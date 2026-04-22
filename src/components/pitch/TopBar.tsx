"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { PITCH_MODES } from "@/lib/modes";
import type { PitchMode } from "@/types/pitch";

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
  onOpenReports,
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
  /** Setup screen: open saved analysis reports */
  onOpenReports?: () => void;
}) {
  if (compact) {
    return (
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-black/20 px-5 py-3 backdrop-blur-xl">
        <Link href="/" className="text-sm font-semibold tracking-tight text-white">
          PITCH<span className="text-cyan-300">AI</span>
        </Link>
        <div className="flex items-center gap-3">
          {onOpenReports ? (
            <button
              type="button"
              onClick={onOpenReports}
              className="text-xs font-medium text-cyan-300/90 hover:text-cyan-200"
            >
              Analysis reports
            </button>
          ) : null}
          <span className="text-xs text-zinc-500">Setup</span>
        </div>
      </header>
    );
  }

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-black/20 px-5 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm font-semibold tracking-tight text-white">
          PITCH<span className="text-cyan-300">AI</span>
        </Link>
        <span className="hidden text-xs text-zinc-500 sm:inline">NABC voice coach</span>
      </div>

      <div className="flex items-center gap-3">
        <label className="hidden items-center gap-2 text-xs text-zinc-400 sm:flex">
          <span>Mode</span>
          <select
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-cyan-400/50"
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
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-cyan-400/40 hover:text-white"
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
            className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-100 hover:border-rose-400/50 disabled:opacity-40"
          >
            {endSessionBusy ? "Ending…" : "End session"}
          </motion.button>
        ) : null}

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onRestart}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-cyan-400/40 hover:text-white"
        >
          Restart session
        </motion.button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-xs font-semibold text-white">
          You
        </div>
      </div>
    </header>
  );
}
