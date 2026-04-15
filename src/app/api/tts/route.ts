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

type TtsBody = { text?: string; voice?: string };

function jsonHeaders() {
  const key = process.env.PIPER_TTS_API_KEY?.trim();
  return {
    "Content-Type": "application/json",
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
  };
}

function plainHeaders() {
  const key = process.env.PIPER_TTS_API_KEY?.trim();
  return {
    "Content-Type": "text/plain; charset=utf-8",
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
  };
}

async function piperSpeech(
  text: string,
  voice: string,
): Promise<{ ok: true; audio: Buffer; type: string } | { ok: false; error: string }> {
  const piperUrl = process.env.PIPER_TTS_URL?.trim();
  if (!piperUrl) {
    return { ok: false, error: "PIPER_TTS_URL is not set." };
  }

  const timeoutMs = Number(process.env.PIPER_TTS_TIMEOUT_MS || 12000);

  const endpointCandidates = (() => {
    const normalized = piperUrl.replace(/\/+$/, "");
    const roots = Array.from(
      new Set([
        normalized,
        normalized.replace(/\/(tts|synthesize|api\/tts)$/i, ""),
      ]),
    ).filter(Boolean);
    const candidates = new Set<string>();
    for (const root of roots) {
      candidates.add(root);
      candidates.add(`${root}/tts`);
      candidates.add(`${root}/synthesize`);
      candidates.add(`${root}/api/tts`);
    }
    return Array.from(candidates);
  })();

  const trimmedText = text.slice(0, 4000);
  const payloadCandidates: Array<{
    headers: Record<string, string>;
    body: string;
    note: string;
  }> = [
    // Some Piper HTTP wrappers expect raw text, not JSON.
    { headers: plainHeaders(), body: trimmedText, note: "plain-text" },
    { headers: jsonHeaders(), body: JSON.stringify({ text: trimmedText }), note: "json-text" },
    { headers: jsonHeaders(), body: JSON.stringify({ text: trimmedText, voice }), note: "json-voice" },
    { headers: jsonHeaders(), body: JSON.stringify({ text: trimmedText, voice, format: "mp3" }), note: "json-format" },
    { headers: jsonHeaders(), body: JSON.stringify({ text: trimmedText, voice, output_format: "mp3" }), note: "json-output-format" },
    { headers: jsonHeaders(), body: JSON.stringify({ text: trimmedText, voice_id: voice, format: "mp3" }), note: "json-voice-id" },
    { headers: jsonHeaders(), body: JSON.stringify({ text: trimmedText, model: voice, format: "mp3" }), note: "json-model" },
  ];

  const errors: string[] = [];

  for (const endpoint of endpointCandidates) {
    for (const payload of payloadCandidates) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: payload.headers,
          body: payload.body,
          signal: ctrl.signal,
          cache: "no-store",
        });

        if (!res.ok) {
          const raw = await res.text();
          errors.push(
            sanitizeErrorMessage(raw || `${endpoint} (${payload.note}) returned ${res.status}`),
          );
          continue;
        }

        const contentType = res.headers.get("content-type") || "";
        if (/^audio\//i.test(contentType)) {
          return {
            ok: true,
            audio: Buffer.from(await res.arrayBuffer()),
            type: contentType,
          };
        }

        // Some Piper HTTP wrappers return raw WAV bytes with text/* content-type.
        if (!/json/i.test(contentType)) {
          const rawAudio = Buffer.from(await res.arrayBuffer());
          if (rawAudio.byteLength > 0) {
            return {
              ok: true,
              audio: rawAudio,
              type: "audio/wav",
            };
          }
        }

        const parsedJson = (await res.json().catch(() => null)) as
          | { audioBase64?: string; audio?: string; mimeType?: string }
          | null;
        const encoded = parsedJson?.audioBase64 || parsedJson?.audio;
        if (!encoded) {
          errors.push(`${endpoint} (${payload.note}) returned no audio payload`);
          continue;
        }
        return {
          ok: true,
          audio: Buffer.from(encoded, "base64"),
          type: parsedJson?.mimeType || "audio/mpeg",
        };
      } catch (e) {
        const message =
          e instanceof Error ? sanitizeErrorMessage(e.message) : "Piper TTS failed";
        errors.push(`${endpoint}: ${message}`);
      } finally {
        clearTimeout(timer);
      }
    }
  }

  const summary = errors.filter(Boolean).slice(0, 3).join(" | ");
  if (/connection refused|ECONNREFUSED/i.test(summary)) {
    return {
      ok: false,
      error:
        "Piper server is not running on the configured URL. Start Piper HTTP service and try again.",
    };
  }
  return {
    ok: false,
    error: summary || "Piper TTS failed on all endpoint/payload attempts.",
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TtsBody;
    const text = String(body.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "Missing text for TTS." }, { status: 400 });
    }
    const voice = (body.voice || process.env.OPENAI_TTS_VOICE || "alloy").trim();

    // Free/local path first: use Piper when configured.
    const piper = await piperSpeech(text, voice);
    if (piper.ok) {
      return new Response(new Uint8Array(piper.audio), {
        status: 200,
        headers: {
          "Content-Type": piper.type,
          "Cache-Control": "no-store",
          "X-TTS-Provider": "piper",
        },
      });
    }

    // Optional fallback path: OpenAI TTS if key exists.
    const openai = ttsClient();
    if (!openai) {
      return NextResponse.json(
        {
          error:
            "Natural voice unavailable. Configure PIPER_TTS_URL for free local voice, or set OPENAI_API_KEY for cloud voice.",
          detail: piper.error,
        },
        { status: 500 },
      );
    }

    const model = process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts";
    const audio = await openai.audio.speech.create({
      model,
      voice,
      input: text.slice(0, 4000),
      response_format: "mp3",
    });

    const buffer = Buffer.from(await audio.arrayBuffer());
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-TTS-Provider": "openai",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? sanitizeErrorMessage(e.message) : "Natural TTS failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

