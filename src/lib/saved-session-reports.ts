import type { SessionAnalysisReport } from "@/types/pitch";

const STORAGE_KEY = "pitchai.sessionReports.v1";
const MAX_REPORTS = 40;

function safeParse(raw: string | null): SessionAnalysisReport[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter((x) => x && typeof (x as SessionAnalysisReport).id === "string") as SessionAnalysisReport[];
  } catch {
    return [];
  }
}

export function loadSessionReports(): SessionAnalysisReport[] {
  if (typeof window === "undefined") return [];
  return safeParse(localStorage.getItem(STORAGE_KEY)).sort((a, b) => b.createdAt - a.createdAt);
}

export function saveSessionReport(report: SessionAnalysisReport): void {
  if (typeof window === "undefined") return;
  const prev = safeParse(localStorage.getItem(STORAGE_KEY));
  const next = [report, ...prev.filter((r) => r.id !== report.id)].slice(0, MAX_REPORTS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getSessionReportById(id: string): SessionAnalysisReport | null {
  return loadSessionReports().find((r) => r.id === id) ?? null;
}

export function deleteSessionReportById(id: string): void {
  if (typeof window === "undefined") return;
  const prev = safeParse(localStorage.getItem(STORAGE_KEY));
  const next = prev.filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
