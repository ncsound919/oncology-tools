import { NextRequest, NextResponse } from "next/server";
import { getZai } from "@/lib/zai";

// POST /api/tts — generate a WAV audio narration for the given text.
// Used by the Framework section to narrate tier explanations for accessibility.
export async function POST(req: NextRequest) {
  try {
    const { text, voice = "tongtong", speed = 1.0 } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    // TTS API limit is 1024 chars; truncate to be safe.
    const trimmed = text.trim().slice(0, 1000);
    if (!trimmed) {
      return NextResponse.json({ error: "text is empty" }, { status: 400 });
    }

    const zai = await getZai();
    const response = await zai.audio.tts.create({
      input: trimmed,
      voice,
      speed,
      response_format: "wav",
      stream: false,
    });
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
