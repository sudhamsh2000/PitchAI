# PITCHAI - AI Voice NABC Pitch Coach

Pitch to AI before you pitch to the real world.

PITCHAI is a modern voice-first startup pitch coaching app built around the NABC framework:
- Need
- Approach
- Benefits
- Competition

It runs guided pitch interviews, scores every answer, gives sharp investor-style feedback, rewrites weak responses, and generates final 30s / 1m / 3m pitch scripts.

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
- Live session mode (continuous flow)
- Natural voice with free local Piper support (OpenAI fallback optional)
- Friday persona (direct, investor-style, no fluff)
- Circular live voice spectrum (neon ring style)
- Auto turn-taking in live mode (prevents self-echo loops)

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Framer Motion
- Zustand
- OpenAI SDK

## Local Setup

### 1) Prerequisites

- Node.js 20+ recommended
- npm

### 2) Install dependencies

```bash
npm install
```

### 3) Configure environment variables

Create either `.env.local` (recommended) or `.env` in the project root.

You can use OpenRouter for chat, OpenAI for chat, or both.

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
OPENAI_MODEL=gpt-4o
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

### 5) Run the app

```bash
npm run dev
```

Open:
- Home: [http://localhost:3000](http://localhost:3000)
- Setup + session: [http://localhost:3000/pitch](http://localhost:3000/pitch)

## How To Use

1. Open `/pitch`
2. Fill pitch context (what you are building, customer, stage)
3. Select a mode (Investor / Hackathon / Healthcare / Beginner)
4. Optional: enable Live session
5. Click **Start pitch session**
6. Answer via voice or text
7. Review scores + feedback
8. Use rewrite helper when needed
9. Generate final outputs and copy/export

## Notes for Contributors

- `.env*` files are gitignored; never commit secrets.
- If running from another device over LAN in dev mode, ensure your URL/port is correct.
- If you see stale UI, restart `npm run dev` and hard refresh.
- Piper model downloads can take a few minutes on first run.

## Troubleshooting

- `429 Provider returned error`: OpenRouter model is rate-limited. Wait 20-60 seconds or set a different `OPENROUTER_MODEL`; fallback models are supported via `OPENROUTER_FALLBACK_MODELS`.
- Voice sounds robotic: verify Piper is running (`docker ps | grep pitchai-piper`). If not running, app falls back to browser voice.
- Friday reads technical terms like voice/model/format: set `PIPER_TTS_URL=http://127.0.0.1:5002` and restart `npm run dev`.
- Live mode hears itself: this is now guarded via turn-taking; if you still see it, hard refresh the app.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Product Branding

Watermark in-app: **A product of Smash TECH**
