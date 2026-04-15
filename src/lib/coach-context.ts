/** Appends founder-written context so every coach call stays anchored to their idea. */
export function founderContextBlock(brief: string): string {
  const b = brief.trim();
  if (!b) return "";
  return `\n\n---\nFounder / company context (use in all questions and feedback; do not make them re-explain this from scratch):\n${b}\n---`;
}
