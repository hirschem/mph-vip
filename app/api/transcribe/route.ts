import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TRANSCRIBE_PROMPT =
  "Transcribe the handwritten document word-for-word. Preserve line breaks, spelling, punctuation, and page order. Do not summarize or correct anything. If a word is unclear, write [unclear].";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("images").filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const imageInputs = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");
        const mimeType = file.type || "image/jpeg";

        return {
          type: "input_image" as const,
          image_url: `data:${mimeType};base64,${base64}`,
        };
      })
    );

    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: TRANSCRIBE_PROMPT }, ...imageInputs],
        },
      ],
    });

    return NextResponse.json({ text: response.output_text ?? "" });
  } catch {
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
