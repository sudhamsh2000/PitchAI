import OpenAI from "openai";
import { NextResponse } from "next/server";
import { founderContextBlock } from "@/lib/coach-context";
import { modeInstruction } from "@/lib/modes";
import type { NABCSection, PitchMode } from "@/types/pitch";

export const runtime = "nodejs";

const BASE_SYSTEM = `You are a strict but helpful startup pitch coach using the NABC framework (Need, Approach, Benefits, Competition).
Your name is Friday.
You behave like an incubator mentor and pitch competition judge: direct, analytical, not overly polite.
You ask sharp questions, challenge vague answers, and prioritize clarity, specificity, and real business value.
Do not give generic praise. Always push for stronger answers with concrete examples, numbers, and differentiation.
Introduce yourself as Friday in the first response only.
When returning JSON, follow the schema exactly with no markdown fences.`;

function sanitizeErrorMessage(message: string) {
  return message
    .replace(/sk-[A-Za-z0-9_\-]+/g, "sk-***")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer ***");
}

function usingOpenRouter() {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

function modelName() {
  if (usingOpenRouter()) {
    return process.env.OPENROUTER_MODEL?.trim() || "openrouter/free";
  }
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o";
}

function fallbackModels() {
  const configured = (process.env.OPENROUTER_FALLBACK_MODELS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  if (configured.length) return configured;
  return ["openrouter/auto", "openai/gpt-4o-mini"];
}

function client() {
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openrouterKey) {
    return new OpenAI({
      apiKey: openrouterKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL?.trim() || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME?.trim() || "PITCHAI",
      },
    });
  }
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) return null;
  return new OpenAI({ apiKey: openaiKey });
}

type ApiMsg = { role: "user" | "assistant"; content: string };

function parseJson<T>(raw: string): T {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model did not return JSON");
  return JSON.parse(trimmed.slice(start, end + 1)) as T;
}

function tryParseJson<T>(raw: string): T | null {
  try {
    return parseJson<T>(raw);
  } catch {
    return null;
  }
}

function normalizeScore(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(10, n));
}

function nextSection(current: NABCSection): NABCSection | "done" {
  if (current === "need") return "approach";
  if (current === "approach") return "benefits";
  if (current === "benefits") return "competition";
  return "done";
}

function systemForMode(mode: PitchMode, pitchBrief: string) {
  const modeLine = modeInstruction(mode);
  return `${BASE_SYSTEM}\n${modeLine}${founderContextBlock(pitchBrief)}`;
}

async function createCoachCompletion(
  openai: OpenAI,
  payload: { temperature: number; messages: Array<{ role: "system" | "user" | "assistant"; content: string }> },
) {
  const primary = modelName();
  try {
    return await openai.chat.completions.create({
      model: primary,
      temperature: payload.temperature,
      messages: payload.messages,
    });
  } catch (e) {
    const status = Number((e as { status?: number })?.status || 0);
    if (!usingOpenRouter() || status !== 429) throw e;

    let lastError: unknown = e;
    for (const fallback of fallbackModels()) {
      if (!fallback || fallback === primary) continue;
      try {
        return await openai.chat.completions.create({
          model: fallback,
          temperature: payload.temperature,
          messages: payload.messages,
        });
      } catch (fallbackError) {
        lastError = fallbackError;
      }
    }
    throw lastError;
  }
}

