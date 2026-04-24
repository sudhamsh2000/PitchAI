import { NextResponse } from "next/server";
import {
  orchestrateNABCCompareReports,
  orchestrateNABCTranscriptEvaluation,
  orchestrateNABCWriteReport,
  orchestrateEvaluateAndContinue,
  orchestrateFinalPitches,
  orchestrateRewrite,
  orchestrateSessionReport,
  orchestrateStart,
} from "@/lib/agents/orchestrator";
import { createOpenAIClient, sanitizeErrorMessage, usingOpenRouter } from "@/lib/agents/llm-client";
import type { NABCSection, PitchMode, SessionFeedbackEntry } from "@/types/pitch";

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
  const rawLen = Number(body.sessionLengthMinutes);
  const sessionLengthMinutes =
    rawLen === 0 ? 0 : Math.max(1, Math.min(30, Number.isFinite(rawLen) ? rawLen : 5));
  const elapsedSeconds = Math.max(0, Number(body.elapsedSeconds) || 0);

  try {
    if (action === "start") {
      if (!pitchBrief.trim()) {
        return NextResponse.json(
          { error: "pitchBrief is required so the coach knows what you are building." },
          { status: 400 },
        );
      }
      const result = await orchestrateStart(openai, { mode, pitchBrief, sessionLengthMinutes });
      return NextResponse.json(result);
    }

    if (action === "evaluate_and_continue") {
      const messages = body.messages as { role: "user" | "assistant"; content: string }[];
      const activeSection = body.activeSection as NABCSection;
      const followUpsAskedThisSection = Number(body.followUpsAskedThisSection) || 0;
      const userAnswer = String(body.userAnswer || "");
      const feedbackHistory = (body.feedbackHistory as SessionFeedbackEntry[]) || [];

      const result = await orchestrateEvaluateAndContinue(openai, {
        mode,
        pitchBrief,
        messages,
        activeSection,
        followUpsAskedThisSection,
        userAnswer,
        feedbackHistory,
        sessionLengthMinutes,
        elapsedSeconds,
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
      const feedbackHistory = (body.feedbackHistory as SessionFeedbackEntry[]) || [];

      const result = await orchestrateRewrite(openai, {
        mode,
        pitchBrief,
        userAnswer,
        activeSection,
        feedback,
        feedbackHistory,
      });
      return NextResponse.json(result);
    }

    if (action === "final_pitches") {
      const messages = body.messages as { role: "user" | "assistant"; content: string }[];
      const feedbackHistory = (body.feedbackHistory as SessionFeedbackEntry[]) || [];
      const result = await orchestrateFinalPitches(openai, {
        mode,
        pitchBrief,
        messages,
        feedbackHistory,
        sessionLengthMinutes,
      });
      return NextResponse.json(result);
    }

    if (action === "session_report") {
      const entries = (body.entries as SessionFeedbackEntry[]) || [];
      const result = await orchestrateSessionReport(openai, { mode, pitchBrief, entries });
      return NextResponse.json(result);
    }

    if (action === "nabc_transcript_evaluate") {
      const transcript = String(body.transcript || "");
      if (!transcript.trim()) {
        return NextResponse.json({ error: "transcript is required" }, { status: 400 });
      }
      const result = await orchestrateNABCTranscriptEvaluation(openai, { transcript });
      return NextResponse.json(result);
    }

    if (action === "nabc_report_write") {
      const evaluation = body.evaluation as Parameters<typeof orchestrateNABCWriteReport>[1]["evaluation"];
      const teamName = String(body.teamName || "").trim() || undefined;
      if (!evaluation) {
        return NextResponse.json({ error: "evaluation is required" }, { status: 400 });
      }
      const result = await orchestrateNABCWriteReport(openai, { evaluation, teamName });
      return NextResponse.json(result);
    }

    if (action === "nabc_compare_reports") {
      const transcriptBasedReport = String(body.transcriptBasedReport || "");
      const videoBasedReport = String(body.videoBasedReport || "");
      if (!transcriptBasedReport.trim() || !videoBasedReport.trim()) {
        return NextResponse.json(
          { error: "transcriptBasedReport and videoBasedReport are required" },
          { status: 400 },
        );
      }
      const result = await orchestrateNABCCompareReports(openai, { transcriptBasedReport, videoBasedReport });
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
    if (status === 503) {
      return NextResponse.json(
        {
          error: usingOpenRouter()
            ? "The AI provider is temporarily unavailable (503). Wait a minute and retry, set OPENROUTER_FALLBACK_MODELS in .env.local, or switch OPENROUTER_MODEL (e.g. openai/gpt-4o-mini). You can also use OPENAI_API_KEY directly without OpenRouter."
            : "OpenAI returned a temporary error (503). Retry shortly or check status.openai.com.",
        },
        { status: 503 },
      );
    }
    const message = e instanceof Error ? sanitizeErrorMessage(e.message) : "Coach error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
