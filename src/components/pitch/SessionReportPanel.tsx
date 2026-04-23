"use client";

import type { SessionAnalysisReport } from "@/types/pitch";
import { PITCH_MODES } from "@/lib/modes";

function Meter({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, (value / 10) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-zinc-500 dark:text-zinc-300">{label}</span>
        <span className="font-semibold text-sky-700 dark:text-cyan-200/90">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-pink-400 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function SessionReportPanel({
  report,
  title = "Session analysis report",
}: {
  report: SessionAnalysisReport;
  title?: string;
}) {
  const modeLabel = PITCH_MODES.find((m) => m.id === report.mode)?.label ?? report.mode;
  const dateStr = new Date(report.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">
          {dateStr} · Mode: {modeLabel} · {report.answerCount} scored answer
          {report.answerCount === 1 ? "" : "s"}
        </p>
        <p className="mt-3 rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-[11px] leading-relaxed text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-200">
          <span className="font-medium text-zinc-500 dark:text-zinc-300">Pitch context: </span>
          {report.pitchBrief.length > 320 ? `${report.pitchBrief.slice(0, 320)}…` : report.pitchBrief}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-300/35 bg-sky-100/80 px-4 py-3 dark:border-cyan-400/25 dark:bg-cyan-500/10">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-cyan-200/80">Overall rating</p>
          <p className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">{report.overallRating}/10</p>
        </div>
        <div className="h-10 w-px bg-black/10 dark:bg-white/10" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Verdict</p>
          <p className="text-lg font-semibold text-zinc-800 dark:text-cyan-100">{report.overallLabel}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Meter label="Clarity (avg)" value={report.averages.clarity} />
        <Meter label="Specificity (avg)" value={report.averages.specificity} />
        <Meter label="Strength (avg)" value={report.averages.strength} />
      </div>

      <div className="rounded-xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Summary</h3>
        <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-700 dark:text-zinc-200">{report.summary}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-400/35 bg-emerald-100/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200/90">Strengths</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {report.topStrengths.map((line, i) => (
              <li key={`s-${i}-${line.slice(0, 24)}`}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-400/35 bg-amber-100/60 p-4 dark:border-amber-500/25 dark:bg-amber-500/5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200/90">Priority improvements</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {report.priorityImprovements.map((line, i) => (
              <li key={`p-${i}-${line.slice(0, 24)}`}>{line}</li>
            ))}
          </ul>
        </div>
      </div>

      {report.entries.length > 0 ? (
        <div className="rounded-xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-black/25">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Answer-by-answer scores</h3>
          <ul className="mt-3 space-y-3 text-[13px] font-medium text-zinc-700 dark:text-zinc-200">
            {report.entries.map((e, i) => (
              <li key={e.id} className="rounded-lg border border-black/10 bg-white px-3 py-2 dark:border-white/5 dark:bg-white/[0.02]">
                <span className="font-semibold text-sky-700 dark:text-cyan-200/80">
                  {i + 1}. {e.section}
                </span>
                <span className="ml-2 text-zinc-500 dark:text-zinc-300">
                  C {e.feedback.clarity.toFixed(1)} · S {e.feedback.specificity.toFixed(1)} · T {e.feedback.strength.toFixed(1)}
                </span>
                <p className="mt-1 text-[12px] leading-snug text-zinc-600 dark:text-zinc-300">
                  {e.userAnswer.length > 200 ? `${e.userAnswer.slice(0, 200)}…` : e.userAnswer}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
