import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden px-6 py-8 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(110,231,255,0.16),transparent_42%),radial-gradient(circle_at_80%_0%,rgba(167,139,250,0.14),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_30%,transparent_70%,rgba(255,255,255,0.02))]" />

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center overflow-y-auto overscroll-contain text-center">
        <div className="my-auto flex w-full flex-col items-center py-4">
          <div className="w-full rounded-3xl border border-white/10 bg-black/25 px-6 py-10 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl sm:px-10 sm:py-12">
          <p className="mb-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            PITCH<span className="text-cyan-300">AI</span>
          </p>
          <p className="mx-auto mb-6 inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
            AI Voice NABC Pitch Coach
          </p>

          <h1 className="mx-auto max-w-4xl text-balance text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            Pitch to AI before you pitch to the real world
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-zinc-400 sm:text-base">
            Practice your startup story with direct, investor-style questioning and sharper, structured feedback.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3">
            <Link
              href="/pitch"
              className="inline-flex h-13 min-w-64 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-10 text-base font-semibold text-black shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:brightness-110"
            >
              Start pitching session
            </Link>
            <p className="text-xs text-zinc-500">Setup your pitch context next, then begin the voice interview.</p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
