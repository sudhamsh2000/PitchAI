import type OpenAI from "openai";
import { founderContextBlock } from "@/lib/coach-context";
import { modeInstruction } from "@/lib/modes";
import type { NABCSection, PitchMode } from "@/types/pitch";
import { FRIDAY_INTERVIEW_SYSTEM } from "./friday-base";
import { createCoachCompletion, tryParseJson } from "./llm-client";
import { sessionMemoryPromptBlock, type SessionMemory } from "./sessionMemory";
import type { RewriteAgentResult } from "./types";

export async function runRewriteAgent(
  openai: OpenAI,
  params: {
    mode: PitchMode;
    pitchBrief: string;
    userAnswer: string;
    activeSection: NABCSection;
    feedback: { clarity: number; specificity: number; strength: number; bullets: string[] };
    sessionMemory?: SessionMemory;
  },
): Promise<RewriteAgentResult> {
  const modeLine = modeInstruction(params.mode);
  const memoryBlock = params.sessionMemory ? `\n${sessionMemoryPromptBlock(params.sessionMemory)}` : "";
  const system = `${FRIDAY_INTERVIEW_SYSTEM}
${modeLine}
${founderContextBlock(params.pitchBrief)}
${memoryBlock}
You are rewriting the founder's answer for section "${params.activeSection}".
Preserve intent; improve clarity and specificity; keep it credible (not marketing hype).
Prioritize fixing recurring weaknesses from session memory while keeping strengths intact.
Return JSON only.`;

  const completion = await createCoachCompletion(openai, {
    temperature: 0.55,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `Original:
"""
${params.userAnswer}
"""

Scores: clarity ${params.feedback.clarity}, specificity ${params.feedback.specificity}, strength ${params.feedback.strength}.
Critiques: ${params.feedback.bullets.join(" | ")}

Return JSON:
{
  "improvedAnswer": string (3-8 sentences, voice-friendly),
  "whyItIsBetter": string[] (2-4 bullets: what changed and why it lands better)
}`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content || "{}";
  const parsed = tryParseJson<{ improvedAnswer: string; whyItIsBetter?: string[] }>(text);
  const improved =
    parsed?.improvedAnswer?.trim() ||
    "We solve a well-defined problem for a specific customer, with a differentiated approach and measurable outcomes compared with how buyers solve it today.";
  const why =
    (parsed?.whyItIsBetter || [])
      .filter((s) => typeof s === "string" && s.trim())
      .slice(0, 4) || ["More concrete than the original.", "Better specificity for investors."];

  return { improvedAnswer: improved, whyItIsBetter: why };
}
