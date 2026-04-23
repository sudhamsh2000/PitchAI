"use client";

import { motion } from "framer-motion";
import type { FinalPitches } from "@/types/pitch";

function Card({
  title,
  body,
  onCopy,
}: {
  title: string;
  body: string;
  onCopy: () => void;
}) {
  return (
    <motion.div
      layout
      className="rounded-2xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-lg border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:border-sky-400/35 dark:border-white/10 dark:bg-black/30 dark:text-zinc-200 dark:hover:border-cyan-400/40"
        >
          Copy
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-zinc-700 dark:text-zinc-200">{body}</p>
    </motion.div>
  );
}

export function FinalOutputPanel({
  open,
  data,
  onClose,
}: {
  open: boolean;
  data: FinalPitches | null;
  onClose: () => void;
}) {
  if (!open || !data) return null;

  const exportText = [
    "# PITCHAI outputs",
    "",
    "## 30 seconds",
    data.pitch30s,
    "",
    "## 1 minute",
    data.pitch1m,
    "",
    "## 3 minutes",
    data.pitch3m,
    "",
    "## Deck bullets",
    ...data.deckBullets.map((b) => `- ${b}`),
  ].join("\n");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center dark:bg-black/70">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-h-[min(90dvh,calc(100dvh-2rem))] w-full max-w-4xl overflow-y-auto overscroll-contain rounded-2xl border border-black/10 bg-white/90 p-5 text-zinc-800 shadow-2xl shadow-black/15 dark:border-white/10 dark:bg-[#07080b] dark:text-zinc-100 dark:shadow-cyan-500/10"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Final pitch outputs</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">
              Tight scripts plus a deck-ready bullet summary. Iterate with another session anytime.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(exportText);
              }}
              className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-sky-400/35 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:hover:border-cyan-400/40"
            >
              Export all
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-black/10 bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-sky-400/35 dark:border-white/10 dark:bg-black/40 dark:text-zinc-200 dark:hover:border-white/20"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card title="30-second pitch" body={data.pitch30s} onCopy={() => navigator.clipboard.writeText(data.pitch30s)} />
          <Card title="1-minute pitch" body={data.pitch1m} onCopy={() => navigator.clipboard.writeText(data.pitch1m)} />
          <Card title="3-minute pitch" body={data.pitch3m} onCopy={() => navigator.clipboard.writeText(data.pitch3m)} />
          <div className="rounded-2xl border border-black/10 bg-white/80 p-4 md:col-span-2 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Pitch deck summary</h3>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(data.deckBullets.map((b) => `- ${b}`).join("\n"))}
                className="rounded-lg border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:border-sky-400/35 dark:border-white/10 dark:bg-black/30 dark:text-zinc-200 dark:hover:border-cyan-400/40"
              >
                Copy bullets
              </button>
            </div>
            <ul className="list-disc space-y-2 pl-5 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {data.deckBullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
