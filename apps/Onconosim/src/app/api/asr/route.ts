import { NextRequest, NextResponse } from "next/server";
import { getZai } from "@/lib/zai";

// POST /api/asr — transcribe spoken audio to text.
// Body: { audio: "<base64-encoded audio data>" } (any common format: wav/mp3/webm/etc.)
// Returns: { text: "<transcription>" }
export async function POST(req: NextRequest) {
  try {
    const { audio } = await req.json();
    if (!audio || typeof audio !== "string") {
      return NextResponse.json({ error: "audio (base64) is required" }, { status: 400 });
    }
    const zai = await getZai();
    const response = await zai.audio.asr.create({ file_base64: audio });
    const text = (response as { text?: string }).text ?? "";
    return NextResponse.json({ text: text.trim() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
