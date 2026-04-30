import type OpenAI from "openai";
import { founderContextBlock } from "@/lib/coach-context";
import { modeInstruction } from "@/lib/modes";
import type { NABCSection, PitchMode } from "@/types/pitch";
import { FRIDAY_INTERVIEW_SYSTEM } from "./friday-base";
import { createCoachCompletion, tryParseJson } from "./llm-client";
import { sessionMemoryPromptBlock } from "./sessionMemory";
import type { EvaluationAgentResult, InterviewAgentParams } from "./types";

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

function tokenSet(text: string): Set<string> {
  return new Set(text.split(/\s+/).filter((w) => w.length > 2));
}

function jaccardSimilarity(a: string, b: string): number {
  const sa = tokenSet(a);
  const sb = tokenSet(b);
  if (!sa.size || !sb.size) return 0;
  let intersection = 0;
  for (const w of sa) if (sb.has(w)) intersection++;
  return intersection / (sa.size + sb.size - intersection);
}

/**
 * Deterministic gap detection — returns a specific, actionable sentence about
 * what is missing from the founder's answer. Used to anchor follow-up questions
 * so they target the exact missing element, not a generic "tell me more".
 * Priority: model's own followupReason (if substantive) → lowest scoring dimension → fallback.
 */
function detectSpecificGap(ev: EvaluationAgentResult, section: NABCSection): string {
  // Use the evaluator's reason if it's specific enough (more than a generic phrase).
  if (ev.followupReason && ev.followupReason.trim().length > 20) {
    return ev.followupReason.trim();
  }
  const low = Math.min(ev.clarity, ev.specificity, ev.strength);
  // Specificity is the weakest — ask for concrete evidence.
  if (ev.specificity === low && ev.specificity < 6.5) {
    if (section === "competition") {
      return "No named competitor or concrete differentiator — need a specific alternative and one clear reason this beats it.";
    }
    return "No concrete number, named customer, or specific example — need at least one of those.";
  }
  // Clarity is the weakest — the claim itself is unclear.
  if (ev.clarity === low && ev.clarity < 6.5) {
    return "The core claim is unclear — what exactly is being said in one plain sentence?";
  }
  // Strength is the weakest — the argument doesn't hold up.
  if (ev.strength === low && ev.strength < 6.5) {
    if (section === "competition") {
      return "The differentiation argument is weak — what stops an incumbent or well-funded startup from copying this?";
    }
    return "The argument isn't convincing — what is the single strongest proof point?";
  }
  // All dimensions are borderline — ask for the highest-impact missing element.
  return "The answer needs one concrete proof point — a number, a customer, or a measurable result.";
}

/** True when two question strings share ≥62% of their content words — catches paraphrases. */
function looksTooSimilar(a: string, b: string): boolean {
  if (!a || !b) return false;
  const na = normalizeQuestionText(a);
  const nb = normalizeQuestionText(b);
  if (!na || !nb) return false;
  return jaccardSimilarity(na, nb) >= 0.62;
}

