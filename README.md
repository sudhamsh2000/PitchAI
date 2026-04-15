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
- Natural Voice (Premium) option with neural TTS

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
```

#### Option B: OpenAI for chat

```bash
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o
```

### 4) Natural Voice (Premium) requirements

Natural voice uses OpenAI TTS API.

```bash
OPENAI_API_KEY=your_openai_key
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
```

If these are not set, browser voice fallback still works.

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
4. Optional: enable
   - Live session
   - Natural Voice (Premium)
5. Click **Start pitch session**
6. Answer via voice or text
7. Review scores + feedback
8. Use rewrite helper when needed
9. Generate final outputs and copy/export

## Notes for Contributors

- `.env*` files are gitignored; never commit secrets.
- If running from another device over LAN in dev mode, ensure your URL/port is correct.
- If you see stale UI, restart `npm run dev` and hard refresh.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Product Branding

Watermark in-app: **A product of Smash TECH**
