"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { PitchMessage } from "@/types/pitch";
import { speakText, stopSpeaking } from "@/hooks/useVoice";
import { speakPremiumText, stopPremiumSpeech } from "@/lib/tts-client";

export function ConversationPanel({
  messages,
  typing,
  interim,
  liveSession,
  liveActive,
  premiumVoice,
  premiumVoiceName,
  onVoiceError,
}: {
  messages: PitchMessage[];
  typing: boolean;
  interim: string;
  liveSession?: boolean;
  liveActive?: boolean;
  premiumVoice?: boolean;
  premiumVoiceName?: string;
  onVoiceError?: (message: string) => void;
}) {
  return (
    <div className="flex h-full flex-col bg-black/20">
      <div className="border-b border-white/10 px-5 py-4">
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

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {liveSession || liveActive ? <CircularSpectrum active={Boolean(liveActive)} /> : null}
        {messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
            <p className="text-xs text-zinc-500">Your coach question will appear here once the session starts.</p>
          </div>
        ) : null}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              layout
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
                    {m.role === "user" ? "You" : "Coach"}
                  </span>
                  {m.role === "assistant" ? (
                    <button
                      type="button"
                      onClick={() => {
                        stopSpeaking();
                        stopPremiumSpeech();
                        if (premiumVoice) {
                          void speakPremiumText(m.content, {
                            voice: premiumVoiceName,
                            onError: onVoiceError,
                          });
                        } else {
                          speakText(m.content);
                        }
                      }}
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
                      {premiumVoice ? "Play HD" : "Play"}
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

      {interim ? (
        <div className="border-t border-white/10 bg-black/30 px-5 py-3">
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
  const bars = Array.from({ length: 36 }, (_, i) => i);
  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.02] py-4">
      <div className="relative mx-auto h-32 w-32">
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/25 via-indigo-400/15 to-fuchsia-400/25 blur-xl"
          animate={active ? { scale: [0.9, 1.08, 0.95, 1.05, 0.9], opacity: [0.45, 0.75, 0.55, 0.7, 0.45] } : { scale: 0.9, opacity: 0.35 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-3 rounded-full border border-cyan-300/40"
          animate={active ? { scale: [0.95, 1.08, 0.98], opacity: [0.4, 0.9, 0.4] } : { scale: 0.95, opacity: 0.3 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-6 rounded-full border border-violet-300/35"
          animate={active ? { scale: [1, 0.88, 1], opacity: [0.25, 0.55, 0.25] } : { scale: 1, opacity: 0.2 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        {bars.map((i) => {
          const rotate = (360 / bars.length) * i;
          const delay = i * 0.03;
          return (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 block h-8 w-[2px] origin-bottom rounded-full bg-gradient-to-t from-cyan-500/25 via-cyan-300 to-violet-300"
              style={{ transform: `translate(-50%, -106%) rotate(${rotate}deg)` }}
              animate={
                active
                  ? { scaleY: [0.25, 1.1, 0.4, 1, 0.3], opacity: [0.35, 1, 0.6, 1, 0.35] }
                  : { scaleY: 0.2, opacity: 0.25 }
              }
              transition={{
                duration: 0.75,
                repeat: active ? Infinity : 0,
                delay,
                ease: "easeInOut",
              }}
            />
          );
        })}
        <motion.div
          className={`absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border ${
            active ? "border-cyan-200/80 bg-cyan-400/15" : "border-white/20 bg-white/5"
          }`}
          animate={active ? { scale: [0.95, 1.08, 0.95] } : { scale: 0.95 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <p className="mt-2 text-center text-[11px] text-zinc-500">
        {active ? "I’m listening… speak naturally." : "Live voice ready"}
      </p>
    </div>
  );
}
