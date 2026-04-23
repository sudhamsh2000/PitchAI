import type { NABCSection, PitchMode, SessionPacingMode } from "@/types/pitch";
import type { SessionMemory } from "./sessionMemory";

export type ApiMsg = { role: "user" | "assistant"; content: string };

export interface EvaluationAgentResult {
  clarity: number;
  specificity: number;
  strength: number;
  feedback: string[];
  needsFollowup: boolean;
  followupReason?: string;
}

export interface InterviewAgentParams {
  mode: PitchMode;
  pitchBrief: string;
  messages: ApiMsg[];
  activeSection: NABCSection;
  followUpsAskedThisSection: number;
  userAnswer: string;
  /** Latest evaluation — used to shape the next question */
  evaluation: EvaluationAgentResult;
  sessionMemory?: SessionMemory;
  intent: "followup_same_section" | "advance_section" | "complete_session";
  nextSection?: NABCSection | "done";
  pacingMode?: SessionPacingMode;
  remainingSeconds?: number;
  sessionLengthMinutes?: number;
}

export interface RewriteAgentResult {
  improvedAnswer: string;
  whyItIsBetter: string[];
}
