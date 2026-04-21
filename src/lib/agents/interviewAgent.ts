import type OpenAI from "openai";
import { founderContextBlock } from "@/lib/coach-context";
import { modeInstruction } from "@/lib/modes";
import type { NABCSection, PitchMode } from "@/types/pitch";
import { FRIDAY_INTERVIEW_SYSTEM } from "./friday-base";
import { createCoachCompletion, tryParseJson } from "./llm-client";
import type { ApiMsg, EvaluationAgentResult, InterviewAgentParams } from "./types";

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

export async function runInterviewStart(
  openai: OpenAI,
  params: { mode: PitchMode; pitchBrief: string },
): Promise<{ assistantMessage: string; activeSection: NABCSection }> {
  const modeLine = modeInstruction(params.mode);
  const system = `${FRIDAY_INTERVIEW_SYSTEM}
${modeLine}
${founderContextBlock(params.pitchBrief)}
You are starting the interview. Introduce yourself as Friday in ONE short sentence only (first session message).
Then 1-2 sentences of expectations. Then ask ONE sharp first question about NEED only.
Do not use markdown.`;

  const completion = await createCoachCompletion(openai, {
    temperature: 0.65,
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

  const system = `${FRIDAY_INTERVIEW_SYSTEM}
${modeLine}
${founderContextBlock(params.pitchBrief)}`;

  let instruction = "";
  if (params.intent === "followup_same_section") {
    instruction = `You are still in ${sectionLabel(params.activeSection)}.
The founder's last answer needs a follow-up (avg score ~${avg.toFixed(1)}).
Evaluation notes: needsFollowup=${ev.needsFollowup}. ${ev.followupReason ? `Reason: ${ev.followupReason}` : ""}
Ask ONE incisive follow-up question in Friday's voice. Probe for numbers, proof, specificity, or wedge vs alternatives as appropriate.
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
    temperature: 0.55,
    messages: [
      { role: "system", content: system },
      ...params.messages.map((m) => ({ role: m.role, content: m.content })),
      {
        role: "user",
        content: `${instruction}

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
    return { assistantMessage: parsed.assistantMessage.trim() };
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
        "Go deeper: who exactly feels this pain, how often, and what measurable outcome proves you're solving it?",
    };
  }
  if (params.nextSection && params.nextSection !== "done") {
    return {
      assistantMessage: `Let's move to ${sectionLabel(params.nextSection)} — give me the strongest concrete version in 2-4 sentences.`,
    };
  }
  return { assistantMessage: "Say more, with specifics and numbers." };
}
