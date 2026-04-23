"use client";

import { motion } from "framer-motion";
import { Waveform } from "./Waveform";

export function BottomInput({
  draft,
  onDraftChange,
  onSend,
  recording,
  onMicToggle,
  micSupported,
  disabled,
  placeholder,
  modeNote,
  liveSession,
  livePaused,
}: {
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  recording: boolean;
  onMicToggle: () => void;
  micSupported: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Shown under the textarea (e.g. current mode behavior) — not used as textarea placeholder */
  modeNote?: string;
  liveSession?: boolean;
  livePaused?: boolean;
}) {
  return (
    <div className="border-t border-black/10 bg-white/70 px-5 py-4 backdrop-blur-xl dark:border-white/12 dark:bg-[rgba(8,12,19,0.86)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        {liveSession && !micSupported ? (
          <div className="rounded-lg border border-amber-400/35 bg-amber-100/65 px-3 py-2 text-[11px] leading-snug text-amber-800 dark:border-white/20 dark:bg-white/[0.07] dark:text-zinc-100">
            <span className="font-semibold text-amber-800 dark:text-zinc-100">Live dictation isn’t available in this browser. </span>
            Type your answer in the box (Chrome or Edge on desktop supports hands‑free live mode).
          </div>
        ) : null}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
              Your answer (voice or text)
            </label>
            <textarea
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              rows={3}
              disabled={disabled}
              placeholder={placeholder ?? "Speak or type a concrete answer with specifics…"}
              className="w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-zinc-800 outline-none ring-0 placeholder:text-zinc-500 focus:border-sky-500/35 dark:border-white/12 dark:bg-[#0a0e16] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-sky-300/45"
            />
            {modeNote ? <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500">{modeNote}</p> : null}
            {liveSession && micSupported ? (
              <p className="text-[11px] font-medium text-sky-700 dark:text-sky-200/80">
                {livePaused
                  ? "Live mode is paused. Resume when you are ready."
                  : "Live mode: speak your answer; it submits after a short pause. Or type anytime."}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-stretch">
            <div className="flex items-center gap-3">
              <motion.button
                type="button"
                disabled={disabled || Boolean(livePaused)}
                onClick={onMicToggle}
                whileTap={{ scale: 0.96 }}
                className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border text-xs font-semibold transition ${
                  recording
                    ? "border-sky-400/50 bg-sky-100 text-sky-700 animate-mic-glow dark:border-sky-300/40 dark:bg-sky-400/15 dark:text-white"
                    : "border-black/10 bg-white text-zinc-700 hover:border-sky-400/35 dark:border-white/12 dark:bg-[#111722] dark:text-zinc-200 dark:hover:border-sky-300/35"
                } ${!micSupported ? "opacity-80" : ""}`}
                title={
                  micSupported
                    ? recording
                      ? "Stop recording"
                      : "Start voice dictation"
                    : "Tap for dictation help (this browser may not support Web Speech)"
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
                  <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                  <path d="M12 19v3" />
                  <path d="M8 22h8" />
                </svg>
              </motion.button>
              <Waveform active={recording} />
            </div>

            {!liveSession ? (
              <motion.button
                type="button"
                disabled={disabled || !draft.trim()}
                whileTap={{ scale: 0.98 }}
                onClick={onSend}
                className="rounded-xl bg-gradient-to-r from-blue-500 via-blue-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                Submit answer
              </motion.button>
            ) : (
              <div
                className={`rounded-xl border px-4 py-3 text-center text-xs font-semibold ${
                  livePaused
                    ? "border-amber-400/40 bg-amber-100 text-amber-700 dark:border-amber-300/35 dark:bg-amber-400/14 dark:text-amber-100"
                    : "border-sky-400/40 bg-sky-100 text-sky-700 dark:border-sky-300/35 dark:bg-sky-400/14 dark:text-sky-100"
                }`}
              >
                {livePaused ? "Live paused" : "Auto-submit enabled"}
              </div>
            )}
          </div>
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
          {micSupported
            ? recording
              ? "Listening… speak clearly. Tap the mic again to stop."
              : "Tip: tap the mic to dictate, or type. Chrome / Edge on desktop work best."
            : "Safari often cannot run Web Speech dictation. Use Chrome or Edge on desktop, open via localhost or HTTPS, or type your answers."}
        </p>
      </div>
    </div>
  );
}
