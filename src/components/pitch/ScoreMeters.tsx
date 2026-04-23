"use client";

import { motion } from "framer-motion";

function Meter({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(10, value));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
        <span>{label}</span>
        <span className="font-mono text-zinc-700 dark:text-zinc-200">{v.toFixed(1)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
          initial={{ width: 0 }}
          animate={{ width: `${v * 10}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 18 }}
        />
      </div>
    </div>
  );
}

export function ScoreMeters({
  clarity,
  specificity,
  strength,
}: {
  clarity: number;
  specificity: number;
  strength: number;
}) {
  return (
    <div className="grid gap-3">
      <Meter label="Clarity" value={clarity} />
      <Meter label="Specificity" value={specificity} />
      <Meter label="Strength" value={strength} />
    </div>
  );
}
