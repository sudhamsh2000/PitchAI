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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-4 sm:items-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-h-[min(92dvh,calc(100dvh-2rem))] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#07080b] p-5 shadow-2xl shadow-cyan-500/10"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div />
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-200 hover:border-white/20"
          >
            Close
          </button>
        </div>
        <SessionReportPanel report={report} title={title} />
      </motion.div>
    </div>
  );
}
