"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { SessionAnalysisReport } from "@/types/pitch";
import { loadSessionReports } from "@/lib/saved-session-reports";
import { PITCH_MODES } from "@/lib/modes";

export function ReportsLibraryModal({
  open,
  onClose,
  onOpenReport,
}: {
  open: boolean;
  onClose: () => void;
  onOpenReport: (r: SessionAnalysisReport) => void;
}) {
  const reports = useMemo(() => (open ? loadSessionReports() : []), [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-h-[min(85dvh,calc(100dvh-2rem))] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#07080b] p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">My analysis reports</h2>
            <p className="mt-1 text-xs text-zinc-500">Saved on this device from ended sessions.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-200 hover:border-white/20"
          >
            Close
          </button>
        </div>

        {reports.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
            No reports yet. End a coaching session to generate your first analysis.
          </p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => {
              const modeLabel = PITCH_MODES.find((m) => m.id === r.mode)?.label ?? r.mode;
              const when = new Date(r.createdAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              });
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onOpenReport(r)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:border-cyan-400/35 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white">{r.overallLabel}</span>
                      <span className="text-xs font-semibold text-cyan-300/90">{r.overallRating}/10</span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">{when}</p>
                    <p className="mt-1 line-clamp-2 text-[12px] text-zinc-400">{r.pitchBrief}</p>
                    <p className="mt-1 text-[10px] text-zinc-600">
                      {modeLabel} · {r.answerCount} answer{r.answerCount === 1 ? "" : "s"}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </motion.div>
    </div>
  );
}
