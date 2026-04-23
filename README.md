# PITCHAI - AI Voice NABC Pitch Coach

Pitch to AI before you pitch to the real world.

PITCHAI is a modern voice-first startup pitch coaching app built around the NABC framework:
- Need
- Approach
- Benefits
- Competition

It runs guided pitch interviews, scores every answer, gives sharp investor-style feedback, rewrites weak responses, and generates final 30s / 1m / 3m pitch scripts.

## Latest Update (Apr 2026)

- Introduced an immersive **AI Interview Stage** session layout (central Friday orb + persistent analysis + compact transcript strip).
- **Pitch session length**: choose **1 / 3 / 5 / 7 / 10 min**, **No limit** (practice, no countdown or auto-stop), or let the timer run out to **auto-end and open the session report**.
- Timed sessions steer **full NABC coverage** (Need → Approach → Benefits → Competition) within the clock; practice mode keeps depth without a timer.
- Friday adapts follow-up depth and section moves using remaining time (`On track` / `Compressed` / `Urgent`) when a timer is set.
- **Setup layout**: coach mode and session length share one compact card so the form fits on screen more comfortably.
- **Transcript** auto-scrolls to the latest messages during live coaching.
- **Audio cleanup**: Friday’s voice stops when you return to setup, leave the page, or end the session (no stray TTS).
- OpenRouter **503** uses the same model fallbacks as **429** where applicable; the API returns clearer guidance when the provider is temporarily unavailable.
- Live flow remains the default, with pause/resume and improved stage cues.
- Delete individual saved reports from **My analysis reports** when cleaning up.

## Core Features

- Voice interview mode (mic + transcript)
- NABC guided flow with adaptive follow-up questions
- Scoring after every answer:
  - Clarity (0-10)
  - Specificity (0-10)
  - Strength (0-10)
- Rewrite assistant ("Improve my answer")
- Final outputs:
  - 30-second pitch
  - 1-minute pitch
  - 3-minute pitch
  - Pitch deck bullet summary
- Pitch modes:
  - Investor
  - Hackathon
  - Healthcare
  - Beginner
- Live session is always on (continuous flow, faster pause-to-submit, improved Web Speech handling)
- Session length: **1 / 3 / 5 / 7 / 10 min**, **No limit** (practice), time-aware pacing when timed, optional **auto session end + report** when the timer expires
- **Live self-view** — small mirrored webcam preview during live sessions only (confidence / framing)
- **End session** — full session analysis report (overall rating, averages, strengths, improvements, per-answer scores); saved locally on this device
- **My analysis reports** — browse past reports from setup (same device, local storage)
- Natural voice with free local Piper support (OpenAI fallback optional); client timeout prevents hung TTS requests
- Friday persona (direct, investor-style, no fluff)
- Immersive AI interview stage (central orb + live self-view + compact transcript strip + persistent analysis panel)
- Auto turn-taking in live mode (prevents self-echo loops)
- **UI** — viewport-stable layouts (home, setup, coaching); chat transcript scrolls inside the conversation column; setup keeps **Start pitch session** pinned while the form scrolls

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Framer Motion
- Zustand
- OpenAI SDK

## AI architecture (multi-agent, unified Friday)

The app still presents **one** coach, **Friday**. Under the hood, `/api/coach` orchestrates modular agents in `src/lib/agents/`:

- **evaluationAgent** — scores and critique for the latest answer (`needsFollowup` helps decide depth).
- **interviewAgent** — Friday’s next spoken question (follow-up vs section advance vs session wrap-up).
- **rewriteAgent** — improved answer plus “why it’s better” bullets.
- **pitchComposerAgent** — final 30s / 1m / 3m scripts and deck bullets.
- **unifiedEvaluateContinue** (optional fast path) — single LLM call for evaluate + next question when JSON parses cleanly; falls back to evaluation + interview if needed.
- **sessionReportAgent** — end-of-session narrative report from scored turns (`action: session_report`).
- **orchestrator** — runs evaluation + next step (unified or two-step), NABC rules with time-aware pacing (normal/compressed/urgent) before advancing.

