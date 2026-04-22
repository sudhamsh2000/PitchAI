"use client";

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
  naturalVoice,
  naturalVoiceName,
}: {
  messages: PitchMessage[];
  typing: boolean;
  interim: string;
  liveSession?: boolean;
  liveActive?: boolean;
  naturalVoice?: boolean;
  naturalVoiceName?: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-black/20">
      <div className="shrink-0 border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Conversation</h2>
            <p className="text-xs text-zinc-500">Voice-first interview with live transcript.</p>
          </div>
          {liveSession ? (
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                liveActive
                  ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100"
                  : "border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              {liveActive ? "Listening live" : "Live session"}
            </span>
          ) : null}
        </div>
      </div>

      {liveSession || liveActive ? (
        <div className="shrink-0 border-b border-white/5 px-5 pb-4 pt-3">
          <div className="flex flex-wrap items-start justify-center gap-4">
            <CircularSpectrum active={Boolean(liveActive)} />
            <LiveSelfView active={Boolean(liveSession)} />
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-4 [scrollbar-gutter:stable]">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
              <p className="text-xs text-zinc-500">Your coach question will appear here once the session starts.</p>
            </div>
          ) : null}
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-lg ${
                    m.role === "user"
                      ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-50"
                      : "border-white/10 bg-white/[0.04] text-zinc-100"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
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
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] text-zinc-200 hover:border-cyan-400/40"
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
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-zinc-400">
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

      {interim ? (
        <div className="shrink-0 border-t border-white/10 bg-black/30 px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Live transcript
          </p>
          <p className="mt-1 text-sm text-cyan-100/90">{interim}</p>
        </div>
      ) : null}
    </div>
  );
}

function CircularSpectrum({ active }: { active: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-5">
      <div className="relative mx-auto h-40 w-40">
        <motion.div
          className="absolute inset-0 rounded-full bg-cyan-400/20 blur-2xl"
          animate={
            active
              ? { scale: [0.9, 1.12, 0.95, 1.06, 0.9], opacity: [0.35, 0.75, 0.45, 0.65, 0.35] }
              : { scale: 0.9, opacity: 0.25 }
          }
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.svg
          viewBox="0 0 160 160"
          className="absolute inset-0"
          animate={active ? { rotate: [0, 360] } : { rotate: 0 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        >
          <defs>
            <linearGradient id="fridaySpectrum" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(69, 229, 255, 0.95)" />
              <stop offset="55%" stopColor="rgba(84, 255, 249, 0.82)" />
              <stop offset="100%" stopColor="rgba(89, 145, 255, 0.95)" />
            </linearGradient>
            <filter id="fridayGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <motion.circle
            cx="80"
            cy="80"
            r="56"
            fill="none"
            stroke="url(#fridaySpectrum)"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#fridayGlow)"
            strokeDasharray="126 52 62 88 142 74"
            animate={
              active
                ? {
                    strokeDashoffset: [0, -230],
                    pathLength: [0.96, 1, 0.97, 0.99, 0.96],
                    scale: [0.985, 1.04, 0.99, 1.025, 0.985],
                    opacity: [0.82, 1, 0.86, 0.95, 0.82],
                  }
                : {
                    strokeDashoffset: 0,
                    pathLength: 0.95,
                    scale: 0.985,
                    opacity: 0.6,
                  }
            }
            transition={{
              duration: active ? 2.4 : 0.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ transformOrigin: "80px 80px" }}
          />
          <motion.circle
            cx="80"
            cy="80"
            r="56"
            fill="none"
            stroke="rgba(116, 245, 255, 0.25)"
            strokeWidth="1.2"
            strokeDasharray="14 16"
            animate={
              active
                ? { strokeDashoffset: [0, 90], opacity: [0.2, 0.45, 0.2] }
                : { strokeDashoffset: 0, opacity: 0.16 }
            }
            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          />
        </motion.svg>
        <motion.div
          className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/35 bg-cyan-300/10"
          animate={active ? { scale: [0.92, 1.2, 0.95, 1.08, 0.92], opacity: [0.45, 0.9, 0.5, 0.75, 0.45] } : { scale: 0.92, opacity: 0.3 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <p className="mt-2 text-center text-[11px] text-zinc-500">
        {active ? "I’m listening… speak naturally." : "Live voice ready"}
      </p>
    </div>
  );
}
