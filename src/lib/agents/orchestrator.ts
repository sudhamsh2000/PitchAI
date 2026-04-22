import type OpenAI from "openai";
import type { CoachEvaluateResult, NABCSection, PitchMode, SessionAnalysisReport, SessionFeedbackEntry } from "@/types/pitch";
import { runEvaluationAgent } from "./evaluationAgent";
import { runInterviewNext, runInterviewStart } from "./interviewAgent";
import { runPitchComposerAgent } from "./pitchComposerAgent";
import { runRewriteAgent } from "./rewriteAgent";
import { runSessionReportAgent } from "./sessionReportAgent";
import { runUnifiedEvaluateAndContinue } from "./unifiedEvaluateContinue";
import type { ApiMsg } from "./types";

const MIN_FOLLOWUPS_PER_SECTION = 2;
const MAX_FOLLOWUPS_PER_SECTION = 4;

function nextSection(current: NABCSection): NABCSection | "done" {
  if (current === "need") return "approach";
  if (current === "approach") return "benefits";
  if (current === "benefits") return "competition";
  return "done";
}

function averageThree(e: { clarity: number; specificity: number; strength: number }) {
  return (e.clarity + e.specificity + e.strength) / 3;
}

/** Whether to ask another question in the same NABC section before advancing. */
function shouldProbeSameSection(
  followUps: number,
  evaluation: Awaited<ReturnType<typeof runEvaluationAgent>>,
): boolean {
  if (followUps >= MAX_FOLLOWUPS_PER_SECTION) return false;

  const avg = averageThree(evaluation);
  const low = Math.min(evaluation.clarity, evaluation.specificity, evaluation.strength);

  const exceptional =
    !evaluation.needsFollowup && avg >= 8.2 && low >= 7.5 && avg - low <= 1.2;

  if (followUps < MIN_FOLLOWUPS_PER_SECTION) {
    if (exceptional) return false;
    return true;
  }

  if (evaluation.needsFollowup) return true;
  if (avg < 6.2) return true;
  if (low < 5.5) return true;

  return false;
}

export async function orchestrateStart(
  openai: OpenAI,
  params: { mode: PitchMode; pitchBrief: string },
) {
  return runInterviewStart(openai, params);
}

export async function orchestrateEvaluateAndContinue(
  openai: OpenAI,
  params: {
    mode: PitchMode;
    pitchBrief: string;
    messages: ApiMsg[];
    activeSection: NABCSection;
    followUpsAskedThisSection: number;
    userAnswer: string;
  },
): Promise<CoachEvaluateResult> {
  const unified = await runUnifiedEvaluateAndContinue(openai, params);
  if (unified) return unified;

  const evaluation = await runEvaluationAgent(openai, params);
  const followUps = params.followUpsAskedThisSection;
  const probe = shouldProbeSameSection(followUps, evaluation);

  if (probe) {
    const next = await runInterviewNext(openai, {
      mode: params.mode,
      pitchBrief: params.pitchBrief,
      messages: params.messages,
      activeSection: params.activeSection,
      followUpsAskedThisSection: followUps,
      userAnswer: params.userAnswer,
      evaluation,
      intent: "followup_same_section",
    });
    return {
      feedback: {
        clarity: evaluation.clarity,
        specificity: evaluation.specificity,
        strength: evaluation.strength,
        bullets: evaluation.feedback,
        needsFollowup: evaluation.needsFollowup,
        followupReason: evaluation.followupReason,
      },
      assistantMessage: next.assistantMessage,
      activeSection: params.activeSection,
      followUpsAskedThisSection: followUps + 1,
      interviewComplete: false,
    };
  }

  const nextSec = nextSection(params.activeSection);

  if (nextSec === "done") {
    const closing = await runInterviewNext(openai, {
      mode: params.mode,
      pitchBrief: params.pitchBrief,
      messages: params.messages,
      activeSection: "competition",
      followUpsAskedThisSection: followUps,
      userAnswer: params.userAnswer,
      evaluation,
      intent: "complete_session",
      nextSection: "done",
    });
    return {
      feedback: {
        clarity: evaluation.clarity,
        specificity: evaluation.specificity,
        strength: evaluation.strength,
        bullets: evaluation.feedback,
        needsFollowup: false,
        followupReason: evaluation.followupReason,
      },
      assistantMessage: closing.assistantMessage,
      activeSection: "done",
      followUpsAskedThisSection: 0,
      interviewComplete: true,
    };
  }

  const advance = await runInterviewNext(openai, {
    mode: params.mode,
    pitchBrief: params.pitchBrief,
    messages: params.messages,
    activeSection: params.activeSection,
    followUpsAskedThisSection: followUps,
    userAnswer: params.userAnswer,
    evaluation,
    intent: "advance_section",
    nextSection: nextSec,
  });

  return {
    feedback: {
      clarity: evaluation.clarity,
      specificity: evaluation.specificity,
      strength: evaluation.strength,
      bullets: evaluation.feedback,
      needsFollowup: evaluation.needsFollowup,
      followupReason: evaluation.followupReason,
    },
    assistantMessage: advance.assistantMessage,
    activeSection: nextSec,
    followUpsAskedThisSection: 0,
    interviewComplete: false,
  };
}

export async function orchestrateRewrite(
  openai: OpenAI,
  params: Parameters<typeof runRewriteAgent>[1],
) {
  return runRewriteAgent(openai, params);
}

export async function orchestrateFinalPitches(
  openai: OpenAI,
  params: { mode: PitchMode; pitchBrief: string; messages: ApiMsg[] },
) {
  return runPitchComposerAgent(openai, params);
}

export async function orchestrateSessionReport(
  openai: OpenAI,
  params: { mode: PitchMode; pitchBrief: string; entries: SessionFeedbackEntry[] },
): Promise<SessionAnalysisReport> {
  const body = await runSessionReportAgent(openai, params);
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    pitchBrief: params.pitchBrief,
    mode: params.mode,
    entries: params.entries,
    answerCount: params.entries.length,
    averages: body.averages,
    summary: body.summary,
    topStrengths: body.topStrengths,
    priorityImprovements: body.priorityImprovements,
    overallLabel: body.overallLabel,
    overallRating: body.overallRating,
  };
}
