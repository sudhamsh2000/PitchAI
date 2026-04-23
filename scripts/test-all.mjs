#!/usr/bin/env node
/**
 * PITCHAI full test runner: ESLint → production build → HTTP/API smoke tests.
 *
 * Usage:
 *   npm test
 *
 * Env:
 *   TEST_BASE_URL   — default http://127.0.0.1:3000
 *   SKIP_HTTP=1     — only lint + build (for environments without a server)
 *   TEST_KEEP_SERVER=1 — do not stop a server we started (debug only)
 */

import { execSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const BASE = process.env.TEST_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:3000";
const SKIP_HTTP = process.env.SKIP_HTTP === "1";
const KEEP_SERVER = process.env.TEST_KEEP_SERVER === "1";

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[90m${s}\x1b[0m`;

/** @type {{ name: string; level: 'pass' | 'fail' | 'warn'; detail?: string }[]} */
const results = [];

function record(name, level, detail) {
  results.push({ name, level, detail });
}

function runNpm(script, label) {
  try {
    execSync(`npm run ${script}`, { cwd: ROOT, stdio: "inherit", env: process.env });
    record(label, "pass");
  } catch {
    record(label, "fail", "non-zero exit — see output above");
    throw new Error(`${label} failed`);
  }
}

async function serverUp() {
  try {
    const r = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch {
    return false;
  }
}

async function waitForReady(timeoutMs = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await serverUp()) return;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Nothing responded at ${BASE} within ${timeoutMs / 1000}s`);
}

function startNextProduction() {
  const child = spawn("npm", ["run", "start", "--", "-p", "3000"], {
    cwd: ROOT,
    shell: true,
    stdio: "ignore",
    detached: false,
    env: { ...process.env, PORT: "3000" },
  });
  return child;
}

/** @type {import('child_process').ChildProcess | null} */
let spawnedServer = null;

async function cleanupServer() {
  if (!spawnedServer || KEEP_SERVER) return;
  try {
    spawnedServer.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 1500));
    if (!spawnedServer.killed) {
      spawnedServer.kill("SIGKILL");
    }
  } catch {
    /* ignore */
  }
  spawnedServer = null;
}

process.on("SIGINT", async () => {
  await cleanupServer();
  process.exit(130);
});

process.on("SIGTERM", async () => {
  await cleanupServer();
  process.exit(143);
});

async function fetchText(method, url, body) {
  const opt = {
    method,
    signal: AbortSignal.timeout(120000),
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  };
  const res = await fetch(url, opt);
  const text = await res.text();
  return { res, text };
}

