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
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-zinc-200 hover:border-cyan-400/40"
        >
          Copy
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{body}</p>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-[#07080b] p-5 shadow-2xl shadow-cyan-500/10"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Final pitch outputs</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Tight scripts plus a deck-ready bullet summary. Iterate with another session anytime.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(exportText);
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-100 hover:border-cyan-400/40"
            >
              Export all
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-200 hover:border-white/20"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card title="30-second pitch" body={data.pitch30s} onCopy={() => navigator.clipboard.writeText(data.pitch30s)} />
          <Card title="1-minute pitch" body={data.pitch1m} onCopy={() => navigator.clipboard.writeText(data.pitch1m)} />
          <Card title="3-minute pitch" body={data.pitch3m} onCopy={() => navigator.clipboard.writeText(data.pitch3m)} />
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">Pitch deck summary</h3>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(data.deckBullets.map((b) => `- ${b}`).join("\n"))}
                className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-zinc-200 hover:border-cyan-400/40"
              >
                Copy bullets
              </button>
            </div>
            <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-200">
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
