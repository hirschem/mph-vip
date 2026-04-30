"use client";

import Link from "next/link";
import { ChangeEvent, useState } from "react";

export default function BookPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [transcription, setTranscription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setSelectedFiles(files);
  };

  const handleGenerateTranscription = async () => {
    if (selectedFiles.length === 0 || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
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
      setIsLoading(false);
    }
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
              <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                {selectedFiles.map((file) => (
                  <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
                ))}
              </ul>
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
            disabled
            className="inline-flex items-center justify-center rounded-lg bg-zinc-300 px-5 py-3 font-medium text-zinc-600 opacity-80 cursor-not-allowed"
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
