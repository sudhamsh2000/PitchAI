"use client";

import { motion } from "framer-motion";
import type { SessionAnalysisReport } from "@/types/pitch";
import { SessionReportPanel } from "./SessionReportPanel";

export function SessionReportModal({
  open,
  report,
  title,
  onClose,
}: {
  open: boolean;
  report: SessionAnalysisReport | null;
  title?: string;
  onClose: () => void;
}) {
  if (!open || !report) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center dark:bg-black/75">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-h-[min(92dvh,calc(100dvh-2rem))] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-black/10 bg-white/90 p-5 shadow-2xl shadow-black/15 dark:border-white/10 dark:bg-[#07080b] dark:shadow-cyan-500/10"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div />
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-black/10 bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-sky-400/35 dark:border-white/10 dark:bg-black/40 dark:text-zinc-200 dark:hover:border-white/20"
          >
            Close
          </button>
        </div>
        <SessionReportPanel report={report} title={title} />
      </motion.div>
    </div>
  );
}
