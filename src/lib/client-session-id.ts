const STORAGE_KEY = "pitchai.coachSessionId";

/** Stable ID for one browser tab session so backend can group all coach API calls. */
export function getOrCreateClientSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}
