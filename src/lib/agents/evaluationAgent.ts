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
        content: `Evaluate ONLY this latest founder answer.

"""
${params.userAnswer}
"""

Scoring rules:
- Reconstruct likely intent first if phrasing looks like noisy speech-to-text.
- Scores 0-10. Give 8+ only for answers with named customers, real metrics, or concrete proof.
- clarity: is the core claim understandable in one read?
- specificity: are there actual numbers, names, or examples — not just adjectives?
- strength: is the argument convincing to a skeptical investor?

needsFollowup rules (keep this a high bar — do NOT set true for stylistic improvement):
- Set true ONLY if the answer is missing something that would materially change an investor's decision: a key metric, a named customer or user type, or a concrete differentiator.
- If the overall impression is "reasonable but could be tighter" and avg score is ≥ 7 — set false and move forward.
- Vague phrasing alone is not enough; missing proof that matters is.

followupReason rules:
- If needsFollowup is true: write ONE short, specific phrase naming what is missing and what would fix it.
  Format: "[what's missing] — [what would fix it]"
  Good examples: "No customer type named — need a specific user or company segment." / "No metric given — need a number, frequency, or cost." / "Differentiation is hand-wavy — how is this different from [the obvious alternative]?"
  Bad examples: "Could be more specific." / "Needs more detail." / "Vague answer."
- If needsFollowup is false: set followupReason to null.

Return JSON exactly:
{
  "clarity": number,
  "specificity": number,
  "strength": number,
  "feedback": string[],
  "needsFollowup": boolean,
  "followupReason": string | null
}
feedback: 2-4 sharp bullets. No generic praise. If healthcare mode, flag unsupported clinical or compliance claims.`,
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
