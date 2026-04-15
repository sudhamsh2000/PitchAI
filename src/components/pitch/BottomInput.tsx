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
}) {
  return (
    <div className="border-t border-white/10 bg-black/45 px-5 py-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Your answer (voice or text)
            </label>
            <textarea
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              rows={3}
              disabled={disabled}
              placeholder={placeholder ?? "Speak or type a concrete answer with specifics…"}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none ring-0 placeholder:text-zinc-600 focus:border-cyan-400/40"
            />
            {modeNote ? <p className="text-[11px] leading-relaxed text-zinc-500">{modeNote}</p> : null}
            {liveSession ? (
              <p className="text-[11px] text-cyan-200/80">
                Live mode is automatic: speak your answer and it submits when you pause.
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-stretch">
            <div className="flex items-center gap-3">
              <motion.button
                type="button"
                disabled={disabled}
                onClick={onMicToggle}
                whileTap={{ scale: 0.96 }}
                className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border text-xs font-semibold transition ${
                  recording
                    ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-50 animate-mic-glow"
                    : "border-white/10 bg-white/5 text-zinc-200 hover:border-cyan-400/40"
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
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 text-sm font-semibold text-black disabled:opacity-40"
              >
                Submit answer
              </motion.button>
            ) : (
              <div className="rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-3 text-center text-xs font-medium text-cyan-100">
                Auto-submit enabled
              </div>
            )}
          </div>
        </div>
        <p className="text-[11px] text-zinc-500">
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
