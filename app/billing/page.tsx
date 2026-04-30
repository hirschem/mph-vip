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
    const priceColumnWidth = 34;
    const descriptionMaxWidth = maxWidth - priceColumnWidth;
    const priceColumnX = pageWidth - margin;
    const lineHeight = 4.8;
    const smallGap = 0.4;
    const mediumGap = 1.3;
    const maxY = 280;
    const headerLines = [
      "MPH Construction and Painting",
      "(303)-249-4563",
      "(720)-883-5097",
      "mhirsch60@hotmail.com",
      "9426 Troon Village Way",
      "Lone Tree, CO 80124",
    ];
    const headerLineHeight = 4.7;
    const bodyStartGap = 4.2;
    const sectionTitleGap = mediumGap;
    const sectionTitles = new Set([
      "Invoice",
      "Homeowner Address",
      "Scope of Work",
      "Materials",
      "Labor",
      "Notes",
    ]);
    const isPriceLine = (line: string) => /^\$?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})$/.test(line.trim());
    const isNumberedItemLine = (line: string) => /^\d+[.)]\s+/.test(line.trim());
    const isBulletLine = (line: string) => /^-\s+/.test(line.trim());
    const formatPriceLine = (line: string) => {
      const trimmed = line.trim();
      if (!isPriceLine(trimmed)) {
        return trimmed;
      }

      const numericValue = Number.parseFloat(trimmed.replace(/[$,]/g, ""));
      if (Number.isNaN(numericValue)) {
        return trimmed;
      }

      return `$${numericValue.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    };
    const consumedPriceIndexes = new Set<number>();
    const getNextRenderableNonEmptyIndex = (startIndex: number) => {
      for (let idx = startIndex; idx < sourceLines.length; idx += 1) {
        const trimmed = sourceLines[idx].trim();
        if (!trimmed || consumedPriceIndexes.has(idx)) {
          continue;
        }

        return idx;
      }

      return -1;
    };
    const findItemBlockEndIndex = (startIndex: number) => {
      for (let idx = startIndex + 1; idx < sourceLines.length; idx += 1) {
        const trimmed = sourceLines[idx].trim();
        if (!trimmed) {
          continue;
        }

        if (isNumberedItemLine(trimmed) || sectionTitles.has(trimmed)) {
          return idx;
        }
      }

      return sourceLines.length;
    };
    const findPairedPriceIndexForItem = (startIndex: number) => {
      // Pair only the first price found before the next numbered item or section title.
      for (let idx = startIndex + 1; idx < sourceLines.length; idx += 1) {
        const trimmed = sourceLines[idx].trim();

        if (!trimmed) {
          continue;
        }

        if (isNumberedItemLine(trimmed) || sectionTitles.has(trimmed)) {
          break;
        }

        if (isPriceLine(trimmed)) {
          return idx;
        }
      }

      return -1;
    };
    const getNextNonEmptyIndexInBlock = (startIndex: number, blockEndIndex: number) => {
      for (let idx = startIndex; idx < blockEndIndex; idx += 1) {
        if (consumedPriceIndexes.has(idx)) {
          continue;
        }

        if (sourceLines[idx].trim() !== "") {
          return idx;
        }
      }

      return -1;
    };
    let y = margin;

    const sourceLines = transcription
      .split("\n")
      .filter((line) => line.trim() !== "Company Name");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(headerLines[0], margin, y);
    y += headerLineHeight;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    headerLines.slice(1).forEach((line) => {
      doc.text(line, margin, y);
      y += headerLineHeight;
    });

    const dividerY = y + 0.8;
    doc.setLineWidth(0.2);
    doc.line(margin, dividerY, pageWidth - margin, dividerY);

    y += bodyStartGap;

    doc.setLineWidth(0.1);
    doc.line(priceColumnX - priceColumnWidth, dividerY + 1, priceColumnX - priceColumnWidth, maxY);

    let i = 0;
    while (i < sourceLines.length) {
      const sourceLine = sourceLines[i];
      const trimmedLine = sourceLine.trim();

      if (consumedPriceIndexes.has(i)) {
        i += 1;
        continue;
      }

      if (!trimmedLine) {
        y += smallGap;
        i += 1;
        continue;
      }

      const isSectionTitle = sectionTitles.has(trimmedLine);

      if (isSectionTitle) {
        if (y > maxY) {
          doc.addPage();
          y = margin;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11.1);
        doc.text(trimmedLine, margin, y);
        y += lineHeight;
        y += sectionTitleGap;
        i += 1;
        continue;
      }

      if (isNumberedItemLine(trimmedLine)) {
        if (y > maxY) {
          doc.addPage();
          y = margin;
        }

        const blockEndIndex = findItemBlockEndIndex(i);
        const pairedPriceIndex = findPairedPriceIndexForItem(i);
        const wrappedItemLines = doc.splitTextToSize(sourceLine, descriptionMaxWidth);
        const blockStartY = y;

        wrappedItemLines.forEach((wrappedLine: string) => {
          if (y > maxY) {
            doc.addPage();
            y = margin;
          }

          doc.setFont("helvetica", "normal");
          doc.setFontSize(10.2);
          doc.text(wrappedLine, margin, y);
          y += lineHeight;
        });

        for (let detailIndex = i + 1; detailIndex < blockEndIndex; detailIndex += 1) {
          if (detailIndex === pairedPriceIndex || consumedPriceIndexes.has(detailIndex)) {
            continue;
          }

          const detailLine = sourceLines[detailIndex];
          const trimmedDetailLine = detailLine.trim();
          if (!trimmedDetailLine) {
            y += smallGap;
            continue;
          }

          if (isPriceLine(trimmedDetailLine)) {
            if (consumedPriceIndexes.has(detailIndex)) {
              continue;
            }

            if (y > maxY) {
              doc.addPage();
              y = margin;
            }

            const formattedPrice = formatPriceLine(trimmedDetailLine);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(formattedPrice, priceColumnX, y, { align: "right" });
            consumedPriceIndexes.add(detailIndex);
            y += lineHeight;
            continue;
          }

          const nextNonEmptyDetailIndex = getNextNonEmptyIndexInBlock(detailIndex + 1, blockEndIndex);
          const pairedDetailPriceIndex =
            nextNonEmptyDetailIndex !== -1 && isPriceLine(sourceLines[nextNonEmptyDetailIndex].trim())
              ? nextNonEmptyDetailIndex
              : -1;
          const detailStartY = y;

          const wrappedDetailLines = doc.splitTextToSize(detailLine, descriptionMaxWidth);
          wrappedDetailLines.forEach((wrappedDetailLine: string) => {
            if (y > maxY) {
              doc.addPage();
              y = margin;
            }

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10.2);
            doc.text(wrappedDetailLine, margin, y);
            y += lineHeight;
          });

          if (pairedDetailPriceIndex !== -1 && !consumedPriceIndexes.has(pairedDetailPriceIndex)) {
            const formattedPairedDetailPrice = formatPriceLine(sourceLines[pairedDetailPriceIndex]);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(formattedPairedDetailPrice, priceColumnX, detailStartY, { align: "right" });
            consumedPriceIndexes.add(pairedDetailPriceIndex);
          }
        }

        if (pairedPriceIndex !== -1 && !consumedPriceIndexes.has(pairedPriceIndex)) {
          const formattedPrice = formatPriceLine(sourceLines[pairedPriceIndex]);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text(formattedPrice, priceColumnX, blockStartY, { align: "right" });
          consumedPriceIndexes.add(pairedPriceIndex);
        }

        const afterItemIndex = getNextRenderableNonEmptyIndex(blockEndIndex);
        y += smallGap;

        i = blockEndIndex;
        continue;
      }

      if (isPriceLine(trimmedLine)) {
        if (consumedPriceIndexes.has(i)) {
          i += 1;
          continue;
        }

        if (y > maxY) {
          doc.addPage();
          y = margin;
        }

        const formattedPrice = formatPriceLine(trimmedLine);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(formattedPrice, priceColumnX, y, { align: "right" });
        consumedPriceIndexes.add(i);
        y += lineHeight;
        y += smallGap;
        i += 1;
        continue;
      }

      const wrappedLines = doc.splitTextToSize(sourceLine, descriptionMaxWidth);
      const isBullet = isBulletLine(trimmedLine);

      wrappedLines.forEach((wrappedLine: string) => {
        if (y > maxY) {
          doc.addPage();
          y = margin;
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.2);
        doc.text(wrappedLine, margin, y);
        y += lineHeight;
      });

      const afterLineIndex = getNextRenderableNonEmptyIndex(i + 1);
      const nextTrimmedLine = afterLineIndex === -1 ? "" : sourceLines[afterLineIndex].trim();

      if (isBullet || isBulletLine(nextTrimmedLine)) {
        y += smallGap;
      } else if (isNumberedItemLine(nextTrimmedLine)) {
        y += mediumGap;
      } else {
        y += smallGap;
      }

      i += 1;
    }

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
