import type OpenAI from "openai";
import type { NABCEvaluation } from "@/types/nabc-lab";
import { EVALUATOR_SYSTEM } from "./friday-base";
import { createCoachCompletion, normalizeScore, tryParseJson } from "./llm-client";

export async function runNABCEvaluatorAgent(
  openai: OpenAI,
  params: { transcript: string },
): Promise<NABCEvaluation> {
  const system = `${EVALUATOR_SYSTEM}
You are evaluating an NABC presentation transcript for course assessment.
Score each rubric area from 0 to 10:
- Hook
- Need
- Approach
- Benefits
- Competition
- Risks
- Risk mitigation strategies

Output should focus on substance quality in the transcript.
Do not invent facts that are not present in the transcript.`;

  const completion = await createCoachCompletion(openai, {
    temperature: 0.2,
    maxTokens: 1400,
    jsonObject: true,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `Evaluate this transcript:
"""
${params.transcript}
"""

Return JSON exactly:
{
  "rubric": {
    "hook": number,
    "need": number,
    "approach": number,
    "benefits": number,
    "competition": number,
    "risks": number,
    "riskMitigationStrategies": number
  },
  "strengths": string[],
  "weaknesses": string[],
  "recommendedImprovements": string[],
  "summary": string
}

Rules:
- Scores are 0-10.
- strengths: 3-6 bullets.
- weaknesses: 3-6 bullets.
- recommendedImprovements: 4-8 concrete actions.
- summary: 5-8 sentences, concise but specific.`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content || "{}";
  const parsed = tryParseJson<NABCEvaluation>(text);
  if (!parsed) {
    return {
      rubric: {
        hook: 5,
        need: 5,
        approach: 5,
        benefits: 5,
        competition: 5,
        risks: 5,
        riskMitigationStrategies: 5,
      },
      strengths: ["Unable to parse model output reliably."],
      weaknesses: ["Evaluation parsing failed; rerun analysis."],
      recommendedImprovements: ["Retry with a cleaner transcript and clear speaker breaks."],
      summary:
        "The transcript could not be parsed into the expected evaluation schema. Re-run the pipeline.",
    };
  }

  return {
    rubric: {
      hook: normalizeScore(parsed.rubric?.hook, 5),
      need: normalizeScore(parsed.rubric?.need, 5),
      approach: normalizeScore(parsed.rubric?.approach, 5),
      benefits: normalizeScore(parsed.rubric?.benefits, 5),
      competition: normalizeScore(parsed.rubric?.competition, 5),
      risks: normalizeScore(parsed.rubric?.risks, 5),
      riskMitigationStrategies: normalizeScore(parsed.rubric?.riskMitigationStrategies, 5),
    },
    strengths: (parsed.strengths || []).filter(Boolean).slice(0, 8),
    weaknesses: (parsed.weaknesses || []).filter(Boolean).slice(0, 8),
    recommendedImprovements: (parsed.recommendedImprovements || []).filter(Boolean).slice(0, 10),
    summary: parsed.summary?.trim() || "NABC evaluation generated.",
  };
}
