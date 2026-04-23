import OpenAI from "openai";

export function sanitizeErrorMessage(message: string) {
  return message
    .replace(/sk-[A-Za-z0-9_\-]+/g, "sk-***")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer ***");
}

export function usingOpenRouter() {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export function modelName() {
  if (usingOpenRouter()) {
    return process.env.OPENROUTER_MODEL?.trim() || "openrouter/free";
  }
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

export function fallbackModels() {
  const configured = (process.env.OPENROUTER_FALLBACK_MODELS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  if (configured.length) return configured;
  return ["openrouter/auto", "openai/gpt-4o-mini"];
}

export function createOpenAIClient(): OpenAI | null {
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openrouterKey) {
    return new OpenAI({
      apiKey: openrouterKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL?.trim() || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME?.trim() || "PITCHAI",
      },
    });
  }
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) return null;
  return new OpenAI({ apiKey: openaiKey });
}

export async function createCoachCompletion(
  openai: OpenAI,
  payload: {
    temperature: number;
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    /** Caps latency from overly long generations (defaults unset = provider default). */
    maxTokens?: number;
    /** When true, requires a message that mentions JSON; OpenAI-compatible providers only. */
    jsonObject?: boolean;
  },
) {
  const primary = modelName();
  const baseBody = {
    temperature: payload.temperature,
    messages: payload.messages,
    ...(payload.maxTokens != null ? { max_tokens: payload.maxTokens } : {}),
    ...(payload.jsonObject ? { response_format: { type: "json_object" as const } } : {}),
  };
  try {
    return await openai.chat.completions.create({
      model: primary,
      ...baseBody,
    });
  } catch (e) {
    const status = Number((e as { status?: number })?.status || 0);
    /** OpenRouter often returns 429 (rate limit) or 503 (provider overload / unavailable). Retry fallbacks for both. */
    if (!usingOpenRouter() || (status !== 429 && status !== 503)) throw e;

    let lastError: unknown = e;
    for (const fallback of fallbackModels()) {
      if (!fallback || fallback === primary) continue;
      try {
        return await openai.chat.completions.create({
          model: fallback,
          ...baseBody,
        });
      } catch (fallbackError) {
        lastError = fallbackError;
      }
    }
    throw lastError;
  }
}

export function parseJson<T>(raw: string): T {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model did not return JSON");
  return JSON.parse(trimmed.slice(start, end + 1)) as T;
}

export function tryParseJson<T>(raw: string): T | null {
  try {
    return parseJson<T>(raw);
  } catch {
    return null;
  }
}

export function normalizeScore(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(10, n));
}
