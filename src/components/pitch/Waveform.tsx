"use client";

import { motion } from "framer-motion";

export function Waveform({ active }: { active: boolean }) {
  const heights = [10, 18, 26, 16, 30, 14, 22, 12, 24, 16];
  return (
    <div className="flex h-10 items-end gap-1">
      {heights.map((h, i) => (
        <motion.span
          key={i}
          className="w-1 origin-bottom rounded-full bg-gradient-to-t from-cyan-500/30 to-cyan-300"
          style={{ height: h }}
          animate={
            active
              ? { scaleY: [0.35, 1, 0.45, 0.9, 0.35], opacity: [0.55, 1, 0.65, 1, 0.55] }
              : { scaleY: 0.35, opacity: 0.35 }
          }
          transition={{
            duration: 0.9,
            repeat: active ? Infinity : 0,
            delay: i * 0.05,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
