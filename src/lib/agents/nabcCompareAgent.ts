import type OpenAI from "openai";
import type { NABCComparisonReport } from "@/types/nabc-lab";
import { createCoachCompletion, tryParseJson } from "./llm-client";

export async function runNABCCompareAgent(
  openai: OpenAI,
  params: { transcriptBasedReport: string; videoBasedReport: string },
): Promise<NABCComparisonReport> {
  const completion = await createCoachCompletion(openai, {
    temperature: 0.35,
    maxTokens: 1400,
    jsonObject: true,
    messages: [
      {
        role: "system",
        content:
          "You compare two NABC analyses: transcript-based vs video-based. Explain overlap and divergence in a balanced, academic tone.",
      },
      {
        role: "user",
        content: `Compare these two reports.

Transcript-based report:
"""
${params.transcriptBasedReport}
"""

Video-based report:
"""
${params.videoBasedReport}
"""

Return JSON exactly:
{
  "transcriptSummary": string,
  "videoSummary": string,
  "similarities": string[],
  "differences": string[],
  "whyDifferencesExist": string[],
  "finalReflection": string
}

Rules:
- similarities: 3-6 bullets.
- differences: 4-8 bullets.
- whyDifferencesExist: 3-6 bullets.
- finalReflection: 2-4 paragraphs, enough for 1-2 page section when expanded.`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content || "{}";
  const parsed = tryParseJson<NABCComparisonReport>(text);
  if (!parsed) {
    return {
      transcriptSummary: "Transcript-based analysis completed.",
      videoSummary: "Video-based analysis completed.",
      similarities: ["Both analyses reviewed NABC coverage."],
      differences: ["Automatic comparison parsing failed; rerun with cleaner inputs."],
      whyDifferencesExist: ["Video carries delivery signals not present in plain text."],
      finalReflection:
        "The two analyses likely diverge because transcript input omits nonverbal and delivery cues.",
    };
  }
  return {
    transcriptSummary: parsed.transcriptSummary?.trim() || "",
    videoSummary: parsed.videoSummary?.trim() || "",
    similarities: (parsed.similarities || []).filter(Boolean).slice(0, 10),
    differences: (parsed.differences || []).filter(Boolean).slice(0, 12),
    whyDifferencesExist: (parsed.whyDifferencesExist || []).filter(Boolean).slice(0, 10),
    finalReflection: parsed.finalReflection?.trim() || "",
  };
}
