import type OpenAI from "openai";
import { founderContextBlock } from "@/lib/coach-context";
import { modeInstruction } from "@/lib/modes";
import type { PitchMode, SessionAnalysisReport, SessionFeedbackEntry } from "@/types/pitch";
import { createCoachCompletion, tryParseJson } from "./llm-client";

function averages(entries: SessionFeedbackEntry[]) {
  if (!entries.length) {
    return { clarity: 0, specificity: 0, strength: 0, overall: 0 };
  }
  let c = 0;
  let s = 0;
  let t = 0;
  for (const e of entries) {
    c += e.feedback.clarity;
    s += e.feedback.specificity;
    t += e.feedback.strength;
  }
  const n = entries.length;
  const clarity = Math.round((c / n) * 10) / 10;
  const specificity = Math.round((s / n) * 10) / 10;
  const strength = Math.round((t / n) * 10) / 10;
  const overall = Math.round(((clarity + specificity + strength) / 3) * 10) / 10;
  return { clarity, specificity, strength, overall };
}

export async function runSessionReportAgent(
  openai: OpenAI,
  params: {
    mode: PitchMode;
    pitchBrief: string;
    entries: SessionFeedbackEntry[];
  },
): Promise<Omit<SessionAnalysisReport, "id" | "createdAt" | "pitchBrief" | "mode" | "entries" | "answerCount">> {
  const av = averages(params.entries);
  if (!params.entries.length) {
    return {
      averages: av,
      summary:
        "No scored answers were recorded in this session yet. Answer at least one coach question to receive feedback and a full report.",
      topStrengths: ["Start the interview and share concrete specifics in your answers."],
      priorityImprovements: [
        "Come back after a few exchanges so we can score clarity, specificity, and strength.",
      ],
      overallLabel: "Not started",
      overallRating: 0,
    };
  }

  const modeLine = modeInstruction(params.mode);
  const lines = params.entries.map((e, i) => {
    const b = e.feedback.bullets.join(" | ");
    return `${i + 1}. [${e.section}] Scores C=${e.feedback.clarity} S=${e.feedback.specificity} T=${e.feedback.strength}. Notes: ${b}. Answer excerpt: "${e.userAnswer.slice(0, 420)}${e.userAnswer.length > 420 ? "…" : ""}"`;
  });

  const system = `You are Friday's session analyst for PITCHAI. The founder ended a live coaching session.
You write a clear, investor-style wrap-up. No markdown. Be direct and useful.
${modeLine}
${founderContextBlock(params.pitchBrief)}

Numerical averages across answers (0-10): clarity ${av.clarity}, specificity ${av.specificity}, strength ${av.strength}, overall ${av.overall}.`;

  const reportMessages = [
    { role: "system" as const, content: system },
    {
      role: "user" as const,
      content: `Per-answer data:
${lines.join("\n")}

Return JSON only:
{
  "summary": string (3-5 sentences: how the pitch came across across NABC, main pattern of gaps),
  "topStrengths": string[] (2-4 bullets),
  "priorityImprovements": string[] (3-5 actionable bullets ordered by impact),
  "overallLabel": string (one or two words e.g. "Promising", "Needs depth", "Strong"),
  "overallRating": number (1-10 holistic readiness, aligned with the averages)
}`,
    },
  ];

  let completion;
  try {
    completion = await createCoachCompletion(openai, {
      temperature: 0.4,
      maxTokens: 900,
      jsonObject: true,
      messages: reportMessages,
    });
  } catch {
    completion = await createCoachCompletion(openai, {
      temperature: 0.4,
      maxTokens: 900,
      jsonObject: false,
      messages: reportMessages,
    });
  }

  let text = completion.choices[0]?.message?.content || "{}";
  let parsed = tryParseJson<{
    summary: string;
    topStrengths: string[];
    priorityImprovements: string[];
    overallLabel: string;
    overallRating: number;
  }>(text);

  if (!parsed) {
    try {
      const retry = await createCoachCompletion(openai, {
        temperature: 0.35,
        maxTokens: 900,
        jsonObject: false,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Per-answer data:\n${lines.join("\n")}\n\nReturn JSON with summary, topStrengths, priorityImprovements, overallLabel, overallRating.`,
          },
        ],
      });
      text = retry.choices[0]?.message?.content || "{}";
      parsed = tryParseJson<{
        summary: string;
        topStrengths: string[];
        priorityImprovements: string[];
        overallLabel: string;
        overallRating: number;
      }>(text);
    } catch {
      parsed = null;
    }
  }

  if (!parsed?.summary) {
    return {
      averages: av,
      summary: `Session averages: clarity ${av.clarity}/10, specificity ${av.specificity}/10, strength ${av.strength}/10. Keep pushing for numbers, proof, and a sharper wedge.`,
      topStrengths: ["You showed up and iterated with the coach."],
      priorityImprovements: [
        "Add measurable outcomes and named customers.",
        "Tighten differentiation vs alternatives.",
      ],
      overallLabel: av.overall >= 7 ? "Solid" : "Building",
      overallRating: Math.max(1, Math.min(10, Math.round(av.overall))),
    };
  }

  const rating = Number(parsed.overallRating);
  const overallRating = Number.isFinite(rating) ? Math.max(1, Math.min(10, Math.round(rating))) : Math.round(av.overall);

  return {
    averages: av,
    summary: parsed.summary.trim(),
    topStrengths: (parsed.topStrengths || []).filter((x) => typeof x === "string" && x.trim()).slice(0, 5),
    priorityImprovements: (parsed.priorityImprovements || [])
      .filter((x) => typeof x === "string" && x.trim())
      .slice(0, 6),
    overallLabel: String(parsed.overallLabel || "").trim() || "Session complete",
    overallRating,
  };
}
