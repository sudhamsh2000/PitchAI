import type OpenAI from "openai";
import { founderContextBlock } from "@/lib/coach-context";
import { modeInstruction } from "@/lib/modes";
import type { NABCSection, PitchMode } from "@/types/pitch";
import { EVALUATOR_SYSTEM } from "./friday-base";
import { createCoachCompletion, normalizeScore, tryParseJson } from "./llm-client";
import { sessionMemoryPromptBlock, type SessionMemory } from "./sessionMemory";
import type { ApiMsg, EvaluationAgentResult } from "./types";

export async function runEvaluationAgent(
  openai: OpenAI,
  params: {
    mode: PitchMode;
    pitchBrief: string;
    messages: ApiMsg[];
    activeSection: NABCSection;
    followUpsAskedThisSection: number;
    userAnswer: string;
    sessionMemory?: SessionMemory;
  },
): Promise<EvaluationAgentResult> {
  const modeLine = modeInstruction(params.mode);
  const memoryBlock = params.sessionMemory ? `\n${sessionMemoryPromptBlock(params.sessionMemory)}` : "";
  const system = `${EVALUATOR_SYSTEM}
${modeLine}
${founderContextBlock(params.pitchBrief)}
NABC section under review: ${params.activeSection}.
Follow-ups already asked in this section: ${params.followUpsAskedThisSection}.${memoryBlock}
Use session memory to identify recurring weakness patterns.`;

  const completion = await createCoachCompletion(openai, {
    temperature: 0.25,
    maxTokens: 440,
    messages: [
      { role: "system", content: system },
      ...params.messages.map((m) => ({ role: m.role, content: m.content })),
      {
        role: "user",
        content: `Evaluate ONLY this latest founder answer (not the whole thread for scoring context beyond clarity).

"""
${params.userAnswer}
"""

Return JSON exactly:
{
  "clarity": number,
  "specificity": number,
  "strength": number,
  "feedback": string[],
  "needsFollowup": boolean,
  "followupReason": string | null
}
(feedback: 2-4 sharp lines; needsFollowup true if vague/unproven/hand-wavy.)

Rules:
- First reconstruct likely intent if phrasing looks like noisy speech-to-text.
- Scores 0-10. 8+ only for genuinely specific, evidence-backed answers.
- needsFollowup true if the answer is vague, generic, missing proof, missing numbers when relevant, or hand-wavy vs competition.
- If healthcare mode, flag unsupported clinical or compliance claims.`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content || "{}";
  const parsed = tryParseJson<{
    clarity: number;
    specificity: number;
    strength: number;
    feedback: string[];
    needsFollowup: boolean;
    followupReason?: string | null;
  }>(text);

  if (!parsed) {
    return {
      clarity: 5,
      specificity: 4,
      strength: 5,
      feedback: [
        "This needs more concrete specifics.",
        "Add who, how much, how often, and measurable impact.",
      ],
      needsFollowup: true,
      followupReason: "Answer was too thin to score confidently.",
    };
  }

  const feedback = (parsed.feedback || [])
    .filter((b) => typeof b === "string" && b.trim())
    .slice(0, 4);

  return {
    clarity: normalizeScore(parsed.clarity, 5),
    specificity: normalizeScore(parsed.specificity, 5),
    strength: normalizeScore(parsed.strength, 5),
    feedback:
      feedback.length > 0
        ? feedback
        : ["Tighten this with specifics and proof.", "Quantify impact and name the exact user."],
    needsFollowup: Boolean(parsed.needsFollowup),
    followupReason: parsed.followupReason?.trim() || undefined,
  };
}
