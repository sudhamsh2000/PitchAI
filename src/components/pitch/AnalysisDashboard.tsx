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
}: {
  section: NABCSection;
  feedback: ScoreFeedback | null;
  typing: boolean;
  complete: boolean;
}) {
  return (
    <aside className="flex h-full flex-col gap-5 border-l border-white/10 bg-black/30 p-5">
      <div>
        <h2 className="text-sm font-semibold text-white">Analysis</h2>
        <p className="mt-1 text-xs text-zinc-500">Investor-style signal, not cheerleading.</p>
      </div>

      <NABCProgress active={section} complete={complete} />

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-300">Scores</span>
          {typing ? (
            <span className="text-[11px] text-cyan-300/80">Coach is thinking…</span>
          ) : null}
        </div>
        {feedback ? (
          <ScoreMeters
            clarity={feedback.clarity}
            specificity={feedback.specificity}
            strength={feedback.strength}
          />
        ) : (
          <p className="text-xs text-zinc-500">
            Submit an answer to see clarity, specificity, and strength scores.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <h3 className="text-xs font-medium text-zinc-300">Feedback</h3>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-200">
          <AnimatePresence mode="popLayout">
            {feedback?.bullets?.length ? (
              feedback.bullets.map((b, i) => (
                <motion.div
                  key={`${b}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-[13px] text-zinc-200"
                >
                  {b}
                </motion.div>
              ))
            ) : (
              <p className="text-xs text-zinc-500">
                Sharp critique will appear here after each answer.
              </p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
