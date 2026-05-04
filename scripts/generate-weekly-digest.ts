/**
 * generate-weekly-digest.ts
 *
 * Weekly meta-synthesis. Runs Mondays (or any day with --force). Reviews the
 * past 7 days of convergences, tensions resolved, derived implications, and
 * new high-cred predictions, and produces a "what changed in the system's
 * view this week" digest.
 *
 *   npx tsx scripts/generate-weekly-digest.ts            # Mon-only
 *   npx tsx scripts/generate-weekly-digest.ts --force    # any day
 *   npx tsx scripts/generate-weekly-digest.ts --dry-run
 */
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const anthropic = new Anthropic();

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

function mondayOf(d: Date): Date {
  const day = d.getUTCDay();           // 0 = Sun
  const diff = day === 0 ? 6 : day - 1; // back up to Monday
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

async function main() {
  const today = new Date();
  if (!force && today.getUTCDay() !== 1) {
    console.log(`Today is ${today.toUTCString().slice(0, 16)} — weekly digest only generates Mondays. Use --force to override.`);
    return;
  }

  // Last full week: Mon-Sun before today
  const monday = mondayOf(today);
  const lastMonday = new Date(monday);
  lastMonday.setUTCDate(monday.getUTCDate() - 7);
  const lastSunday = new Date(monday);
  lastSunday.setUTCDate(monday.getUTCDate() - 1);
  lastSunday.setUTCHours(23, 59, 59);

  const weekStart = lastMonday.toISOString().slice(0, 10);
  const weekEnd = lastSunday.toISOString().slice(0, 10);
  console.log(`=== Weekly Digest (${dryRun ? 'DRY RUN' : 'APPLY'}) ===`);
  console.log(`Week: ${weekStart} → ${weekEnd}\n`);

  // Pull week's data
  const startISO = lastMonday.toISOString();
  const endISO = lastSunday.toISOString();

  const [signalsRes, resolutionsRes, implicationsRes, predsRes, filingsRes] = await Promise.all([
    supabase.from('intelligence_signals')
      .select('signal_type, signal_kind, signal_key, direction, source_count, avg_credibility, source_names, sample_claims, last_signal_at, updated_at')
      .gte('updated_at', startISO).lte('updated_at', endISO),
    supabase.from('tension_resolutions')
      .select('resolution_type, winning_side, confidence, point_of_disagreement, net_recommendation, intelligence_signals(signal_kind, signal_key)')
      .gte('resolved_at', startISO).lte('resolved_at', endISO),
    supabase.from('derived_implications')
      .select('order_n, affected_asset, affected_theme, direction, conviction, reasoning, parent_source_name, parent_source_credibility')
      .gte('created_at', startISO).lte('created_at', endISO).order('parent_source_credibility', { ascending: false }).limit(60),
    supabase.from('predictions')
      .select('claim, sentiment, time_horizon, themes, assets_mentioned, sources(name, weighted_score), date_made')
      .gte('date_made', startISO).lte('date_made', endISO).order('date_made', { ascending: false }).limit(80),
    supabase.from('insider_filings')
      .select('form_type, filing_date, issuer_name, pct_of_class, cost_basis, fund:fund_id(name)')
      .gte('ingested_at', startISO).lte('ingested_at', endISO),
  ]);

  const signals = signalsRes.data || [];
  const resolutions = resolutionsRes.data || [];
  const implications = implicationsRes.data || [];
  const predictions = (predsRes.data || []).filter((p) => {
    const cred = (p.sources as { weighted_score?: number } | null)?.weighted_score ?? 0;
    return cred >= 4.0;
  });
  const filings = filingsRes.data || [];

  console.log(`  ${signals.length} signals | ${resolutions.length} resolutions | ${implications.length} implications | ${predictions.length} high-cred predictions | ${filings.length} insider filings\n`);

  if (signals.length + resolutions.length + implications.length + predictions.length === 0) {
    console.log('No material activity this week. Skipping.');
    return;
  }

  // Build context block
  const signalsBlock = signals.map((s) =>
    `[${s.signal_type} ${s.signal_kind}] ${s.signal_key}${s.direction ? ' ' + s.direction.toUpperCase() : ''} — ${s.source_count} sources @ avg ${s.avg_credibility} cred`
  ).join('\n');

  const resBlock = resolutions.map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sig = r.intelligence_signals as any;
    return `[${sig?.signal_kind}: ${sig?.signal_key}] ${r.resolution_type}${r.winning_side ? ' (' + r.winning_side + ' wins)' : ''} conf ${r.confidence} — ${r.net_recommendation?.slice(0, 120)}`;
  }).join('\n');

  const implBlock = implications.slice(0, 30).map((i) => {
    const target = i.affected_asset || i.affected_theme || '?';
    return `[O${i.order_n} ${i.direction} ${i.conviction}] ${target} ← from ${i.parent_source_name} (${i.parent_source_credibility}): ${i.reasoning?.slice(0, 130)}`;
  }).join('\n');

  const predBlock = predictions.slice(0, 30).map((p) => {
    const src = (p.sources as { name?: string; weighted_score?: number } | null);
    return `[${src?.name} ${src?.weighted_score}] ${p.sentiment} ${p.time_horizon || '?'}: ${p.claim?.slice(0, 160)}`;
  }).join('\n');

  const filingsBlock = filings.map((f) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fund = (f.fund as any)?.name;
    return `[${fund}] ${f.form_type} ${f.filing_date}${f.issuer_name ? ' — ' + f.issuer_name + (f.pct_of_class ? ' (' + f.pct_of_class + '%)' : '') : ''}`;
  }).join('\n');

  const prompt = `You are writing the weekly meta-synthesis for Howard, an AI financial intelligence platform.

WEEK ${weekStart} → ${weekEnd}

CROSS-SOURCE SIGNALS DETECTED THIS WEEK (${signals.length})
${signalsBlock || '(none)'}

TENSIONS RESOLVED THIS WEEK (${resolutions.length})
${resBlock || '(none)'}

2ND/3RD ORDER IMPLICATIONS DERIVED (${implications.length})
${implBlock || '(none)'}

NEW HIGH-CREDIBILITY PREDICTIONS (${predictions.length})
${predBlock || '(none)'}

TRACKED-FUND SEC FILINGS (${filings.length})
${filingsBlock || '(none)'}

TASK
Write a structured weekly digest capturing how the system's view EVOLVED this week. This is meta-level — focus on:
1. **What's changed** — theses that strengthened, weakened, or pivoted vs the prior week
2. **What's converging** — multi-source patterns that are now consensus or near-consensus
3. **What's still unresolved** — the genuine uncertainties the system can't yet adjudicate
4. **Net directional posture** — what the cumulative picture says about positioning

Return JSON:
{
  "thesis_summary": "2-3 sentence top-line synthesis. The 'TLDR for the week.'",
  "digest_md": "Markdown body, 600-1200 words. Use sections: ## What Strengthened, ## What Weakened, ## New Tensions, ## Resolutions, ## Net Posture. Reference specific source names and credibility scores. Be direct — name names, cite numbers, identify the actual trades.",
  "thesis_evolution": { "theme_or_asset": "evolved how this week" },
  "net_directional_calls": { "TICKER_OR_THEME": "bullish | bearish | mixed | unresolved" }
}

Be honest about thinness — if the week was quiet, say so. Don't manufacture conviction.`;

  console.log('Generating digest with Claude...');
  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = resp.content[0].type === 'text' ? resp.content[0].text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) { console.error('No JSON parsed'); process.exit(1); }
  const digest = JSON.parse(match[0]);

  console.log(`\n  Thesis: ${digest.thesis_summary?.slice(0, 200)}`);
  console.log(`  Body: ${digest.digest_md?.length ?? 0} chars`);
  console.log(`  Net calls: ${Object.keys(digest.net_directional_calls || {}).length}`);

  if (!dryRun) {
    await supabase.from('weekly_digests').upsert({
      week_start: weekStart,
      week_end: weekEnd,
      digest_md: digest.digest_md || '',
      thesis_summary: digest.thesis_summary || '',
      thesis_evolution: digest.thesis_evolution || {},
      net_directional_calls: digest.net_directional_calls || {},
      watchlist_movers: {},
      signals_count: signals.length,
      resolutions_count: resolutions.length,
      implications_count: implications.length,
      new_predictions_count: predictions.length,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'week_start' });
    console.log(`\n  Saved weekly digest for ${weekStart}.`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
