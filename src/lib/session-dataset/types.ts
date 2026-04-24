import type { PitchMode } from "@/types/pitch";

export const SESSION_DATASET_VERSION = 1 as const;

/** One line in JSONL — backend-only, for future training / RAG / evals. */
export type SessionDatasetLine = {
  v: typeof SESSION_DATASET_VERSION;
  ts: number;
  requestId: string;
  clientSessionId: string | null;
  action: string;
  mode: PitchMode;
  sessionLengthMinutes: number;
  elapsedSeconds: number;
  /** Success path; errors are not logged as dataset rows in v1 (reduces noise). */
  ok: true;
  payload: Record<string, unknown>;
};
