"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ScoreFeedback } from "@/types/pitch";
import { NABCProgress } from "./NABCProgress";
import { ScoreMeters } from "./ScoreMeters";
import type { NABCSection } from "@/types/pitch";

export function AnalysisDashboard({
  section,
  feedback,
  typing,
  complete,
  liveMonologue,
  nabcLiveHints,
  nabcTranscriptLength,
  nabcListening,
}: {
  section: NABCSection;
  feedback: ScoreFeedback | null;
  typing: boolean;
  complete: boolean;
  liveMonologue?: boolean;
  nabcLiveHints?: Record<NABCSection, boolean> | null;
  /** Monologue text length (pitch only) for smooth NABC bar motion */
  nabcTranscriptLength?: number;
  nabcListening?: boolean;
}) {
  return (
    <aside className="flex h-auto min-h-0 w-full flex-col gap-5 overflow-hidden border-l border-black/10 bg-white/55 p-5 dark:border-white/10 dark:bg-[rgba(8,12,19,0.7)] lg:h-full">
      <div className="shrink-0">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Analysis</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">
          {liveMonologue
            ? "A light, live read on NABC as you go—so you are never guessing in silence. Scores come after the debrief."
            : "Investor-style signal, not cheerleading."}
        </p>
      </div>

      <div className="shrink-0">
        <NABCProgress
          active={section}
          complete={complete}
          liveHints={liveMonologue ? (nabcLiveHints ?? null) : null}
          liveTranscriptLength={nabcTranscriptLength ?? 0}
          listeningLine={nabcListening !== false}
        />
      </div>

      <div className="shrink-0 rounded-xl border border-black/10 bg-white/72 p-4 dark:border-white/10 dark:bg-[#111722]">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Scores</span>
          {typing ? (
            <span className="text-[11px] text-sky-600 dark:text-sky-300/80">Coach is thinking…</span>
          ) : null}
        </div>
        {feedback ? (
          <>
            <ScoreMeters
              clarity={feedback.clarity}
              specificity={feedback.specificity}
              strength={feedback.strength}
            />
            {feedback.needsFollowup && feedback.followupReason ? (
              <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-100/55 px-3 py-2 text-[11px] leading-snug text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100/90">
                <span className="font-semibold text-amber-700 dark:text-amber-200/90">Focus: </span>
                {feedback.followupReason}
              </p>
            ) : null}
            {feedback.progressInsights?.length ? (
              <div className="mt-3 rounded-lg border border-sky-400/30 bg-sky-100/60 px-3 py-2 dark:border-sky-400/25 dark:bg-sky-400/10">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-200/80">
                  Session learning
                </p>
                <ul className="list-disc space-y-1 pl-4 text-[11px] font-medium leading-snug text-sky-700 dark:text-sky-100/90">
                  {feedback.progressInsights.map((line, i) => (
                    <li key={`${i}-${line.slice(0, 24)}`} className="break-words">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : liveMonologue ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-300">
            Friday is not scoring mid-pitch. You will get a full report after the delivery debrief.
          </p>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-300">
            Submit an answer to see clarity, specificity, and strength scores.
          </p>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-black/10 bg-white/72 p-4 dark:border-white/10 dark:bg-[#111722]">
        <h3 className="shrink-0 text-xs font-semibold text-zinc-600 dark:text-zinc-300">Feedback</h3>
        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 text-sm font-medium leading-relaxed text-zinc-700 dark:text-zinc-200">
          <AnimatePresence mode="popLayout">
            {feedback?.bullets?.length ? (
              feedback.bullets.map((b, i) => (
                <motion.div
                  key={`${b}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] text-zinc-700 dark:border-white/10 dark:bg-[#0a0e16] dark:text-zinc-200"
                >
                  {b}
                </motion.div>
              ))
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-300">
                Sharp critique will appear here after each answer.
              </p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
