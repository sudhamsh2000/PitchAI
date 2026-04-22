let activeAudio: HTMLAudioElement | null = null;
let activeUrl: string | null = null;

function releaseAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }
  if (activeUrl) {
    URL.revokeObjectURL(activeUrl);
    activeUrl = null;
  }
}

async function parseError(res: Response) {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text) as { error?: string; detail?: string };
    const raw = parsed.error || parsed.detail || `Natural voice request failed (${res.status})`;
    if (
      /incorrect api key|invalid api key|needs OPENAI_API_KEY|401|unauthorized/i.test(raw)
    ) {
      return "Natural voice is unavailable right now. Falling back to browser voice.";
    }
    return raw;
  } catch {
    if (/incorrect api key|invalid api key|401|unauthorized/i.test(text)) {
      return "Natural voice is unavailable right now. Falling back to browser voice.";
    }
    return text || `Natural voice request failed (${res.status})`;
  }
}

export function stopPremiumSpeech() {
  releaseAudio();
}

const TTS_FETCH_MS = 45_000;

export async function speakPremiumText(
  text: string,
  options?: {
    voice?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (message: string) => void;
  },
): Promise<boolean> {
  try {
    const input = text.trim();
    if (!input) return false;
    releaseAudio();

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TTS_FETCH_MS);

    let res: Response;
    try {
      res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input, voice: options?.voice }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      options?.onError?.(await parseError(res));
      return false;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    activeAudio = audio;
    activeUrl = url;

    audio.onplay = () => options?.onStart?.();
    audio.onended = () => {
      options?.onEnd?.();
      releaseAudio();
    };
    audio.onerror = () => {
      options?.onError?.("Natural voice playback failed.");
      releaseAudio();
    };

    await audio.play();
    return true;
  } catch (e) {
    const msg =
      e instanceof Error && e.name === "AbortError"
        ? "Natural voice request timed out. Using browser voice instead."
        : e instanceof Error
          ? e.message
          : "Natural voice playback failed.";
    options?.onError?.(msg);
    return false;
  }
}

