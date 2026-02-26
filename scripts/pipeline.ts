/**
 * pipeline.ts — Run the full processing pipeline.
 *
 * Steps:
 *   1. Fetch new content (YouTube, Oaktree, etc.)
 *   2. Analyze unprocessed content (Claude)
 *   3. Generate missing embeddings (Voyage AI)
 *   4. Evaluate & update outlooks (Claude)
 *   5. Generate signals (Claude + Yahoo Finance)
 *   6. Fetch 13F holdings (SEC EDGAR)
 *
 * Usage:
 *   npx tsx scripts/pipeline.ts            # run all steps
 *   npx tsx scripts/pipeline.ts --fetch    # only fetch
 *   npx tsx scripts/pipeline.ts --analyze  # only analyze
 *   npx tsx scripts/pipeline.ts --embed    # only embeddings
 *   npx tsx scripts/pipeline.ts --outlook  # only outlook
 *   npx tsx scripts/pipeline.ts --signals  # only signals
 *   npx tsx scripts/pipeline.ts --13f      # only 13F holdings
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
const run13f = runAll || args.includes('--13f');

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
    console.error(`\n  ✗ ${label} failed after ${elapsed}s`);
    process.exit(1);
  }
}

console.log('\n  Howard Pipeline\n');

const steps: [boolean, string, string][] = [
  [runFetch, 'Step 1/6 — Fetch content', 'scripts/fetch-all.ts'],
  [runAnalyze, 'Step 2/6 — Analyze content', 'scripts/analyze-content.ts'],
  [runEmbed, 'Step 3/6 — Generate embeddings', 'scripts/generate-embeddings.ts'],
  [runOutlook, 'Step 4/6 — Update outlooks', 'scripts/update-outlook.ts'],
  [runSignals, 'Step 5/6 — Generate signals', 'scripts/generate-signals.ts'],
  [run13f, 'Step 6/6 — Fetch 13F holdings', 'scripts/fetch-13f.ts'],
];

const active = steps.filter(([enabled]) => enabled);
const pipelineStart = Date.now();

for (const [, label, script] of active) {
  run(label, script);
}

const total = ((Date.now() - pipelineStart) / 1000).toFixed(1);
console.log(`\n${'─'.repeat(50)}`);
console.log(`  Pipeline complete — ${active.length} step${active.length !== 1 ? 's' : ''} in ${total}s`);
console.log(`${'─'.repeat(50)}\n`);
