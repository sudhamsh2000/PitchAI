/** Light cleanup for Web Speech dictation chunks before appending to the answer. */
export function normalizeDictationChunk(input: string) {
  return input
    .replace(/\s+/g, " ")
    .replace(/\b(i|im|i'm)\b/gi, (m) => (m.toLowerCase() === "i" ? "I" : "I'm"))
    .replace(/\b(uh+|um+|erm+|hmm+)\b/gi, "")
    .replace(/\s+,/g, ",")
    .replace(/\s+\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function normalizeForSpeech(input: string) {
  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/#+\s*/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\b(voice|model)\s*[:=]\s*[\w-]+\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

