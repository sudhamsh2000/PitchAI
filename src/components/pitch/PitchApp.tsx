"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePitchStore } from "@/store/usePitchStore";
import { coachEvaluate, coachFinal, coachRewrite, coachStart } from "@/lib/coach-client";
import { PITCH_MODES } from "@/lib/modes";
import { speakText, stopSpeaking, useVoice } from "@/hooks/useVoice";
import { speakPremiumText, stopPremiumSpeech } from "@/lib/tts-client";
import { TopBar } from "./TopBar";
import { ConversationPanel } from "./ConversationPanel";
import { AnalysisDashboard } from "./AnalysisDashboard";
import { BottomInput } from "./BottomInput";
import { FinalOutputPanel } from "./FinalOutputPanel";
import { SetupContextPanel } from "./SetupContextPanel";

const MIN_BRIEF = 1;

export function PitchApp() {
  const [draft, setDraft] = useState("");
  const [setupBusy, setSetupBusy] = useState(false);
  const [liveSession, setLiveSession] = useState(false);
  const [premiumVoice, setPremiumVoice] = useState(false);
  const [premiumVoiceName, setPremiumVoiceName] = useState("alloy");
  const [lastSpokenAssistantId, setLastSpokenAssistantId] = useState<string | null>(null);

  const sessionPhase = usePitchStore((s) => s.sessionPhase);
  const pitchBrief = usePitchStore((s) => s.pitchBrief);
  const mode = usePitchStore((s) => s.mode);
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

  const [rewriteBusy, setRewriteBusy] = useState(false);

  const onFinalSpeech = useCallback((chunk: string) => {
    setDraft((d) => {
      const t = chunk.trim();
      if (!t) return d;
      const joiner = d && !/\s$/.test(d) ? " " : "";
      return `${d}${joiner}${t}`;
    });
  }, []);

  const onRecognitionError = useCallback(
    (msg: string) => {
      setError(msg);
      setRecording(false);
    },
    [setError, setRecording],
  );

  const { supported: micSupported, startListening, stopListening } = useVoice(
    onFinalSpeech,
    onRecognitionError,
  );

  const startCoachingSession = useCallback(async () => {
    const brief = usePitchStore.getState().pitchBrief.trim();
    const currentMode = usePitchStore.getState().mode;
    setError(null);
    setTyping(true);
    try {
      const res = await coachStart(currentMode, brief);
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
      stopSpeaking();
      stopPremiumSpeech();
      if (premiumVoice) {
        void speakPremiumText(text, {
          voice: premiumVoiceName,
          onError: (msg) => setError(msg),
        });
      } else {
        speakText(text);
      }
    },
    [premiumVoice, premiumVoiceName, setError],
  );

  useEffect(() => {
    if (!liveSession) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (last.id === lastSpokenAssistantId) return;
    setLastSpokenAssistantId(last.id);
    speakCoach(last.content);
  }, [liveSession, lastSpokenAssistantId, messages, speakCoach]);

  useEffect(() => {
    if (sessionPhase !== "coaching") return;
    if (phase !== "loading_final") return;
    let stale = false;
    (async () => {
      setTyping(true);
      try {
        const { messages: m, mode: md, pitchBrief: brief } = usePitchStore.getState();
        const pitches = await coachFinal({ mode: md, pitchBrief: brief, messages: m });
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

  const submitAnswer = async () => {
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
    try {
      const result = await coachEvaluate({
        mode: usePitchStore.getState().mode,
        pitchBrief: brief,
        messages: prior,
        activeSection: usePitchStore.getState().activeSection,
        followUpsAskedThisSection: usePitchStore.getState().followUpsAskedThisSection,
        userAnswer: text,
      });
      stashEvaluateResult(result);
      if (liveSession) {
        setTimeout(() => {
          commitPendingQuestion();
        }, 650);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed.");
      setPhase("asking");
    } finally {
      setTyping(false);
    }
  };

  const improveAnswer = async () => {
    const fb = latestFeedback;
    const uid = usePitchStore.getState().lastUserMessageId;
    const userText = messages.find((m) => m.id === uid)?.content;
    const brief = usePitchStore.getState().pitchBrief;
    if (!fb || !userText) return;
    setRewriteBusy(true);
    setError(null);
    try {
      const { improvedAnswer } = await coachRewrite({
        mode,
        pitchBrief: brief,
        userAnswer: userText,
        feedback: fb,
        activeSection,
      });
      if (uid) updateMessage(uid, improvedAnswer);
      setDraft(improvedAnswer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rewrite failed.");
    } finally {
      setRewriteBusy(false);
    }
  };

  const continueAfterReview = () => {
    commitPendingQuestion();
  };

  const restartConversation = async () => {
    stopSpeaking();
    stopPremiumSpeech();
    setLastSpokenAssistantId(null);
    stopListening();
    setRecording(false);
    setInterim("");
    setDraft("");
    clearCoachThread();
    await startCoachingSession();
  };

  const onModeChange = async (m: typeof mode) => {
    if (m === mode) return;
    setMode(m);
    if (sessionPhase !== "coaching") return;
    stopSpeaking();
    stopPremiumSpeech();
    setLastSpokenAssistantId(null);
    clearCoachThread();
    setDraft("");
    setTyping(true);
    setError(null);
    try {
      const brief = usePitchStore.getState().pitchBrief;
      const res = await coachStart(m, brief);
      bootstrapFromStart(res.assistantMessage, res.activeSection);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not restart with new mode.");
    } finally {
      setTyping(false);
    }
  };

  const modeHint = useMemo(() => PITCH_MODES.find((x) => x.id === mode)?.hint ?? "", [mode]);

  const complete = phase === "final" || phase === "loading_final";

  const inputDisabled =
    phase === "loading_feedback" ||
    phase === "loading_final" ||
    phase === "idle" ||
    phase === "review" ||
    phase === "final" ||
    showFinal;

  if (sessionPhase === "setup") {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-transparent text-zinc-100">
        <TopBar compact />
        <SetupContextPanel
          mode={mode}
          pitchBrief={pitchBrief}
          onBriefChange={setPitchBrief}
          onModeChange={setMode}
          onStart={() => void beginFromSetup()}
          liveSession={liveSession}
          onLiveSessionChange={setLiveSession}
          premiumVoice={premiumVoice}
          onPremiumVoiceChange={setPremiumVoice}
          premiumVoiceName={premiumVoiceName}
          onPremiumVoiceNameChange={setPremiumVoiceName}
          busy={setupBusy}
          minChars={MIN_BRIEF}
          error={error}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-transparent text-zinc-100">
      <TopBar
        mode={mode}
        onModeChange={(m) => void onModeChange(m)}
        onRestart={() => void restartConversation()}
        onEditPitch={() => {
          stopSpeaking();
          stopPremiumSpeech();
          setLastSpokenAssistantId(null);
          stopListening();
          setRecording(false);
          setInterim("");
          setDraft("");
          setError(null);
          returnToSetup();
        }}
        showEditPitch
      />

      <div className="border-b border-white/10 bg-white/[0.03] px-5 py-2.5">
        <p className="mx-auto max-w-6xl text-[11px] leading-relaxed text-zinc-400">
          <span className="font-semibold text-zinc-400">Your pitch context: </span>
          {pitchBrief.length > 220 ? `${pitchBrief.slice(0, 220)}…` : pitchBrief}
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-0">
        <ConversationPanel
          messages={messages}
          typing={isTyping}
          interim={interimTranscript}
          liveSession={liveSession}
          liveActive={liveSession && isRecording}
          premiumVoice={premiumVoice}
          premiumVoiceName={premiumVoiceName}
          onVoiceError={setError}
        />
        <div className="hidden lg:block">
          <AnalysisDashboard
            section={activeSection}
            feedback={latestFeedback}
            typing={isTyping}
            complete={complete}
          />
        </div>
      </div>

      <div className="lg:hidden">
        <AnalysisDashboard
          section={activeSection}
          feedback={latestFeedback}
          typing={isTyping}
          complete={complete}
        />
      </div>

      {phase === "review" && !liveSession ? (
        <div className="border-t border-white/10 bg-black/40 px-5 py-3">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-400">
              Review the scores, tighten your answer if needed, then continue to the next coach prompt.
            </p>
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
      />

      {error ? (
        <div className="border-t border-rose-500/20 bg-rose-500/10 px-5 py-2 text-center text-xs text-rose-100">
          {error}
        </div>
      ) : null}

      <FinalOutputPanel open={showFinal} data={finalPitches} onClose={closeFinal} />
    </div>
  );
}
