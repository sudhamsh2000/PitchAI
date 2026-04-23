import type OpenAI from "openai";
import { founderContextBlock } from "@/lib/coach-context";
import { modeInstruction } from "@/lib/modes";
import type { CoachEvaluateResult, NABCSection, PitchMode, SessionPacingMode } from "@/types/pitch";
import { EVALUATOR_SYSTEM, FRIDAY_INTERVIEW_SYSTEM } from "./friday-base";
import { createCoachCompletion, normalizeScore, tryParseJson } from "./llm-client";
import { runInterviewNext } from "./interviewAgent";
import { deriveProgressInsights, sessionMemoryPromptBlock, type SessionMemory } from "./sessionMemory";
import type { ApiMsg, EvaluationAgentResult } from "./types";

const MIN_FOLLOWUPS_PER_SECTION = 1;
const MAX_FOLLOWUPS_PER_SECTION = 2;

function nextSection(current: NABCSection): NABCSection | "done" {
  if (current === "need") return "approach";
  if (current === "approach") return "benefits";
  if (current === "benefits") return "competition";
  return "done";
}

function averageThree(e: { clarity: number; specificity: number; strength: number }) {
  return (e.clarity + e.specificity + e.strength) / 3;
}

function shouldProbeSameSection(
  followUps: number,
  evaluation: EvaluationAgentResult,
  pacingMode: SessionPacingMode,
): boolean {
  const minFollowups = pacingMode === "normal" ? MIN_FOLLOWUPS_PER_SECTION : 0;
  const maxFollowups = pacingMode === "normal" ? MAX_FOLLOWUPS_PER_SECTION : 1;
  if (followUps >= maxFollowups) return false;

  const avg = averageThree(evaluation);
  const low = Math.min(evaluation.clarity, evaluation.specificity, evaluation.strength);

  const exceptional =
    !evaluation.needsFollowup && avg >= 8.2 && low >= 7.5 && avg - low <= 1.2;

  if (followUps < minFollowups) {
    if (exceptional) return false;
    return true;
  }

  if (evaluation.needsFollowup) return true;
  if (avg < 6.2) return true;
  if (low < 5.5) return true;

  return false;
}

type UnifiedParse = {
  clarity: number;
  specificity: number;
  strength: number;
  feedback: string[];
  needsFollowup: boolean;
  followupReason?: string | null;
  assistantMessage: string;
  /** Model’s guess: another question in the same NABC section before advancing. */
  probeSameSection: boolean;
};

/**
 * One LLM round-trip: score the answer + produce Friday’s next line.
 * If the model’s branch guess disagrees with deterministic rules, we fix with a small follow-up call.
 */
