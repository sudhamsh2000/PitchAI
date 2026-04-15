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
  premiumVoice,
  onPremiumVoiceChange,
  premiumVoiceName,
  onPremiumVoiceNameChange,
  busy,
  minChars,
  error,
}: {
  mode: PitchMode;
  pitchBrief: string;
  onBriefChange: (v: string) => void;
  onModeChange: (m: PitchMode) => void;
  onStart: () => void;
  liveSession: boolean;
  onLiveSessionChange: (v: boolean) => void;
  premiumVoice: boolean;
  onPremiumVoiceChange: (v: boolean) => void;
  premiumVoiceName: string;
  onPremiumVoiceNameChange: (v: string) => void;
  busy: boolean;
  minChars: number;
  error?: string | null;
}) {
  const ready = pitchBrief.trim().length >= minChars;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-10">
      <div className="text-center">
        <p className="mx-auto mb-3 inline-flex rounded-full border border-cyan-400/35 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-200">
          UI v2
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          PITCH<span className="text-cyan-300">AI</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">AI Voice NABC Pitch Coach</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <h2 className="text-2xl font-semibold tracking-tight text-white">What are you pitching?</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Describe your company, product, customer, and stage. The coach uses this for every question so you do not
          repeat the basics.
        </p>
        <div className="mt-4 grid gap-2 text-[11px] text-zinc-500 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Need: who hurts and why now</div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">Approach: how you solve it</div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            Benefits + Competition: why you win
          </div>
        </div>
      </div>

      <label className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Pitch context</span>
        <span className="text-[11px] text-zinc-500/80">
          Suggestion: generate pitch context using any preferred LLM, then paste and refine it here.
        </span>
        <textarea
          value={pitchBrief}
          onChange={(e) => onBriefChange(e.target.value)}
          rows={8}
          disabled={busy}
          placeholder={`Example: "B2B SaaS for dental clinics that automates insurance claims. We're pre-seed, 4 pilots, $400 ARPU, selling to office managers in the US Midwest."`}
          className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-400/40"
        />
        <span className={`text-[11px] ${ready ? "text-emerald-300/80" : "text-zinc-500"}`}>
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
              className={`rounded-xl border px-3 py-3 text-left transition ${
                active
                  ? "border-cyan-400/40 bg-cyan-500/10"
                  : "border-white/10 bg-black/20 hover:border-cyan-400/30"
              }`}
            >
              <p className={`text-xs font-semibold ${active ? "text-cyan-100" : "text-zinc-200"}`}>{m.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{m.hint}</p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Live session</p>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            Speak naturally, get live scoring updates, and auto-advance to the next question.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onLiveSessionChange(!liveSession)}
          disabled={busy}
          className={`relative h-7 w-12 rounded-full border transition ${
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

      {premiumVoice ? (
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">Premium voice style</p>
            <p className="text-[11px] leading-relaxed text-zinc-500">
              Pick the tone you like best for the AI coach.
            </p>
          </div>
          <select
            value={premiumVoiceName}
            disabled={busy}
            onChange={(e) => onPremiumVoiceNameChange(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-cyan-400/50"
          >
            <option value="alloy">Alloy (balanced)</option>
            <option value="verse">Verse (warm)</option>
            <option value="calm">Calm</option>
            <option value="aria">Aria</option>
          </select>
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Natural voice (Premium)</p>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            Uses neural TTS for a friendly, human-like coach voice. Needs OPENAI_API_KEY.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onPremiumVoiceChange(!premiumVoice)}
          disabled={busy}
          className={`relative h-7 w-12 rounded-full border transition ${
            premiumVoice ? "border-cyan-400/60 bg-cyan-500/20" : "border-white/10 bg-white/5"
          }`}
          aria-pressed={premiumVoice}
          aria-label="Toggle premium voice"
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
              premiumVoice ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>

      <motion.button
        type="button"
        disabled={!ready || busy}
        whileTap={{ scale: 0.98 }}
        onClick={onStart}
        className="h-12 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 text-sm font-semibold text-black shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:opacity-40"
      >
        {busy ? "Starting coach…" : "Start pitch session"}
      </motion.button>

      {error ? (
        <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </div>
      ) : null}

      <p className="text-center text-[11px] leading-relaxed text-zinc-600">
        Tip: if Start fails with a key error, set{" "}
        <span className="rounded bg-white/5 px-1 font-mono text-zinc-400">OPENROUTER_API_KEY</span> or{" "}
        <span className="rounded bg-white/5 px-1 font-mono text-zinc-400">OPENAI_API_KEY</span> in{" "}
        <span className="rounded bg-white/5 px-1 font-mono text-zinc-400">.env</span> /{" "}
        <span className="rounded bg-white/5 px-1 font-mono text-zinc-400">.env.local</span>, then restart{" "}
        <span className="rounded bg-white/5 px-1 font-mono text-zinc-400">npm run dev</span>.
      </p>
    </div>
  );
}
