/**
 * pipeline.ts — Run the full processing pipeline (without fetching content).
 *
 * Steps:
 *   1. Analyze unprocessed content (Claude)
 *   2. Generate missing embeddings (Voyage AI)
 *   3. Evaluate & update outlooks (Claude)
 *   4. Generate signals (Claude + Yahoo Finance)
 *
 * Usage:
 *   npx tsx scripts/pipeline.ts            # run all steps
 *   npx tsx scripts/pipeline.ts --analyze  # only analyze
 *   npx tsx scripts/pipeline.ts --embed    # only embeddings
 *   npx tsx scripts/pipeline.ts --outlook  # only outlook
 *   npx tsx scripts/pipeline.ts --signals  # only signals
 */

import { execSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const runAll = args.length === 0;
const runAnalyze = runAll || args.includes('--analyze');
const runEmbed = runAll || args.includes('--embed');
const runOutlook = runAll || args.includes('--outlook');
const runSignals = runAll || args.includes('--signals');

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

console.log('\n  Howard Pipeline');
console.log('  Skipping content fetch — processing existing content\n');

const steps: [boolean, string, string][] = [
  [runAnalyze, 'Step 1/4 — Analyze content', 'scripts/analyze-content.ts'],
  [runEmbed, 'Step 2/4 — Generate embeddings', 'scripts/generate-embeddings.ts'],
  [runOutlook, 'Step 3/4 — Update outlooks', 'scripts/update-outlook.ts'],
  [runSignals, 'Step 4/4 — Generate signals', 'scripts/generate-signals.ts'],
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
