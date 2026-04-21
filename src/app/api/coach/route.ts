import { NextResponse } from "next/server";
import {
  orchestrateEvaluateAndContinue,
  orchestrateFinalPitches,
  orchestrateRewrite,
  orchestrateStart,
} from "@/lib/agents/orchestrator";
import { createOpenAIClient, sanitizeErrorMessage, usingOpenRouter } from "@/lib/agents/llm-client";
import type { NABCSection, PitchMode } from "@/types/pitch";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const openai = createOpenAIClient();
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
      const result = await orchestrateStart(openai, { mode, pitchBrief });
      return NextResponse.json(result);
    }

    if (action === "evaluate_and_continue") {
      const messages = body.messages as { role: "user" | "assistant"; content: string }[];
      const activeSection = body.activeSection as NABCSection;
      const followUpsAskedThisSection = Number(body.followUpsAskedThisSection) || 0;
      const userAnswer = String(body.userAnswer || "");

      const result = await orchestrateEvaluateAndContinue(openai, {
        mode,
        pitchBrief,
        messages,
        activeSection,
        followUpsAskedThisSection,
        userAnswer,
      });
      return NextResponse.json(result);
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

      const result = await orchestrateRewrite(openai, {
        mode,
        pitchBrief,
        userAnswer,
        activeSection,
        feedback,
      });
      return NextResponse.json(result);
    }

    if (action === "final_pitches") {
      const messages = body.messages as { role: "user" | "assistant"; content: string }[];
      const result = await orchestrateFinalPitches(openai, { mode, pitchBrief, messages });
      return NextResponse.json(result);
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
