import type OpenAI from "openai";
import { founderContextBlock } from "@/lib/coach-context";
import { modeInstruction } from "@/lib/modes";
import type { FinalPitches, PitchMode, SessionFeedbackEntry } from "@/types/pitch";
import { FRIDAY_INTERVIEW_SYSTEM } from "./friday-base";
import { createCoachCompletion, tryParseJson } from "./llm-client";
import { buildSessionMemory, strongestAnswersBySection } from "./sessionMemory";
import type { ApiMsg } from "./types";

export async function runPitchComposerAgent(
  openai: OpenAI,
  params: {
    mode: PitchMode;
    pitchBrief: string;
    messages: ApiMsg[];
    feedbackHistory?: SessionFeedbackEntry[];
    sessionLengthMinutes?: number;
  },
): Promise<FinalPitches> {
  const modeLine = modeInstruction(params.mode);
  const memory = buildSessionMemory({
    pitchBrief: params.pitchBrief,
    mode: params.mode,
    currentStage: "competition",
    feedbackHistory: params.feedbackHistory || [],
  });
  const strongest = strongestAnswersBySection(memory);
  const strongestBlock = ["need", "approach", "benefits", "competition"]
    .map((s) => {
      const row = strongest.get(s as "need" | "approach" | "benefits" | "competition");
      return row ? `- ${s}: ${row.answer}` : `- ${s}: (no strong refined answer yet)`;
    })
    .join("\n");
  const system = `${FRIDAY_INTERVIEW_SYSTEM}
${modeLine}
${founderContextBlock(params.pitchBrief)}
You compose final investor-ready scripts from the conversation. Ground every claim in what the founder actually said; do not invent traction numbers they did not provide.
${(params.sessionLengthMinutes ?? 5) === 0 ? `Practice session (no fixed timer). Compose investor-ready scripts from what they shared.` : `Session budget was ${params.sessionLengthMinutes ?? 5} minutes. If budget <= 3 minutes, prioritize concise, practical 30s/1m outputs and keep 3m compact.
If budget >= 7 minutes, allow fuller detail and richer 3m structure.`}
Use these strongest refined answers as primary source material:
${strongestBlock}`;

  const completion = await createCoachCompletion(openai, {
    temperature: 0.45,
    messages: [
      { role: "system", content: system },
      ...params.messages.map((m) => ({ role: m.role, content: m.content })),
      {
        role: "user",
        content: `Produce JSON:
{
  "pitch30s": string,
  "pitch1m": string,
  "pitch3m": string,
  "deckBullets": string[]
}
deckBullets: 8-12 tight bullets. No markdown in strings.`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content || "{}";
  const parsed = tryParseJson<{
    pitch30s: string;
    pitch1m: string;
    pitch3m: string;
    deckBullets: string[];
  }>(text);

  if (parsed?.pitch30s && parsed?.pitch1m && parsed?.pitch3m) {
    return {
      pitch30s: parsed.pitch30s.trim(),
      pitch1m: parsed.pitch1m.trim(),
      pitch3m: parsed.pitch3m.trim(),
      deckBullets: (parsed.deckBullets || []).filter((b) => typeof b === "string" && b.trim()).slice(0, 14),
    };
  }

  return {
    pitch30s:
      "We focus on a specific customer pain, deliver a differentiated approach, and measure outcomes that matter — with a clear view of competition and why we can win.",
    pitch1m:
      "Our team targets a well-defined problem for a concrete user segment. The approach is differentiated by how we deliver value faster or more reliably than alternatives. We prioritize measurable outcomes and a credible path to scale, with honest framing of competition and risk.",
    pitch3m:
      "We identified a recurring, costly problem for a specific set of users and designed an approach that fits into their workflow while producing measurable improvements. Our differentiation is not slogans — it is how we deliver outcomes relative to status-quo options. We are focused on proving repeatability, then expanding distribution with disciplined economics and clear milestones.",
    deckBullets: [
      "Problem & who feels it most",
      "Why existing options fall short",
      "Product / approach (mechanism, not buzzwords)",
      "Benefits with measurable framing",
      "Traction or validation (only if stated)",
      "Business model (if stated)",
      "Competition & wedge",
      "Risks & mitigations (esp. healthcare if relevant)",
      "Team edge (if stated)",
      "Ask & use of funds (if stated)",
    ],
  };
}
