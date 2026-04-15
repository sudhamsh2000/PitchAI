"use client";

import { motion } from "framer-motion";
import type { NABCSection } from "@/types/pitch";

const ORDER: NABCSection[] = ["need", "approach", "benefits", "competition"];

const LABEL: Record<NABCSection, string> = {
  need: "Need",
  approach: "Approach",
  benefits: "Benefits",
  competition: "Competition",
};

export function NABCProgress({
  active,
  complete,
}: {
  active: NABCSection;
  complete: boolean;
}) {
  const idx = ORDER.indexOf(active);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>NABC progress</span>
        <span>{complete ? "Complete" : `${LABEL[active]} phase`}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400"
          initial={false}
          animate={{
            width: complete ? "100%" : `${((idx + 0.35) / ORDER.length) * 100}%`,
          }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {ORDER.map((key, i) => {
          const state =
            complete || i < idx ? "done" : i === idx ? "active" : "todo";
          return (
            <div
              key={key}
              className={`rounded-lg border px-2 py-2 text-center text-[11px] font-medium ${
                state === "done"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : state === "active"
                    ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-100"
                    : "border-white/5 bg-white/[0.02] text-zinc-500"
              }`}
            >
              {LABEL[key]}
            </div>
          );
        })}
      </div>
    </div>
  );
}
