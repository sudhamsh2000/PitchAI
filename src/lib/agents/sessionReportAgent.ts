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

const neutralAverages = () => ({
  clarity: 6.5,
  specificity: 6.5,
  strength: 6.5,
  overall: 6.5,
});

/** Post–live monologue: one narrative report from full pitch + debrief Q&A, no per-turn scores. */
export async function runMonologueSessionReportAgent(
  openai: OpenAI,
  params: {
    mode: PitchMode;
    pitchBrief: string;
    monologue: string;
    debriefReply: string;
  },
): Promise<Omit<SessionAnalysisReport, "id" | "createdAt" | "pitchBrief" | "mode" | "entries" | "answerCount">> {
  const av = neutralAverages();
  const modeLine = modeInstruction(params.mode);
  const system = `You are Friday, the same real coach the founder has been speaking with—this is your written wrap-up, not a lab report. They gave one full live pitch, then a real back-and-forth about delivery. Sound like a person who was paying attention: warm where it helps, never fluffy, no bot voice.
The summary should read like a candid conversation recap an investor would respect—clear, specific, and human. No markdown. No "As an AI" phrasing. No bullet-point stiffness in the JSON strings themselves; still use the JSON structure requested.
${modeLine}
${founderContextBlock(params.pitchBrief)}

There are no per-answer scores—infer a holistic view from the monologue and their debrief, including how their follow-up comments clarify intent. Return JSON with summary, topStrengths, priorityImprovements, overallLabel, overallRating (1-10), and also clarity, specificity, strength (0-10) as your honest estimate of how the pitch landed in delivery, not a generic middle score.`;

  const userContent = `MONOLOGUE:
${params.monologue.slice(0, 14_000)}${params.monologue.length > 14_000 ? "\n…" : ""}

FOLLOW-UP (their response to your delivery questions):
${params.debriefReply.slice(0, 4_000)}${params.debriefReply.length > 4_000 ? "…" : ""}

Return JSON only:
{
  "summary": string,
  "topStrengths": string[],
  "priorityImprovements": string[],
  "overallLabel": string,
  "overallRating": number,
  "clarity": number,
  "specificity": number,
  "strength": number
}`;

  let completion;
  try {
    completion = await createCoachCompletion(openai, {
      temperature: 0.5,
      maxTokens: 1_000,
      jsonObject: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    });
  } catch {
    completion = await createCoachCompletion(openai, {
      temperature: 0.5,
      maxTokens: 1_000,
      jsonObject: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    });
  }

  const text = completion.choices[0]?.message?.content || "{}";
  const parsed = tryParseJson<{
    summary: string;
    topStrengths: string[];
    priorityImprovements: string[];
    overallLabel: string;
    overallRating: number;
    clarity?: number;
    specificity?: number;
    strength?: number;
  }>(text);

  const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

  if (!parsed?.summary?.trim()) {
    return {
      averages: av,
      summary:
        "You made it through a full run and a real debrief—that already moves the needle. When you have a quiet moment, skim your pitch for one sharper proof point on the need, one line that says how you are different, and one outcome you can name.",
      topStrengths: ["You put a full pass on the table under the kind of time pressure a real raise feels like."],
      priorityImprovements: [
        "Point to one urgent proof the problem is real, not just annoying.",
        "Say how you are different in one clear sentence, not a feature list.",
        "Tie a benefit to a number, pilot, or customer story you can stand behind.",
      ],
      overallLabel: "On the board",
      overallRating: 6,
    };
  }

  const c = clamp(Number(parsed.clarity ?? 6.5), 0, 10);
  const sp = clamp(Number(parsed.specificity ?? 6.5), 0, 10);
  const st = clamp(Number(parsed.strength ?? 6.5), 0, 10);
  const o = Math.round(((c + sp + st) / 3) * 10) / 10;

  return {
    averages: {
      clarity: Math.round(c * 10) / 10,
      specificity: Math.round(sp * 10) / 10,
      strength: Math.round(st * 10) / 10,
      overall: o,
    },
    summary: parsed.summary.trim(),
    topStrengths: (parsed.topStrengths || [])
      .filter((x) => typeof x === "string" && x.trim())
      .slice(0, 5),
    priorityImprovements: (parsed.priorityImprovements || [])
      .filter((x) => typeof x === "string" && x.trim())
      .slice(0, 6),
    overallLabel: String(parsed.overallLabel || "").trim() || "Session complete",
    overallRating: clamp(Math.round(Number(parsed.overallRating) || 6), 1, 10),
  };
}
