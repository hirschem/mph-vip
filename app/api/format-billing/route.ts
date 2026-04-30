import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FORMAT_BILLING_PROMPT = `Rewrite the following handwritten job notes into a clean, professional invoice.

Tone:
Rewrite the notes so they sound more polished, clear, and eloquent while still sounding like a practical residential contractor.

Tone Rules:
- Improve sentence quality and wording.
- Make descriptions sound professional and confident.
- Use elegant but plain language.
- Do not sound overly corporate, legal, salesy, or robotic.
- Do not invent details, materials, quantities, dates, warranties, or promises.
- Keep every original work item and price.
- If the original note is short, expand the wording slightly for clarity, but only using information already implied by the note.

Rules:
- Keep ALL original items and details.
- Do NOT remove, alter, or invent any information.
- Improve wording to be clear, professional, and slightly more polished.
- Maintain a practical residential contractor tone (not overly corporate or salesy).
- Organize content into simple sections when appropriate (e.g., Invoice, Project Address, Scope of Work, Materials, Labor, Notes).
- Keep all pricing exactly as written.

Formatting:
- Do NOT use markdown (no **, no ###, no special formatting symbols).
- Output plain text only.
- Use clean spacing and consistent line breaks for readability.
- Use simple section titles such as:
  Invoice
  Project Address
  Scope of Work
- Format like a professional document:
  - Clear spacing between sections
  - Use "-" for simple bullet points where needed
  - Place prices on their own line directly under each item
- Ensure the output is easy to read when exported to PDF.

Return only the formatted text.`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string };
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `${FORMAT_BILLING_PROMPT}\n\n${text}`,
            },
          ],
        },
      ],
    });

    return NextResponse.json({ text: response.output_text ?? "" });
  } catch {
    return NextResponse.json({ error: "Formatting failed" }, { status: 500 });
  }
}
