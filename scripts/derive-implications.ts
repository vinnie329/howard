/**
 * derive-implications.ts
 *
 * For each NEW high-credibility prediction (last 24h, source cred ≥ 4.0),
 * uses Claude to derive 2nd / 3rd order implications for OTHER tracked
 * assets and themes. Implications must reference tickers / themes the
 * system actually tracks — not arbitrary speculation.
 *
 * Stored in `derived_implications` with provenance back to the parent
 * prediction. The daily briefing surfaces today's derivations as a
 * dedicated section.
 *
 *   npx tsx scripts/derive-implications.ts
 *   npx tsx scripts/derive-implications.ts --dry-run
 *   npx tsx scripts/derive-implications.ts --limit 5
 *   npx tsx scripts/derive-implications.ts --window-hours 168    # last 7 days
 */
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { CORE_SYMBOLS } from '../src/lib/assets-universe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const anthropic = new Anthropic();

const dryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.indexOf('--limit');
const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : 50;
const windowArg = process.argv.indexOf('--window-hours');
const windowHours = windowArg !== -1 ? parseInt(process.argv[windowArg + 1], 10) : 24;
const MIN_CREDIBILITY = 4.0;

interface PredictionRow {
  id: string;
  claim: string;
  sentiment: string | null;
  themes: string[] | null;
  assets_mentioned: string[] | null;
  time_horizon: string | null;
  source_id: string;
  date_made: string;
  sources: { name: string; slug: string; weighted_score: number } | null;
}

interface DerivedImplication {
  order_n: number;
  affected_asset: string | null;
  affected_theme: string | null;
  direction: 'bullish' | 'bearish' | 'mixed';
  conviction: 'high' | 'medium' | 'low';
  reasoning: string;
  derivation_steps: string[];
}

async function deriveFor(
  pred: PredictionRow,
  trackedTickers: string[],
  trackedThemes: string[],
): Promise<DerivedImplication[]> {
  const sourceName = pred.sources?.name || 'Unknown';
  const sourceCred = pred.sources?.weighted_score ?? 0;

  const prompt = `You are a financial analyst tracing 2nd / 3rd order implications of a high-credibility prediction across a tracked asset universe.

PARENT PREDICTION
Claim: "${pred.claim}"
Source: ${sourceName} (credibility ${sourceCred}/5)
Sentiment: ${pred.sentiment || 'unknown'}
Time horizon: ${pred.time_horizon || 'unknown'}
Direct assets: ${(pred.assets_mentioned || []).join(', ') || 'none'}
Themes: ${(pred.themes || []).join(', ') || 'none'}

TRACKED TICKERS (~95 names — only reference tickers in this list):
${trackedTickers.join(', ')}

TRACKED THEMES (recent themes from the system):
${trackedThemes.join(', ')}

TASK
Derive 3-7 implications that follow logically from the parent prediction. Each implication must:
1. Reference a ticker FROM THE TRACKED LIST or a theme that's already tracked
2. Skip the assets the parent prediction already names directly (those are 1st-order, not derived)
3. Have a clear logical chain — not arbitrary speculation
4. Be specific in direction (bullish, bearish, mixed)
5. Include conviction (high if the chain is mechanical and short; medium if it requires one assumption; low if it requires multiple assumptions)
6. order_n: 2 if one logical step from parent, 3 if two or more steps

Return ONLY a JSON array. Use this schema:
[
  {
    "order_n": 2,
    "affected_asset": "TLT",
    "affected_theme": null,
    "direction": "bearish",
    "conviction": "high",
    "reasoning": "One sentence: why this follows from the parent.",
    "derivation_steps": ["step 1", "step 2"]
  }
]

If no clear implications follow, return [].`;

  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = resp.content[0].type === 'text' ? resp.content[0].text : '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as DerivedImplication[];
    // Validate: must reference tracked ticker or theme
    return parsed.filter((i) => {
      if (i.affected_asset && !trackedTickers.includes(i.affected_asset)) return false;
      if (!i.affected_asset && !i.affected_theme) return false;
      return true;
    });
  } catch {
    return [];
  }
}

