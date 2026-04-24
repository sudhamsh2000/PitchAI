import { appendFile, mkdir } from "fs/promises";
import path from "path";
import { datasetDir } from "./paths";
import type { SessionDatasetLine } from "./types";

const MAX_LINE_CHARS = 1_500_000;

function isDisabled(): boolean {
  if (process.env.PITCHAI_SESSION_DATASET === "0") return true;
  return false;
}

function filePathForToday(): string {
  const d = new Date();
  const day = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
  return path.join(datasetDir(), `${day}.jsonl`);
}

let warnedOnce = false;

/**
 * Append one JSONL record. Fails open (never throws to callers).
 * On serverless with read-only FS, no-op and optionally warn once in development.
 */
export async function appendSessionDatasetLine(line: SessionDatasetLine): Promise<void> {
  if (isDisabled()) return;

  const dir = datasetDir();
  const file = filePathForToday();
  let text = JSON.stringify(line);
  if (text.length > MAX_LINE_CHARS) {
    text = JSON.stringify({
      ...line,
      payload: { _truncated: true, _originalChars: text.length, note: "Row exceeded max size" },
    });
  }
  const row = `${text}\n`;

  try {
    await mkdir(dir, { recursive: true });
    await appendFile(file, row, { encoding: "utf8" });
  } catch (e) {
    if (process.env.NODE_ENV === "development" && !warnedOnce) {
      warnedOnce = true;
      // eslint-disable-next-line no-console -- dev-only once
      console.warn(
        "[pitchai] Session dataset not written (set PITCHAI_SESSION_DATASET=0 to silence, or PITCHAI_SESSION_DATASET_DIR to a writable path):",
        e instanceof Error ? e.message : e,
      );
    }
  }
}
