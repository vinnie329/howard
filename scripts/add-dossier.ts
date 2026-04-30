/**
 * add-dossier.ts — Attach a long-form research dossier to a ticker.
 *
 * Dossiers are first-class artifacts keyed to an asset; they do NOT flow
 * through content/predictions/house-view aggregation (they are curated
 * synthesis, not independent signal).
 *
 * Usage:
 *   npx tsx scripts/add-dossier.ts <TICKER> --file <path.md> --author <slug> --title "..." [--as-of YYYY-MM-DD] [--summary "..."]
 *
 * Examples:
 *   npx tsx scripts/add-dossier.ts CORZ --file dossiers/corz.md --author howard-research --title "Core Scientific Analytical Report"
 *   npx tsx scripts/add-dossier.ts NVDA --file dossiers/nvda.md --author oai-deep-research --title "NVIDIA Q4 2025 Deep Dive" --as-of 2026-04-15
 */
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function arg(name: string, required = true): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) {
    if (required) { console.error(`Missing --${name}`); process.exit(1); }
    return undefined;
  }
  return process.argv[i + 1];
}

async function main() {
  const ticker = process.argv[2];
  if (!ticker || ticker.startsWith('--')) {
    console.error('Usage: npx tsx scripts/add-dossier.ts <TICKER> --file <path> --author <slug> --title "..." [--as-of YYYY-MM-DD] [--summary "..."]');
    process.exit(1);
  }
  const filePath = arg('file')!;
  const author = arg('author')!;
  const title = arg('title')!;
  const asOf = arg('as-of', false) || new Date().toISOString().slice(0, 10);
  const summary = arg('summary', false) || null;
  const related = arg('related', false);
  const relatedTickers = related ? related.split(',').map((s) => s.trim()).filter(Boolean) : null;

  const body = await readFile(filePath, 'utf-8');
  console.log(`Ticker: ${ticker} | Author: ${author} | As of: ${asOf}`);
  console.log(`Body: ${body.length} chars`);

  const { data, error } = await supabase.from('asset_dossiers').insert({
    ticker,
    title,
    body_md: body,
    author,
    as_of_date: asOf,
    summary,
    related_tickers: relatedTickers,
  }).select('id').single();

  if (error) { console.error('insert error:', error.message); process.exit(1); }
  console.log(`Dossier inserted: ${data.id}`);
  console.log(`  → /assets/${encodeURIComponent(ticker)}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
