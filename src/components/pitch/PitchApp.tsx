"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePitchStore } from "@/store/usePitchStore";
import { coachEvaluate, coachFinal, coachRewrite, coachSessionReport, coachStart } from "@/lib/coach-client";
import { saveSessionReport } from "@/lib/saved-session-reports";
import type { SessionAnalysisReport, SessionPacingMode } from "@/types/pitch";
import { PITCH_MODES } from "@/lib/modes";
import { normalizeDictationChunk, normalizeForSpeech } from "@/lib/speech-text";
import { speakText, stopSpeaking, useVoice } from "@/hooks/useVoice";
import { speakPremiumText, stopPremiumSpeech } from "@/lib/tts-client";
import { TopBar } from "./TopBar";
import { ConversationPanel } from "./ConversationPanel";
import { AnalysisDashboard } from "./AnalysisDashboard";
import { BottomInput } from "./BottomInput";
import { FinalOutputPanel } from "./FinalOutputPanel";
import { SetupContextPanel } from "./SetupContextPanel";
import { ReportsLibraryModal } from "./ReportsLibraryModal";
import { SessionReportModal } from "./SessionReportModal";
import { BackgroundBubbles } from "@/components/BackgroundBubbles";

const MIN_BRIEF = 1;

export function PitchApp() {
  const [draft, setDraft] = useState("");
  const [setupBusy, setSetupBusy] = useState(false);
  const liveSession = true;
  const [livePaused, setLivePaused] = useState(false);
  const [naturalVoiceName] = useState("alloy");
  const [coachSpeaking, setCoachSpeaking] = useState(false);
  const [lastSpokenAssistantId, setLastSpokenAssistantId] = useState<string | null>(null);
  const liveAutoSubmitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionPhase = usePitchStore((s) => s.sessionPhase);
  const pitchBrief = usePitchStore((s) => s.pitchBrief);
  const mode = usePitchStore((s) => s.mode);
  const sessionLengthMinutes = usePitchStore((s) => s.sessionLengthMinutes);
  const sessionStartedAt = usePitchStore((s) => s.sessionStartedAt);
  const elapsedSeconds = usePitchStore((s) => s.elapsedSeconds);
  const pacingMode = usePitchStore((s) => s.pacingMode);
  const phase = usePitchStore((s) => s.phase);
  const messages = usePitchStore((s) => s.messages);
  const activeSection = usePitchStore((s) => s.activeSection);
  const latestFeedback = usePitchStore((s) => s.latestFeedback);
  const interimTranscript = usePitchStore((s) => s.interimTranscript);
  const isTyping = usePitchStore((s) => s.isTyping);
  const isRecording = usePitchStore((s) => s.isRecording);
  const error = usePitchStore((s) => s.error);
  const finalPitches = usePitchStore((s) => s.finalPitches);
  const showFinal = usePitchStore((s) => s.showFinal);

  const setMode = usePitchStore((s) => s.setMode);
  const setPitchBrief = usePitchStore((s) => s.setPitchBrief);
  const setSessionLengthMinutes = usePitchStore((s) => s.setSessionLengthMinutes);
  const beginSessionClock = usePitchStore((s) => s.beginSessionClock);
  const setElapsedSeconds = usePitchStore((s) => s.setElapsedSeconds);
  const setPacingMode = usePitchStore((s) => s.setPacingMode);
  const clearSessionClock = usePitchStore((s) => s.clearSessionClock);
  const clearCoachThread = usePitchStore((s) => s.clearCoachThread);
  const returnToSetup = usePitchStore((s) => s.returnToSetup);
  const appendMessage = usePitchStore((s) => s.appendMessage);
  const updateMessage = usePitchStore((s) => s.updateMessage);
  const setInterim = usePitchStore((s) => s.setInterimTranscript);
  const setRecording = usePitchStore((s) => s.setIsRecording);
  const setError = usePitchStore((s) => s.setError);
  const setTyping = usePitchStore((s) => s.setTyping);
  const bootstrapFromStart = usePitchStore((s) => s.bootstrapFromStart);
  const stashEvaluateResult = usePitchStore((s) => s.stashEvaluateResult);
  const commitPendingQuestion = usePitchStore((s) => s.commitPendingQuestion);
  const setPhase = usePitchStore((s) => s.setPhase);
  const openFinal = usePitchStore((s) => s.openFinal);
  const closeFinal = usePitchStore((s) => s.closeFinal);
  const setLastUserMessageId = usePitchStore((s) => s.setLastUserMessageId);
  const updateFeedbackEntryAnswer = usePitchStore((s) => s.updateFeedbackEntryAnswer);

  const [rewriteBusy, setRewriteBusy] = useState(false);
  const [rewriteNotes, setRewriteNotes] = useState<string[] | null>(null);
  const [endSessionBusy, setEndSessionBusy] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<SessionAnalysisReport | null>(null);
  const [reportModalKind, setReportModalKind] = useState<"end" | "library" | null>(null);
  const [reportEndCause, setReportEndCause] = useState<"manual" | "time">("manual");
  const reportSourceRef = useRef<"end" | "library" | null>(null);
  const sessionReportFlowLockRef = useRef(false);

  const onFinalSpeech = useCallback((chunk: string) => {
    const t = normalizeDictationChunk(chunk);
    if (!t) return;
    setDraft((d) => {
      const joiner = d && !/\s$/.test(d) ? " " : "";
      return `${d}${joiner}${t}`;
    });
  }, []);

  const onRecognitionError = useCallback(
    (msg: string) => {
      setError(msg);
      setRecording(false);
      if (liveAutoSubmitTimer.current) {
        clearTimeout(liveAutoSubmitTimer.current);
        liveAutoSubmitTimer.current = null;
      }
    },
    [setError, setRecording],
  );

  const { supported: micSupported, startListening, stopListening } = useVoice(
    onFinalSpeech,
    onRecognitionError,
    () => setRecording(false),
  );

  const startCoachingSession = useCallback(async () => {
    const brief = usePitchStore.getState().pitchBrief.trim();
    const currentMode = usePitchStore.getState().mode;
    setError(null);
    setTyping(true);
    try {
      const res = await coachStart(currentMode, brief, usePitchStore.getState().sessionLengthMinutes);
      bootstrapFromStart(res.assistantMessage, res.activeSection);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start coach session.");
    } finally {
      setTyping(false);
    }
  }, [bootstrapFromStart, setError, setTyping]);

  const beginFromSetup = async () => {
    if (pitchBrief.trim().length < MIN_BRIEF) {
      setError(`Add at least ${MIN_BRIEF} characters so the coach understands your idea.`);
      return;
    }
    setSetupBusy(true);
    setLivePaused(false);
    beginSessionClock();
    setError(null);
    setLastSpokenAssistantId(null);
    try {
      await startCoachingSession();
    } finally {
      setSetupBusy(false);
    }
  };

  const speakCoach = useCallback(
    (text: string) => {
      const spokenText = normalizeForSpeech(text);
      if (!spokenText) {
        setCoachSpeaking(false);
        return;
      }
      // Prevent Friday's own voice from being captured as user input.
      stopListening();
      setRecording(false);
      setInterim("");
      stopSpeaking();
      stopPremiumSpeech();
      setCoachSpeaking(true);
      void (async () => {
        try {
          const ok = await speakPremiumText(spokenText, {
            voice: naturalVoiceName,
            onEnd: () => setCoachSpeaking(false),
            onError: () => setCoachSpeaking(false),
          });
          if (!ok) {
            speakText(
              spokenText,
              () => setCoachSpeaking(true),
              () => setCoachSpeaking(false),
            );
          }
        } catch {
          setCoachSpeaking(false);
          speakText(
            spokenText,
            () => setCoachSpeaking(true),
            () => setCoachSpeaking(false),
          );
        }
      })();
    },
    [naturalVoiceName, setInterim, setRecording, stopListening],
  );

  useEffect(() => {
    if (sessionPhase !== "coaching" || !sessionStartedAt) return;
    const id = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000));
      setElapsedSeconds(elapsed);
      if (sessionLengthMinutes === 0) {
        setPacingMode("normal");
        return;
      }
      const total = sessionLengthMinutes * 60;
      const ratio = total > 0 ? elapsed / total : 0;
      const nextPacing: SessionPacingMode = ratio >= 0.9 ? "urgent" : ratio >= 0.7 ? "compressed" : "normal";
      setPacingMode(nextPacing);
    }, 1000);
    return () => clearInterval(id);
  }, [sessionLengthMinutes, sessionPhase, sessionStartedAt, setElapsedSeconds, setPacingMode]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopPremiumSpeech();
    };
  }, []);

  useEffect(() => {
    if (sessionPhase !== "setup") return;
    stopSpeaking();
    stopPremiumSpeech();
    setCoachSpeaking(false);
    setLastSpokenAssistantId(null);
  }, [sessionPhase]);

  useEffect(() => {
    if (sessionPhase !== "coaching") return;
    if (!liveSession) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (last.id === lastSpokenAssistantId) return;
    setLastSpokenAssistantId(last.id);
    speakCoach(last.content);
  }, [sessionPhase, liveSession, lastSpokenAssistantId, messages, speakCoach]);

  useEffect(() => {
    if (sessionPhase !== "coaching") return;
    if (phase !== "loading_final") return;
    let stale = false;
    (async () => {
      setTyping(true);
      try {
        const { messages: m, mode: md, pitchBrief: brief, feedbackHistory: fh } = usePitchStore.getState();
        const pitches = await coachFinal({
          mode: md,
          pitchBrief: brief,
          messages: m,
          feedbackHistory: fh,
          sessionLengthMinutes: usePitchStore.getState().sessionLengthMinutes,
        });
        if (!stale) openFinal(pitches);
      } catch (e) {
        if (!stale) {
          setError(e instanceof Error ? e.message : "Could not generate finals.");
          setPhase("asking");
        }
      } finally {
        if (!stale) setTyping(false);
      }
    })();
    return () => {
      stale = true;
    };
  }, [sessionPhase, phase, openFinal, setError, setPhase, setTyping]);

  const toggleMic = () => {
    if (liveSession && livePaused) {
      setError("Live mode is paused. Resume live to continue dictation.");
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError(
        "Voice dictation needs a secure context. Open the app as http://localhost:3000 on the dev machine, or use HTTPS. Plain http://192… from another device is often blocked.",
      );
      return;
    }
    if (!micSupported) {
      setError(
        "This browser does not support Web Speech dictation (common on Safari). Use Chrome or Edge on desktop, or type your answer.",
      );
      return;
    }
    if (isRecording) {
      stopListening();
      setRecording(false);
      setInterim("");
      return;
    }
    setError(null);
    setRecording(true);
    setInterim("");
    startListening((text) => setInterim(text));
  };

  const submitAnswer = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    if (phase !== "asking") return;

    const prior = [...usePitchStore.getState().messages];
    const brief = usePitchStore.getState().pitchBrief;
    const userMsg = appendMessage("user", text);
    setLastUserMessageId(userMsg.id);
    setDraft("");
    setInterim("");
    stopListening();
    setRecording(false);

    setPhase("loading_feedback");
    setTyping(true);
    setError(null);
    setRewriteNotes(null);
    try {
      const result = await coachEvaluate({
        mode: usePitchStore.getState().mode,
        pitchBrief: brief,
        messages: prior,
        activeSection: usePitchStore.getState().activeSection,
        followUpsAskedThisSection: usePitchStore.getState().followUpsAskedThisSection,
        userAnswer: text,
        feedbackHistory: usePitchStore.getState().feedbackHistory,
        sessionLengthMinutes: usePitchStore.getState().sessionLengthMinutes,
        elapsedSeconds: usePitchStore.getState().elapsedSeconds,
      });
      stashEvaluateResult(result);
      setTimeout(() => {
        commitPendingQuestion();
      }, 320);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed.");
      setPhase("asking");
    } finally {
      setTyping(false);
    }
  }, [
    appendMessage,
    commitPendingQuestion,
    draft,
    phase,
    setError,
    setInterim,
    setLastUserMessageId,
    setPhase,
    setRecording,
    setRewriteNotes,
    setTyping,
    stashEvaluateResult,
    stopListening,
  ]);

  // Live call behavior: once user pauses, auto-submit their spoken answer.
  useEffect(() => {
    if (!liveSession) return;
    if (livePaused) return;
    if (phase !== "asking") return;
    if (!draft.trim()) return;
    if (isTyping) return;
    if (coachSpeaking) return;
    if (liveAutoSubmitTimer.current) clearTimeout(liveAutoSubmitTimer.current);
    liveAutoSubmitTimer.current = setTimeout(() => {
      liveAutoSubmitTimer.current = null;
      void submitAnswer();
    }, isRecording ? 720 : 120);
    return () => {
      if (liveAutoSubmitTimer.current) {
        clearTimeout(liveAutoSubmitTimer.current);
        liveAutoSubmitTimer.current = null;
      }
    };
  }, [coachSpeaking, draft, isRecording, isTyping, livePaused, liveSession, phase, submitAnswer]);

  // Live call behavior: auto-open mic when ready for next answer.
  useEffect(() => {
    if (!liveSession) return;
    if (livePaused) return;
    if (sessionPhase !== "coaching") return;
    if (phase !== "asking") return;
    if (isTyping) return;
    if (coachSpeaking) return;
    if (isRecording) return;
    if (draft.trim()) return;
    if (typeof window !== "undefined" && !window.isSecureContext) return;
    if (!micSupported) return;

    setError(null);
    setRecording(true);
    setInterim("");
    startListening((text) => setInterim(text));
  }, [
    isRecording,
    isTyping,
    coachSpeaking,
    liveSession,
    livePaused,
    micSupported,
    phase,
    sessionPhase,
    draft,
    setError,
    setInterim,
    setRecording,
    startListening,
  ]);

  const improveAnswer = async () => {
    const fb = latestFeedback;
    const uid = usePitchStore.getState().lastUserMessageId;
    const userText = messages.find((m) => m.id === uid)?.content;
    const brief = usePitchStore.getState().pitchBrief;
    if (!fb || !userText) return;
    setRewriteBusy(true);
    setError(null);
    try {
      const { improvedAnswer, whyItIsBetter } = await coachRewrite({
        mode,
        pitchBrief: brief,
        userAnswer: userText,
        feedback: fb,
        activeSection,
        feedbackHistory: usePitchStore.getState().feedbackHistory,
      });
      if (uid) updateMessage(uid, improvedAnswer);
      if (uid) updateFeedbackEntryAnswer(uid, improvedAnswer);
      setDraft(improvedAnswer);
      setRewriteNotes(whyItIsBetter?.length ? whyItIsBetter : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rewrite failed.");
    } finally {
      setRewriteBusy(false);
    }
  };

  const continueAfterReview = () => {
    setRewriteNotes(null);
    commitPendingQuestion();
  };

  const restartConversation = async () => {
    stopSpeaking();
    stopPremiumSpeech();
    setCoachSpeaking(false);
    setLastSpokenAssistantId(null);
    stopListening();
    setRecording(false);
    setInterim("");
    setDraft("");
    setLivePaused(false);
    beginSessionClock();
    clearCoachThread();
    await startCoachingSession();
  };

  const closeReportModal = useCallback(() => {
    const kind = reportSourceRef.current;
    reportSourceRef.current = null;
    setReportModalOpen(false);
    setActiveReport(null);
    setReportModalKind(null);
    setReportEndCause("manual");
    if (kind === "end") {
      returnToSetup();
      setDraft("");
      setLivePaused(false);
      clearSessionClock();
      setLastSpokenAssistantId(null);
      setInterim("");
      stopListening();
      setRecording(false);
      stopSpeaking();
      stopPremiumSpeech();
      setCoachSpeaking(false);
    }
  }, [clearSessionClock, returnToSetup, setInterim, setRecording, stopListening]);

  const runSessionReportFlow = useCallback(
    async (cause: "manual" | "time") => {
      if (sessionReportFlowLockRef.current) return;
      sessionReportFlowLockRef.current = true;
      stopSpeaking();
      stopPremiumSpeech();
      setCoachSpeaking(false);
      setLastSpokenAssistantId(null);
      stopListening();
      setRecording(false);
      setInterim("");
      setDraft("");
      setLivePaused(false);
      clearSessionClock();
      if (liveAutoSubmitTimer.current) {
        clearTimeout(liveAutoSubmitTimer.current);
        liveAutoSubmitTimer.current = null;
      }
      setEndSessionBusy(true);
      setError(null);
      setReportEndCause(cause);
      try {
        const st = usePitchStore.getState();
        const report = await coachSessionReport({
          mode: st.mode,
          pitchBrief: st.pitchBrief,
          entries: st.feedbackHistory,
        });
        saveSessionReport(report);
        setActiveReport(report);
        reportSourceRef.current = "end";
        setReportModalKind("end");
        setReportModalOpen(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not generate session report.");
      } finally {
        setEndSessionBusy(false);
        sessionReportFlowLockRef.current = false;
      }
    },
    [clearSessionClock, setError, setInterim, setRecording, stopListening],
  );

  const handleEndSession = useCallback(async () => {
    if (
      !window.confirm(
        "End this session and generate your full analysis report? You can reopen saved reports from the setup screen.",
      )
    ) {
      return;
    }
    await runSessionReportFlow("manual");
  }, [runSessionReportFlow]);

  useEffect(() => {
    if (sessionPhase !== "coaching" || !sessionStartedAt) return;
    if (sessionLengthMinutes === 0) return;
    const limitSec = sessionLengthMinutes * 60;
    if (elapsedSeconds < limitSec) return;
    if (phase === "loading_feedback" || phase === "loading_final" || isTyping) return;
    void runSessionReportFlow("time");
  }, [
    elapsedSeconds,
    isTyping,
    phase,
    runSessionReportFlow,
    sessionLengthMinutes,
    sessionPhase,
    sessionStartedAt,
  ]);

  const onModeChange = async (m: typeof mode) => {
    if (m === mode) return;
    setMode(m);
    if (sessionPhase !== "coaching") return;
    stopSpeaking();
    stopPremiumSpeech();
    setCoachSpeaking(false);
    setLastSpokenAssistantId(null);
    clearCoachThread();
    setDraft("");
    setLivePaused(false);
    beginSessionClock();
    setTyping(true);
    setError(null);
    try {
      const brief = usePitchStore.getState().pitchBrief;
      const res = await coachStart(m, brief, usePitchStore.getState().sessionLengthMinutes);
      bootstrapFromStart(res.assistantMessage, res.activeSection);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not restart with new mode.");
    } finally {
      setTyping(false);
    }
  };

  const modeHint = useMemo(() => PITCH_MODES.find((x) => x.id === mode)?.hint ?? "", [mode]);

  const toggleLivePause = useCallback(() => {
    if (!liveSession) return;
    const next = !livePaused;
    setLivePaused(next);
    if (next) {
      stopListening();
      setRecording(false);
      setInterim("");
      if (liveAutoSubmitTimer.current) {
        clearTimeout(liveAutoSubmitTimer.current);
        liveAutoSubmitTimer.current = null;
      }
    }
  }, [livePaused, liveSession, setInterim, setRecording, stopListening]);

  const complete = phase === "final" || phase === "loading_final";

  const inputDisabled =
    phase === "loading_feedback" ||
    phase === "loading_final" ||
    phase === "idle" ||
    phase === "review" ||
    phase === "final" ||
    showFinal;

  const reportModals = (
    <>
      <ReportsLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onOpenReport={(r) => {
          setActiveReport(r);
          setLibraryOpen(false);
          reportSourceRef.current = "library";
          setReportModalKind("library");
          setReportModalOpen(true);
        }}
      />
      <SessionReportModal
        open={reportModalOpen}
        report={activeReport}
        title={
          reportModalKind === "end"
            ? reportEndCause === "time"
              ? "Time's up — your report"
              : "Session ended — your report"
            : "Analysis report"
        }
        onClose={closeReportModal}
      />
    </>
  );

  if (sessionPhase === "setup") {
    return (
      <>
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-transparent text-zinc-900 dark:text-zinc-100">
          <BackgroundBubbles subtle />
          <TopBar compact onOpenReports={() => setLibraryOpen(true)} />
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <SetupContextPanel
              mode={mode}
              pitchBrief={pitchBrief}
              onBriefChange={setPitchBrief}
              onModeChange={setMode}
              onStart={() => void beginFromSetup()}
              sessionLengthMinutes={sessionLengthMinutes}
              onSessionLengthChange={setSessionLengthMinutes}
              busy={setupBusy}
              minChars={MIN_BRIEF}
              error={error}
              onViewReports={() => setLibraryOpen(true)}
            />
          </div>
        </div>
        {reportModals}
      </>
    );
  }

  return (
    <>
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-transparent text-zinc-900 dark:text-zinc-100">
      <BackgroundBubbles subtle />
      <TopBar
        mode={mode}
        onModeChange={(m) => void onModeChange(m)}
        onRestart={() => void restartConversation()}
        onEndSession={() => void handleEndSession()}
        endSessionBusy={endSessionBusy}
        disableEndSession={endSessionBusy}
        liveSession={liveSession}
        livePaused={livePaused}
        onToggleLivePause={toggleLivePause}
        remainingSeconds={
          sessionLengthMinutes === 0 ? null : Math.max(0, sessionLengthMinutes * 60 - elapsedSeconds)
        }
        pacingMode={pacingMode}
        onEditPitch={() => {
          stopSpeaking();
          stopPremiumSpeech();
          setCoachSpeaking(false);
          setLastSpokenAssistantId(null);
          stopListening();
          setRecording(false);
          setInterim("");
          setDraft("");
          setLivePaused(false);
          setError(null);
          clearSessionClock();
          returnToSetup();
        }}
        showEditPitch
      />

      <div className="shrink-0 border-b border-black/10 bg-white/55 px-5 py-2.5 dark:border-white/10 dark:bg-black/35">
        <p className="mx-auto max-w-6xl text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          <span className="font-semibold text-zinc-700 dark:text-zinc-400">Your pitch context: </span>
          {pitchBrief.length > 220 ? `${pitchBrief.slice(0, 220)}…` : pitchBrief}
        </p>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-0">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:min-h-0 lg:h-full">
          <ConversationPanel
            messages={messages}
            typing={isTyping}
            interim={interimTranscript}
            liveSession={liveSession}
            liveActive={liveSession && isRecording}
            aiSpeaking={coachSpeaking}
            naturalVoice
            naturalVoiceName={naturalVoiceName}
          />
        </div>
        <div className="hidden min-h-0 overflow-y-auto overscroll-contain lg:block lg:h-full lg:min-h-0">
          <AnalysisDashboard
            section={activeSection}
            feedback={latestFeedback}
            typing={isTyping}
            complete={complete}
          />
        </div>
        <div className="max-h-[38vh] min-h-0 shrink-0 overflow-y-auto overscroll-contain border-t border-black/10 dark:border-white/10 lg:hidden">
          <AnalysisDashboard
            section={activeSection}
            feedback={latestFeedback}
            typing={isTyping}
            complete={complete}
          />
        </div>
      </div>

      {phase === "review" && !liveSession ? (
        <div className="shrink-0 border-t border-white/10 bg-black/40 px-5 py-3">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs text-zinc-400">
                Review the scores, tighten your answer if needed, then continue to the next coach prompt.
              </p>
              {rewriteNotes?.length ? (
                <ul className="list-disc space-y-1 pl-4 text-[11px] text-cyan-100/80">
                  {rewriteNotes.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={rewriteBusy}
                onClick={() => void improveAnswer()}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:border-cyan-400/40 disabled:opacity-40"
              >
                {rewriteBusy ? "Improving…" : "Improve my answer"}
              </button>
              <button
                type="button"
                onClick={continueAfterReview}
                className="rounded-lg bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 text-xs font-semibold text-black"
              >
                Continue to next question
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="shrink-0">
        <BottomInput
          draft={draft}
          onDraftChange={setDraft}
          onSend={() => void submitAnswer()}
          recording={isRecording}
          onMicToggle={toggleMic}
          micSupported={micSupported}
          disabled={inputDisabled}
          placeholder="Answer the coach’s question with specifics, numbers, and examples…"
          modeNote={modeHint ? `Mode: ${modeHint}` : undefined}
          liveSession={liveSession}
          livePaused={livePaused}
        />
      </div>

      {error ? (
        <div className="shrink-0 border-t border-rose-500/20 bg-rose-500/10 px-5 py-2 text-center text-xs text-rose-100">
          {error}
        </div>
      ) : null}

      <FinalOutputPanel open={showFinal} data={finalPitches} onClose={closeFinal} />
    </div>
    {reportModals}
    </>
  );
}
