# MPH VIP

Production AI tool that converts handwritten contractor documents into 
client-ready invoices and formatted exports.

Built for a real construction business. Currently live at 
[mph-vip.vercel.app](https://mph-vip.vercel.app)

---

## What It Does

Contractors photograph their handwritten job notes. MPH VIP transcribes 
them using GPT-4.1 Vision, allows human review and correction, then 
formats the output into a professional invoice — exported as a 
print-ready PDF.

A secondary workflow handles handwritten manuscript pages, converting 
them to clean formatted DOCX exports.

---

## How It Works

The core pipeline is intentionally two-stage:

**1. Transcribe** — GPT-4.1 Vision reads the handwritten images and 
produces a raw, word-for-word transcription. Nothing is corrected or 
invented at this stage.

**2. Review** — The transcription is surfaced in an editable textarea 
before any formatting occurs. The user can correct errors, add context, 
or adjust content.

**3. Format** — A second AI pass rewrites the transcription into a 
structured, professional invoice using a tightly constrained prompt 
that preserves all original line items and pricing without fabricating 
details.

**4. Export** — The formatted output is rendered into a PDF with custom 
layout logic: aligned price columns, section headers, page overflow 
handling, and numbered line items.

The human-in-the-loop step between transcription and formatting is a 
deliberate design decision — AI handles the conversion work, the 
contractor controls the output.

---

## Technical Highlights

- Two-stage AI pipeline with human review between stages
- GPT-4.1 Vision for multi-image handwriting transcription
- Constrained prompt engineering for consistent, non-hallucinating 
  invoice formatting
- Custom PDF layout engine built on jsPDF — price column alignment, 
  section parsing, page break logic
- Multi-image upload with parallel base64 encoding
- Next.js App Router API routes for both AI pipeline stages
- Built for non-technical end users in a field environment

---

## Tech Stack

- Next.js / TypeScript
- OpenAI API (GPT-4.1 Vision)
- jsPDF
- docx / file-saver
- Tailwind CSS

---

## Screenshots

### Home
![Home](./screenshots/readme-img1.png)

### Invoice Workflow
![Invoice Workflow](./screenshots/readme-img2.png)

### Generated Invoice PDF
![Invoice PDF](./screenshots/readme-img3.png)

### Book Formatting Workflow
![Book Workflow](./screenshots/readme-img4.png)

### DOCX Export
![DOCX Export](./screenshots/readme-img5.png)
