"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { NABCComparisonReport, NABCEvaluation, NABCWrittenReport } from "@/types/nabc-lab";

async function postCoach<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* noop */
  }
  if (!res.ok) {
    const err =
      parsed && typeof parsed === "object" && "error" in parsed
        ? String((parsed as { error?: string }).error || `Request failed (${res.status})`)
        : `Request failed (${res.status})`;
    throw new Error(err);
  }
  return parsed as T;
}

export default function NABCLabPage() {
  const [teamName, setTeamName] = useState("");
  const [transcript, setTranscript] = useState("");
  const [videoReport, setVideoReport] = useState("");

  const [evaluation, setEvaluation] = useState<NABCEvaluation | null>(null);
  const [writtenReport, setWrittenReport] = useState<NABCWrittenReport | null>(null);
  const [comparison, setComparison] = useState<NABCComparisonReport | null>(null);

  const [busyStep, setBusyStep] = useState<"" | "evaluate" | "write" | "compare">("");
  const [error, setError] = useState<string | null>(null);

  const transcriptReportText = useMemo(() => {
    if (!writtenReport) return "";
    return [
      writtenReport.title,
      "",
      writtenReport.executiveSummary,
      "",
      "Score breakdown:",
      ...writtenReport.scoreBreakdown.map((r) => `- ${r.category}: ${r.score}/10 — ${r.rationale}`),
      "",
      "Strengths:",
      ...writtenReport.strengths.map((s) => `- ${s}`),
      "",
      "Weaknesses:",
      ...writtenReport.weaknesses.map((w) => `- ${w}`),
      "",
      "Recommended improvements:",
      ...writtenReport.recommendedImprovements.map((i) => `- ${i}`),
      "",
      "Conclusion:",
      writtenReport.conclusion,
    ].join("\n");
  }, [writtenReport]);

  const runEvaluate = async () => {
    setError(null);
    setBusyStep("evaluate");
    try {
      const res = await postCoach<NABCEvaluation>({
        action: "nabc_transcript_evaluate",
        transcript,
      });
      setEvaluation(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed.");
    } finally {
      setBusyStep("");
    }
  };

  const runWrite = async () => {
    if (!evaluation) return;
    setError(null);
    setBusyStep("write");
    try {
      const res = await postCoach<NABCWrittenReport>({
        action: "nabc_report_write",
        evaluation,
        teamName,
      });
      setWrittenReport(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report writing failed.");
    } finally {
      setBusyStep("");
    }
  };

  const runCompare = async () => {
    if (!transcriptReportText.trim() || !videoReport.trim()) return;
    setError(null);
    setBusyStep("compare");
    try {
      const res = await postCoach<NABCComparisonReport>({
        action: "nabc_compare_reports",
        transcriptBasedReport: transcriptReportText,
        videoBasedReport: videoReport,
      });
      setComparison(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed.");
    } finally {
      setBusyStep("");
    }
  };

  return (
    <main className="min-h-[100dvh] bg-zinc-50 px-4 py-6 text-zinc-900 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">NABC Lab</h1>
          <Link href="/pitch" className="text-sm font-medium text-sky-700 hover:underline">
            Back to Pitch
          </Link>
        </div>
        <p className="text-sm text-zinc-600">
          Additive analysis path for assignment workflow: transcript evaluation, writer output, and transcript vs
          video comparison.
        </p>

        {error ? <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Team name (optional)</label>
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Team Alpha"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-sky-400"
          />
          <label className="mb-2 mt-4 block text-xs font-semibold uppercase tracking-wide text-zinc-500">NABC transcript</label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={12}
            placeholder="Paste NABCTranscript.txt content here..."
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-sky-400"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!transcript.trim() || !!busyStep}
              onClick={() => void runEvaluate()}
              className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busyStep === "evaluate" ? "Evaluating..." : "Run transcript evaluator"}
            </button>
            <button
              type="button"
              disabled={!evaluation || !!busyStep}
              onClick={() => void runWrite()}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-40"
            >
              {busyStep === "write" ? "Writing..." : "Generate written report"}
            </button>
          </div>
        </section>

        {evaluation ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Transcript Evaluation</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(evaluation.rubric).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">{k}</p>
                  <p className="text-base font-semibold">{v}/10</p>
                </div>
              ))}
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-700">{evaluation.summary}</p>
          </section>
        ) : null}

        {writtenReport ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-lg font-semibold">{writtenReport.title}</h2>
            <pre className="mt-3 max-h-[45dvh] overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
              {transcriptReportText}
            </pre>
          </section>
        ) : null}

        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Video-based report (from ChatGPT/Gemini)</h2>
          <textarea
            value={videoReport}
            onChange={(e) => setVideoReport(e.target.value)}
            rows={10}
            placeholder="Paste multimodal video analysis report text here..."
            className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-sky-400"
          />
          <button
            type="button"
            disabled={!videoReport.trim() || !transcriptReportText.trim() || !!busyStep}
            onClick={() => void runCompare()}
            className="mt-3 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busyStep === "compare" ? "Comparing..." : "Compare transcript vs video reports"}
          </button>
        </section>

        {comparison ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Comparison Output</h2>
            <div className="mt-3 space-y-3 text-sm text-zinc-700">
              <p><span className="font-semibold">Transcript summary:</span> {comparison.transcriptSummary}</p>
              <p><span className="font-semibold">Video summary:</span> {comparison.videoSummary}</p>
              <p className="font-semibold">Similarities</p>
              <ul className="list-disc pl-5">
                {comparison.similarities.map((s) => <li key={s}>{s}</li>)}
              </ul>
              <p className="font-semibold">Differences</p>
              <ul className="list-disc pl-5">
                {comparison.differences.map((d) => <li key={d}>{d}</li>)}
              </ul>
              <p className="font-semibold">Why differences exist</p>
              <ul className="list-disc pl-5">
                {comparison.whyDifferencesExist.map((d) => <li key={d}>{d}</li>)}
              </ul>
              <p className="whitespace-pre-wrap">{comparison.finalReflection}</p>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
