"use client";

import Link from "next/link";
import { ChangeEvent, useState } from "react";
import { jsPDF } from "jspdf";

export default function BillingPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [transcription, setTranscription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);

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

  const handleExportPdf = () => {
    if (!transcription.trim()) {
      return;
    }

    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 6.5;
    const maxY = 280;
    const headerLines = [
      "MPH Construction and Painting",
      "(303)-249-4563",
      "(720)-883-5097",
      "mhirsch60@hotmail.com",
      "9426 Troon Village Way",
      "Lone Tree, CO 80124",
    ];
    const headerLineHeight = 6;
    const bodyStartGap = 6;
    const sectionTitleGap = 3;
    const sectionTitles = new Set([
      "Invoice",
      "Homeowner Address",
      "Scope of Work",
      "Materials",
      "Labor",
      "Notes",
    ]);
    const isPriceLine = (line: string) => /^\$?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})$/.test(line.trim());
    let y = margin;

    doc.setFontSize(14);
    doc.text(headerLines[0], margin, y);
    y += headerLineHeight;

    doc.setFontSize(11);
    headerLines.slice(1).forEach((line) => {
      doc.text(line, margin, y);
      y += headerLineHeight;
    });

    y += bodyStartGap;
    doc.setFontSize(12);

    const sourceLines = transcription
      .split("\n")
      .filter((line) => line.trim() !== "Company Name");

    sourceLines.forEach((sourceLine) => {
      const trimmedLine = sourceLine.trim();
      const isSectionTitle = sectionTitles.has(trimmedLine);

      if (isPriceLine(trimmedLine)) {
        if (y > maxY) {
          doc.addPage();
          y = margin;
        }

        doc.text(trimmedLine, pageWidth - margin, y, { align: "right" });
        y += lineHeight;
        return;
      }

      const wrappedLines = doc.splitTextToSize(sourceLine || " ", maxWidth);

      wrappedLines.forEach((wrappedLine: string) => {
        if (y > maxY) {
          doc.addPage();
          y = margin;
        }

        doc.text(wrappedLine, margin, y);
        y += lineHeight;
      });

      if (isSectionTitle) {
        y += sectionTitleGap;

        if (y > maxY) {
          doc.addPage();
          y = margin;
        }
      }
    });

    doc.save("billing-document.pdf");
  };

  const handleFormatInvoice = async () => {
    if (!transcription.trim() || isFormatting) {
      return;
    }

    setIsFormatting(true);

    try {
      const response = await fetch("/api/format-billing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: transcription }),
      });

      const data: { text?: string } = await response.json();
      setTranscription(data.text ?? transcription);
    } finally {
      setIsFormatting(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Billing</h1>
          <p className="mt-2 text-zinc-600">
            Upload or take photos of your handwritten document. You can select multiple images at once.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <label htmlFor="billing-images" className="mb-3 block text-sm font-medium text-zinc-700">
            Upload Images
          </label>
          <input
            id="billing-images"
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
            onClick={handleExportPdf}
            disabled={!transcription.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-3 font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
          >
            Export PDF
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
          <button
            type="button"
            onClick={handleFormatInvoice}
            disabled={!transcription.trim() || isFormatting}
            className="mt-3 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-3 font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
          >
            {isFormatting ? "Formatting..." : "Format as Professional Invoice"}
          </button>
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
