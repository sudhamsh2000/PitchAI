"use client";

import { useEffect, useRef } from "react";

/**
 * Small mirrored self-view for confidence during live sessions only.
 * Video-only stream (does not replace mic / speech recognition).
 */
export function LiveSelfView({ active }: { active: boolean }) {
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
    <div className="relative shrink-0 overflow-hidden rounded-xl border border-cyan-400/25 bg-black/50 shadow-lg shadow-cyan-500/10">
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className="h-[88px] w-[120px] object-cover sm:h-[100px] sm:w-[140px]"
        style={{ transform: "scaleX(-1)" }}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
        <p className="text-center text-[9px] font-semibold uppercase tracking-wide text-cyan-100/90">
          You
        </p>
      </div>
    </div>
  );
}
