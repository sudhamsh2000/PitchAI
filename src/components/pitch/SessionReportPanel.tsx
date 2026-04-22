"use client";

import type { SessionAnalysisReport } from "@/types/pitch";
import { PITCH_MODES } from "@/lib/modes";

function Meter({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, (value / 10) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-zinc-400">{label}</span>
        <span className="font-semibold text-cyan-200/90">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400/90 to-violet-500/80 transition-[width]"
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
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500">
          {dateStr} · Mode: {modeLabel} · {report.answerCount} scored answer
          {report.answerCount === 1 ? "" : "s"}
        </p>
        <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
          <span className="font-medium text-zinc-500">Pitch context: </span>
          {report.pitchBrief.length > 320 ? `${report.pitchBrief.slice(0, 320)}…` : report.pitchBrief}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-200/80">Overall rating</p>
          <p className="text-3xl font-bold tabular-nums text-white">{report.overallRating}/10</p>
        </div>
        <div className="h-10 w-px bg-white/10" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Verdict</p>
          <p className="text-lg font-semibold text-cyan-100">{report.overallLabel}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Meter label="Clarity (avg)" value={report.averages.clarity} />
        <Meter label="Specificity (avg)" value={report.averages.specificity} />
        <Meter label="Strength (avg)" value={report.averages.strength} />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Summary</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-200">{report.summary}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-200/90">Strengths</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-zinc-200">
            {report.topStrengths.map((line, i) => (
              <li key={`s-${i}-${line.slice(0, 24)}`}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">Priority improvements</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-zinc-200">
            {report.priorityImprovements.map((line, i) => (
              <li key={`p-${i}-${line.slice(0, 24)}`}>{line}</li>
            ))}
          </ul>
        </div>
      </div>

      {report.entries.length > 0 ? (
        <div className="rounded-xl border border-white/10 bg-black/25 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Answer-by-answer scores</h3>
          <ul className="mt-3 space-y-3 text-[13px] text-zinc-300">
            {report.entries.map((e, i) => (
              <li key={e.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                <span className="font-medium text-cyan-200/80">
                  {i + 1}. {e.section}
                </span>
                <span className="ml-2 text-zinc-500">
                  C {e.feedback.clarity.toFixed(1)} · S {e.feedback.specificity.toFixed(1)} · T {e.feedback.strength.toFixed(1)}
                </span>
                <p className="mt-1 text-[12px] leading-snug text-zinc-500">
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
