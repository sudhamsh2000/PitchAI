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

