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
    const parsed = JSON.parse(text) as { error?: string };
    return parsed.error || `Premium voice request failed (${res.status})`;
  } catch {
    return text || `Premium voice request failed (${res.status})`;
  }
}

export function stopPremiumSpeech() {
  releaseAudio();
}

export async function speakPremiumText(
  text: string,
  options?: {
    voice?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (message: string) => void;
  },
) {
  try {
    const input = text.trim();
    if (!input) return;
    releaseAudio();

    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input, voice: options?.voice }),
    });

    if (!res.ok) {
      options?.onError?.(await parseError(res));
      return;
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
      options?.onError?.("Premium voice playback failed.");
      releaseAudio();
    };

    await audio.play();
  } catch (e) {
    options?.onError?.(e instanceof Error ? e.message : "Premium voice playback failed.");
  }
}

