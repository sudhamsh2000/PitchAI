import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function sanitizeErrorMessage(message: string) {
  return message
    .replace(/sk-[A-Za-z0-9_\-]+/g, "sk-***")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer ***");
}

function ttsClient() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export async function POST(req: Request) {
  const openai = ttsClient();
  if (!openai) {
    return NextResponse.json(
      {
        error:
          "Natural Voice (Premium) needs OPENAI_API_KEY in .env or .env.local. Browser voice still works without it.",
      },
      { status: 500 },
    );
  }

  try {
    const body = (await req.json()) as { text?: string; voice?: string };
    const text = String(body.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "Missing text for TTS." }, { status: 400 });
    }

    const model = process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts";
    const voice = (body.voice || process.env.OPENAI_TTS_VOICE || "alloy").trim();
    const audio = await openai.audio.speech.create({
      model,
      voice,
      input: text.slice(0, 4000),
      response_format: "mp3",
    });

    const buffer = Buffer.from(await audio.arrayBuffer());
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? sanitizeErrorMessage(e.message) : "Premium TTS failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

