import type { NABCSection, PitchMode, SessionFeedbackEntry } from "@/types/pitch";

type ScorePoint = {
  section: NABCSection;
  clarity: number;
  specificity: number;
  strength: number;
  createdAt: number;
};

export interface SessionMemory {
  pitchBrief: string;
  mode: PitchMode;
  currentStage: NABCSection;
  answerHistory: Array<{ section: NABCSection; answer: string; createdAt: number }>;
  scoreHistory: ScorePoint[];
  recurringWeaknesses: string[];
  strengths: string[];
  coachingNotes: string[];
}

const ORDER: NABCSection[] = ["need", "approach", "benefits", "competition"];

function toWeaknessLabel(entry: SessionFeedbackEntry) {
  const weak: string[] = [];
  if (entry.feedback.clarity < 6) weak.push("clarity");
  if (entry.feedback.specificity < 6) weak.push("specificity");
  if (entry.feedback.strength < 6) weak.push("strength");
  if (entry.section === "competition" && entry.feedback.strength < 6.5) weak.push("differentiation");
  if (entry.feedback.needsFollowup) weak.push("evidence depth");
  return weak;
}

function toStrengthLabel(entry: SessionFeedbackEntry) {
  const labels: string[] = [];
  if (entry.feedback.clarity >= 7.5) labels.push("clear narrative");
  if (entry.feedback.specificity >= 7.5) labels.push("strong specifics");
  if (entry.feedback.strength >= 7.5) labels.push("convincing argument");
  return labels;
}

function topCounts(values: string[], max = 4) {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k]) => k);
}

function sectionAverage(points: ScorePoint[], section: NABCSection) {
  const rows = points.filter((p) => p.section === section);
  if (!rows.length) return 0;
  const total = rows.reduce((acc, p) => acc + (p.clarity + p.specificity + p.strength) / 3, 0);
  return total / rows.length;
}

export function buildSessionMemory(params: {
  pitchBrief: string;
  mode: PitchMode;
  currentStage: NABCSection;
  feedbackHistory: SessionFeedbackEntry[];
}): SessionMemory {
  const answerHistory = params.feedbackHistory.map((e) => ({
    section: e.section,
    answer: e.userAnswer,
    createdAt: e.createdAt,
  }));
  const scoreHistory: ScorePoint[] = params.feedbackHistory.map((e) => ({
    section: e.section,
    clarity: e.feedback.clarity,
    specificity: e.feedback.specificity,
    strength: e.feedback.strength,
    createdAt: e.createdAt,
  }));
  const weaknesses = topCounts(params.feedbackHistory.flatMap((e) => toWeaknessLabel(e)));
  const strengths = topCounts(params.feedbackHistory.flatMap((e) => toStrengthLabel(e)));

  const notes: string[] = [];
  if (scoreHistory.length >= 2) {
    const first = scoreHistory[0];
    const last = scoreHistory[scoreHistory.length - 1];
    const firstAvg = (first.clarity + first.specificity + first.strength) / 3;
    const lastAvg = (last.clarity + last.specificity + last.strength) / 3;
    if (lastAvg - firstAvg >= 0.6) notes.push("overall quality is trending up");
  }
  for (const s of ORDER) {
    const avg = sectionAverage(scoreHistory, s);
    if (!avg) continue;
    if (avg < 6) notes.push(`${s} remains underdeveloped`);
    if (avg >= 7.2) notes.push(`${s} is becoming a strength`);
  }

  return {
    pitchBrief: params.pitchBrief,
    mode: params.mode,
    currentStage: params.currentStage,
    answerHistory,
    scoreHistory,
    recurringWeaknesses: weaknesses,
    strengths,
    coachingNotes: topCounts(notes, 5),
  };
}

export function sessionMemoryPromptBlock(memory: SessionMemory): string {
  const lastAnswers = memory.answerHistory
    .slice(-3)
    .map((a, i) => `${i + 1}) [${a.section}] ${a.answer.slice(0, 220)}${a.answer.length > 220 ? "..." : ""}`)
    .join("\n");

  return `Session memory (adaptive context, not retraining):
- Current stage: ${memory.currentStage}
- Recurring weaknesses: ${memory.recurringWeaknesses.join(", ") || "none yet"}
- Strengths: ${memory.strengths.join(", ") || "none yet"}
- Coaching notes: ${memory.coachingNotes.join(" | ") || "none yet"}
- Recent answers:
${lastAnswers || "none yet"}`;
}

export function strongestAnswersBySection(memory: SessionMemory) {
  const bySection = new Map<NABCSection, { answer: string; score: number }>();
  memory.answerHistory.forEach((a, idx) => {
    const scorePoint = memory.scoreHistory[idx];
    if (!scorePoint) return;
    const score = (scorePoint.clarity + scorePoint.specificity + scorePoint.strength) / 3;
    const current = bySection.get(a.section);
    if (!current || score > current.score) {
      bySection.set(a.section, { answer: a.answer, score });
    }
  });
  return bySection;
}

export function deriveProgressInsights(memory: SessionMemory): string[] {
  const insights: string[] = [];
  if (memory.scoreHistory.length >= 2) {
    const first = memory.scoreHistory[0];
    const last = memory.scoreHistory[memory.scoreHistory.length - 1];
    if (last.clarity - first.clarity >= 0.8) insights.push("Your clarity improved across this session.");
    if (last.specificity - first.specificity >= 0.8) insights.push("Specificity is improving with each answer.");
  }
  const weak = new Set(memory.recurringWeaknesses);
  if (weak.has("differentiation")) insights.push("You still need stronger differentiation vs alternatives.");
  const benefits = sectionAverage(memory.scoreHistory, "benefits");
  const comp = sectionAverage(memory.scoreHistory, "competition");
  if (benefits >= 6.4 && comp > 0 && comp < 6.1) {
    insights.push("Benefits are improving, but competition remains weak.");
  }
  return insights.slice(0, 3);
}
