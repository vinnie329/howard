/**
 * pipeline.ts — Run the full processing pipeline.
 *
 * Steps:
 *   1. Fetch new content (YouTube, Oaktree, etc.)
 *   2. Analyze unprocessed content (Claude)
 *   3. Generate missing embeddings (Voyage AI)
 *   4. Evaluate & update outlooks (Claude)
 *   5. Generate signals (Claude + Yahoo Finance)
 *   6. Generate positioning (Claude synthesis)
 *   7. Fetch 13F holdings (SEC EDGAR)
 *   8. Fetch prediction markets (Kalshi + Polymarket)
 *   9. Fetch FedWatch rate probabilities
 *  10. Generate daily update (Claude synthesis — must be last)
 *
 * Usage:
 *   npx tsx scripts/pipeline.ts                # run all steps
 *   npx tsx scripts/pipeline.ts --fetch        # only fetch
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
const args = process.argv.slice(2);
const runAll = args.length === 0;
const runFetch = runAll || args.includes('--fetch');
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

function run(label: string, script: string) {
  const divider = '─'.repeat(50);
  console.log(`\n${divider}`);
  console.log(`  ${label}`);
  console.log(`${divider}\n`);

  const start = Date.now();
  try {
    execSync(`npx tsx ${script}`, {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env },
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n  ✓ ${label} completed in ${elapsed}s`);
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`\n  ✗ ${label} failed after ${elapsed}s — continuing pipeline`);
    failures.push(label);
  }
}

console.log('\n  Howard Pipeline\n');

const steps: [boolean, string, string][] = [
  [runFetch, 'Step 1/10 — Fetch content', 'scripts/fetch-all.ts'],
  [runAnalyze, 'Step 2/10 — Analyze content', 'scripts/analyze-content.ts'],
  [runEmbed, 'Step 3/10 — Generate embeddings', 'scripts/generate-embeddings.ts'],
  [runOutlook, 'Step 4/10 — Update outlooks', 'scripts/update-outlook.ts'],
  [runSignals, 'Step 5/10 — Generate signals', 'scripts/generate-signals.ts'],
  [runPositioning, 'Step 6/10 — Generate positioning', 'scripts/generate-positioning.ts'],
  [run13f, 'Step 7/10 — Fetch 13F holdings', 'scripts/fetch-13f.ts'],
  [runMarkets, 'Step 8/10 — Fetch prediction markets', 'scripts/fetch-prediction-markets.ts'],
  [runFedWatch, 'Step 9/10 — Fetch FedWatch probabilities', 'scripts/fetch-fedwatch.ts'],
  [runDaily, 'Step 10/10 — Generate daily update', 'scripts/generate-daily-update.ts'],
];

const active = steps.filter(([enabled]) => enabled);
const pipelineStart = Date.now();

for (const [, label, script] of active) {
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
