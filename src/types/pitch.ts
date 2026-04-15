export type PitchMode =
  | "investor"
  | "hackathon"
  | "healthcare"
  | "beginner";

export type NABCSection = "need" | "approach" | "benefits" | "competition";

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
}
