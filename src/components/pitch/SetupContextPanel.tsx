"use client";

import { motion } from "framer-motion";
import type { PitchMode } from "@/types/pitch";
import { PITCH_MODES } from "@/lib/modes";

export function SetupContextPanel({
  mode,
  pitchBrief,
  onBriefChange,
  onModeChange,
  onStart,
  sessionLengthMinutes,
  onSessionLengthChange,
  busy,
  minChars,
  error,
  onViewReports,
}: {
  mode: PitchMode;
  pitchBrief: string;
  onBriefChange: (v: string) => void;
  onModeChange: (m: PitchMode) => void;
  onStart: () => void;
  sessionLengthMinutes: number;
  onSessionLengthChange: (minutes: number) => void;
  busy: boolean;
  minChars: number;
  error?: string | null;
  onViewReports?: () => void;
}) {
  const ready = pitchBrief.trim().length >= minChars;
  const lengthOptions = [1, 3, 5, 7, 10];
  const practiceSelected = sessionLengthMinutes === 0;
  const samplePitchOptions = [
    {
      id: "sell-pen",
      label: "Sell a pen",
      context:
        "I want to sell a pen that writes smoothly, never leaks, and feels premium but affordable. My target customers are students and office workers who use pens every day.",
    },
    {
      id: "sell-car",
      label: "Sell a car",
      context:
        "I want to sell a compact city car that is fuel-efficient, easy to park, and low maintenance. My target customers are first-time car buyers and daily commuters.",
    },
    {
      id: "sell-notebook",
      label: "Sell a notebook",
      context:
        "I want to sell a durable notebook with thick paper, clean design, and organized layouts for planning. My target customers are students, creators, and professionals.",
    },
    {
      id: "sell-water-bottle",
      label: "Sell a water bottle",
      context:
        "I want to sell a reusable water bottle that keeps drinks cold for long hours and is easy to carry. My target customers are gym-goers, office workers, and travelers.",
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden text-zinc-800 dark:text-zinc-100">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2 pt-3 sm:px-5 sm:pt-4">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2.5 sm:gap-3">
          {error ? (
            <div className="sticky top-0 z-10 rounded-lg border border-rose-400/45 bg-rose-50/95 px-3 py-2.5 text-xs leading-snug text-rose-700 shadow-lg backdrop-blur-sm dark:border-rose-500/35 dark:bg-rose-950/95 dark:text-rose-50">
              {error}
            </div>
          ) : null}
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              <span className="text-zinc-900 dark:text-white dark:[text-shadow:0_0_10px_rgba(255,255,255,0.28)]">PITCH</span>
              <span className="bg-gradient-to-r from-sky-600 to-pink-500 bg-clip-text text-transparent dark:from-sky-100 dark:to-pink-100 dark:[text-shadow:0_0_12px_rgba(144,205,255,0.35)]">AI</span>
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">AI Voice NABC Pitch Coach</p>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="mt-2 inline-flex items-center gap-2 rounded-full border border-sky-300/40 bg-white/80 px-3 py-1 text-[11px] font-medium text-sky-700 shadow-sm dark:border-sky-300/30 dark:bg-sky-400/10 dark:text-sky-100"
            >
              <motion.span
                animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-sky-300"
              />
              Hi, I&apos;m Friday - I&apos;ll coach your pitch live.
            </motion.div>
          </div>

          <div className="rounded-xl border border-black/10 bg-white/72 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:border-white/12 dark:bg-[rgba(12,16,24,0.76)] dark:shadow-[0_12px_28px_rgba(0,0,0,0.42)] sm:p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-lg">Set up your pitch session</h2>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  ready
                    ? "border-sky-300/40 bg-sky-50/85 text-sky-700 dark:border-sky-300/35 dark:bg-sky-400/12 dark:text-sky-100"
                    : "border-black/10 bg-white/70 text-zinc-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400"
                }`}
              >
                {ready ? "Ready to start" : "Add a bit more context"}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-snug text-zinc-600 dark:text-zinc-300 sm:text-sm">
              Share your startup context once. Then pick a mode and start the voice interview.
            </p>
            <div className="mt-2 grid gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-300 sm:grid-cols-3">
              <div className="rounded-md border border-black/10 bg-zinc-100/85 px-2 py-1.5 dark:border-white/10 dark:bg-[#111722]">1) Add startup context</div>
              <div className="rounded-md border border-black/10 bg-zinc-100/85 px-2 py-1.5 dark:border-white/10 dark:bg-[#111722]">2) Pick coach mode</div>
              <div className="rounded-md border border-black/10 bg-zinc-100/85 px-2 py-1.5 dark:border-white/10 dark:bg-[#111722]">3) Start session (live mode)</div>
            </div>
            {onViewReports ? (
              <button
                type="button"
                onClick={onViewReports}
                className="mt-2 w-full rounded-lg border border-sky-300/35 bg-gradient-to-r from-sky-100 to-pink-100/80 px-3 py-2 text-xs font-medium text-sky-700 transition hover:border-pink-300/50 hover:from-sky-100 hover:to-pink-100 sm:text-sm dark:border-sky-300/30 dark:bg-gradient-to-r dark:from-sky-400/10 dark:to-pink-400/10 dark:text-sky-100 dark:hover:border-pink-300/45 dark:hover:from-sky-300/15 dark:hover:to-pink-300/15"
              >
                View my analysis reports
              </button>
            ) : null}
          </div>

          <label className="flex min-h-0 flex-col gap-1 rounded-xl border border-black/10 bg-white/72 p-3 dark:border-white/12 dark:bg-[rgba(12,16,24,0.76)] sm:p-3.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Pitch context</span>
            <span className="text-[10px] leading-snug text-zinc-500 dark:text-zinc-300/90">
              Paste context — expand if needed; scrolls inside the box.
            </span>
            <select
              disabled={busy}
              defaultValue=""
              onChange={(e) => {
                const picked = samplePitchOptions.find((o) => o.id === e.target.value);
                if (!picked) return;
                onBriefChange(picked.context);
              }}
              className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-sm text-zinc-700 outline-none focus:border-sky-500/35 dark:border-white/12 dark:bg-[#0a0e16] dark:text-zinc-100 dark:focus:border-sky-300/45"
            >
              <option value="">Choose a simple sample pitch context (optional)</option>
              {samplePitchOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <textarea
              value={pitchBrief}
              onChange={(e) => onBriefChange(e.target.value)}
              rows={3}
              disabled={busy}
              placeholder={`Example: "B2B SaaS for dental clinics that automates insurance claims. We're pre-seed, 4 pilots, $400 ARPU…"`}
              className="max-h-[min(180px,28svh)] min-h-[72px] w-full resize-y overflow-y-auto rounded-lg border border-black/10 bg-zinc-50 px-2.5 py-2 text-sm text-zinc-800 outline-none placeholder:text-zinc-500 focus:border-sky-500/35 dark:border-white/12 dark:bg-[#0a0e16] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-sky-300/45"
            />
            <span className={`text-[10px] ${ready ? "text-emerald-600 dark:text-emerald-300/80" : "text-zinc-500 dark:text-zinc-500"}`}>
              {pitchBrief.trim().length}/{minChars}+ characters to start
            </span>
          </label>

          <div className="rounded-xl border border-black/10 bg-white/72 p-3 shadow-[0_6px_20px_rgba(0,0,0,0.06)] dark:border-white/12 dark:bg-[rgba(12,16,24,0.76)] sm:p-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">
                Coach mode & session length
              </p>
              <p className="hidden max-w-[18rem] text-[10px] leading-snug text-zinc-400 sm:inline dark:text-zinc-500">
                Pick a mode, then duration (timed NABC vs practice).
              </p>
            </div>

            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {PITCH_MODES.map((m) => {
                const active = m.id === mode;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={busy}
                    onClick={() => onModeChange(m.id)}
                    className={`rounded-lg border px-2.5 py-1.5 text-left transition sm:px-3 sm:py-2 ${
                      active
                        ? "border-sky-400/45 bg-gradient-to-r from-sky-100 to-pink-100/55 text-zinc-900 dark:border-sky-300/40 dark:bg-gradient-to-r dark:from-sky-400/10 dark:to-pink-400/10 dark:text-sky-100"
                        : "border-black/10 bg-zinc-100/85 hover:border-sky-300/35 dark:border-white/10 dark:bg-[#111722] dark:hover:border-sky-300/25"
                    }`}
                  >
                    <p className={`text-[11px] font-semibold sm:text-xs ${active ? "text-sky-700 dark:text-sky-100" : "text-zinc-700 dark:text-zinc-200"}`}>
                      {m.label}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-zinc-500 dark:text-zinc-300">{m.hint}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Time
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSessionLengthChange(0)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${
                      practiceSelected
                        ? "border-emerald-400/45 bg-emerald-50 text-emerald-800 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-100"
                        : "border-black/10 bg-zinc-100 text-zinc-600 hover:border-emerald-300/40 dark:border-white/10 dark:bg-black/20 dark:text-zinc-300"
                    }`}
                  >
                    No limit
                  </button>
                  {lengthOptions.map((minutes) => {
                    const active = minutes === sessionLengthMinutes;
                    return (
                      <button
                        key={minutes}
                        type="button"
                        disabled={busy}
                        onClick={() => onSessionLengthChange(minutes)}
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${
                          active
                            ? "border-sky-400/45 bg-sky-100 text-sky-700 dark:border-sky-300/40 dark:bg-sky-400/15 dark:text-sky-100"
                            : "border-black/10 bg-zinc-100 text-zinc-600 hover:border-sky-300/35 dark:border-white/10 dark:bg-black/20 dark:text-zinc-300"
                        }`}
                      >
                        {minutes} min
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="shrink-0 border-t border-black/10 bg-white/70 px-4 py-3 backdrop-blur-sm dark:border-white/12 dark:bg-[rgba(8,12,19,0.86)] sm:px-5">
        <div className="mx-auto w-full max-w-4xl space-y-2">
          <motion.button
            type="button"
            disabled={!ready || busy}
            whileTap={{ scale: 0.98 }}
            onClick={onStart}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-500 via-blue-500 to-sky-500 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:brightness-105 disabled:opacity-40"
          >
            {busy ? "Starting coach…" : "Start pitch session"}
          </motion.button>

          <p className="text-center text-[10px] leading-relaxed text-zinc-600 dark:text-zinc-300">
            Tip: set{" "}
            <span className="rounded bg-zinc-200/80 px-1 font-mono text-zinc-600 dark:bg-white/10 dark:text-zinc-100">OPENROUTER_API_KEY</span> or{" "}
            <span className="rounded bg-zinc-200/80 px-1 font-mono text-zinc-600 dark:bg-white/10 dark:text-zinc-100">OPENAI_API_KEY</span> in{" "}
            <span className="rounded bg-zinc-200/80 px-1 font-mono text-zinc-600 dark:bg-white/10 dark:text-zinc-100">.env.local</span> if the coach fails.
          </p>
        </div>
      </div>
    </div>
  );
}
