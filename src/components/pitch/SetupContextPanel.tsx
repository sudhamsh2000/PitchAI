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
  liveSession,
  onLiveSessionChange,
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
  liveSession: boolean;
  onLiveSessionChange: (v: boolean) => void;
  busy: boolean;
  minChars: number;
  error?: string | null;
  onViewReports?: () => void;
}) {
  const ready = pitchBrief.trim().length >= minChars;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2 pt-3 sm:px-5 sm:pt-4">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-4">
          {error ? (
            <div className="sticky top-0 z-10 rounded-lg border border-rose-500/35 bg-rose-950/95 px-3 py-2.5 text-xs leading-snug text-rose-50 shadow-lg backdrop-blur-sm">
              {error}
            </div>
          ) : null}
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              PITCH<span className="text-cyan-300">AI</span>
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500">AI Voice NABC Pitch Coach</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">Set up your pitch session</h2>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  ready ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-white/5 text-zinc-400"
                }`}
              >
                {ready ? "Ready to start" : "Add a bit more context"}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-snug text-zinc-500 sm:text-sm">
              Share your startup context once. Then pick a mode and start the voice interview.
            </p>
            <div className="mt-2 grid gap-1.5 text-[10px] text-zinc-500 sm:grid-cols-3">
              <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">1) Add startup context</div>
              <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">2) Pick coach mode</div>
              <div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">3) Start live session</div>
            </div>
            {onViewReports ? (
              <button
                type="button"
                onClick={onViewReports}
                className="mt-2 w-full rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:border-cyan-400/50 hover:bg-cyan-500/15 sm:text-sm"
              >
                View my analysis reports
              </button>
            ) : null}
          </div>

          <label className="flex min-h-0 flex-col gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Pitch context</span>
            <span className="text-[10px] leading-snug text-zinc-500/80">
              Paste context here (you can expand the box — it scrolls inside).
            </span>
            <textarea
              value={pitchBrief}
              onChange={(e) => onBriefChange(e.target.value)}
              rows={4}
              disabled={busy}
              placeholder={`Example: "B2B SaaS for dental clinics that automates insurance claims. We're pre-seed, 4 pilots, $400 ARPU…"`}
              className="max-h-[min(220px,32svh)] min-h-[88px] w-full resize-y overflow-y-auto rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-400/40"
            />
            <span className={`text-[10px] ${ready ? "text-emerald-300/80" : "text-zinc-500"}`}>
              {pitchBrief.trim().length}/{minChars}+ characters to start
            </span>
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            {PITCH_MODES.map((m) => {
              const active = m.id === mode;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={busy}
                  onClick={() => onModeChange(m.id)}
                  className={`rounded-lg border px-2.5 py-2 text-left transition sm:px-3 sm:py-2.5 ${
                    active
                      ? "border-cyan-400/40 bg-cyan-500/10"
                      : "border-white/10 bg-black/20 hover:border-cyan-400/30"
                  }`}
                >
                  <p className={`text-[11px] font-semibold sm:text-xs ${active ? "text-cyan-100" : "text-zinc-200"}`}>
                    {m.label}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-zinc-500 sm:line-clamp-none">{m.hint}</p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white sm:text-sm">Live session</p>
              <p className="text-[10px] leading-snug text-zinc-500">
                Voice + auto-advance between questions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onLiveSessionChange(!liveSession)}
              disabled={busy}
              className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
                liveSession ? "border-cyan-400/60 bg-cyan-500/20" : "border-white/10 bg-white/5"
              }`}
              aria-pressed={liveSession}
              aria-label="Toggle live session"
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                  liveSession ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-black/35 px-4 py-3 backdrop-blur-sm sm:px-5">
        <div className="mx-auto w-full max-w-4xl space-y-2">
          <motion.button
            type="button"
            disabled={!ready || busy}
            whileTap={{ scale: 0.98 }}
            onClick={onStart}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 text-sm font-semibold text-black shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:opacity-40"
          >
            {busy ? "Starting coach…" : "Start pitch session"}
          </motion.button>

          <p className="text-center text-[10px] leading-relaxed text-zinc-600">
            Tip: set{" "}
            <span className="rounded bg-white/5 px-1 font-mono text-zinc-400">OPENROUTER_API_KEY</span> or{" "}
            <span className="rounded bg-white/5 px-1 font-mono text-zinc-400">OPENAI_API_KEY</span> in{" "}
            <span className="rounded bg-white/5 px-1 font-mono text-zinc-400">.env.local</span> if the coach fails.
          </p>
        </div>
      </div>
    </div>
  );
}