export async function runUnifiedEvaluateAndContinue(
  openai: OpenAI,
  params: {
    mode: PitchMode;
    pitchBrief: string;
    messages: ApiMsg[];
    activeSection: NABCSection;
    followUpsAskedThisSection: number;
    userAnswer: string;
    sessionMemory?: SessionMemory;
    sessionLengthMinutes?: number;
    elapsedSeconds?: number;
    remainingSeconds?: number;
    pacingMode?: SessionPacingMode;
  },
): Promise<CoachEvaluateResult | null> {
  const modeLine = modeInstruction(params.mode);
  const followUps = params.followUpsAskedThisSection;
  const pacing = params.pacingMode || "normal";
  const maxFollowups = pacing === "normal" ? MAX_FOLLOWUPS_PER_SECTION : 1;
  const minFollowups = pacing === "normal" ? MIN_FOLLOWUPS_PER_SECTION : 0;
  const memoryBlock = params.sessionMemory ? `\n${sessionMemoryPromptBlock(params.sessionMemory)}` : "";

  const system = `${EVALUATOR_SYSTEM}
${FRIDAY_INTERVIEW_SYSTEM}
${modeLine}
${founderContextBlock(params.pitchBrief)}${memoryBlock}

You do TWO things in ONE response (JSON only):
1) Score the founder's latest answer (harsh but fair).
2) Write Friday's next spoken line as "assistantMessage" — concise, voice-friendly, no markdown.
First, infer what the founder most likely means even if dictation is rough.
If meaning is unclear, assistantMessage should ask one crisp clarification question.

Branching rules (must set probeSameSection boolean to match what you will do in assistantMessage):
- Let followUps = ${followUps}, section = ${params.activeSection}.
- Time budget = ${params.sessionLengthMinutes || 5} min, elapsed = ${params.elapsedSeconds || 0}s, remaining = ${params.remainingSeconds || 0}s, pacing = ${params.pacingMode || "normal"}.
- If followUps >= ${maxFollowups}: probeSameSection MUST be false (advance or close).
- If followUps < ${minFollowups}: stay in section (probeSameSection true) UNLESS the answer is exceptional: avg score ≥ 8.2, every dimension ≥ 7.5, spread ≤ 1.2, and needsFollowup is false.
- Else: probeSameSection true if needsFollowup OR avg < 6.2 OR lowest dimension < 5.5; otherwise false.

If probeSameSection is true: ONE follow-up question still in the same NABC section (${params.activeSection}).
If false and section is not competition: move to the NEXT NABC section and ask its first strong question.
If false and section is competition: interview is done — assistantMessage closes briefly (2 short sentences), set interviewComplete in JSON.

Return JSON exactly:
{
  "clarity": number,
  "specificity": number,
  "strength": number,
  "feedback": string[],
  "needsFollowup": boolean,
  "followupReason": string | null,
  "probeSameSection": boolean,
  "assistantMessage": string,
  "interviewComplete": boolean
}`;

  const messagesPayload = [
    { role: "system" as const, content: system },
    ...params.messages.map((m) => ({ role: m.role, content: m.content })),
    {
      role: "user" as const,
      content: `Latest founder answer to evaluate and respond to:

"""
${params.userAnswer}
"""

Return ONLY JSON as specified.`,
    },
  ];

  let completion;
  try {
    completion = await createCoachCompletion(openai, {
      temperature: 0.25,
      maxTokens: 700,
      jsonObject: true,
      messages: messagesPayload,
    });
  } catch {
    try {
      completion = await createCoachCompletion(openai, {
        temperature: 0.25,
        maxTokens: 700,
        jsonObject: false,
        messages: messagesPayload,
      });
    } catch {
      return null;
    }
  }

  const text = completion.choices[0]?.message?.content || "{}";
  const parsed = tryParseJson<
    UnifiedParse & {
      interviewComplete?: boolean;
    }
  >(text);

  if (!parsed?.assistantMessage?.trim()) return null;

  const feedbackLines = (parsed.feedback || [])
    .filter((b) => typeof b === "string" && b.trim())
    .slice(0, 4);

  const evaluation: EvaluationAgentResult = {
    clarity: normalizeScore(parsed.clarity, 5),
    specificity: normalizeScore(parsed.specificity, 5),
    strength: normalizeScore(parsed.strength, 5),
    feedback:
      feedbackLines.length > 0
        ? feedbackLines
        : ["Tighten this with specifics and proof.", "Quantify impact and name the exact user."],
    needsFollowup: Boolean(parsed.needsFollowup),
    followupReason: parsed.followupReason?.trim() || undefined,
  };

  const truthProbe = shouldProbeSameSection(followUps, evaluation, pacing);
  const nextSec = nextSection(params.activeSection);

  let assistantMessage = parsed.assistantMessage.trim();
  let interviewComplete: boolean;
  let activeSection: NABCSection | "done";
  let followUpsOut: number;

  const probeGuess =
    typeof parsed.probeSameSection === "boolean" ? parsed.probeSameSection : truthProbe;
  const branchMismatch = probeGuess !== truthProbe;

  if (branchMismatch) {
    if (truthProbe) {
      const fix = await runInterviewNext(openai, {
        mode: params.mode,
        pitchBrief: params.pitchBrief,
        messages: params.messages,
        activeSection: params.activeSection,
        followUpsAskedThisSection: followUps,
        userAnswer: params.userAnswer,
        evaluation,
        sessionMemory: params.sessionMemory,
        intent: "followup_same_section",
        pacingMode: pacing,
        remainingSeconds: params.remainingSeconds,
        sessionLengthMinutes: params.sessionLengthMinutes,
      });
      assistantMessage = fix.assistantMessage;
      activeSection = params.activeSection;
      followUpsOut = followUps + 1;
      interviewComplete = false;
    } else if (nextSec === "done") {
      const fix = await runInterviewNext(openai, {
        mode: params.mode,
        pitchBrief: params.pitchBrief,
        messages: params.messages,
        activeSection: "competition",
        followUpsAskedThisSection: followUps,
        userAnswer: params.userAnswer,
        evaluation,
        sessionMemory: params.sessionMemory,
        intent: "complete_session",
        nextSection: "done",
        pacingMode: pacing,
        remainingSeconds: params.remainingSeconds,
        sessionLengthMinutes: params.sessionLengthMinutes,
      });
      assistantMessage = fix.assistantMessage;
      activeSection = "done";
      followUpsOut = 0;
      interviewComplete = true;
    } else {
      const fix = await runInterviewNext(openai, {
        mode: params.mode,
        pitchBrief: params.pitchBrief,
        messages: params.messages,
        activeSection: params.activeSection,
        followUpsAskedThisSection: followUps,
        userAnswer: params.userAnswer,
        evaluation,
        sessionMemory: params.sessionMemory,
        intent: "advance_section",
        nextSection: nextSec,
        pacingMode: pacing,
        remainingSeconds: params.remainingSeconds,
        sessionLengthMinutes: params.sessionLengthMinutes,
      });
      assistantMessage = fix.assistantMessage;
      activeSection = nextSec;
      followUpsOut = 0;
      interviewComplete = false;
    }
  } else if (truthProbe) {
    activeSection = params.activeSection;
    followUpsOut = followUps + 1;
    interviewComplete = false;
  } else if (nextSec === "done") {
    activeSection = "done";
    followUpsOut = 0;
    interviewComplete = true;
  } else {
    activeSection = nextSec;
    followUpsOut = 0;
    interviewComplete = false;
  }

  return {
    feedback: {
      clarity: evaluation.clarity,
      specificity: evaluation.specificity,
      strength: evaluation.strength,
      bullets: evaluation.feedback,
      needsFollowup: evaluation.needsFollowup,
      followupReason: evaluation.followupReason,
      progressInsights: params.sessionMemory ? deriveProgressInsights(params.sessionMemory) : [],
    },
    assistantMessage,
    activeSection,
    followUpsAskedThisSection: followUpsOut,
    interviewComplete,
  };
}
