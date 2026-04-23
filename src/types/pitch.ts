export type PitchMode =
  | "investor"
  | "hackathon"
  | "healthcare"
  | "beginner";

export type NABCSection = "need" | "approach" | "benefits" | "competition";
export type SessionPacingMode = "normal" | "compressed" | "urgent";

export type ChatRole = "assistant" | "user" | "system";

export interface PitchMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
}

export interface ScoreFeedback {
  clarity: number;
  specificity: number;
  strength: number;
  bullets: string[];
  /** Set by evaluation agent — whether another follow-up would help */
  needsFollowup?: boolean;
  followupReason?: string;
  /** Lightweight adaptive coaching insights shown in analysis panel */
  progressInsights?: string[];
}

export interface FinalPitches {
  pitch30s: string;
  pitch1m: string;
  pitch3m: string;
  deckBullets: string[];
}

export interface CoachEvaluateResult {
  feedback: ScoreFeedback;
  assistantMessage: string;
  activeSection: NABCSection | "done";
  followUpsAskedThisSection: number;
  interviewComplete: boolean;
}

export interface CoachRewriteResult {
  improvedAnswer: string;
  whyItIsBetter?: string[];
}

/** One scored answer during a coaching session (for end-of-session report). */
export interface SessionFeedbackEntry {
  id: string;
  createdAt: number;
  section: NABCSection;
  userAnswer: string;
  /** Optional source message id so rewritten answers can update memory */
  sourceUserMessageId?: string;
  feedback: ScoreFeedback;
}

/** Full analysis shown when ending a session; also persisted for “My reports”. */
export interface SessionAnalysisReport {
  id: string;
  createdAt: number;
  pitchBrief: string;
  mode: PitchMode;
  /** Rolling averages across scored answers */
  averages: {
    clarity: number;
    specificity: number;
    strength: number;
    overall: number;
  };
  answerCount: number;
  entries: SessionFeedbackEntry[];
  /** LLM-generated narrative */
  summary: string;
  topStrengths: string[];
  priorityImprovements: string[];
  /** Short label e.g. “Strong”, “Developing” */
  overallLabel: string;
  /** 1–10 holistic pitch readiness */
  overallRating: number;
}
