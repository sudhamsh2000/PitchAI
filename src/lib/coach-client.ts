import type {
  CoachEvaluateResult,
  CoachRewriteResult,
  FinalPitches,
  PitchMessage,
  PitchMode,
  NABCSection,
} from "@/types/pitch";

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
  const res = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "start", mode, pitchBrief }),
  });
  if (!res.ok) throw new Error(await readCoachError(res));
  return (await res.json()) as { assistantMessage: string; activeSection: NABCSection };
}

export async function coachEvaluate(params: {
  mode: PitchMode;
  pitchBrief: string;
  messages: PitchMessage[];
  activeSection: NABCSection;
  followUpsAskedThisSection: number;
  userAnswer: string;
}) {
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
  });
  if (!res.ok) throw new Error(await readCoachError(res));
  return (await res.json()) as CoachEvaluateResult;
}

export async function coachRewrite(params: {
  mode: PitchMode;
  pitchBrief: string;
  userAnswer: string;
  feedback: CoachEvaluateResult["feedback"];
  activeSection: NABCSection;
}) {
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
  });
  if (!res.ok) throw new Error(await readCoachError(res));
  return (await res.json()) as CoachRewriteResult;
}

export async function coachFinal(params: {
  mode: PitchMode;
  pitchBrief: string;
  messages: PitchMessage[];
}) {
  const res = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "final_pitches",
      mode: params.mode,
      pitchBrief: params.pitchBrief,
      messages: toApiMessages(params.messages),
    }),
  });
  if (!res.ok) throw new Error(await readCoachError(res));
  return (await res.json()) as FinalPitches;
}
