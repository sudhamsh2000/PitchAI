"use client";

import { create } from "zustand";
import type {
  CoachEvaluateResult,
  FinalPitches,
  NABCSection,
  PitchMessage,
  PitchMode,
  ScoreFeedback,
  SessionPacingMode,
  SessionFeedbackEntry,
} from "@/types/pitch";

type Phase =
  | "idle"
  | "pre_start"
  | "pitching"
  | "loading_debrief"
  | "debrief"
  | "loading_report"
  | "asking"
  | "loading_feedback"
  | "review"
  | "loading_final"
  | "final";

export type SessionPhase = "setup" | "coaching";

interface PendingMeta {
  activeSection: NABCSection | "done";
  followUpsAskedThisSection: number;
  interviewComplete: boolean;
}

interface PitchState {
  mode: PitchMode;
  sessionPhase: SessionPhase;
  pitchBrief: string;
  sessionLengthMinutes: number;
  sessionStartedAt: number | null;
  elapsedSeconds: number;
  pacingMode: SessionPacingMode;
  phase: Phase;
  messages: PitchMessage[];
  activeSection: NABCSection;
  followUpsAskedThisSection: number;
  latestFeedback: ScoreFeedback | null;
  lastUserMessageId: string | null;
  pendingNext: string | null;
  pendingMeta: PendingMeta | null;
  interimTranscript: string;
  isRecording: boolean;
  isSpeaking: boolean;
  isTyping: boolean;
  error: string | null;
  finalPitches: FinalPitches | null;
  showFinal: boolean;
  /** Accumulated scored turns for end-of-session report */
  feedbackHistory: SessionFeedbackEntry[];
  /** Live monologue text (continuous pitch, not split into chat turns) */
  pitchTranscript: string;

  setMode: (m: PitchMode) => void;
  setPitchBrief: (t: string) => void;
  setSessionLengthMinutes: (m: number) => void;
  beginSessionClock: () => void;
  setElapsedSeconds: (s: number) => void;
  setPacingMode: (p: SessionPacingMode) => void;
  clearSessionClock: () => void;
  setSessionPhase: (p: SessionPhase) => void;
  clearCoachThread: () => void;
  returnToSetup: () => void;
  setInterimTranscript: (t: string) => void;
  setIsRecording: (v: boolean) => void;
  setIsSpeaking: (v: boolean) => void;
  setError: (e: string | null) => void;
  resetSession: () => void;

  appendMessage: (role: PitchMessage["role"], content: string) => PitchMessage;
  updateMessage: (id: string, content: string) => void;

  setPitchTranscript: (t: string) => void;
  bootstrapFromStart: (
    assistantMessage: string,
    section: NABCSection,
    options?: { phase?: Phase },
  ) => void;
  setTyping: (v: boolean) => void;
  setPhase: (p: Phase) => void;
  setLastUserMessageId: (id: string | null) => void;

  stashEvaluateResult: (result: CoachEvaluateResult) => void;
  updateFeedbackEntryAnswer: (sourceUserMessageId: string, answer: string) => void;
  commitPendingQuestion: () => void;
  discardPending: () => void;

  openFinal: (p: FinalPitches) => void;
  closeFinal: () => void;
}

const emptyFeedback = (): ScoreFeedback => ({
  clarity: 0,
  specificity: 0,
  strength: 0,
  bullets: [],
});

function newId() {
  return crypto.randomUUID();
}

