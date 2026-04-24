"use client";

import { motion } from "framer-motion";
import type { NABCSection } from "@/types/pitch";

const ORDER: NABCSection[] = ["need", "approach", "benefits", "competition"];

const LABEL: Record<NABCSection, string> = {
  need: "Need",
  approach: "Approach",
  benefits: "Benefits",
  competition: "Competition",
};

/** Live bar: done sections (25% each) + smooth partial fill from how much they have said in this take. */
function liveBarWidthPercent(liveHints: Record<NABCSection, boolean>, transcriptLength: number): number {
  const done = ORDER.filter((k) => liveHints[k]).length;
  const len = Math.max(0, transcriptLength);
  // Ease so the bar keeps moving as they add words, before the next keyword hits
  const ease = 1 - Math.exp(-len / 2000);
  // Cap partial segment so the bar nears but does not hit 100% until all four fire (or `complete` from parent)
  const partial = done < 4 ? ease * 0.98 : 0;
  return Math.min(100, ((done + partial) / ORDER.length) * 100);
}

export function NABCProgress({
  active,
  complete,
  /** Live monologue: which parts sound present in the running transcript (keyword hints) */
  liveHints,
  /** Pitch text length (monologue only) — drives smooth bar motion */
  liveTranscriptLength = 0,
  listeningLine,
}: {
  active: NABCSection;
  complete: boolean;
  liveHints?: Record<NABCSection, boolean> | null;
  liveTranscriptLength?: number;
  listeningLine?: boolean;
}) {
  const idx = ORDER.indexOf(active);
  const live = Boolean(liveHints);
  const barWidth = (() => {
    if (complete) return "100%";
    if (live && liveHints) {
      return `${liveBarWidthPercent(liveHints, liveTranscriptLength)}%`;
    }
    return `${((idx + 0.35) / ORDER.length) * 100}%`;
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>NABC progress</span>
        <span>
          {live
            ? complete
              ? "All four touched"
              : listeningLine === false
                ? "From your pitch"
                : "Listening"
            : complete
              ? "Complete"
              : `${LABEL[active]} phase`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400"
          initial={false}
          animate={{ width: barWidth }}
          transition={{ type: "spring", stiffness: 70, damping: 22, mass: 0.6 }}
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {ORDER.map((key, i) => {
          const detected = live && liveHints ? liveHints[key] : false;
          const state = live
            ? detected
              ? "done"
              : i === idx
                ? "active"
                : "todo"
            : complete || i < idx
              ? "done"
              : i === idx
                ? "active"
                : "todo";
          return (
            <div
              key={key}
              className={`rounded-lg border px-2 py-2 text-center text-[11px] font-medium ${
                state === "done"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                  : state === "active"
                    ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-100"
                    : "border-black/10 bg-black/[0.02] text-zinc-500 dark:border-white/10 dark:bg-white/[0.02]"
              }`}
            >
              {live && detected ? "✓ " : ""}
              {LABEL[key]}
            </div>
          );
        })}
      </div>
      {live ? (
        <p className="text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
          Hints from your words — not a score. Try to cover all four before time is up.
        </p>
      ) : null}
    </div>
  );
}
