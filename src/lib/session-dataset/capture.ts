import { randomUUID } from "crypto";
import { appendSessionDatasetLine } from "./persist";
import { SESSION_DATASET_VERSION, type SessionDatasetLine } from "./types";
import type { PitchMode } from "@/types/pitch";

const MAX_STR = 120_000;

function clip(s: string, max = MAX_STR): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n… [truncated at ${max} chars]`;
}

type Base = {
  clientSessionId: string | null;
  mode: PitchMode;
  sessionLengthMinutes: number;
  elapsedSeconds: number;
  pitchBrief: string;
  action: string;
};

/**
 * Fire-and-forget: record one successful coach interaction for offline learning.
 * No await required at call site.
 */
export function scheduleSessionDatasetCapture(
  base: Base,
  payload: Record<string, unknown>,
): void {
  const line: SessionDatasetLine = {
    v: SESSION_DATASET_VERSION,
    ts: Date.now(),
    requestId: randomUUID(),
    clientSessionId: base.clientSessionId,
    action: base.action,
    mode: base.mode,
    sessionLengthMinutes: base.sessionLengthMinutes,
    elapsedSeconds: base.elapsedSeconds,
    ok: true,
    payload: {
      pitchBrief: clip(base.pitchBrief),
      ...payload,
    },
  };
  void appendSessionDatasetLine(line);
}

export { clip as clipDatasetString };
