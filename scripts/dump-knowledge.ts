import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function main() {
  // Get all predictions with source names
  const { data: preds } = await sb.from('predictions')
    .select('claim, sentiment, time_horizon, confidence, specificity, themes, assets_mentioned, source_id, date_made')
    .order('date_made', { ascending: false });

  const sourceIds = Array.from(new Set((preds || []).map(p => p.source_id)));
  const { data: sources } = await sb.from('sources').select('id, name').in('id', sourceIds);
  const sourceMap: Record<string, string> = {};
  for (const s of sources || []) sourceMap[s.id] = s.name;

  console.log(`=== ALL PREDICTIONS (${(preds || []).length}) ===\n`);
  for (const p of preds || []) {
    console.log(`${sourceMap[p.source_id]} | ${p.sentiment} | ${p.time_horizon} | ${p.confidence} | ${p.specificity}`);
    console.log(`  ${p.claim}`);
    console.log(`  themes: ${p.themes?.join(', ')}`);
    console.log(`  assets: ${p.assets_mentioned?.join(', ')}`);
    console.log('');
  }

  // Get outlooks
  const { data: outlooks } = await sb.from('outlooks')
    .select('domain, title, sentiment, confidence, key_themes, positioning, thesis_intro')
    .order('last_updated', { ascending: false });

  console.log(`=== OUTLOOKS (${(outlooks || []).length}) ===\n`);
  for (const o of outlooks || []) {
    console.log(`${o.domain} | ${o.sentiment} | conf:${o.confidence}`);
    console.log(`  ${o.title}`);
    console.log(`  ${o.thesis_intro?.substring(0, 200)}`);
    console.log(`  positioning: ${o.positioning?.join('; ')}`);
    console.log('');
  }

  // Get latest fedwatch
  const { data: fw } = await sb.from('fedwatch_snapshots')
    .select('meeting_date, rate_range, probability')
    .order('meeting_date', { ascending: true })
    .order('probability', { ascending: false });

  console.log('=== FEDWATCH ===\n');
  const seen = new Set<string>();
  for (const r of fw || []) {
    if (!seen.has(r.meeting_date)) {
      seen.add(r.meeting_date);
      console.log(`${r.meeting_date}: ${r.rate_range} at ${(r.probability * 100).toFixed(1)}%`);
    }
  }

  // Get recent analyses
  const { data: analyses } = await sb.from('analyses')
    .select('display_title, sentiment_overall, sentiment_score, themes, summary')
    .order('created_at', { ascending: false })
    .limit(15);

  console.log(`\n=== RECENT ANALYSES (${(analyses || []).length}) ===\n`);
  for (const a of analyses || []) {
    console.log(`${a.display_title} | ${a.sentiment_overall} (${a.sentiment_score})`);
    console.log(`  ${a.summary?.substring(0, 200)}`);
    console.log('');
  }

  // Get prediction markets
  const { data: markets } = await sb.from('prediction_markets')
    .select('title, category, is_watched, source')
    .eq('is_watched', true)
    .order('category');

  const { data: snaps } = await sb.from('prediction_market_snapshots')
    .select('market_id, yes_price, volume_24h')
    .order('captured_at', { ascending: false });

  const latestSnap: Record<string, { yes_price: number; volume_24h: number }> = {};
  for (const s of snaps || []) {
    if (!latestSnap[s.market_id]) latestSnap[s.market_id] = s;
  }

  console.log(`=== PREDICTION MARKETS (${(markets || []).length} watched) ===\n`);
  for (const m of markets || []) {
    const snap = latestSnap[m.title]; // won't match, need market id
    console.log(`[${m.category}] ${m.title}`);
  }
}

main();
