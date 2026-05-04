/**
 * resolve-tensions.ts
 *
 * For each active tension signal (cross-source disagreement detected by the
 * convergence layer), runs a Claude pass that adjudicates:
 *   - Which side has more weight (cred + recency + specialization)?
 *   - What is the actual point of disagreement (often timing or magnitude,
 *     not direction)?
 *   - What evidence would resolve it?
 *   - One-line net recommendation
 *
 * Stored in `tension_resolutions` keyed to the signal. Re-runs only when the
 * signal's underlying predictions have changed (or after 7+ days).
 *
 *   npx tsx scripts/resolve-tensions.ts
 *   npx tsx scripts/resolve-tensions.ts --dry-run
 *   npx tsx scripts/resolve-tensions.ts --limit 5
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
const limitArg = process.argv.indexOf('--limit');
const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : 20;
const REFRESH_DAYS = 7;
const MIN_TOTAL_SOURCES = 3;             // only adjudicate tensions with ≥3 total sources

interface TensionSignal {
  id: string;
  signal_kind: 'asset' | 'theme';
  signal_key: string;
  source_count: number;
  bullish_count: number | null;
  bearish_count: number | null;
  bullish_sources: string[] | null;
  bearish_sources: string[] | null;
  prediction_ids: string[];
  sample_claims: string[];
}

interface ResolutionOutput {
  resolution_type: 'side_a_wins' | 'side_b_wins' | 'both_right_different_horizons' | 'unresolvable_pending_evidence' | 'genuine_uncertainty';
  winning_side: 'bullish' | 'bearish' | null;
  confidence: number;
  point_of_disagreement: string;
  reasoning: string;
  resolving_evidence: string[];
  net_recommendation: string;
  source_weighting_factor: string;
}

async function adjudicate(
  signal: TensionSignal,
  bullPreds: Array<{ source: string; cred: number; claim: string; horizon: string | null; date: string }>,
  bearPreds: Array<{ source: string; cred: number; claim: string; horizon: string | null; date: string }>,
): Promise<ResolutionOutput | null> {
  const prompt = `You are adjudicating a cross-source disagreement on a tracked ${signal.signal_kind}.

DISAGREEMENT
${signal.signal_kind === 'asset' ? 'Asset' : 'Theme'}: ${signal.signal_key}

BULLISH SIDE (${bullPreds.length} sources):
${bullPreds.map((p) => `- [${p.source} cred ${p.cred} | ${p.horizon || '?'} horizon | ${p.date.slice(0, 10)}]: "${p.claim.slice(0, 200)}"`).join('\n')}

BEARISH SIDE (${bearPreds.length} sources):
${bearPreds.map((p) => `- [${p.source} cred ${p.cred} | ${p.horizon || '?'} horizon | ${p.date.slice(0, 10)}]: "${p.claim.slice(0, 200)}"`).join('\n')}

TASK
Adjudicate this disagreement. Consider:
1. Source credibility weighting (cred score is 0-5; treat ≥4.5 as top tier)
2. Source domain specialization (does the source's expertise area match the topic?)
3. Recency (more recent = more relevant if the situation is dynamic)
4. Time horizons (bulls vs bears might be talking about different windows — e.g. "near-term bear, long-term bull")
5. The ACTUAL point of disagreement — it's often NOT direction but timing, magnitude, or causation

Resolution types:
- "side_a_wins" / "side_b_wins": one side genuinely outweighs (cite which: bullish or bearish in winning_side)
- "both_right_different_horizons": both sides correct on different time windows
- "unresolvable_pending_evidence": genuine uncertainty until specific evidence lands
- "genuine_uncertainty": equally credible disagreement; the system should NOT pick a side

Return ONLY a JSON object:
{
  "resolution_type": "...",
  "winning_side": "bullish" or "bearish" or null,
  "confidence": 0-100,
  "point_of_disagreement": "One sentence: what's actually being disagreed about (often surprising — not direction).",
  "reasoning": "2-4 sentences walking through the adjudication logic.",
  "resolving_evidence": ["specific data point 1 that would settle it", "specific data point 2"],
  "net_recommendation": "One-line trade / watch implication.",
  "source_weighting_factor": "One line: which side's weight comes from where (e.g. 'Cred-weighted bull (Buffett 5.0, Sehgal 4.23 vs Howell 4.13); recency tilts bear (most recent prediction is bear)')."
}`;

  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = resp.content[0].type === 'text' ? resp.content[0].text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as ResolutionOutput;
  } catch {
    return null;
  }
}

async function main() {
  console.log(`=== Tension Resolution (${dryRun ? 'DRY RUN' : 'APPLY'}) ===`);
  console.log(`Limit: ${limit} | Refresh threshold: ${REFRESH_DAYS}d | Min sources: ${MIN_TOTAL_SOURCES}\n`);

  // Pull active tensions, sorted by source_count (more sources = higher priority)
  const { data: tensions } = await supabase
    .from('intelligence_signals')
    .select('id, signal_kind, signal_key, source_count, bullish_count, bearish_count, bullish_sources, bearish_sources, prediction_ids, sample_claims')
    .eq('signal_type', 'tension')
    .eq('status', 'active')
    .gte('source_count', MIN_TOTAL_SOURCES)
    .order('source_count', { ascending: false })
    .limit(limit * 2);

  // Skip ones we've already resolved recently
  const refreshCutoff = new Date(Date.now() - REFRESH_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from('tension_resolutions')
    .select('signal_id, resolved_at')
    .gte('resolved_at', refreshCutoff);
  const recentlyResolved = new Set((existing || []).map((r) => r.signal_id));

  const todo = (tensions || []).filter((t) => !recentlyResolved.has(t.id)).slice(0, limit) as unknown as TensionSignal[];
  console.log(`Active tensions: ${tensions?.length || 0} | Recently resolved: ${recentlyResolved.size} | New to adjudicate: ${todo.length}\n`);

  let resolved = 0;
  for (const t of todo) {
    // Pull the underlying predictions
    const { data: preds } = await supabase
      .from('predictions')
      .select('id, claim, sentiment, time_horizon, date_made, sources(name, weighted_score)')
      .in('id', t.prediction_ids);

    const bullPreds: Array<{ source: string; cred: number; claim: string; horizon: string | null; date: string }> = [];
    const bearPreds: Array<{ source: string; cred: number; claim: string; horizon: string | null; date: string }> = [];

    for (const p of (preds || [])) {
      const src = p.sources as { name?: string; weighted_score?: number } | null;
      const entry = {
        source: src?.name || 'Unknown',
        cred: src?.weighted_score ?? 0,
        claim: p.claim || '',
        horizon: p.time_horizon,
        date: p.date_made,
      };
      const sentiment = (p.sentiment || '').toLowerCase();
      if (sentiment === 'bullish') bullPreds.push(entry);
      else if (sentiment === 'bearish') bearPreds.push(entry);
    }

    if (bullPreds.length === 0 || bearPreds.length === 0) continue;

    console.log(`\n→ [${t.signal_kind}] ${t.signal_key}: ${bullPreds.length} bull vs ${bearPreds.length} bear`);

    let resolution: ResolutionOutput | null = null;
    try {
      resolution = await adjudicate(t, bullPreds, bearPreds);
    } catch (e) {
      console.log(`  adjudicate error: ${e instanceof Error ? e.message : e}`);
      continue;
    }
    if (!resolution) { console.log('  no resolution parsed'); continue; }

    console.log(`  type: ${resolution.resolution_type} | wins: ${resolution.winning_side || '—'} | conf: ${resolution.confidence}`);
    console.log(`  disagreement: ${resolution.point_of_disagreement.slice(0, 120)}`);
    console.log(`  recommendation: ${resolution.net_recommendation.slice(0, 120)}`);

    if (!dryRun) {
      const bullAvgCred = bullPreds.reduce((s, p) => s + p.cred, 0) / bullPreds.length;
      const bearAvgCred = bearPreds.reduce((s, p) => s + p.cred, 0) / bearPreds.length;
      const row = {
        signal_id: t.id,
        resolution_type: resolution.resolution_type,
        winning_side: resolution.winning_side,
        confidence: resolution.confidence,
        point_of_disagreement: resolution.point_of_disagreement,
        reasoning: resolution.reasoning,
        resolving_evidence: resolution.resolving_evidence || [],
        net_recommendation: resolution.net_recommendation,
        source_weighting_factor: resolution.source_weighting_factor,
        bull_avg_cred: Math.round(bullAvgCred * 100) / 100,
        bear_avg_cred: Math.round(bearAvgCred * 100) / 100,
        bull_count: bullPreds.length,
        bear_count: bearPreds.length,
        bull_sources: bullPreds.map((p) => p.source),
        bear_sources: bearPreds.map((p) => p.source),
        resolved_at: new Date().toISOString(),
        refresh_count: 1,
      };
      await supabase.from('tension_resolutions').upsert(row, { onConflict: 'signal_id' });
    }
    resolved++;
  }

  console.log(`\nDone. Resolved ${resolved} tensions.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