export async function runInterviewStart(
  openai: OpenAI,
  params: {
    mode: PitchMode;
    pitchBrief: string;
    sessionLengthMinutes?: number;
    flow?: "interview" | "monologue";
  },
): Promise<{ assistantMessage: string; activeSection: NABCSection }> {
  const modeLine = modeInstruction(params.mode);
  const sm = params.sessionLengthMinutes ?? 5;
  const isMono = params.flow === "monologue";
  const budgetLine =
    sm === 0
      ? `Practice mode — no countdown. You still run the full NABC arc (Need → Approach → Benefits → Competition); prioritize clarity over racing the clock.`
      : `Session budget is ${sm} minutes. Aim to touch all four NABC stages within that window—about a quarter of the time per stage as a loose guide—so nothing important is rushed at the end.`;

  if (isMono) {
    const mono = `${FRIDAY_INTERVIEW_SYSTEM}
${modeLine}
${founderContextBlock(params.pitchBrief)}
${budgetLine}

This is a live pitch pass: in this first message, do not ask a practice question. You will not interrupt them while they speak.
Introduce yourself as Friday in one warm, human short sentence.
Then in 2-4 more sentences, sound encouraging and real: they get one continuous run at their pitch, NABC progress will support them on the side, and you will be quiet and listen until the timer (or if they end early)—then you will talk about how it landed. Invite them to tap "Start session now" when they feel ready, so the clock only then—no need to rush off the start line. Let them take a breath.
${sm === 0 ? "Mention that practice mode has no countdown but one full, calm pass through NABC still matters." : ""}
Do not use markdown.`;
    const completion = await createCoachCompletion(openai, {
      temperature: 0.6,
      maxTokens: 450,
      messages: [
        { role: "system", content: mono },
        { role: "user", content: `Begin. Return JSON: {"assistantMessage": string}` },
      ],
    });
    const text = completion.choices[0]?.message?.content || "{}";
    const parsed = tryParseJson<{ assistantMessage: string }>(text);
    if (parsed?.assistantMessage?.trim()) {
      return { assistantMessage: parsed.assistantMessage.trim(), activeSection: "need" };
    }
    return {
      assistantMessage:
        "I’m Friday—I’ll be in your corner for this. When you’re set, you’ll have one full take to pitch; I’ll stay quiet and really listen, then we’ll talk through how it landed. No rush: tap Start session now when you’re ready—the timer only starts then—and you’ll see NABC along the way.",
      activeSection: "need",
    };
  }

  const system = `${FRIDAY_INTERVIEW_SYSTEM}
${modeLine}
${founderContextBlock(params.pitchBrief)}
${budgetLine}
You are opening the session. Three sentences maximum total.
Introduce yourself as Friday in one short sentence. Then ask ONE sharp opening question about NEED — the specific painful problem, for exactly which person, and why it matters now.
Do not explain what NABC is. Do not list what the session will cover. Do not say "great to meet you". Speak like someone who has already read their brief and wants the real answer.
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
  const recentAssistantQuestions = [...params.messages]
    .filter((m) => m.role === "assistant")
    .slice(-3)
    .map((m) => m.content?.trim())
    .filter(Boolean) as string[];

  let instruction = "";
  if (params.intent === "followup_same_section") {
    const gap = detectSpecificGap(ev, params.activeSection);
    instruction = `Still in ${sectionLabel(params.activeSection)}. Avg score ~${avg.toFixed(1)}.
Specific gap to probe: "${gap}"
Ask ONE question that targets ONLY this gap. Do not ask about anything else.
1 to 2 sentences. Do not open with praise. Do not restate what they said.
${params.pacingMode === "compressed" || params.pacingMode === "urgent" ? "Pacing is tight — one punchy sentence only." : ""}
No markdown.`;
  } else if (params.intent === "advance_section" && params.nextSection && params.nextSection !== "done") {
    instruction = `Move to ${sectionLabel(params.nextSection)} — you heard enough here.
One brief transition (optional, only if something genuinely landed), then ONE strong opening question for ${sectionLabel(params.nextSection)}.
2 sentences max. Do not summarize what they said. Do not list what you want to cover next. No markdown.`;
  } else if (params.intent === "complete_session") {
    instruction = `NABC is done. Tell them in 1-2 sentences that you have what you need and you are ready to build their pitch scripts. Friday's voice — direct, not celebratory. No markdown.`;
  } else {
    instruction = `Ask ONE sharp question in Friday's voice. 1-2 sentences. No markdown.`;
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
${recentAssistantQuestions.length > 0 ? `\nRecent Friday questions — do NOT repeat or closely paraphrase any of these:\n${recentAssistantQuestions.map((q, i) => `${i + 1}. "${q}"`).join("\n")}` : ""}

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
    const tooSimilar = recentAssistantQuestions.some((q) => looksTooSimilar(nextLine, q));
    if (!tooSimilar) {
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
        "Give me one concrete number or real example that makes this undeniable — a user count, a cost, a frequency, or a named customer who felt this acutely.",
    };
  }
  if (params.nextSection && params.nextSection !== "done") {
    return {
      assistantMessage: `Let's move to ${sectionLabel(params.nextSection)} — give me the strongest concrete version in 2-4 sentences.`,
    };
  }
  return { assistantMessage: "Say more, with specifics and numbers." };
}
