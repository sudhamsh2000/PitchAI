"use client";

import { useEffect, useRef } from "react";

/**
 * Small mirrored self-view for confidence during live sessions only.
 * Video-only stream (does not replace mic / speech recognition).
 */
export function LiveSelfView({ active, speaking }: { active: boolean; speaking?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!active) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }

    const node = videoRef.current;
    if (!node) return;

    let cancelled = false;

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 480 },
            height: { ideal: 360 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        node.srcObject = stream;
        await node.play().catch(() => {});
      } catch {
        /* Camera denied or unavailable — hide quietly */
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      node.srcObject = null;
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl border bg-black/60 shadow-[0_12px_30px_rgba(0,0,0,0.3)] transition ${
        speaking
          ? "border-sky-400/65 shadow-[0_0_0_2px_rgba(56,189,248,0.22),0_18px_34px_rgba(14,116,255,0.24)]"
          : "border-black/15 dark:border-sky-300/25 dark:shadow-sky-500/10"
      }`}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className="h-[132px] w-[196px] object-cover sm:h-[148px] sm:w-[220px]"
        style={{ transform: "scaleX(-1)" }}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-2 py-1.5">
        <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-cyan-100/90">
          You
        </p>
      </div>
    </div>
  );
}
