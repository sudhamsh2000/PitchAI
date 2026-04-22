import type {
  CoachEvaluateResult,
  CoachRewriteResult,
  FinalPitches,
  PitchMessage,
  PitchMode,
  NABCSection,
  SessionAnalysisReport,
  SessionFeedbackEntry,
} from "@/types/pitch";

/** Avoid hung UI when the model or network stalls (AbortSignal.timeout is widely supported). */
function coachAbort(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}

function mapCoachFetchError(e: unknown): string {
  if (!(e instanceof Error)) return "Request failed.";
  const m = e.message;
  if (/abort|timed out|TimeoutError/i.test(m)) {
    return "Request timed out. Check your network and API keys, then try again.";
  }
  return m;
}

async function readCoachError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const data = JSON.parse(text) as { error?: string };
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error.trim();
    }
  } catch {
    /* plain text body */
  }
  const t = text.trim();
  return t || `Request failed (${res.status})`;
}

function toApiMessages(messages: PitchMessage[]) {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
}

export async function coachStart(mode: PitchMode, pitchBrief: string) {
  try {
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", mode, pitchBrief }),
      signal: coachAbort(120_000),
    });
    if (!res.ok) throw new Error(await readCoachError(res));
    return (await res.json()) as { assistantMessage: string; activeSection: NABCSection };
  } catch (e) {
    throw new Error(mapCoachFetchError(e));
  }
}

export async function coachEvaluate(params: {
  mode: PitchMode;
  pitchBrief: string;
  messages: PitchMessage[];
  activeSection: NABCSection;
  followUpsAskedThisSection: number;
  userAnswer: string;
}) {
  try {
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "evaluate_and_continue",
        mode: params.mode,
        pitchBrief: params.pitchBrief,
        messages: toApiMessages(params.messages),
        activeSection: params.activeSection,
        followUpsAskedThisSection: params.followUpsAskedThisSection,
        userAnswer: params.userAnswer,
      }),
      signal: coachAbort(180_000),
    });
    if (!res.ok) throw new Error(await readCoachError(res));
    return (await res.json()) as CoachEvaluateResult;
  } catch (e) {
    throw new Error(mapCoachFetchError(e));
  }
}

export async function coachRewrite(params: {
  mode: PitchMode;
  pitchBrief: string;
  userAnswer: string;
  feedback: CoachEvaluateResult["feedback"];
  activeSection: NABCSection;
}) {
  try {
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rewrite",
        mode: params.mode,
        pitchBrief: params.pitchBrief,
        userAnswer: params.userAnswer,
        feedback: params.feedback,
        activeSection: params.activeSection,
      }),
      signal: coachAbort(120_000),
    });
    if (!res.ok) throw new Error(await readCoachError(res));
    return (await res.json()) as CoachRewriteResult;
  } catch (e) {
    throw new Error(mapCoachFetchError(e));
  }
}

export async function coachSessionReport(params: {
  mode: PitchMode;
  pitchBrief: string;
  entries: SessionFeedbackEntry[];
}) {
  try {
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "session_report",
        mode: params.mode,
        pitchBrief: params.pitchBrief,
        entries: params.entries,
      }),
      signal: coachAbort(120_000),
    });
    if (!res.ok) throw new Error(await readCoachError(res));
    return (await res.json()) as SessionAnalysisReport;
  } catch (e) {
    throw new Error(mapCoachFetchError(e));
  }
}

export async function coachFinal(params: {
  mode: PitchMode;
  pitchBrief: string;
  messages: PitchMessage[];
}) {
  try {
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "final_pitches",
        mode: params.mode,
        pitchBrief: params.pitchBrief,
        messages: toApiMessages(params.messages),
      }),
      signal: coachAbort(180_000),
    });
    if (!res.ok) throw new Error(await readCoachError(res));
    return (await res.json()) as FinalPitches;
  } catch (e) {
    throw new Error(mapCoachFetchError(e));
  }
}
