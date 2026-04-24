import type OpenAI from "openai";
import { founderContextBlock } from "@/lib/coach-context";
import { modeInstruction } from "@/lib/modes";
import type { PitchMode } from "@/types/pitch";
import { FRIDAY_INTERVIEW_SYSTEM } from "./friday-base";
import { createCoachCompletion, tryParseJson } from "./llm-client";

export async function runMonologueDebrief(
  openai: OpenAI,
  params: { mode: PitchMode; pitchBrief: string; monologue: string; sessionLengthMinutes: number },
): Promise<{ assistantMessage: string }> {
  const modeLine = modeInstruction(params.mode);
  const sm = params.sessionLengthMinutes;
  const timeLine =
    sm === 0
      ? "This was an untimed practice run."
      : `They had a ${sm}-minute window for a continuous pitch.`;

  const system = `${FRIDAY_INTERVIEW_SYSTEM}
${modeLine}
${founderContextBlock(params.pitchBrief)}

They just finished one uninterrupted run—their full pitch, in their own words, while you stayed quiet. ${timeLine}

This is your first real chance to respond. Sound like a human who was listening, not a bot summarizing. Start from what actually landed: one or two real observations (momentum, clarity, a gap, something they made you curious about) in plain language. Then have a natural conversation: 2-3 follow-ups that help them think like an investor about delivery, structure, and NABC—open enough that they can explain, not yes/no. If dictation is messy, stay with what they clearly meant.
Never paste their words back in big blocks, never sound like a template. No markdown.`;

  const completion = await createCoachCompletion(openai, {
    temperature: 0.7,
    maxTokens: 680,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `What they said (live, may be messy from dictation):
"""
${params.monologue.slice(0, 12_000)}${params.monologue.length > 12_000 ? "\n…" : ""}
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
  return {
    assistantMessage:
      "I heard you all the way through—thanks for trusting the room. I’m curious: what part of the pitch felt strongest when you were in it, and what would you change first if you only had a minute? And what’s one real signal—an anecdote, a number, a customer—that would make the need feel undeniable?",
  };
}