async function httpSuite() {
  let r = await fetchText("GET", `${BASE}/`);
  if (!r.res.ok) {
    record("GET /", "fail", `HTTP ${r.res.status}`);
  } else if (!/<html/i.test(r.text) && !/DOCTYPE/i.test(r.text)) {
    record("GET /", "warn", "response does not look like HTML");
  } else {
    record("GET /", "pass");
  }

  r = await fetchText("GET", `${BASE}/pitch`);
  if (!r.res.ok) {
    record("GET /pitch", "fail", `HTTP ${r.res.status}`);
  } else if (!/pitch|PITCHAI|conversation/i.test(r.text)) {
    record("GET /pitch", "warn", "unexpected body (missing expected markers)");
  } else {
    record("GET /pitch", "pass");
  }

  r = await fetchText("POST", `${BASE}/api/coach`, {
    action: "start",
    mode: "investor",
    pitchBrief: "Smoke test pitch brief for automated testing.",
    sessionLengthMinutes: 5,
  });
  if (r.res.ok) {
    try {
      const j = JSON.parse(r.text);
      if (j.assistantMessage && j.activeSection) {
        record("POST /api/coach (start)", "pass");
      } else {
        record("POST /api/coach (start)", "fail", "JSON missing assistantMessage or activeSection");
      }
    } catch {
      record("POST /api/coach (start)", "fail", "response is not JSON");
    }
  } else if (r.res.status === 500 && /No AI key|OPENROUTER|OPENAI_API_KEY/i.test(r.text)) {
    record(
      "POST /api/coach (start)",
      "warn",
      "No chat API key configured — add OPENROUTER_API_KEY or OPENAI_API_KEY to .env.local",
    );
  } else {
    record("POST /api/coach (start)", "fail", `HTTP ${r.res.status}: ${r.text.slice(0, 280)}`);
  }

  r = await fetchText("POST", `${BASE}/api/coach`, {
    action: "start",
    mode: "investor",
    pitchBrief: "x",
    sessionLengthMinutes: 0,
  });
  if (r.res.ok) {
    record("POST /api/coach (start, practice mode)", "pass");
  } else if (r.res.status === 500 && /No AI key/i.test(r.text)) {
    record("POST /api/coach (start, practice mode)", "warn", "skipped — no API keys");
  } else {
    record(
      "POST /api/coach (start, practice mode)",
      "fail",
      `HTTP ${r.res.status}: ${r.text.slice(0, 200)}`,
    );
  }

  const ttsRes = await fetch(`${BASE}/api/tts`, {
    method: "POST",
    signal: AbortSignal.timeout(120000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Smoke test utterance.", voice: "alloy" }),
  });
  const ttsBuf = await ttsRes.arrayBuffer();
  const ttsSnippet = new TextDecoder().decode(ttsBuf.slice(0, 200));
  if (ttsRes.ok && ttsBuf.byteLength > 500) {
    record("POST /api/tts", "pass");
  } else if (ttsRes.status >= 400 && /key|401|403|OPENAI/i.test(ttsSnippet)) {
    record("POST /api/tts", "warn", "TTS may need OPENAI_API_KEY — optional for chat-only flows");
  } else {
    record(
      "POST /api/tts",
      "fail",
      `HTTP ${ttsRes.status}, ${ttsBuf.byteLength} bytes — ${ttsSnippet.slice(0, 120)}`,
    );
  }

  let nf = await fetch(`${BASE}/this-route-should-not-exist-xyz`, { signal: AbortSignal.timeout(5000) });
  if (nf.status === 404) {
    record("GET unknown route → 404", "pass");
  } else {
    record("GET unknown route → 404", "warn", `expected 404, got HTTP ${nf.status}`);
  }
}

function printSummary() {
  console.log("");
  console.log(dim("── PITCHAI test summary ──"));
  let fails = 0;
  let warns = 0;
  for (const row of results) {
    const icon = row.level === "pass" ? green("✓") : row.level === "warn" ? yellow("!") : red("✗");
    console.log(`  ${icon} ${row.name}`);
    if (row.detail) console.log(dim(`      ${row.detail}`));
    if (row.level === "fail") fails += 1;
    if (row.level === "warn") warns += 1;
  }
  console.log("");
  if (fails > 0) {
    console.log(red(`FAILED — ${fails} error(s), ${warns} warning(s). Fix issues above.`));
    process.exitCode = 1;
  } else if (warns > 0) {
    console.log(yellow(`PASSED with ${warns} warning(s) — review messages above.`));
    process.exitCode = 0;
  } else {
    console.log(green("ALL CHECKS PASSED."));
    process.exitCode = 0;
  }
}

async function main() {
  console.log(dim(`\nPITCHAI test runner — ${ROOT}\n`));

  try {
    runNpm("lint", "ESLint");
  } catch {
    printSummary();
    await cleanupServer();
    process.exit(1);
  }

  try {
    runNpm("build", "Production build (next build)");
  } catch {
    printSummary();
    await cleanupServer();
    process.exit(1);
  }

  if (SKIP_HTTP) {
    record("HTTP smoke tests", "warn", "skipped (SKIP_HTTP=1)");
    printSummary();
    return;
  }

  let up = await serverUp();
  if (!up) {
    console.log(dim(`No server at ${BASE} — starting production server (next start)…`));
    spawnedServer = startNextProduction();
    spawnedServer.on("error", (err) => {
      console.error(red(String(err)));
    });
    try {
      await waitForReady();
      console.log(dim(`Server ready at ${BASE}\n`));
    } catch (e) {
      record("Start server for smoke tests", "fail", String(e.message));
      await cleanupServer();
      printSummary();
      process.exit(1);
    }
  } else {
    console.log(dim(`Using existing server at ${BASE}\n`));
  }

  try {
    await httpSuite();
  } catch (e) {
    record("HTTP smoke tests", "fail", String(e?.message || e));
  }

  await cleanupServer();
  printSummary();
}

main().catch(async (e) => {
  console.error(red(String(e)));
  await cleanupServer();
  process.exit(1);
});
