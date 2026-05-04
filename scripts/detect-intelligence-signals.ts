/**
 * detect-intelligence-signals.ts
 *
 * Scans recent high-credibility predictions and surfaces:
 *   - CONVERGENCE: ≥3 sources (cred ≥ 4.0) predicting the same direction on
 *     the same asset OR theme within a rolling 30-day window
 *   - TENSION: ≥2 high-cred sources predicting OPPOSITE directions on the
 *     same asset OR theme within the same window (real thesis collisions)
 *
 * Signals are upserted into `intelligence_signals` keyed by (kind, key, type,
 * direction) — idempotent across runs. Stale signals (no new predictions in
 * 14+ days) flip to status='stale'.
 *
 *   npx tsx scripts/detect-intelligence-signals.ts
 *   npx tsx scripts/detect-intelligence-signals.ts --dry-run
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const dryRun = process.argv.includes('--dry-run');
const WINDOW_DAYS = 30;
const STALE_DAYS = 14;
const MIN_CREDIBILITY = 4.0;
const MIN_CONVERGENCE_SOURCES = 3;
const MIN_TENSION_SOURCES_PER_SIDE = 1; // 1 + 1 = 2 total opposing-direction sources

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface PredictionRow {
  id: string;
  claim: string;
  sentiment: string | null;
  themes: string[] | null;
  assets_mentioned: string[] | null;
  date_made: string;
  source_id: string;
  sources: { name: string; slug: string; weighted_score: number } | null;
}

interface SignalAggregate {
  kind: 'asset' | 'theme';
  key: string;
  bullish: { sources: Map<string, { name: string; cred: number; predIds: string[]; claims: string[] }> };
  bearish: { sources: Map<string, { name: string; cred: number; predIds: string[]; claims: string[] }> };
  firstAt: string;
  lastAt: string;
}

function bucketSentiment(s: string | null): 'bullish' | 'bearish' | null {
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower === 'bullish') return 'bullish';
  if (lower === 'bearish') return 'bearish';
  return null;
}

async function main() {
  console.log(`=== Intelligence Signals Detector (${dryRun ? 'DRY RUN' : 'APPLY'}) ===`);
  console.log(`Window: ${WINDOW_DAYS}d | Min cred: ${MIN_CREDIBILITY} | Min convergence: ${MIN_CONVERGENCE_SOURCES} sources\n`);

  const cutoff = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: preds, error } = await supabase
    .from('predictions')
    .select('id, claim, sentiment, themes, assets_mentioned, date_made, source_id, sources(name, slug, weighted_score)')
    .gte('date_made', cutoff)
    .order('date_made', { ascending: false });
  if (error) { console.error(error.message); process.exit(1); }
  const rows = (preds || []) as unknown as PredictionRow[];

  // Filter to high-credibility predictions with a directional sentiment
  const filtered = rows.filter((r) => {
    const cred = r.sources?.weighted_score ?? 0;
    const dir = bucketSentiment(r.sentiment);
    return cred >= MIN_CREDIBILITY && dir !== null;
  });
  console.log(`Predictions in window: ${rows.length} | High-cred + directional: ${filtered.length}`);

  // Aggregate by (kind, key)
  const aggregates = new Map<string, SignalAggregate>();
  function ensureAgg(kind: 'asset' | 'theme', key: string): SignalAggregate {
    const k = `${kind}::${key}`;
    if (!aggregates.has(k)) {
      aggregates.set(k, {
        kind, key,
        bullish: { sources: new Map() },
        bearish: { sources: new Map() },
        firstAt: '9999-12-31',
        lastAt: '0000-01-01',
      });
    }
    return aggregates.get(k)!;
  }

  for (const r of filtered) {
    const dir = bucketSentiment(r.sentiment)!;
    const slug = r.sources?.slug || 'unknown';
    const name = r.sources?.name || 'Unknown';
    const cred = r.sources?.weighted_score ?? 0;
    const dateAt = r.date_made;
    const claim = r.claim?.slice(0, 200) || '';

    // Iterate assets_mentioned
    for (const asset of r.assets_mentioned || []) {
      if (!asset || asset.length === 0 || asset.length > 30) continue; // skip junk / multi-word phrases
      const agg = ensureAgg('asset', asset);
      const sideMap = dir === 'bullish' ? agg.bullish.sources : agg.bearish.sources;
      const existing = sideMap.get(slug);
      if (existing) {
        existing.predIds.push(r.id);
        existing.claims.push(claim);
      } else {
        sideMap.set(slug, { name, cred, predIds: [r.id], claims: [claim] });
      }
      if (dateAt < agg.firstAt) agg.firstAt = dateAt;
      if (dateAt > agg.lastAt) agg.lastAt = dateAt;
    }

    // Iterate themes
    for (const theme of r.themes || []) {
      if (!theme || theme.length === 0 || theme.length > 60) continue;
      const agg = ensureAgg('theme', theme);
      const sideMap = dir === 'bullish' ? agg.bullish.sources : agg.bearish.sources;
      const existing = sideMap.get(slug);
      if (existing) {
        existing.predIds.push(r.id);
        existing.claims.push(claim);
      } else {
        sideMap.set(slug, { name, cred, predIds: [r.id], claims: [claim] });
      }
      if (dateAt < agg.firstAt) agg.firstAt = dateAt;
      if (dateAt > agg.lastAt) agg.lastAt = dateAt;
    }
  }

  console.log(`Aggregates: ${aggregates.size}\n`);

  // Detect signals
  const convergences: Array<{ agg: SignalAggregate; direction: 'bullish' | 'bearish'; sources: Array<{ slug: string; name: string; cred: number; predIds: string[]; claims: string[] }> }> = [];
  const tensions: Array<{ agg: SignalAggregate; bull: Array<{ slug: string; name: string; cred: number; predIds: string[]; claims: string[] }>; bear: Array<{ slug: string; name: string; cred: number; predIds: string[]; claims: string[] }> }> = [];

  for (const agg of aggregates.values()) {
    const bull = Array.from(agg.bullish.sources.entries()).map(([slug, v]) => ({ slug, ...v }));
    const bear = Array.from(agg.bearish.sources.entries()).map(([slug, v]) => ({ slug, ...v }));

    // Convergence: bull side
    if (bull.length >= MIN_CONVERGENCE_SOURCES) {
      convergences.push({ agg, direction: 'bullish', sources: bull });
    }
    if (bear.length >= MIN_CONVERGENCE_SOURCES) {
      convergences.push({ agg, direction: 'bearish', sources: bear });
    }
    // Tension: at least 1 + 1 (and at least 2 total)
    if (bull.length >= MIN_TENSION_SOURCES_PER_SIDE && bear.length >= MIN_TENSION_SOURCES_PER_SIDE && (bull.length + bear.length) >= 2) {
      tensions.push({ agg, bull, bear });
    }
  }

  console.log(`Detected ${convergences.length} convergence signal(s) and ${tensions.length} tension signal(s)\n`);

  // Upsert convergences
  if (!dryRun) {
    for (const c of convergences) {
      const avgCred = c.sources.reduce((s, x) => s + x.cred, 0) / c.sources.length;
      const allPredIds = c.sources.flatMap((s) => s.predIds);
      const sampleClaims = c.sources.flatMap((s) => s.claims).slice(0, 5);
      const row = {
        signal_type: 'convergence',
        signal_kind: c.agg.kind,
        signal_key: c.agg.key,
        direction: c.direction,
        source_count: c.sources.length,
        avg_credibility: Math.round(avgCred * 100) / 100,
        prediction_ids: allPredIds,
        source_slugs: c.sources.map((s) => s.slug),
        source_names: c.sources.map((s) => s.name),
        first_signal_at: c.agg.firstAt,
        last_signal_at: c.agg.lastAt,
        sample_claims: sampleClaims,
        status: 'active',
        updated_at: new Date().toISOString(),
      };
      await supabase.from('intelligence_signals').upsert(row, { onConflict: 'signal_kind,signal_key,signal_type,direction' });
    }
    for (const t of tensions) {
      const allSources = [...t.bull, ...t.bear];
      const avgCred = allSources.reduce((s, x) => s + x.cred, 0) / allSources.length;
      const allPredIds = allSources.flatMap((s) => s.predIds);
      const sampleClaims = [...t.bull.flatMap((s) => s.claims).slice(0, 2), ...t.bear.flatMap((s) => s.claims).slice(0, 2)];
      const row = {
        signal_type: 'tension',
        signal_kind: t.agg.kind,
        signal_key: t.agg.key,
        direction: null,
        source_count: allSources.length,
        avg_credibility: Math.round(avgCred * 100) / 100,
        prediction_ids: allPredIds,
        source_slugs: allSources.map((s) => s.slug),
        source_names: allSources.map((s) => s.name),
        bullish_count: t.bull.length,
        bearish_count: t.bear.length,
        bullish_sources: t.bull.map((s) => s.name),
        bearish_sources: t.bear.map((s) => s.name),
        first_signal_at: t.agg.firstAt,
        last_signal_at: t.agg.lastAt,
        sample_claims: sampleClaims,
        status: 'active',
        updated_at: new Date().toISOString(),
      };
      // Tension upsert — use a separate ON CONFLICT, since direction is NULL
      // Postgres treats NULL != NULL by default, so we delete + insert to keep it simple
      await supabase.from('intelligence_signals')
        .delete()
        .eq('signal_kind', t.agg.kind)
        .eq('signal_key', t.agg.key)
        .eq('signal_type', 'tension');
      await supabase.from('intelligence_signals').insert(row);
    }

    // Stale-flagging: anything with last_signal_at older than 14 days → stale
    const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('intelligence_signals')
      .update({ status: 'stale', updated_at: new Date().toISOString() })
      .lt('last_signal_at', staleCutoff)
      .eq('status', 'active');
  }

  // Print summary — sorted by (cred * count) desc
  console.log('=== TOP CONVERGENCES (by source-count × avg-cred) ===');
  const topConv = convergences
    .map((c) => ({ ...c, score: c.sources.length * (c.sources.reduce((s, x) => s + x.cred, 0) / c.sources.length) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
  for (const c of topConv) {
    const names = c.sources.map((s) => `${s.name}(${s.cred.toFixed(2)})`).join(', ');
    console.log(`  ${c.agg.kind.padEnd(5)} ${c.agg.key.padEnd(28)} ${c.direction.padEnd(7)} ${c.sources.length} sources [${names}]`);
  }

  console.log('\n=== TENSIONS ===');
  const topTen = tensions.sort((a, b) => (b.bull.length + b.bear.length) - (a.bull.length + a.bear.length)).slice(0, 10);
  for (const t of topTen) {
    const bullNames = t.bull.map((s) => s.name).join(', ');
    const bearNames = t.bear.map((s) => s.name).join(', ');
    console.log(`  ${t.agg.kind.padEnd(5)} ${t.agg.key.padEnd(28)} BULL: ${t.bull.length} [${bullNames}] vs BEAR: ${t.bear.length} [${bearNames}]`);
  }

  console.log('\nDone.');
}
main().catch((e) => { console.error(e); process.exit(1); });
