import type OpenAI from "openai";
import type { CoachEvaluateResult, NABCSection, PitchMode, SessionAnalysisReport, SessionFeedbackEntry, SessionPacingMode } from "@/types/pitch";
import { runEvaluationAgent } from "./evaluationAgent";
import { runInterviewNext, runInterviewStart } from "./interviewAgent";
import { runPitchComposerAgent } from "./pitchComposerAgent";
import { runRewriteAgent } from "./rewriteAgent";
import { runMonologueDebrief } from "./monologueDebriefAgent";
import { runMonologueSessionReportAgent, runSessionReportAgent } from "./sessionReportAgent";
import { runUnifiedEvaluateAndContinue } from "./unifiedEvaluateContinue";
import { buildSessionMemory, deriveProgressInsights } from "./sessionMemory";
import type { ApiMsg } from "./types";

function pacingFromTime(sessionLengthMinutes: number, elapsedSeconds: number): SessionPacingMode {
  const total = Math.max(60, sessionLengthMinutes * 60);
  const ratio = elapsedSeconds / total;
  if (ratio >= 0.9) return "urgent";
  if (ratio >= 0.7) return "compressed";
  return "normal";
}

function resolveSessionLengthMinutes(raw?: number): { minutes: number; timed: boolean } {
  if (raw === undefined || raw === null) return { minutes: 5, timed: true };
  if (raw === 0) return { minutes: 0, timed: false };
  return { minutes: Math.max(1, Math.min(30, raw)), timed: true };
}

function followupCapsForPacing(pacing: SessionPacingMode) {
  if (pacing === "urgent") return { min: 0, max: 1 };
  if (pacing === "compressed") return { min: 0, max: 1 };
  return { min: 0, max: 2 };
}

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
  pacing: SessionPacingMode,
): boolean {
  const caps = followupCapsForPacing(pacing);
  if (followUps >= caps.max) return false;

  const avg = averageThree(evaluation);
  const low = Math.min(evaluation.clarity, evaluation.specificity, evaluation.strength);

  const exceptional =
    !evaluation.needsFollowup && avg >= 8.2 && low >= 7.5 && avg - low <= 1.2;

  if (followUps < caps.min) {
    if (exceptional) return false;
    return true;
  }

  // Medium answer (not clearly weak): cap at 1 follow-up then advance.
  if (followUps >= 1 && avg >= 6.2 && low >= 5.5) return false;

  if (evaluation.needsFollowup) return true;
  if (avg < 6.2) return true;
  if (low < 5.5) return true;

  return false;
}

export async function orchestrateStart(
  openai: OpenAI,
  params: {
    mode: PitchMode;
    pitchBrief: string;
    sessionLengthMinutes?: number;
    flow?: "interview" | "monologue";
  },
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
    feedbackHistory?: SessionFeedbackEntry[];
    sessionLengthMinutes?: number;
    elapsedSeconds?: number;
  },
): Promise<CoachEvaluateResult> {
  const { minutes: sessionLength, timed: timedSession } = resolveSessionLengthMinutes(params.sessionLengthMinutes);
  const elapsed = params.elapsedSeconds || 0;
  const pacingMode = timedSession ? pacingFromTime(sessionLength, elapsed) : "normal";
  const remainingSeconds = timedSession ? Math.max(0, sessionLength * 60 - elapsed) : 0;
  const sessionMemory = buildSessionMemory({
    pitchBrief: params.pitchBrief,
    mode: params.mode,
    currentStage: params.activeSection,
    feedbackHistory: params.feedbackHistory || [],
  });
  const unified = await runUnifiedEvaluateAndContinue(openai, {
    ...params,
    sessionMemory,
    pacingMode,
    sessionLengthMinutes: sessionLength,
    timedSession,
    elapsedSeconds: elapsed,
    remainingSeconds,
  });
  if (unified) return unified;

  const evaluation = await runEvaluationAgent(openai, { ...params, sessionMemory });
  const followUps = params.followUpsAskedThisSection;
  const probe = shouldProbeSameSection(followUps, evaluation, pacingMode);

  if (probe) {
    const next = await runInterviewNext(openai, {
      mode: params.mode,
      pitchBrief: params.pitchBrief,
      messages: params.messages,
      activeSection: params.activeSection,
      followUpsAskedThisSection: followUps,
      userAnswer: params.userAnswer,
      evaluation,
      sessionMemory,
      intent: "followup_same_section",
      pacingMode,
      remainingSeconds,
      sessionLengthMinutes: sessionLength,
    });
    return {
      feedback: {
        clarity: evaluation.clarity,
        specificity: evaluation.specificity,
        strength: evaluation.strength,
        bullets: evaluation.feedback,
        needsFollowup: evaluation.needsFollowup,
        followupReason: evaluation.followupReason,
        progressInsights: deriveProgressInsights(sessionMemory),
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
      sessionMemory,
      intent: "complete_session",
      nextSection: "done",
      pacingMode,
      remainingSeconds,
      sessionLengthMinutes: sessionLength,
    });
    return {
      feedback: {
        clarity: evaluation.clarity,
        specificity: evaluation.specificity,
        strength: evaluation.strength,
        bullets: evaluation.feedback,
        needsFollowup: false,
        followupReason: evaluation.followupReason,
        progressInsights: deriveProgressInsights(sessionMemory),
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
    sessionMemory,
    intent: "advance_section",
    nextSection: nextSec,
    pacingMode,
    remainingSeconds,
    sessionLengthMinutes: sessionLength,
  });

  return {
    feedback: {
      clarity: evaluation.clarity,
      specificity: evaluation.specificity,
      strength: evaluation.strength,
      bullets: evaluation.feedback,
      needsFollowup: evaluation.needsFollowup,
      followupReason: evaluation.followupReason,
      progressInsights: deriveProgressInsights(sessionMemory),
    },
    assistantMessage: advance.assistantMessage,
    activeSection: nextSec,
    followUpsAskedThisSection: 0,
    interviewComplete: false,
  };
}

export async function orchestrateRewrite(
  openai: OpenAI,
  params: Parameters<typeof runRewriteAgent>[1] & { feedbackHistory?: SessionFeedbackEntry[] },
) {
  const sessionMemory = buildSessionMemory({
    pitchBrief: params.pitchBrief,
    mode: params.mode,
    currentStage: params.activeSection,
    feedbackHistory: params.feedbackHistory || [],
  });
  return runRewriteAgent(openai, { ...params, sessionMemory });
}

export async function orchestrateFinalPitches(
  openai: OpenAI,
  params: {
    mode: PitchMode;
    pitchBrief: string;
    messages: ApiMsg[];
    feedbackHistory?: SessionFeedbackEntry[];
    sessionLengthMinutes?: number;
  },
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

export async function orchestrateMonologueDebrief(
  openai: OpenAI,
  params: { mode: PitchMode; pitchBrief: string; monologue: string; sessionLengthMinutes: number },
) {
  return runMonologueDebrief(openai, params);
}

export async function orchestrateMonologueSessionReport(
  openai: OpenAI,
  params: { mode: PitchMode; pitchBrief: string; monologue: string; debriefReply: string },
): Promise<SessionAnalysisReport> {
  const body = await runMonologueSessionReportAgent(openai, params);
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    pitchBrief: params.pitchBrief,
    mode: params.mode,
    entries: [],
    answerCount: 0,
    averages: body.averages,
    summary: body.summary,
    topStrengths: body.topStrengths,
    priorityImprovements: body.priorityImprovements,
    overallLabel: body.overallLabel,
    overallRating: body.overallRating,
  };
}