export async function POST(req: Request) {
  const openai = client();
  if (!openai) {
    return NextResponse.json(
      {
        error:
          "No AI key configured. Add OPENROUTER_API_KEY or OPENAI_API_KEY to .env or .env.local in the project root, then restart npm run dev.",
      },
      { status: 500 },
    );
  }

  const body = (await req.json()) as Record<string, unknown>;
  const action = body.action as string;
  const mode = (body.mode as PitchMode) || "investor";
  const pitchBrief = String(body.pitchBrief || "");

  try {
    if (action === "start") {
      if (!pitchBrief.trim()) {
        return NextResponse.json(
          { error: "pitchBrief is required so the coach knows what you are building." },
          { status: 400 },
        );
      }

      const completion = await createCoachCompletion(openai, {
        temperature: 0.7,
        messages: [
          { role: "system", content: systemForMode(mode, pitchBrief) },
          {
            role: "user",
            content: `Start the voice interview. Introduce yourself as Friday in one short sentence. Then briefly set expectations (1-2 sentences), acknowledge you understand their context at a high level, and ask the first sharp NABC question focused ONLY on NEED.
Return JSON: {"assistantMessage": string, "activeSection": "need"}`,
          },
        ],
      });
      const text = completion.choices[0]?.message?.content || "{}";
      const parsed = tryParseJson<{ assistantMessage: string; activeSection: NABCSection }>(text);
      if (parsed?.assistantMessage?.trim()) {
        return NextResponse.json({
          assistantMessage: parsed.assistantMessage.trim(),
          activeSection: "need" as NABCSection,
        });
      }
      return NextResponse.json({
        assistantMessage:
          "Hi, I'm Friday - your pitch coach. I understand your context. Let's start with Need: what specific, painful problem are you solving, for exactly which user segment?",
        activeSection: "need" as NABCSection,
      });
    }

    if (action === "evaluate_and_continue") {
      const messages = body.messages as ApiMsg[];
      const activeSection = body.activeSection as NABCSection;
      const followUps = Number(body.followUpsAskedThisSection) || 0;
      const userAnswer = String(body.userAnswer || "");

      const completion = await createCoachCompletion(openai, {
        temperature: 0.55,
        messages: [
          { role: "system", content: systemForMode(mode, pitchBrief) },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          {
            role: "user",
            content: `The founder just answered (section: ${activeSection}, follow-ups already asked in this section: ${followUps}).
Their answer:
"""
${userAnswer}
"""

Return JSON with this exact shape:
{
  "feedback": {
    "clarity": number 0-10,
    "specificity": number 0-10,
    "strength": number 0-10,
    "bullets": string[] of 2-4 sharp critique lines (no fluff)
  },
  "assistantMessage": string (your NEXT question OR transition; if moving to next NABC section, briefly acknowledge gaps and ask the first question of the new section),
  "activeSection": "need"|"approach"|"benefits"|"competition"|"done",
  "followUpsAskedThisSection": number (increment if you stay in same section and asked another follow-up; reset to 0 when you advance sections),
  "interviewComplete": boolean (true only after competition section is sufficiently covered OR you asked at least 2 follow-ups in competition and answers are adequate)
}

Rules:
- Ask 2-4 follow-ups per section before advancing, unless the answer is exceptionally strong and complete.
- Order of sections: need -> approach -> benefits -> competition -> done.
- If advancing sections, set followUpsAskedThisSection to 0.
- Scores must be honest; 8+ only for genuinely crisp, specific answers.
- assistantMessage must be a single conversational question or short 2-sentence prompt suitable for voice.`,
          },
        ],
      });
      const text = completion.choices[0]?.message?.content || "{}";
      const parsed = tryParseJson<{
        feedback: {
          clarity: number;
          specificity: number;
          strength: number;
          bullets: string[];
        };
        assistantMessage: string;
        activeSection: NABCSection | "done";
        followUpsAskedThisSection: number;
        interviewComplete: boolean;
      }>(text);

      if (!parsed) {
        const nextFollowUps = followUps + 1;
        const shouldAdvance = nextFollowUps >= 2;
        const advanced = shouldAdvance ? nextSection(activeSection) : activeSection;
        const done = advanced === "done";
        return NextResponse.json({
          feedback: {
            clarity: 5,
            specificity: 4,
            strength: 5,
            bullets: [
              "Good start, but this answer still needs sharper specifics.",
              "Add measurable evidence (numbers, timelines, or concrete outcomes).",
            ],
          },
          assistantMessage: done
            ? "Nice progress. I have enough to draft your final pitch outputs."
            : shouldAdvance
              ? `Let's move to ${advanced}. Give me the strongest concrete version in 2-4 sentences.`
              : "Go one level deeper with concrete specifics: who, how many, how often, and what measurable impact.",
          activeSection: advanced,
          followUpsAskedThisSection: shouldAdvance ? 0 : nextFollowUps,
          interviewComplete: done,
        });
      }

      const safeSection =
        parsed.activeSection === "need" ||
        parsed.activeSection === "approach" ||
        parsed.activeSection === "benefits" ||
        parsed.activeSection === "competition" ||
        parsed.activeSection === "done"
          ? parsed.activeSection
          : activeSection;

      return NextResponse.json({
        feedback: {
          clarity: normalizeScore(parsed.feedback?.clarity, 5),
          specificity: normalizeScore(parsed.feedback?.specificity, 5),
          strength: normalizeScore(parsed.feedback?.strength, 5),
          bullets:
            parsed.feedback?.bullets?.filter((b) => typeof b === "string" && b.trim()).slice(0, 4) || [],
        },
        assistantMessage:
          parsed.assistantMessage?.trim() ||
          "Be more concrete: who exactly has this problem, how often, and what measurable impact follows?",
        activeSection: safeSection,
        followUpsAskedThisSection: Number.isFinite(parsed.followUpsAskedThisSection)
          ? parsed.followUpsAskedThisSection
          : followUps + 1,
        interviewComplete: Boolean(parsed.interviewComplete),
      });
    }

    if (action === "rewrite") {
      const userAnswer = String(body.userAnswer || "");
      const activeSection = body.activeSection as NABCSection;
      const feedback = body.feedback as {
        clarity: number;
        specificity: number;
        strength: number;
        bullets: string[];
      };

      const completion = await createCoachCompletion(openai, {
        temperature: 0.65,
        messages: [
          { role: "system", content: systemForMode(mode, pitchBrief) },
          {
            role: "user",
            content: `Rewrite the founder's answer to be stronger for section "${activeSection}".
Original:
"""
${userAnswer}
"""

Coaching context (scores 0-10): clarity ${feedback?.clarity}, specificity ${feedback?.specificity}, strength ${feedback?.strength}.
Critiques: ${(feedback?.bullets || []).join(" | ")}

Return JSON: {"improvedAnswer": string} 
The improved answer should be 3-8 sentences, voice-friendly, concrete, and not buzzword soup.`,
          },
        ],
      });
      const text = completion.choices[0]?.message?.content || "{}";
      const parsed = tryParseJson<{ improvedAnswer: string }>(text);
      return NextResponse.json({
        improvedAnswer:
          parsed?.improvedAnswer?.trim() ||
          "Here is a tighter version: We solve a specific high-frequency pain for a clearly defined user segment. Our approach is differentiated by a concrete mechanism, not just a feature list. We can already point to measurable value and a realistic path to scale against existing alternatives.",
      });
    }

    if (action === "final_pitches") {
      const messages = body.messages as ApiMsg[];

      const completion = await createCoachCompletion(openai, {
        temperature: 0.55,
        messages: [
          { role: "system", content: systemForMode(mode, pitchBrief) },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          {
            role: "user",
            content: `Using everything above, generate final outputs as JSON:
{
  "pitch30s": string,
  "pitch1m": string,
  "pitch3m": string,
  "deckBullets": string[] (8-12 bullets for a pitch deck summary)
}
Rules: keep voice natural, strong hook, clear problem, differentiated approach, quantified benefits where possible, honest competition framing.`,
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
      if (parsed) return NextResponse.json(parsed);
      return NextResponse.json({
        pitch30s:
          "We're solving a specific, urgent problem for a clearly defined customer segment with a differentiated approach that delivers measurable value quickly.",
        pitch1m:
          "Our company targets a concrete customer pain that is frequent, costly, and poorly solved by current options. We deliver a differentiated solution with a simple adoption path, measurable outcomes, and an execution plan designed for fast validation and scalable growth.",
        pitch3m:
          "We identified a high-friction problem for a specific user segment and built an approach that is easier to adopt and more effective than status-quo alternatives. Our initial focus is proving repeatable value through measurable outcomes, then scaling through a clear go-to-market motion. We track traction, retention, and economics to ensure the business is not only useful but durable. Competitive alternatives exist, but our differentiation comes from how we deliver faster outcomes with less friction for the user. This positions us to win on both product value and execution discipline.",
        deckBullets: [
          "Problem: clearly defined user pain",
          "User segment: explicit initial beachhead",
          "Approach: concrete and differentiated",
          "Value: measurable outcomes",
          "Go-to-market: focused first channel",
          "Competition: alternatives and gaps",
          "Moat: compounding product/data/distribution edge",
          "Milestones: near-term execution plan",
        ],
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const status = Number((e as { status?: number })?.status || 0);
    if (status === 429) {
      return NextResponse.json(
        {
          error: usingOpenRouter()
            ? "OpenRouter is rate-limiting this model right now (429). Wait 20-60 seconds and try again, or switch OPENROUTER_MODEL to a less busy model."
            : "OpenAI rate limit reached (429). Wait a moment and try again.",
        },
        { status: 429 },
      );
    }
    const message = e instanceof Error ? sanitizeErrorMessage(e.message) : "Coach error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