export const usePitchStore = create<PitchState>((set, get) => ({
  mode: "investor",
  sessionPhase: "setup",
  pitchBrief: "",
  sessionLengthMinutes: 5,
  sessionStartedAt: null,
  elapsedSeconds: 0,
  pacingMode: "normal",
  phase: "idle",
  messages: [],
  activeSection: "need",
  followUpsAskedThisSection: 0,
  latestFeedback: null,
  lastUserMessageId: null,
  pendingNext: null,
  pendingMeta: null,
  interimTranscript: "",
  isRecording: false,
  isSpeaking: false,
  isTyping: false,
  error: null,
  finalPitches: null,
  showFinal: false,
  feedbackHistory: [],
  pitchTranscript: "",

  setMode: (m) => set({ mode: m }),
  setPitchBrief: (t) => set({ pitchBrief: t }),
  setSessionLengthMinutes: (m) =>
    set({
      /** 0 = practice / no countdown; otherwise 1–30 minutes */
      sessionLengthMinutes: m === 0 ? 0 : Math.max(1, Math.min(30, Math.round(m || 1))),
    }),
  beginSessionClock: () => set({ sessionStartedAt: Date.now(), elapsedSeconds: 0, pacingMode: "normal" }),
  setElapsedSeconds: (s) => set({ elapsedSeconds: Math.max(0, Math.floor(s)) }),
  setPacingMode: (p) => set({ pacingMode: p }),
  clearSessionClock: () => set({ sessionStartedAt: null, elapsedSeconds: 0, pacingMode: "normal" }),
  setSessionPhase: (p) => set({ sessionPhase: p }),

  setPitchTranscript: (t) => set({ pitchTranscript: t }),

  clearCoachThread: () =>
    set({
      phase: "idle",
      messages: [],
      activeSection: "need",
      followUpsAskedThisSection: 0,
      latestFeedback: null,
      lastUserMessageId: null,
      pendingNext: null,
      pendingMeta: null,
      interimTranscript: "",
      isRecording: false,
      isSpeaking: false,
      isTyping: false,
      error: null,
      finalPitches: null,
      showFinal: false,
      feedbackHistory: [],
      pitchTranscript: "",
      sessionStartedAt: null,
      elapsedSeconds: 0,
      pacingMode: "normal",
    }),

  returnToSetup: () =>
    set({
      sessionPhase: "setup",
      phase: "idle",
      messages: [],
      activeSection: "need",
      followUpsAskedThisSection: 0,
      latestFeedback: null,
      lastUserMessageId: null,
      pendingNext: null,
      pendingMeta: null,
      interimTranscript: "",
      isRecording: false,
      isSpeaking: false,
      isTyping: false,
      error: null,
      finalPitches: null,
      showFinal: false,
      feedbackHistory: [],
      pitchTranscript: "",
      sessionStartedAt: null,
      elapsedSeconds: 0,
      pacingMode: "normal",
    }),

  setInterimTranscript: (t) => set({ interimTranscript: t }),
  setIsRecording: (v) => set({ isRecording: v }),
  setIsSpeaking: (v) => set({ isSpeaking: v }),
  setError: (e) => set({ error: e }),
  setTyping: (v) => set({ isTyping: v }),
  setPhase: (p) => set({ phase: p }),
  setLastUserMessageId: (id) => set({ lastUserMessageId: id }),

  resetSession: () =>
    set({
      sessionPhase: "setup",
      pitchBrief: "",
      phase: "idle",
      messages: [],
      activeSection: "need",
      followUpsAskedThisSection: 0,
      latestFeedback: null,
      lastUserMessageId: null,
      pendingNext: null,
      pendingMeta: null,
      interimTranscript: "",
      isRecording: false,
      isSpeaking: false,
      isTyping: false,
      error: null,
      finalPitches: null,
      showFinal: false,
      feedbackHistory: [],
      pitchTranscript: "",
      sessionLengthMinutes: 5,
      sessionStartedAt: null,
      elapsedSeconds: 0,
      pacingMode: "normal",
    }),

  appendMessage: (role, content) => {
    const msg: PitchMessage = {
      id: newId(),
      role,
      content,
      createdAt: Date.now(),
    };
    set((s) => ({ messages: [...s.messages, msg] }));
    return msg;
  },

  updateMessage: (id, content) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, content } : m)),
    })),

  bootstrapFromStart: (assistantMessage, section, options) =>
    set({
      sessionPhase: "coaching",
      phase: options?.phase ?? "asking",
      messages: [
        {
          id: newId(),
          role: "assistant",
          content: assistantMessage,
          createdAt: Date.now(),
        },
      ],
      activeSection: section,
      followUpsAskedThisSection: 0,
      latestFeedback: null,
      lastUserMessageId: null,
      pendingNext: null,
      pendingMeta: null,
      error: null,
      feedbackHistory: [],
      pitchTranscript: "",
    }),

  stashEvaluateResult: (result) =>
    set((s) => {
      const uid = s.lastUserMessageId;
      const turn = uid ? s.messages.find((m) => m.id === uid) : null;
      const userAnswer = turn?.role === "user" ? turn.content.trim() : "";
      const fb = result.feedback || emptyFeedback();
      let feedbackHistory = s.feedbackHistory;
      if (userAnswer) {
        const entry: SessionFeedbackEntry = {
          id: newId(),
          createdAt: Date.now(),
          section: s.activeSection,
          userAnswer,
          sourceUserMessageId: uid || undefined,
          feedback: {
            clarity: fb.clarity,
            specificity: fb.specificity,
            strength: fb.strength,
            bullets: fb.bullets ?? [],
            needsFollowup: fb.needsFollowup,
            followupReason: fb.followupReason,
          },
        };
        feedbackHistory = [...feedbackHistory, entry];
      }
      return {
        latestFeedback: fb,
        pendingNext: result.assistantMessage?.trim() || null,
        pendingMeta: {
          activeSection: result.activeSection,
          followUpsAskedThisSection: result.followUpsAskedThisSection ?? 0,
          interviewComplete: Boolean(result.interviewComplete),
        },
        phase: "review",
        error: null,
        feedbackHistory,
      };
    }),

  updateFeedbackEntryAnswer: (sourceUserMessageId, answer) =>
    set((s) => ({
      feedbackHistory: s.feedbackHistory.map((e) =>
        e.sourceUserMessageId === sourceUserMessageId ? { ...e, userAnswer: answer } : e,
      ),
    })),

  commitPendingQuestion: () => {
    const { pendingNext, pendingMeta } = get();
    if (!pendingMeta) {
      set({ phase: "asking", pendingNext: null, pendingMeta: null });
      return;
    }

    set((s) => {
      const nextMessages = [...s.messages];
      if (pendingNext) {
        nextMessages.push({
          id: newId(),
          role: "assistant",
          content: pendingNext,
          createdAt: Date.now(),
        });
      }

      const nextSection =
        pendingMeta.activeSection === "done"
          ? s.activeSection
          : (pendingMeta.activeSection as NABCSection);

      return {
        messages: nextMessages,
        activeSection: nextSection,
        followUpsAskedThisSection: pendingMeta.followUpsAskedThisSection,
        pendingNext: null,
        pendingMeta: null,
        phase: pendingMeta.interviewComplete ? "loading_final" : "asking",
      };
    });
  },

  discardPending: () => set({ pendingNext: null, pendingMeta: null }),

  openFinal: (p) => set({ finalPitches: p, showFinal: true, phase: "final" }),
  closeFinal: () => set({ showFinal: false }),
}));
