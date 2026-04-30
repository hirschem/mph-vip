import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FORMAT_BILLING_PROMPT = `Rewrite the following handwritten job notes into a clean, professional invoice.

Rules:
- Keep ALL original items and details
- Do NOT remove or invent anything
- Improve wording to sound professional and clear
- Organize into sections if appropriate (Scope of Work, Materials, Labor, Notes)
- Keep pricing exactly as written
- Do NOT use markdown (no **, no ###, no symbols)
- Output plain text only
- Use clean spacing and line breaks for readability
- Use simple section titles like:
  Invoice
  Project Address
  Scope of Work
- Format like a professional document:
  - Clear spacing between sections
  - Indented bullet points using "-" only
  - Prices aligned on their own line under each item
- Keep everything easy to read when exported to PDF

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
