"use client";

import Link from "next/link";
import { ChangeEvent, useState } from "react";
import { Document, Packer, Paragraph } from "docx";
import { saveAs } from "file-saver";

export default function BookPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [transcription, setTranscription] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setSelectedFiles(files);
  };

  const getOrientation = async (file: File): Promise<number> => {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);

    if (view.getUint16(0, false) !== 0xffd8) {
      return 1;
    }

    let offset = 2;
    const length = view.byteLength;

    while (offset < length) {
      const marker = view.getUint16(offset, false);
      offset += 2;

      if (marker === 0xffe1) {
        const app1Length = view.getUint16(offset, false);
        const exifHeader = view.getUint32(offset + 2, false);
        if (exifHeader !== 0x45786966) {
          break;
        }

        const little = view.getUint16(offset + 8, false) === 0x4949;
        let nextOffset = offset + 10 + view.getUint32(offset + 14, little);
        const tags = view.getUint16(nextOffset, little);
        nextOffset += 2;

        for (let i = 0; i < tags; i += 1) {
          const tagOffset = nextOffset + i * 12;
          if (view.getUint16(tagOffset, little) === 0x0112) {
            return view.getUint16(tagOffset + 8, little);
          }
        }
        break;
      }

      if ((marker & 0xff00) !== 0xff00) {
        break;
      }

      offset += view.getUint16(offset, false);
    }

    return 1;
  };

  const loadImage = async (file: File): Promise<HTMLImageElement> => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(img);
      };
      img.onerror = (error) => {
        URL.revokeObjectURL(img.src);
        reject(error);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const compressImageFile = async (file: File): Promise<File> => {
    if (!file.type.startsWith("image/")) {
      return file;
    }

    const orientation = await getOrientation(file);
    const image = await loadImage(file);
    const maxWidth = 1600;
    const width = Math.min(image.width, maxWidth);
    const height = Math.round((image.height * width) / image.width);

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }

    if (orientation > 4) {
      canvas.width = height;
      canvas.height = width;
    } else {
      canvas.width = width;
      canvas.height = height;
    }

    switch (orientation) {
      case 2:
        context.translate(width, 0);
        context.scale(-1, 1);
        break;
      case 3:
        context.translate(width, height);
        context.rotate(Math.PI);
        break;
      case 4:
        context.translate(0, height);
        context.scale(1, -1);
        break;
      case 5:
        context.rotate(0.5 * Math.PI);
        context.scale(1, -1);
        break;
      case 6:
        context.rotate(0.5 * Math.PI);
        context.translate(0, -height);
        break;
      case 7:
        context.rotate(0.5 * Math.PI);
        context.translate(width, -height);
        context.scale(-1, 1);
        break;
      case 8:
        context.rotate(-0.5 * Math.PI);
        context.translate(-width, 0);
        break;
      default:
        break;
    }

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.75);
    });

    if (!blob) {
      return file;
    }

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const outputName = `${baseName}.jpg`;
    return new File([blob], outputName, { type: "image/jpeg" });
  };

  const handleGenerateTranscription = async () => {
    if (selectedFiles.length === 0 || isLoading) {
      return;
    }

    setIsLoading(true);
    setIsCompressing(true);

    try {
      const compressedFiles = await Promise.all(
        selectedFiles.map(async (file) => {
          try {
            return await compressImageFile(file);
          } catch {
            return file;
          }
        }),
      );

      const formData = new FormData();
      compressedFiles.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data: { text?: string } = await response.json();
      setTranscription(data.text ?? "");
    } catch {
      setTranscription("");
    } finally {
      setIsCompressing(false);
      setIsLoading(false);
    }
  };

  const handleExportDocx = async () => {
    if (!transcription.trim()) {
      return;
    }

    const paragraphs = transcription
      .split("\n")
      .map((line) => new Paragraph({ text: line }));

    const document = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    const blob = await Packer.toBlob(document);
    saveAs(blob, "book-chapter.docx");
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Book Chapter</h1>
          <p className="mt-2 text-zinc-600">
            Upload or take photos of your handwritten document. You can select multiple images at once.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <label htmlFor="book-images" className="mb-3 block text-sm font-medium text-zinc-700">
            Upload Images
          </label>
          <input
            id="book-images"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="block w-full cursor-pointer rounded-lg border border-zinc-300 bg-zinc-50 p-2 text-sm text-zinc-700 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700"
          />

          <div className="mt-5">
            <h2 className="text-sm font-medium text-zinc-700">Selected Files</h2>
            {selectedFiles.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No files selected.</p>
            ) : (
              <>
                <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                  {selectedFiles.map((file) => (
                    <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-zinc-500">
                  Images will be compressed to JPEG (max width 1600px, quality 0.75) before upload.
                </p>
                {isCompressing && (
                  <p className="mt-2 text-sm text-zinc-600">Compressing images before upload…</p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleGenerateTranscription}
            disabled={selectedFiles.length === 0 || isLoading}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-3 font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
          >
            {isLoading ? "Generating..." : "Generate Transcription"}
          </button>
          <button
            type="button"
            onClick={handleExportDocx}
            disabled={!transcription.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-3 font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
          >
            Export DOCX
          </button>
        </div>

        <div>
          <label htmlFor="transcription-result" className="mb-3 block text-sm font-medium text-zinc-700">
            Transcription Result
          </label>
          <textarea
            id="transcription-result"
            value={transcription}
            onChange={(event) => setTranscription(event.target.value)}
            placeholder="Transcribed text will appear here."
            className="min-h-56 w-full rounded-xl border border-zinc-300 bg-white p-4 text-sm text-zinc-800 shadow-sm outline-none focus:border-zinc-500"
          />
        </div>

        <div>
          <Link href="/" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
