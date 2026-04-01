import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function countItems(arrays: (string[] | null)[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const arr of arrays) {
    for (const item of arr || []) {
      const key = item.trim();
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
  }
  return counts;
}

function printSorted(counts: Record<string, number>, limit?: number) {
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const items = limit ? sorted.slice(0, limit) : sorted;
  for (const [name, count] of items) {
    console.log(`  ${count.toString().padStart(3)}x  ${name}`);
  }
}

async function main() {
  // 1. Get all analyses for themes, assets, and referenced_people
  const { data: analyses, error: aErr } = await supabase
    .from('analyses')
    .select('themes, assets_mentioned, referenced_people');

  if (aErr) {
    console.error('Error fetching analyses:', aErr.message);
    return;
  }

  console.log(`\n========================================`);
  console.log(`  THEMES (from ${(analyses || []).length} analyses)`);
  console.log(`========================================\n`);

  const themeCounts = countItems((analyses || []).map(a => a.themes));
  printSorted(themeCounts);

  console.log(`\n========================================`);
  console.log(`  ASSETS MENTIONED`);
  console.log(`========================================\n`);

  const assetCounts = countItems((analyses || []).map(a => a.assets_mentioned));
  printSorted(assetCounts);

  console.log(`\n========================================`);
  console.log(`  REFERENCED PEOPLE`);
  console.log(`========================================\n`);

  const peopleCounts = countItems((analyses || []).map(a => a.referenced_people));
  printSorted(peopleCounts);

  // 2. Get all predictions
  const { data: preds, error: pErr } = await supabase
    .from('predictions')
    .select('claim, sentiment, time_horizon, assets_mentioned, source_id')
    .order('date_made', { ascending: false });

  if (pErr) {
    console.error('Error fetching predictions:', pErr.message);
    return;
  }

  // Resolve source names
  const sourceIds = Array.from(new Set((preds || []).map(p => p.source_id)));
  const { data: sources } = await supabase.from('sources').select('id, name').in('id', sourceIds);
  const sourceMap: Record<string, string> = {};
  for (const s of sources || []) sourceMap[s.id] = s.name;

  console.log(`\n========================================`);
  console.log(`  ALL PREDICTIONS (${(preds || []).length})`);
  console.log(`========================================\n`);

  for (const p of preds || []) {
    const src = sourceMap[p.source_id] || 'Unknown';
    console.log(`[${p.sentiment}] ${src} | horizon: ${p.time_horizon}`);
    console.log(`  "${p.claim}"`);
    if (p.assets_mentioned?.length) {
      console.log(`  assets: ${p.assets_mentioned.join(', ')}`);
    }
    console.log('');
  }

  // Summary stats
  console.log(`========================================`);
  console.log(`  SUMMARY`);
  console.log(`========================================\n`);
  console.log(`  Total analyses:    ${(analyses || []).length}`);
  console.log(`  Total predictions: ${(preds || []).length}`);
  console.log(`  Unique themes:     ${Object.keys(themeCounts).length}`);
  console.log(`  Unique assets:     ${Object.keys(assetCounts).length}`);
  console.log(`  Unique people:     ${Object.keys(peopleCounts).length}`);
  console.log('');
}

main();
