import type { NABCSection, PitchMode } from "@/types/pitch";

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
  intent: "followup_same_section" | "advance_section" | "complete_session";
  nextSection?: NABCSection | "done";
}

export interface RewriteAgentResult {
  improvedAnswer: string;
  whyItIsBetter: string[];
}