async function main() {
  console.log(`=== Implication Chain Derivation (${dryRun ? 'DRY RUN' : 'APPLY'}) ===`);
  console.log(`Window: last ${windowHours}h | Min cred: ${MIN_CREDIBILITY} | Max preds: ${limit}\n`);

  // Tracked tickers from CORE_SYMBOLS
  const trackedTickers = Array.from(new Set(CORE_SYMBOLS.map((s) => s.ticker)));

  // Tracked themes — pull most-frequent themes from last 90 days
  const themeCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentForThemes } = await supabase
    .from('predictions').select('themes').gte('date_made', themeCutoff).limit(2000);
  const themeCounts = new Map<string, number>();
  for (const r of recentForThemes || []) {
    for (const t of (r.themes || []) as string[]) {
      if (!t) continue;
      themeCounts.set(t, (themeCounts.get(t) || 0) + 1);
    }
  }
  const trackedThemes = Array.from(themeCounts.entries())
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 60)
    .map(([t]) => t);

  // High-cred predictions in window that we haven't derived yet
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const { data: candidates } = await supabase
    .from('predictions')
    .select('id, claim, sentiment, themes, assets_mentioned, time_horizon, source_id, date_made, sources(name, slug, weighted_score)')
    .gte('date_made', cutoff)
    .order('date_made', { ascending: false })
    .limit(limit * 2);

  const eligible = (candidates || []).filter((c) => {
    const s = c.sources as { weighted_score?: number } | null;
    return (s?.weighted_score ?? 0) >= MIN_CREDIBILITY && c.claim && c.claim.length > 30;
  }) as unknown as PredictionRow[];

  // Skip predictions we've already derived from
  const { data: existing } = await supabase
    .from('derived_implications')
    .select('parent_prediction_id')
    .in('parent_prediction_id', eligible.map((p) => p.id));
  const alreadyDerived = new Set((existing || []).map((r) => r.parent_prediction_id));
  const todo = eligible.filter((p) => !alreadyDerived.has(p.id)).slice(0, limit);

  console.log(`Eligible: ${eligible.length} | Already derived: ${alreadyDerived.size} | New to process: ${todo.length}\n`);

  let totalImplications = 0;
  for (const pred of todo) {
    const sourceName = pred.sources?.name || 'Unknown';
    console.log(`\n→ [${sourceName} ${pred.sources?.weighted_score}] ${pred.claim.slice(0, 80)}...`);
    let implications: DerivedImplication[] = [];
    try {
      implications = await deriveFor(pred, trackedTickers, trackedThemes);
    } catch (e) {
      console.log(`  derive error: ${e instanceof Error ? e.message : e}`);
      continue;
    }
    console.log(`  ${implications.length} implications`);
    for (const i of implications) {
      const target = i.affected_asset || i.affected_theme || '?';
      console.log(`    O${i.order_n} ${i.direction.padEnd(7)} ${i.conviction.padEnd(6)} ${target} — ${i.reasoning.slice(0, 100)}`);
      if (!dryRun) {
        await supabase.from('derived_implications').insert({
          parent_prediction_id: pred.id,
          parent_source_id: pred.source_id,
          parent_source_name: sourceName,
          parent_source_credibility: pred.sources?.weighted_score ?? null,
          parent_claim: pred.claim,
          order_n: i.order_n,
          affected_asset: i.affected_asset,
          affected_theme: i.affected_theme,
          direction: i.direction,
          conviction: i.conviction,
          reasoning: i.reasoning,
          derivation_steps: i.derivation_steps || [],
        });
      }
    }
    totalImplications += implications.length;
  }

  console.log(`\nDone. Processed ${todo.length} predictions, derived ${totalImplications} implications.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
