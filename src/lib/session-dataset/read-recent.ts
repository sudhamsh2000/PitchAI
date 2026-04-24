import { readdir, readFile } from "fs/promises";
import path from "path";
import { datasetDir } from "./paths";

/**
 * For future RAG / evals: read the last N non-empty lines from the most recent JSONL file.
 * Returns [] if nothing is on disk. Server-only.
 */
export async function readRecentSessionDatasetLines(maxLines: number): Promise<string[]> {
  if (maxLines <= 0) return [];
  const root = datasetDir();
  let names: string[] = [];
  try {
    names = (await readdir(root))
      .filter((f) => f.endsWith(".jsonl"))
      .sort();
  } catch {
    return [];
  }
  if (!names.length) return [];
  const latest = path.join(root, names[names.length - 1]!);
  let raw: string;
  try {
    raw = await readFile(latest, "utf8");
  } catch {
    return [];
  }
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.slice(-maxLines);
}
