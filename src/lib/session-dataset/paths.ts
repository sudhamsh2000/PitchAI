import path from "path";

export function datasetDir(): string {
  const fromEnv = process.env.PITCHAI_SESSION_DATASET_DIR?.trim();
  if (fromEnv) return fromEnv;
  return path.join(process.cwd(), "data", "pitchai-sessions");
}
