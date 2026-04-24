import Link from "next/link";
import { BackgroundBubbles } from "@/components/BackgroundBubbles";

export default function Home() {
  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden px-6 py-8 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.74),transparent_42%),radial-gradient(circle_at_82%_0%,rgba(171,211,255,0.42),transparent_40%)] dark:bg-[radial-gradient(circle_at_18%_8%,rgba(118,170,245,0.18),transparent_45%),radial-gradient(circle_at_82%_0%,rgba(74,132,214,0.24),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.55),transparent_35%,transparent_68%,rgba(255,255,255,0.35))] dark:bg-[linear-gradient(to_bottom,rgba(7,12,22,0.58),rgba(6,10,18,0.22)_34%,rgba(6,10,18,0.52)_100%)]" />
      <BackgroundBubbles />

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center overflow-y-auto overscroll-contain text-center">
        <div className="my-auto flex w-full flex-col items-center py-4">
          <div className="w-full rounded-3xl border border-black/10 bg-white/60 px-6 py-10 shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-white/12 dark:bg-[rgba(14,18,28,0.68)] dark:shadow-[0_22px_60px_rgba(0,0,0,0.58)] sm:px-10 sm:py-12">
          <p className="mb-2 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-5xl">
            PITCH<span className="text-sky-600 dark:text-sky-300">AI</span>
          </p>
          <p className="mx-auto mb-6 inline-flex rounded-full border border-sky-200 bg-sky-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:border-sky-300/25 dark:bg-sky-300/10 dark:text-sky-200">
            AI Voice NABC Pitch Coach
          </p>

          <h1 className="mx-auto max-w-4xl text-balance text-5xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
            Pitch to <span className="text-sky-600 dark:text-sky-300">AI</span> before you
            <br />
            pitch to the <span className="text-pink-600 dark:text-pink-300">real world</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-zinc-600 dark:text-zinc-300/90 sm:text-base">
            Practice your startup story with direct, investor-style questioning and sharper, structured feedback.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3">
            <Link
              href="/pitch"
              className="inline-flex h-13 min-w-64 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 px-10 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:brightness-105 dark:from-sky-400 dark:via-blue-300 dark:to-indigo-200 dark:text-[#10131a] dark:shadow-[0_14px_30px_rgba(79,150,255,0.25)]"
            >
              Start pitching session
            </Link>
            <Link
              href="/nabc-lab"
              className="inline-flex h-10 min-w-64 items-center justify-center rounded-xl border border-zinc-300 bg-white/80 px-6 text-sm font-semibold text-zinc-800 transition hover:border-sky-400 hover:text-sky-700"
            >
              Open NABC Lab
            </Link>
            <p className="text-xs text-zinc-600 dark:text-zinc-500">Setup your pitch context next, then begin the voice interview.</p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
