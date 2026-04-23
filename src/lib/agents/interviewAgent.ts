import type OpenAI from "openai";
import { founderContextBlock } from "@/lib/coach-context";
import { modeInstruction } from "@/lib/modes";
import type { NABCSection, PitchMode } from "@/types/pitch";
import { FRIDAY_INTERVIEW_SYSTEM } from "./friday-base";
import { createCoachCompletion, tryParseJson } from "./llm-client";
import { sessionMemoryPromptBlock } from "./sessionMemory";
import type { InterviewAgentParams } from "./types";

function sectionLabel(s: NABCSection | "done") {
  switch (s) {
    case "need":
      return "NEED";
    case "approach":
      return "APPROACH";
    case "benefits":
      return "BENEFITS";
    case "competition":
      return "COMPETITION";
    default:
      return "DONE";
  }
}

function normalizeQuestionText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function looksTooSimilar(a: string, b: string) {
  if (!a || !b) return false;
  const na = normalizeQuestionText(a);
  const nb = normalizeQuestionText(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export async function runInterviewStart(
  openai: OpenAI,
  params: { mode: PitchMode; pitchBrief: string; sessionLengthMinutes?: number },
): Promise<{ assistantMessage: string; activeSection: NABCSection }> {
  const modeLine = modeInstruction(params.mode);
  const sm = params.sessionLengthMinutes ?? 5;
  const budgetLine =
    sm === 0
      ? `Practice mode — no countdown. You still run the full NABC arc (Need → Approach → Benefits → Competition); prioritize clarity over racing the clock.`
      : `Session budget is ${sm} minutes. Aim to touch all four NABC stages within that window—about a quarter of the time per stage as a loose guide—so nothing important is rushed at the end.`;
  const system = `${FRIDAY_INTERVIEW_SYSTEM}
${modeLine}
${founderContextBlock(params.pitchBrief)}
${budgetLine}
You are starting the interview. Introduce yourself as Friday in ONE short sentence only (first session message).
Then 1-2 sentences of expectations. Then ask ONE sharp first question about NEED only.
Do not use markdown.`;

  const completion = await createCoachCompletion(openai, {
    temperature: 0.65,
    maxTokens: 420,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `Begin. Return JSON: {"assistantMessage": string}`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content || "{}";
  const parsed = tryParseJson<{ assistantMessage: string }>(text);
  if (parsed?.assistantMessage?.trim()) {
    return { assistantMessage: parsed.assistantMessage.trim(), activeSection: "need" };
  }
  return {
    assistantMessage:
      "I'm Friday, your pitch coach. We'll run your pitch in NABC — I need specifics, not slogans. What painful, expensive problem are you solving, for exactly which customer, and why now?",
    activeSection: "need",
  };
}

export async function runInterviewNext(
  openai: OpenAI,
  params: InterviewAgentParams,
): Promise<{ assistantMessage: string }> {
  const modeLine = modeInstruction(params.mode);
  const ev = params.evaluation;
  const avg = (ev.clarity + ev.specificity + ev.strength) / 3;

  const memoryBlock = params.sessionMemory ? `\n${sessionMemoryPromptBlock(params.sessionMemory)}` : "";
  const sm = params.sessionLengthMinutes ?? 5;
  const timeBlock =
    sm === 0
      ? `\nPractice mode — no countdown. Still reach Need, Approach, Benefits, and Competition with solid depth before wrapping up.`
      : `\nSession budget: ${sm} min. Remaining: ${Math.max(0, params.remainingSeconds ?? 0)} sec. Pacing mode: ${params.pacingMode || "normal"}.
Timed sessions: keep all four NABC stages on track before time expires—about ~25% of clock per stage unless extra probes are clearly needed.`;
  const system = `${FRIDAY_INTERVIEW_SYSTEM}
${modeLine}
${founderContextBlock(params.pitchBrief)}${memoryBlock}${timeBlock}`;
  const lastAssistantQuestion = [...params.messages]
    .reverse()
    .find((m) => m.role === "assistant")
    ?.content?.trim();

  let instruction = "";
  if (params.intent === "followup_same_section") {
    instruction = `You are still in ${sectionLabel(params.activeSection)}.
The founder's last answer needs a follow-up (avg score ~${avg.toFixed(1)}).
Evaluation notes: needsFollowup=${ev.needsFollowup}. ${ev.followupReason ? `Reason: ${ev.followupReason}` : ""}
Ask ONE incisive follow-up question in Friday's voice. Probe for numbers, proof, specificity, or wedge vs alternatives as appropriate.
Bias the question toward recurring weaknesses from session memory when relevant.
Assume some speech-to-text noise and infer likely meaning before challenging details.
Do NOT repeat or paraphrase your previous question.
If pacing is compressed/urgent, keep the question short and prioritize highest-impact gap.
Do not repeat the evaluation verbatim. No markdown.`;
  } else if (params.intent === "advance_section" && params.nextSection && params.nextSection !== "done") {
    instruction = `You are moving forward in NABC to ${sectionLabel(params.nextSection)}.
Briefly acknowledge momentum in one short phrase, then ask the FIRST strong question for ${sectionLabel(params.nextSection)}.
Stay mode-aware. ONE main question (you may add one short clarifying clause). No markdown.`;
  } else if (params.intent === "complete_session") {
    instruction = `The NABC interview is complete. Say you're ready to generate final pitch scripts from what they shared.
2 short sentences max, Friday's voice. No markdown.`;
  } else {
    instruction = `Ask ONE sharp Friday question. No markdown.`;
  }

  const completion = await createCoachCompletion(openai, {
    temperature: 0.35,
    maxTokens: 320,
    messages: [
      { role: "system", content: system },
      ...params.messages.map((m) => ({ role: m.role, content: m.content })),
      {
        role: "user",
        content: `${instruction}
${lastAssistantQuestion ? `\nPrevious Friday question (do not repeat): "${lastAssistantQuestion}"` : ""}

Latest founder answer (for context):
"""
${params.userAnswer}
"""

Return JSON: {"assistantMessage": string}`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content || "{}";
  const parsed = tryParseJson<{ assistantMessage: string }>(text);
  if (parsed?.assistantMessage?.trim()) {
    const nextLine = parsed.assistantMessage.trim();
    if (!looksTooSimilar(nextLine, lastAssistantQuestion || "")) {
      return { assistantMessage: nextLine };
    }
  }

  if (params.intent === "complete_session") {
    return {
      assistantMessage:
        "Good — we've covered NABC with enough depth. I'll generate your 30-second, 1-minute, and 3-minute pitches plus deck bullets next.",
    };
  }
  if (params.intent === "followup_same_section") {
    return {
      assistantMessage:
        "I hear you. Give me a realistic range, not a perfect number: what % of target users see this issue weekly, and how does your pen perform versus cheap and premium alternatives?",
    };
  }
  if (params.nextSection && params.nextSection !== "done") {
    return {
      assistantMessage: `Let's move to ${sectionLabel(params.nextSection)} — give me the strongest concrete version in 2-4 sentences.`,
    };
  }
  return { assistantMessage: "Say more, with specifics and numbers." };
}
