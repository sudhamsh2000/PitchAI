"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { PITCH_MODES } from "@/lib/modes";
import type { PitchMode, SessionPacingMode } from "@/types/pitch";

export function TopBar({
  mode = "investor",
  onModeChange = () => {},
  onRestart = () => {},
  onEditPitch,
  showEditPitch,
  disableMode,
  compact,
  onEndSession,
  endSessionBusy,
  disableEndSession,
  onTestVoice,
  testVoiceBusy,
  onOpenReports,
  liveSession,
  livePaused,
  onToggleLivePause,
  remainingSeconds,
  /** While > 0, pitch countdown is paused during Friday’s intro (same wall clock as parent). */
  introGraceSecondsLeft,
  awaitingStart,
  pacingMode,
}: {
  mode?: PitchMode;
  onModeChange?: (m: PitchMode) => void;
  onRestart?: () => void;
  onEditPitch?: () => void;
  showEditPitch?: boolean;
  disableMode?: boolean;
  /** Logo + home only (pitch context step) */
  compact?: boolean;
  onEndSession?: () => void;
  endSessionBusy?: boolean;
  disableEndSession?: boolean;
  onTestVoice?: () => void;
  testVoiceBusy?: boolean;
  /** Setup screen: open saved analysis reports */
  onOpenReports?: () => void;
  liveSession?: boolean;
  livePaused?: boolean;
  onToggleLivePause?: () => void;
  /** Omit or pass `null` for practice sessions with no countdown */
  remainingSeconds?: number | null;
  introGraceSecondsLeft?: number | null;
  /** Live: session open but pitch timer not started (before Start session now). */
  awaitingStart?: boolean;
  pacingMode?: SessionPacingMode;
}) {
  const timed = remainingSeconds != null && Number.isFinite(remainingSeconds);
  const mins = Math.floor(((remainingSeconds as number) || 0) / 60);
  const secs = ((remainingSeconds as number) || 0) % 60;
  const timerLabel = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const pacingLabel =
    pacingMode === "urgent" ? "Need to speed up" : pacingMode === "compressed" ? "Compressed mode" : "On track";
  if (compact) {
    return (
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-black/10 bg-white/55 px-5 py-3 backdrop-blur-xl dark:border-white/12 dark:bg-[rgba(8,12,19,0.82)]">
        <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
          PITCH<span className="bg-gradient-to-r from-sky-600 to-pink-500 bg-clip-text text-transparent dark:from-sky-300 dark:to-pink-300">AI</span>
        </Link>
        <div className="flex items-center gap-3">
          {onOpenReports ? (
            <button
              type="button"
              onClick={onOpenReports}
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              Analysis reports
            </button>
          ) : null}
          <span className="text-xs text-zinc-500 dark:text-zinc-300">Setup</span>
        </div>
      </header>
    );
  }

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/10 bg-white/60 px-4 py-2 backdrop-blur-xl dark:border-white/12 dark:bg-[rgba(8,12,19,0.82)]">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
          PITCH<span className="bg-gradient-to-r from-sky-600 to-pink-500 bg-clip-text text-transparent dark:from-sky-300 dark:to-pink-300">AI</span>
        </Link>
        <span className="hidden rounded-full border border-black/10 bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 sm:inline dark:border-white/15 dark:bg-[#111722] dark:text-zinc-200">
          {PITCH_MODES.find((m) => m.id === mode)?.label ?? "Mode"}
        </span>
        <span className={`hidden rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:inline ${
          livePaused
            ? "border-amber-300/60 bg-amber-100 text-amber-700"
            : "border-sky-300/60 bg-sky-100 text-sky-700"
        }`}>
          {livePaused ? "Paused" : "Live"}
        </span>
        {introGraceSecondsLeft != null && introGraceSecondsLeft > 0 ? (
          <span className="hidden rounded-full border border-violet-300/55 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800 sm:inline dark:border-violet-400/35 dark:bg-violet-500/12 dark:text-violet-100">
            Intro · timer in {introGraceSecondsLeft}s
          </span>
        ) : null}
        {awaitingStart ? (
          <span className="hidden max-w-[14rem] rounded-full border border-amber-300/50 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900 sm:inline dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100/95">
            Ready when you are — timer starts on Start
          </span>
        ) : timed ? (
          <span className="hidden rounded-full border border-black/10 bg-white/70 px-2 py-0.5 text-[10px] font-mono font-semibold text-zinc-600 sm:inline dark:border-white/15 dark:bg-[#111722] dark:text-zinc-200">
            {timerLabel} left
          </span>
        ) : (
          <span className="hidden rounded-full border border-emerald-300/50 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 sm:inline dark:border-emerald-400/35 dark:bg-emerald-500/10 dark:text-emerald-100">
            Practice · no timer
          </span>
        )}
        {timed && !awaitingStart && !(introGraceSecondsLeft != null && introGraceSecondsLeft > 0) ? (
          <span className="hidden rounded-full border border-black/10 bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 sm:inline dark:border-white/15 dark:bg-[#111722] dark:text-zinc-200">
            {pacingLabel}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <label className="hidden items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 md:flex">
          <span>Mode</span>
          <select
            className="rounded-lg border border-black/10 bg-white/70 px-2 py-1.5 text-xs text-zinc-800 outline-none focus:border-sky-500/50 dark:border-white/12 dark:bg-[#111722] dark:text-zinc-100 dark:focus:border-sky-300/45"
            value={mode}
            disabled={disableMode}
            onChange={(e) => onModeChange(e.target.value as PitchMode)}
          >
            {PITCH_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        {showEditPitch && onEditPitch ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onEditPitch}
            className="hidden rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-sky-500/35 hover:text-zinc-900 dark:border-white/12 dark:bg-[#111722] dark:text-zinc-200 dark:hover:border-sky-300/35 dark:hover:text-white md:inline-flex"
          >
            Change pitch idea
          </motion.button>
        ) : null}

        {onEndSession ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={disableEndSession || endSessionBusy}
            onClick={onEndSession}
            className="rounded-lg border border-black/15 bg-white/75 px-2.5 py-1 text-[11px] font-medium text-zinc-800 hover:border-sky-500/35 disabled:opacity-40 dark:border-white/18 dark:bg-[#141b29] dark:text-zinc-100 dark:hover:border-sky-300/40"
          >
            {endSessionBusy ? "Ending…" : "End session"}
          </motion.button>
        ) : null}
        {onTestVoice ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={testVoiceBusy}
            onClick={onTestVoice}
            className="rounded-lg border border-black/15 bg-white/75 px-2.5 py-1 text-[11px] font-medium text-zinc-800 hover:border-sky-500/35 disabled:opacity-40 dark:border-white/18 dark:bg-[#141b29] dark:text-zinc-100 dark:hover:border-sky-300/40"
          >
            {testVoiceBusy ? "Testing…" : "Test voice"}
          </motion.button>
        ) : null}

        {liveSession && onToggleLivePause ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onToggleLivePause}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
              livePaused
                ? "border-emerald-400/40 bg-emerald-100 text-emerald-700 dark:border-emerald-300/40 dark:bg-emerald-400/12 dark:text-emerald-100"
                : "border-amber-400/40 bg-amber-100 text-amber-700 dark:border-amber-300/40 dark:bg-amber-400/12 dark:text-amber-100"
            }`}
          >
            {livePaused ? "Resume live" : "Pause live"}
          </motion.button>
        ) : null}

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onRestart}
          className="rounded-lg border border-black/10 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:border-sky-500/35 hover:text-zinc-900 dark:border-white/12 dark:bg-[#111722] dark:text-zinc-200 dark:hover:border-sky-300/35 dark:hover:text-white"
        >
          Restart
        </motion.button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-gradient-to-br from-white to-zinc-200 text-xs font-semibold text-zinc-800 dark:border-white/20 dark:bg-gradient-to-br dark:from-white/10 dark:to-zinc-300/10 dark:text-white">
          You
        </div>
      </div>
    </header>
  );
}
