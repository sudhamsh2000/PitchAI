"use client";

import { useLayoutEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PitchMessage } from "@/types/pitch";
import { normalizeForSpeech } from "@/lib/speech-text";
import { speakText, stopSpeaking } from "@/hooks/useVoice";
import { speakPremiumText, stopPremiumSpeech } from "@/lib/tts-client";
import { LiveSelfView } from "./LiveSelfView";

export function ConversationPanel({
  messages,
  typing,
  interim,
  liveSession,
  liveActive,
  aiSpeaking,
  naturalVoice,
  naturalVoiceName,
}: {
  messages: PitchMessage[];
  typing: boolean;
  interim: string;
  liveSession?: boolean;
  liveActive?: boolean;
  aiSpeaking?: boolean;
  naturalVoice?: boolean;
  naturalVoiceName?: string;
}) {
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const transcriptMessages = messages.slice(-10);

  useLayoutEffect(() => {
    const el = transcriptScrollRef.current;
    if (!el) return;
    const scrollEnd = () => {
      el.scrollTop = el.scrollHeight;
    };
    scrollEnd();
    requestAnimationFrame(scrollEnd);
  }, [messages, typing, interim]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white/65 dark:bg-black/25">
      <div className="shrink-0 border-b border-black/10 px-5 py-4 dark:border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Conversation</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-300">Voice-first interview with live transcript.</p>
          </div>
          {liveSession ? (
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                liveActive
                  ? "border-sky-400/60 bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-100"
                  : "border-black/10 bg-zinc-100 text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400"
              }`}
            >
              {liveActive ? "Listening live" : "Live session"}
            </span>
          ) : null}
        </div>
      </div>

      {liveSession || liveActive ? (
        <div className="shrink-0 border-b border-black/10 px-5 pb-4 pt-3 dark:border-white/5">
          {latestAssistant ? (
            <div className="mx-auto mb-3 max-w-3xl rounded-xl border border-sky-300/40 bg-sky-100/70 px-3 py-2 text-sm font-medium text-sky-800 dark:border-sky-300/35 dark:bg-sky-500/10 dark:text-sky-100">
              {latestAssistant.content}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-center gap-6 md:flex-nowrap md:gap-10">
            <CircularSpectrum active={Boolean(liveActive)} aiSpeaking={Boolean(aiSpeaking)} interim={interim} />
            <LiveSelfView active={Boolean(liveSession)} speaking={Boolean(liveActive)} />
          </div>
        </div>
      ) : null}

      <div className="min-h-0 shrink-0 border-t border-black/10 bg-white/65 px-4 py-3 dark:border-white/10 dark:bg-black/20">
        <div
          ref={transcriptScrollRef}
          className="max-h-[22vh] min-h-[16vh] overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]"
        >
          <div className="space-y-2">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-black/12 bg-white/60 px-4 py-4 text-center dark:border-white/10 dark:bg-white/[0.02]">
                <p className="text-xs text-zinc-600 dark:text-zinc-300">Your transcript will appear here once the session starts.</p>
              </div>
            ) : null}
            <AnimatePresence initial={false}>
              {transcriptMessages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[95%] rounded-xl border px-3 py-2 text-[13px] font-medium leading-snug shadow-sm ${
                      m.role === "user"
                        ? "border-sky-400/35 bg-sky-100 text-sky-900 dark:border-sky-400/25 dark:bg-sky-500/10 dark:text-sky-50"
                        : "border-black/10 bg-white/80 text-zinc-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-100"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {m.role === "user" ? "You" : "Friday"}
                      </span>
                      {m.role === "assistant" ? (
                        <button
                          type="button"
                          onClick={() => void (async () => {
                            const spokenText = normalizeForSpeech(m.content);
                            if (!spokenText) return;
                            stopSpeaking();
                            stopPremiumSpeech();
                            if (naturalVoice) {
                              const ok = await speakPremiumText(spokenText, {
                                voice: naturalVoiceName,
                              });
                              if (!ok) speakText(spokenText);
                            } else {
                              speakText(spokenText);
                            }
                          })()}
                          className="inline-flex items-center gap-1 rounded-md border border-black/10 bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-700 hover:border-sky-400/40 dark:border-white/10 dark:bg-black/30 dark:text-zinc-200 dark:hover:border-sky-300/40"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                          </svg>
                          {naturalVoice ? "Play HD" : "Play"}
                        </button>
                      ) : null}
                    </div>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {typing ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-xs text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300">
                  <span className="inline-flex gap-1">
                    <span className="animate-pulse">●</span>
                    <span className="animation-delay-150 animate-pulse">●</span>
                    <span className="animation-delay-300 animate-pulse">●</span>
                  </span>
                </div>
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>

      {interim ? (
        <div className="shrink-0 border-t border-black/10 bg-white/55 px-5 py-2 dark:border-white/10 dark:bg-black/30">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">
            Live transcript
          </p>
          <p className="mt-1 text-sm font-medium text-sky-700 dark:text-sky-100/90">{interim}</p>
        </div>
      ) : null}
    </div>
  );
}

function CircularSpectrum({ active, aiSpeaking, interim }: { active: boolean; aiSpeaking?: boolean; interim?: string }) {
  const energy = Math.min(1, Math.max(0, ((interim?.trim().length ?? 0) / 120)));
  const totalEnergy = aiSpeaking ? Math.max(energy, 0.6) : energy;
  const idleScale = 0.992;
  const activeScale = 1 + totalEnergy * 0.06;
  return (
    <div className="relative px-2 py-2">
      <div className="relative mx-auto h-44 w-44">
        <motion.div
          className="absolute inset-[-12%] rounded-full bg-[radial-gradient(circle,rgba(70,162,255,0.4)_0%,rgba(49,126,255,0.22)_45%,rgba(12,36,88,0)_78%)] blur-2xl"
          animate={
            active || aiSpeaking
              ? { scale: [0.96, 1.08, 0.98, 1.05, 0.96], opacity: [0.38, 0.7, 0.44, 0.62, 0.38] }
              : { scale: 0.94, opacity: 0.3 }
          }
          transition={{ duration: active || aiSpeaking ? 1.4 : 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-[140px] w-[140px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-white/20 shadow-[0_0_70px_rgba(85,181,255,0.52),inset_0_0_30px_rgba(255,255,255,0.24)]"
          style={{
            background:
              "radial-gradient(circle at 48% 38%, rgba(255,252,244,0.93) 0%, rgba(229,246,255,0.92) 34%, rgba(167,227,255,0.74) 58%, rgba(39,139,255,0.9) 100%)",
          }}
          animate={
            active || aiSpeaking
              ? {
                  scale: [idleScale, 1.02 + totalEnergy * 0.05, activeScale, 1.01 + totalEnergy * 0.03, idleScale],
                  borderRadius: ["50% 50% 49% 51% / 50% 48% 52% 50%", "52% 48% 53% 47% / 45% 55% 45% 55%", "49% 51% 47% 53% / 53% 47% 53% 47%", "51% 49% 52% 48% / 48% 52% 48% 52%", "50% 50% 49% 51% / 50% 48% 52% 50%"],
                  rotate: [0, 4, -3, 2, 0],
                }
              : {
                  scale: [0.99, 1, 0.994, 1, 0.99],
                  borderRadius: ["50% 50% 50% 50% / 50% 50% 50% 50%", "52% 48% 49% 51% / 49% 53% 47% 51%", "50% 50% 50% 50% / 50% 50% 50% 50%"],
                  rotate: [0, 1, 0],
                }
          }
          transition={{ duration: active || aiSpeaking ? 1.1 : 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="absolute inset-[8%] rounded-full"
            style={{
              background:
                "radial-gradient(110% 90% at 50% 28%, rgba(255,250,238,0.78) 0%, rgba(196,232,255,0.5) 40%, rgba(53,157,255,0.58) 74%, rgba(19,99,242,0.78) 100%)",
            }}
            animate={
              active || aiSpeaking
                ? { opacity: [0.74, 1, 0.82], scale: [0.97, 1.04, 0.985] }
                : { opacity: [0.68, 0.76, 0.68], scale: [0.99, 1.01, 0.99] }
            }
            transition={{ duration: active || aiSpeaking ? 1 : 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-[6%] left-[6%] right-[6%] h-[45%] rounded-[50%] bg-[radial-gradient(90%_100%_at_50%_80%,rgba(14,111,245,0.95)_0%,rgba(43,157,255,0.46)_58%,rgba(43,157,255,0)_100%)] blur-[1px]"
            animate={active || aiSpeaking ? { opacity: [0.78, 1, 0.82], y: [1, -2, 1] } : { opacity: [0.7, 0.78, 0.7], y: [0, -1, 0] }}
            transition={{ duration: active || aiSpeaking ? 1.15 : 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(85%_55%_at_50%_18%,rgba(255,255,255,0.28),rgba(255,255,255,0)_72%)]" />
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(120%_120%_at_50%_100%,rgba(0,65,185,0.18),rgba(0,65,185,0)_56%)]" />
        </motion.div>
      </div>
    </div>
  );
}
