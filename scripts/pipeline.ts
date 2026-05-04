/**
 * pipeline.ts — Run the full processing pipeline.
 *
 * Steps:
 *   1. Fetch new content (YouTube, Oaktree, etc.)
 *   2. Retry missing transcripts (yt-dlp + Gemini fallback)
 *   3. Analyze unprocessed content (Claude)
 *   4. Update knowledge state (source + theme compilation)
 *   5. Generate missing embeddings (Voyage AI)
 *   6. Evaluate & update outlooks (Claude)
 *   7. Generate signals (Claude + Yahoo Finance)
 *   8. Fetch positioning data (CFTC COT, credit spreads, options sentiment)
 *   9. Generate positioning (Claude synthesis)
 *  10. Fetch 13F holdings (SEC EDGAR)
 *  11. Fetch prediction markets (Kalshi + Polymarket)
 *  12. Fetch FedWatch rate probabilities
 *  13. Backtest source predictions (Claude + Yahoo Finance)
 *  14. Review house view predictions (only when --house-view is passed)
 *  15. Evaluate house predictions (Claude + Yahoo Finance)
 *  16. Generate daily update (Claude synthesis — must be last)
 *
 * Usage:
 *   npx tsx scripts/pipeline.ts                # run all steps
 *   npx tsx scripts/pipeline.ts --fetch        # only fetch
 *   npx tsx scripts/pipeline.ts --transcripts  # only transcript retry
 *   npx tsx scripts/pipeline.ts --analyze      # only analyze
 *   npx tsx scripts/pipeline.ts --knowledge    # only knowledge state compilation
 *   npx tsx scripts/pipeline.ts --embed        # only embeddings
 *   npx tsx scripts/pipeline.ts --outlook      # only outlook
 *   npx tsx scripts/pipeline.ts --signals      # only signals
 *   npx tsx scripts/pipeline.ts --pos-data     # only positioning data (COT, credit, options)
 *   npx tsx scripts/pipeline.ts --positioning  # only positioning
 *   npx tsx scripts/pipeline.ts --13f          # only 13F holdings
 *   npx tsx scripts/pipeline.ts --markets      # only prediction markets
 *   npx tsx scripts/pipeline.ts --fedwatch     # only FedWatch probabilities
 *   npx tsx scripts/pipeline.ts --backtest     # only backtest source predictions
 *   npx tsx scripts/pipeline.ts --house-view   # review house view for material changes (never auto-runs)
 *   npx tsx scripts/pipeline.ts --house-eval   # only evaluate house predictions
 *   npx tsx scripts/pipeline.ts --portfolio     # only generate model portfolio
 *   npx tsx scripts/pipeline.ts --track-portfolio # only track portfolio performance
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
// Modifier flags that tweak behavior but shouldn't disable the default run-all mode
const MODIFIER_FLAGS = ['--skip-house-gen'];
const stepArgs = args.filter((a) => !MODIFIER_FLAGS.includes(a));
const runAll = stepArgs.length === 0;
const runFetch = runAll || args.includes('--fetch');
const runTranscripts = runAll || args.includes('--transcripts');
const runAnalyze = runAll || args.includes('--analyze');
const runKnowledge = runAll || args.includes('--knowledge');
const runEmbed = runAll || args.includes('--embed');
const runOutlook = runAll || args.includes('--outlook');
const runSignals = runAll || args.includes('--signals');
const runPosData = runAll || args.includes('--pos-data');
const runPositioning = runAll || args.includes('--positioning');
const run13f = runAll || args.includes('--13f');
const runInsiderMonitor = runAll || args.includes('--insider-monitor') || args.includes('--13f');
const runMarkets = runAll || args.includes('--markets');
const runFedWatch = runAll || args.includes('--fedwatch');
const runBacktest = runAll || args.includes('--backtest');
// House view is stable & high-conviction — never auto-run, only when explicitly requested
const runHouseView = args.includes('--house-view');
const runHouseEval = runAll || args.includes('--house-eval');
const runPortfolio = runAll || args.includes('--portfolio');
const runTrackPortfolio = runAll || args.includes('--track-portfolio');
const runDaily = runAll || args.includes('--daily');
const runSignals2 = runAll || args.includes('--intel-signals') || args.includes('--signals');

const failures: string[] = [];

// Per-step timeout in ms (default 10 min, fetch/transcript steps get more)
const STEP_TIMEOUTS: Record<string, number> = {
  'scripts/fetch-all.ts': 15 * 60 * 1000,
  'scripts/fetch-missing-transcripts.ts': 10 * 60 * 1000,
  'scripts/analyze-content.ts': 10 * 60 * 1000,
  'scripts/update-knowledge-state.ts': 10 * 60 * 1000,
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
  [runFetch, 'Step 1/18 — Fetch content', 'scripts/fetch-all.ts'],
  [runTranscripts, 'Step 2/18 — Retry missing transcripts', 'scripts/fetch-missing-transcripts.ts'],
  [runAnalyze, 'Step 3/18 — Analyze content', 'scripts/analyze-content.ts'],
  [runKnowledge, 'Step 4/18 — Update knowledge state', 'scripts/update-knowledge-state.ts'],
  [runEmbed, 'Step 5/18 — Generate embeddings', 'scripts/generate-embeddings.ts'],
  [runOutlook, 'Step 6/18 — Update outlooks', 'scripts/update-outlook.ts'],
  [runSignals, 'Step 7/18 — Generate signals', 'scripts/generate-signals.ts'],
  [runPosData, 'Step 8/18 — Fetch positioning data (COT, credit, options)', 'scripts/fetch-positioning-data.ts'],
  [runPositioning, 'Step 9/18 — Generate positioning', 'scripts/generate-positioning.ts'],
  [run13f, 'Step 10/18 — Fetch 13F holdings', 'scripts/fetch-13f.ts'],
  [runInsiderMonitor, 'Step 10b/18 — Monitor SA insider filings (13D/13G + 13F detection)', 'scripts/monitor-sa-filings.ts'],
  [runMarkets, 'Step 11/18 — Fetch prediction markets', 'scripts/fetch-prediction-markets.ts'],
  [runFedWatch, 'Step 12/18 — Fetch FedWatch probabilities', 'scripts/fetch-fedwatch.ts'],
  [runBacktest, 'Step 13/18 — Backtest source predictions', 'scripts/backtest-predictions.ts'],
  [runHouseView, 'Step 14/18 — Generate house view predictions', 'scripts/generate-house-view.ts'],
  [runHouseEval, 'Step 15/18 — Evaluate house predictions', 'scripts/evaluate-house-view.ts'],
  [runPortfolio, 'Step 16/18 — Generate model portfolio', 'scripts/generate-portfolio.ts'],
  [runTrackPortfolio, 'Step 17/18 — Track portfolio performance', 'scripts/track-portfolio-performance.ts'],
  [runSignals2, 'Step 17b/18 — Detect intelligence signals (convergence + tension)', 'scripts/detect-intelligence-signals.ts'],
  [runDaily, 'Step 18/18 — Generate daily update', 'scripts/generate-daily-update.ts'],
];

const active = steps.filter(([enabled]) => enabled);
const pipelineStart = Date.now();

// Hard budget: stop starting new steps after 30 min to leave room for cleanup
// Budget needs to comfortably exceed the worst-case path through fetch + transcripts
// + analysis. 30min was too tight — daily update kept getting skipped. 50min leaves
// ~5min headroom under the GH Actions 55min job timeout.
const PIPELINE_BUDGET_MS = 50 * 60 * 1000;

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
