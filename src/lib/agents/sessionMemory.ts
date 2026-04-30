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

  // Recurring weaknesses: only from the 4 most recent answers so stale gaps don't linger.
  const recentHistory = params.feedbackHistory.slice(-4);
  const weaknesses = topCounts(recentHistory.flatMap((e) => toWeaknessLabel(e)));
  const strengths = topCounts(params.feedbackHistory.flatMap((e) => toStrengthLabel(e)));

  const notes: string[] = [];
  if (scoreHistory.length >= 2) {
    const first = scoreHistory[0];
    const last = scoreHistory[scoreHistory.length - 1];
    const firstAvg = (first.clarity + first.specificity + first.strength) / 3;
    const lastAvg = (last.clarity + last.specificity + last.strength) / 3;
    if (lastAvg - firstAvg >= 0.6) notes.push("overall quality is trending up");
    if (firstAvg - lastAvg >= 0.6) notes.push("answers are getting weaker — refocus");
  }
  for (const s of ORDER) {
    // Require at least 2 scored answers in a section before labelling it.
    const rows = scoreHistory.filter((p) => p.section === s);
    if (rows.length < 2) continue;
    const avg = sectionAverage(scoreHistory, s);
    // Dead-band 5.8–7.2: no label, avoids flip-flop on average sessions.
    if (avg < 5.8) notes.push(`${s} remains underdeveloped`);
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
  const history = memory.answerHistory;
  const scores = memory.scoreHistory;

  if (!history.length) {
    return `Session memory — stage: ${memory.currentStage}. No answers recorded yet.`;
  }

  // Keep the last 2 answers verbatim (freshest context for Friday).
  // Older answers are collapsed into a one-line per-section digest.
  const recentCount = Math.min(2, history.length);
  const recentAnswers = history.slice(-recentCount);
  const recentScores = scores.slice(-recentCount);
  const olderAnswers = history.slice(0, history.length - recentCount);
  const olderScores = scores.slice(0, scores.length - recentCount);

  // Digest: latest excerpt + avg score per section (older answers only).
  const olderBySec = new Map<string, { avg: number; excerpt: string }>();
  olderAnswers.forEach((a, i) => {
    const sc = olderScores[i];
    if (!sc) return;
    const avg = (sc.clarity + sc.specificity + sc.strength) / 3;
    olderBySec.set(a.section, {
      avg,
      excerpt: a.answer.slice(0, 130) + (a.answer.length > 130 ? "…" : ""),
    });
  });

  const digestLines = [...olderBySec.entries()]
    .map(([sec, d]) => `  [${sec.toUpperCase()}] avg ${d.avg.toFixed(1)} — "${d.excerpt}"`)
    .join("\n");

  const recentLines = recentAnswers
    .map((a, i) => {
      const sc = recentScores[i];
      const avg = sc ? ((sc.clarity + sc.specificity + sc.strength) / 3).toFixed(1) : "?";
      return `  [${a.section.toUpperCase()}] avg ${avg} — "${a.answer.slice(0, 340)}${a.answer.length > 340 ? "…" : ""}"`;
    })
    .join("\n");

  const parts: string[] = [
    `Session memory — read this before writing assistantMessage:`,
    `- Current NABC stage: ${memory.currentStage}`,
    `- Recurring weaknesses (recent answers): ${memory.recurringWeaknesses.join(", ") || "none yet"}`,
    `- Strengths so far: ${memory.strengths.join(", ") || "none yet"}`,
    `- Trend: ${memory.coachingNotes.join(" | ") || "no clear pattern yet"}`,
  ];

  if (digestLines) {
    parts.push(`Earlier this session:\n${digestLines}`);
  }

  parts.push(`Most recent answers (highest priority):\n${recentLines}`);

  parts.push(
    `Memory usage rules:` +
    `\n- If they improved on something, name it briefly — e.g. "That's clearer than before" or "Good, more specific this time."` +
    `\n- If a weakness persists across multiple turns, call it out directly — e.g. "We still need a number here" or "You mentioned this earlier but still no proof."` +
    `\n- When relevant, reference their earlier words — e.g. "You mentioned [X] earlier — how does that connect here?"` +
    `\n- Do not re-ask topics they already addressed well. Move the session forward.`,
  );

  return parts.join("\n");
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