Shared LLM helpers live in `src/lib/agents/llm-client.ts` (same OpenRouter/OpenAI behavior as before). Coach HTTP calls from the browser use **abort timeouts** so a stalled model does not freeze the UI indefinitely.

## Local Setup

**Day to day, always use the dev server:** `npm run dev` (or `npm run local`), then open [http://localhost:3000](http://localhost:3000).  
`npm start` is only for **production mode after** `npm run build` (see [Verify, test, and ship](#verify-test-and-ship)).

### 0) Clone the repository

```bash
git clone https://github.com/sudhamsh2000/PitchAI.git
cd PitchAI
```

### 1) Prerequisites

- **Node.js 20+** (LTS recommended)
- **npm** (comes with Node)

### 2) Install dependencies

```bash
npm install
```

### 3) Configure environment variables

Create either `.env.local` (recommended) or `.env` in the project root (same folder as `package.json`).

You can copy the template and edit:

```bash
cp .env.example .env.local
```

Then add real API keys. You can use **OpenRouter** for chat, **OpenAI** for chat, or both. At least one chat key is required for Friday to respond.

#### Option A: OpenRouter for chat (recommended for low-cost/free routing)

```bash
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openrouter/free
```

Optional:

```bash
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_NAME=PITCHAI
OPENROUTER_FALLBACK_MODELS=openrouter/auto,openai/gpt-4o-mini
```

#### Option B: OpenAI for chat

```bash
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini
```

### 4) Natural Voice setup (best free option)

Use a local Piper HTTP endpoint for free, low-latency natural voice.

#### Start Piper with Docker (recommended)

```bash
docker run -d --name pitchai-piper -p 5002:5000 \
  -e MODEL_DOWNLOAD_LINK='https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx?download=true' \
  artibex/piper-http
```

Start it later with:

```bash
docker start pitchai-piper
```

Verify it is running:

```bash
docker ps | grep pitchai-piper
```

```bash
PIPER_TTS_URL=http://127.0.0.1:5002
```

Optional settings:

```bash
PIPER_TTS_TIMEOUT_MS=12000
# PIPER_TTS_API_KEY=your_token_if_needed
```

Optional cloud fallback for TTS:

```bash
OPENAI_API_KEY=your_openai_key
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
```

If Piper is down/unavailable, the app falls back to:
1) OpenAI TTS if `OPENAI_API_KEY` is set  
2) Browser voice as last resort  

The browser aborts the `/api/tts` request after about **45 seconds** and then falls back so Friday’s voice does not block live mode indefinitely.

### 5) Start the dev server (every session)

```bash
npm run dev
```

Equivalent alias:

```bash
npm run local
```

Open:
- Home: [http://localhost:3000](http://localhost:3000)
- Setup + session: [http://localhost:3000/pitch](http://localhost:3000/pitch)

If the UI looks outdated after pulling changes, restart the dev server and hard-refresh the browser (`Cmd+Shift+R` / `Ctrl+Shift+R`).

## Verify, test, and ship

Use this before opening a pull request or cutting a release.

### Automated check (lint + production build)

```bash
npm run verify
```

This runs **`npm run lint`** then **`npm run build`**. Both must pass.

### Clean build (clear Next.js cache)

If you hit odd build or HMR issues:

```bash
rm -rf .next
npm run verify
```

On Windows PowerShell you can use `Remove-Item -Recurse -Force .next` instead of `rm -rf .next`.

### Run a production build locally (optional)

```bash
npm run build
npm start
```

Then open [http://localhost:3000](http://localhost:3000). Stop the server with `Ctrl+C`.

### Manual testing checklist

| Step | What to check |
| --- | --- |
| 1 | **Home** (`/`) loads and CTA goes to `/pitch`. |
| 2 | **Setup** — enter a short pitch brief, pick a mode, start session. |
| 3 | **Coach** — Friday asks a question; you answer by **text** first (fastest sanity check). |
| 4 | **Analysis** — after submit, scores and feedback bullets appear. |
| 5 | **Continue** — next Friday message appears and NABC stage progresses with time-aware pacing. |
| 6 | **Voice** — use Chrome or Edge; allow microphone. Live mode is default/always-on for auto mic + auto submit. Safari: type answers or use Chrome for dictation. |
| 7 | **Natural voice** — with Piper Docker running + `PIPER_TTS_URL` set, Friday should sound neural; otherwise browser TTS is used. |
| 8 | **Live self-view** — in live mode, confirm webcam preview appears (permission). |
| 9 | **End session** — ends coaching, shows saved analysis report; reopen from setup via **Analysis reports**. |
| 10 | **Final outputs** — complete NABC flow until finals generate; copy/export works. |

### Optional: API smoke test (with keys configured)

With **`npm run dev`** running, in another terminal:

```bash
curl -s -X POST http://localhost:3000/api/coach \
  -H "Content-Type: application/json" \
  -d '{"action":"start","mode":"investor","pitchBrief":"A short test product pitch."}'
```

You should get JSON with `assistantMessage` and `activeSection: "need"`. If you see an error about missing keys, fix `.env.local` and restart the dev server.

## How To Use

1. Open `/pitch`
2. Fill pitch context (what you are building, customer, stage)
3. Optional: open **View my analysis reports** or **Analysis reports** (header) to review past session reports saved on this device
4. Select a mode (Investor / Hackathon / Healthcare / Beginner)
5. Choose **session length** in the same card as coach mode: **No limit** (practice) or **1 / 3 / 5 / 7 / 10 min** (timed NABC pacing; session can auto-end with report when time is up)
6. Click **Start pitch session** (button stays at the bottom of the screen on setup)
7. Answer via voice or text (live flow auto-listens and auto-submits)
8. Review scores + feedback in the persistent analysis panel
9. Use **End session** anytime for a full report, or **Restart** / **Change pitch idea** as needed
10. Use rewrite helper when needed
11. Generate final outputs and copy/export

## Notes for Contributors

- `.env*` files are gitignored; never commit secrets.
- If running from another device over LAN in dev mode, ensure your URL/port is correct.
- If you see stale UI, restart `npm run dev` and hard refresh.
- Piper model downloads can take a few minutes on first run.

## Troubleshooting

- `429 Provider returned error`: OpenRouter model is rate-limited. Wait 20-60 seconds or set a different `OPENROUTER_MODEL`; fallback models are supported via `OPENROUTER_FALLBACK_MODELS`.
- `503` / provider unavailable: wait and retry, set `OPENROUTER_FALLBACK_MODELS`, switch `OPENROUTER_MODEL`, or use `OPENAI_API_KEY` directly. OpenRouter fallbacks also retry on **503** when configured.
- **Start pitch session** spins forever / nothing happens: confirm `OPENROUTER_API_KEY` or `OPENAI_API_KEY` in `.env.local` and restart the dev server. Requests time out after a few minutes with a clear error instead of hanging silently.
- Voice sounds robotic: verify Piper is running (`docker ps | grep pitchai-piper`). If not running, app falls back to browser voice.
- Friday reads technical terms like voice/model/format: set `PIPER_TTS_URL=http://127.0.0.1:5002` and restart `npm run dev`.
- Live mode hears itself: this is now guarded via turn-taking; if you still see it, hard refresh the app.
- **Live mode feels stuck**: ensure Chrome or Edge (Web Speech API). Safari cannot dictate — type in the answer box. If natural voice hangs, the client falls back after ~45s.
- Analysis reports missing on another device: reports are stored in **browser localStorage** only (not synced).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` or `npm run local` | **Local development** (Turbopack, hot reload). Use this daily. |
| `npm run verify` | **Lint + production build** — run before PRs / releases. |
| `npm run build` | Production build only. |
| `npm start` | Production server **after** `npm run build` (not for normal dev). |
| `npm run lint` | ESLint only. |

```bash
npm run dev
npm run local
npm run verify
npm run build
npm start
npm run lint
```

## Product Branding

Watermark in-app: **A product of Smash TECH**
