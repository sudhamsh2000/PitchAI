"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

interface VoiceRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: VoiceRecognition, ev: VoiceRecognitionEvent) => void) | null;
  onerror: ((this: VoiceRecognition, ev: Event) => void) | null;
  onend: ((this: VoiceRecognition, ev: Event) => void) | null;
}

interface VoiceRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: VoiceRecognitionResultList;
}

interface VoiceRecognitionResultList {
  readonly length: number;
  item(index: number): VoiceRecognitionResult;
  [index: number]: VoiceRecognitionResult;
}

interface VoiceRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): VoiceRecognitionAlternative;
  [index: number]: VoiceRecognitionAlternative;
}

interface VoiceRecognitionAlternative {
  readonly transcript: string;
}

type RecognitionCtor = new () => VoiceRecognition;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function humanizeRecognitionError(code: string | undefined): string {
  switch (code) {
    case "not-allowed":
      return "Microphone permission was denied. Allow the mic for this site in browser settings, then try again.";
    case "service-not-allowed":
      return "Speech recognition is disabled or blocked for this page. Try Chrome/Edge on desktop, or use HTTPS / localhost.";
    case "network":
      return "Speech recognition hit a network error. Check your connection and try again.";
    case "no-speech":
      return "No speech detected. Speak closer to the mic or try typing.";
    case "aborted":
      return "Dictation stopped.";
    default:
      return code ? `Speech recognition error: ${code}` : "Speech recognition failed.";
  }
}

export function useVoice(
  onFinal: (text: string) => void,
  onRecognitionError?: (message: string) => void,
) {
  const supported = useMemo(() => Boolean(getRecognitionCtor()), []);
  const recRef = useRef<VoiceRecognition | null>(null);

  const stopListening = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
  }, []);

  const startListening = useCallback(
    (onInterim: (text: string) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return;

      stopListening();
      const rec = new Ctor();
      rec.lang = "en-US";
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event: VoiceRecognitionEvent) => {
        let interim = "";
        let finalChunk = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const piece = res[0]?.transcript || "";
          if (res.isFinal) finalChunk += piece;
          else interim += piece;
        }
        if (interim) onInterim(interim);
        if (finalChunk) onFinal(finalChunk);
      };

      rec.onerror = (event: Event) => {
        const code = (event as unknown as { error?: string }).error;
        onRecognitionError?.(humanizeRecognitionError(code));
        stopListening();
      };

      rec.onend = () => {
        recRef.current = null;
      };

      recRef.current = rec;
      try {
        rec.start();
      } catch {
        onRecognitionError?.("Could not start the microphone listener. Try typing instead.");
        stopListening();
      }
    },
    [onFinal, onRecognitionError, stopListening],
  );

  useEffect(() => () => stopListening(), [stopListening]);

  return { supported, startListening, stopListening };
}

let speakingSession = 0;
let cachedFriendlyVoiceName: string | null = null;

function splitForSpeech(text: string): string[] {
  const normalized = text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/[:;]/g, ". ")
    .replace(/\s+-\s+/g, ". ")
    .trim();
  if (!normalized) return [];
  const rough = normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  for (const part of rough) {
    if (part.length <= 220) {
      chunks.push(part);
      continue;
    }
    // Keep chunks short so browser TTS sounds less monotone.
    const words = part.split(" ");
    let buf = "";
    for (const w of words) {
      const candidate = buf ? `${buf} ${w}` : w;
      if (candidate.length > 180) {
        if (buf) chunks.push(buf);
        buf = w;
      } else {
        buf = candidate;
      }
    }
    if (buf) chunks.push(buf);
  }
  return chunks;
}

function pickFriendlyVoice(voices: SpeechSynthesisVoice[]) {
  if (cachedFriendlyVoiceName) {
    const cached = voices.find((v) => v.name === cachedFriendlyVoiceName);
    if (cached) return cached;
  }
  const picked =
    voices.find((v) => /samantha|ava|serena|allison|siri female|google uk english female/i.test(v.name)) ||
    voices.find((v) => /microsoft aria|microsoft jenny|google us english/i.test(v.name)) ||
    voices.find((v) => v.lang === "en-US" && /natural|female/i.test(v.name)) ||
    voices.find((v) => v.lang === "en-US") ||
    voices.find((v) => v.lang.startsWith("en")) ||
    voices[0];
  if (picked?.name) cachedFriendlyVoiceName = picked.name;
  return picked;
}

async function getVoicesReady(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined") return [];
  const synth = window.speechSynthesis;
  const initial = synth.getVoices();
  if (initial.length > 0) return initial;

  return await new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", done);
    // Fallback in case voiceschanged never fires.
    setTimeout(done, 350);
  });
}

export function speakText(text: string, onStart?: () => void, onEnd?: () => void) {
  if (typeof window === "undefined") return;
  speakingSession += 1;
  const sessionId = speakingSession;
  window.speechSynthesis.cancel();
  const chunks = splitForSpeech(text);
  if (!chunks.length) return;
  void (async () => {
    const voices = await getVoicesReady();
    if (sessionId !== speakingSession) return;
    const preferred = pickFriendlyVoice(voices);

    let started = false;
    let remaining = chunks.length;
    for (const chunk of chunks) {
      const utter = new SpeechSynthesisUtterance(chunk);
      // Softer speech profile for a more conversational, friendly output.
      utter.rate = 0.88;
      utter.pitch = 1.0;
      utter.volume = 1;
      utter.lang = preferred?.lang || "en-US";
      if (preferred) utter.voice = preferred;

      utter.onstart = () => {
        if (!started && sessionId === speakingSession) {
          started = true;
          onStart?.();
        }
      };
      utter.onend = () => {
        if (sessionId !== speakingSession) return;
        remaining -= 1;
        if (remaining <= 0) onEnd?.();
      };
      utter.onerror = () => {
        if (sessionId !== speakingSession) return;
        remaining -= 1;
        if (remaining <= 0) onEnd?.();
      };
      window.speechSynthesis.speak(utter);
    }
  })();
}

export function stopSpeaking() {
  if (typeof window === "undefined") return;
  speakingSession += 1;
  window.speechSynthesis.cancel();
}
