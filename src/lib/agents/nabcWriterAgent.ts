import type OpenAI from "openai";
import type { NABCEvaluation, NABCWrittenReport } from "@/types/nabc-lab";
import { createCoachCompletion, normalizeScore, tryParseJson } from "./llm-client";

export async function runNABCWriterAgent(
  openai: OpenAI,
  params: { evaluation: NABCEvaluation; teamName?: string },
): Promise<NABCWrittenReport> {
  const completion = await createCoachCompletion(openai, {
    temperature: 0.35,
    maxTokens: 1500,
    jsonObject: true,
    messages: [
      {
        role: "system",
        content:
          "You are a technical writing assistant. Turn evaluation JSON into a clean, readable report suitable for course submission.",
      },
      {
        role: "user",
        content: `Write a structured NABC report from this evaluation JSON:
${JSON.stringify(params.evaluation)}

Team name: ${params.teamName || "Team"}

Return JSON exactly:
{
  "title": string,
  "executiveSummary": string,
  "scoreBreakdown": [
    { "category": string, "score": number, "rationale": string }
  ],
  "strengths": string[],
  "weaknesses": string[],
  "recommendedImprovements": string[],
  "conclusion": string
}

Rules:
- executiveSummary: 1-2 short paragraphs.
- scoreBreakdown: include all 7 categories.
- rationale entries should be specific and evidence-linked.
- conclusion: 1 paragraph with next-step focus.`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content || "{}";
  const parsed = tryParseJson<NABCWrittenReport>(text);
  if (!parsed) {
    const r = params.evaluation.rubric;
    return {
      title: `${params.teamName || "Team"} NABC Evaluation Report`,
      executiveSummary: params.evaluation.summary,
      scoreBreakdown: [
        { category: "Hook", score: r.hook, rationale: "Derived from evaluator output." },
        { category: "Need", score: r.need, rationale: "Derived from evaluator output." },
        { category: "Approach", score: r.approach, rationale: "Derived from evaluator output." },
        { category: "Benefits", score: r.benefits, rationale: "Derived from evaluator output." },
        { category: "Competition", score: r.competition, rationale: "Derived from evaluator output." },
        { category: "Risks", score: r.risks, rationale: "Derived from evaluator output." },
        {
          category: "Risk mitigation strategies",
          score: r.riskMitigationStrategies,
          rationale: "Derived from evaluator output.",
        },
      ],
      strengths: params.evaluation.strengths,
      weaknesses: params.evaluation.weaknesses,
      recommendedImprovements: params.evaluation.recommendedImprovements,
      conclusion: "Use the recommended improvements to iterate the presentation and retest.",
    };
  }

  return {
    title: parsed.title?.trim() || `${params.teamName || "Team"} NABC Evaluation Report`,
    executiveSummary: parsed.executiveSummary?.trim() || params.evaluation.summary,
    scoreBreakdown: (parsed.scoreBreakdown || []).slice(0, 10).map((row) => ({
      category: row.category,
      score: normalizeScore(row.score, 5),
      rationale: row.rationale,
    })),
    strengths: (parsed.strengths || []).filter(Boolean).slice(0, 10),
    weaknesses: (parsed.weaknesses || []).filter(Boolean).slice(0, 10),
    recommendedImprovements: (parsed.recommendedImprovements || []).filter(Boolean).slice(0, 12),
    conclusion: parsed.conclusion?.trim() || "Report complete.",
  };
}
