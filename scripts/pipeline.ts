/**
 * pipeline.ts — Run the full processing pipeline.
 *
 * Steps:
 *   1. Fetch new content (YouTube, Oaktree, etc.)
 *   2. Retry missing transcripts (yt-dlp + Gemini fallback)
 *   3. Analyze unprocessed content (Claude)
 *   4. Generate missing embeddings (Voyage AI)
 *   5. Evaluate & update outlooks (Claude)
 *   6. Generate signals (Claude + Yahoo Finance)
 *   7. Generate positioning (Claude synthesis)
 *   8. Fetch 13F holdings (SEC EDGAR)
 *   9. Fetch prediction markets (Kalshi + Polymarket)
 *  10. Fetch FedWatch rate probabilities
 *  11. Generate daily update (Claude synthesis — must be last)
 *
 * Usage:
 *   npx tsx scripts/pipeline.ts                # run all steps
 *   npx tsx scripts/pipeline.ts --fetch        # only fetch
 *   npx tsx scripts/pipeline.ts --transcripts  # only transcript retry
 *   npx tsx scripts/pipeline.ts --analyze      # only analyze
 *   npx tsx scripts/pipeline.ts --embed        # only embeddings
 *   npx tsx scripts/pipeline.ts --outlook      # only outlook
 *   npx tsx scripts/pipeline.ts --signals      # only signals
 *   npx tsx scripts/pipeline.ts --positioning  # only positioning
 *   npx tsx scripts/pipeline.ts --13f          # only 13F holdings
 *   npx tsx scripts/pipeline.ts --markets      # only prediction markets
 *   npx tsx scripts/pipeline.ts --fedwatch     # only FedWatch probabilities
 *   npx tsx scripts/pipeline.ts --daily        # only daily update
 */

import { execSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '..');

// ── Validate required environment variables upfront ──
const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
];
const OPTIONAL_ENV = [
  { key: 'YOUTUBE_API_KEY', step: 'Fetch content (YouTube)' },
  { key: 'VOYAGE_API_KEY', step: 'Generate embeddings' },
  { key: 'GEMINI_API_KEY', step: 'Transcript fallback (Gemini)' },
];

const missingRequired = REQUIRED_ENV.filter((k) => !process.env[k] && !process.env[k.replace('NEXT_PUBLIC_', '')]);
if (missingRequired.length > 0) {
  console.error(`\n  ✗ Missing required environment variables:\n`);
  for (const k of missingRequired) console.error(`    - ${k}`);
  console.error('');
  process.exit(1);
}

const missingOptional = OPTIONAL_ENV.filter((e) => !process.env[e.key]);
if (missingOptional.length > 0) {
  console.log(`  ⚠ Missing optional env vars (some steps may be limited):`);
  for (const e of missingOptional) console.log(`    - ${e.key} (${e.step})`);
  console.log('');
}

const args = process.argv.slice(2);
const runAll = args.length === 0;
const runFetch = runAll || args.includes('--fetch');
const runTranscripts = runAll || args.includes('--transcripts');
const runAnalyze = runAll || args.includes('--analyze');
const runEmbed = runAll || args.includes('--embed');
const runOutlook = runAll || args.includes('--outlook');
const runSignals = runAll || args.includes('--signals');
const runPositioning = runAll || args.includes('--positioning');
const run13f = runAll || args.includes('--13f');
const runMarkets = runAll || args.includes('--markets');
const runFedWatch = runAll || args.includes('--fedwatch');
const runDaily = runAll || args.includes('--daily');

const failures: string[] = [];

// Per-step timeout in ms (default 10 min, fetch/transcript steps get more)
const STEP_TIMEOUTS: Record<string, number> = {
  'scripts/fetch-all.ts': 15 * 60 * 1000,
  'scripts/fetch-missing-transcripts.ts': 10 * 60 * 1000,
  'scripts/analyze-content.ts': 10 * 60 * 1000,
};
const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 min

function run(label: string, script: string) {
  const divider = '─'.repeat(50);
  console.log(`\n${divider}`);
  console.log(`  ${label}`);
  console.log(`${divider}\n`);

  const timeout = STEP_TIMEOUTS[script] || DEFAULT_TIMEOUT;
  const start = Date.now();
  try {
    execSync(`npx tsx ${script}`, {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env },
      timeout,
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n  ✓ ${label} completed in ${elapsed}s`);
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const isTimeout = err instanceof Error && 'signal' in err && (err as NodeJS.ErrnoException).signal === 'SIGTERM';
    if (isTimeout) {
      console.error(`\n  ✗ ${label} timed out after ${elapsed}s (limit: ${timeout / 1000}s) — continuing pipeline`);
    } else {
      console.error(`\n  ✗ ${label} failed after ${elapsed}s — continuing pipeline`);
    }
    failures.push(label);
  }
}

console.log('\n  Howard Pipeline\n');

const steps: [boolean, string, string][] = [
  [runFetch, 'Step 1/11 — Fetch content', 'scripts/fetch-all.ts'],
  [runTranscripts, 'Step 2/11 — Retry missing transcripts', 'scripts/fetch-missing-transcripts.ts'],
  [runAnalyze, 'Step 3/11 — Analyze content', 'scripts/analyze-content.ts'],
  [runEmbed, 'Step 4/11 — Generate embeddings', 'scripts/generate-embeddings.ts'],
  [runOutlook, 'Step 5/11 — Update outlooks', 'scripts/update-outlook.ts'],
  [runSignals, 'Step 6/11 — Generate signals', 'scripts/generate-signals.ts'],
  [runPositioning, 'Step 7/11 — Generate positioning', 'scripts/generate-positioning.ts'],
  [run13f, 'Step 8/11 — Fetch 13F holdings', 'scripts/fetch-13f.ts'],
  [runMarkets, 'Step 9/11 — Fetch prediction markets', 'scripts/fetch-prediction-markets.ts'],
  [runFedWatch, 'Step 10/11 — Fetch FedWatch probabilities', 'scripts/fetch-fedwatch.ts'],
  [runDaily, 'Step 11/11 — Generate daily update', 'scripts/generate-daily-update.ts'],
];

const active = steps.filter(([enabled]) => enabled);
const pipelineStart = Date.now();

// Hard budget: stop starting new steps after 30 min to leave room for cleanup
const PIPELINE_BUDGET_MS = 30 * 60 * 1000;

for (const [, label, script] of active) {
  const elapsed = Date.now() - pipelineStart;
  if (elapsed > PIPELINE_BUDGET_MS) {
    console.error(`\n  ⚠ Pipeline time budget exceeded (${(elapsed / 1000).toFixed(0)}s) — skipping remaining steps`);
    failures.push(`${label} (skipped — time budget)`);
    continue;
  }
  run(label, script);
}

const total = ((Date.now() - pipelineStart) / 1000).toFixed(1);
console.log(`\n${'─'.repeat(50)}`);
if (failures.length > 0) {
  console.log(`  Pipeline finished with ${failures.length} failure${failures.length !== 1 ? 's' : ''} in ${total}s`);
  for (const f of failures) console.log(`    ✗ ${f}`);
  console.log(`${'─'.repeat(50)}\n`);
  process.exit(1);
} else {
  console.log(`  Pipeline complete — ${active.length} step${active.length !== 1 ? 's' : ''} in ${total}s`);
  console.log(`${'─'.repeat(50)}\n`);
}
