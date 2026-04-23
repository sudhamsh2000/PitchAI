"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { SessionAnalysisReport } from "@/types/pitch";
import { deleteSessionReportById, loadSessionReports } from "@/lib/saved-session-reports";
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
  const [refreshKey, setRefreshKey] = useState(0);
  void refreshKey;
  const reports = open ? loadSessionReports() : [];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center dark:bg-black/70">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-h-[min(85dvh,calc(100dvh-2rem))] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-black/10 bg-white/90 p-5 shadow-2xl shadow-black/15 dark:border-white/10 dark:bg-[#07080b] dark:shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">My analysis reports</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">Saved on this device from ended sessions.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-black/10 bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-sky-400/35 dark:border-white/10 dark:bg-black/40 dark:text-zinc-200 dark:hover:border-white/20"
          >
            Close
          </button>
        </div>

        {reports.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/10 bg-white/75 px-4 py-8 text-center text-sm text-zinc-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-zinc-300">
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
                  <div className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-left transition hover:border-sky-400/35 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-cyan-400/35 dark:hover:bg-white/[0.05]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-white">{r.overallLabel}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-sky-700 dark:text-cyan-300/90">{r.overallRating}/10</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm("Delete this analysis report?")) return;
                            deleteSessionReportById(r.id);
                            setRefreshKey((k) => k + 1);
                          }}
                          className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 hover:border-rose-300 hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenReport(r)}
                      className="mt-1 block w-full text-left"
                    >
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-300">{when}</p>
                      <p className="mt-1 line-clamp-2 text-[12px] font-medium text-zinc-600 dark:text-zinc-200">{r.pitchBrief}</p>
                      <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-300">
                      {modeLabel} · {r.answerCount} answer{r.answerCount === 1 ? "" : "s"}
                      </p>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </motion.div>
    </div>
  );
}
