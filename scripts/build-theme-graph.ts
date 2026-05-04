/**
 * build-theme-graph.ts
 *
 * Three jobs:
 *   1. Backfill themes table from predictions (extract distinct theme strings,
 *      compute prediction counts + sentiment splits + avg credibility)
 *   2. Compute co-occurrence edges (themes that appear together in >=3 predictions)
 *   3. Use Claude to derive structured edges (implies / contradicts / amplifies)
 *      between top themes
 *
 *   npx tsx scripts/build-theme-graph.ts
 *   npx tsx scripts/build-theme-graph.ts --skip-claude    # backfill only
 *   npx tsx scripts/build-theme-graph.ts --themes-only    # skip edges entirely
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

const skipClaude = process.argv.includes('--skip-claude');
const themesOnly = process.argv.includes('--themes-only');
const TOP_N_FOR_CLAUDE = 40;        // top N themes to send to Claude for edge derivation
const MIN_CO_OCCURRENCE = 3;        // edges require >=3 co-occurring predictions
const MIN_PREDICTIONS_PER_THEME = 2;

interface PredictionRow {
  id: string;
  themes: string[] | null;
  sentiment: string | null;
  date_made: string;
  sources: { weighted_score: number } | null;
}

async function main() {
  console.log('=== Theme Graph Builder ===\n');

  // ── 1. Backfill themes from predictions (last 180 days) ──
  console.log('[1/3] Backfilling themes from predictions...');
  const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const { data: preds } = await supabase
    .from('predictions')
    .select('id, themes, sentiment, date_made, sources(weighted_score)')
    .gte('date_made', cutoff)
    .limit(5000);
  const rows = (preds || []) as unknown as PredictionRow[];

  const themeStats = new Map<string, { count: number; bull: number; bear: number; credSum: number; credN: number; lastSeen: string }>();
  for (const p of rows) {
    const cred = p.sources?.weighted_score ?? 0;
    const sentiment = (p.sentiment || '').toLowerCase();
    for (const t of p.themes || []) {
      if (!t || t.length < 2 || t.length > 60) continue;
      const stat = themeStats.get(t) || { count: 0, bull: 0, bear: 0, credSum: 0, credN: 0, lastSeen: '0' };
      stat.count++;
      if (sentiment === 'bullish') stat.bull++;
      if (sentiment === 'bearish') stat.bear++;
      if (cred > 0) { stat.credSum += cred; stat.credN++; }
      if (p.date_made > stat.lastSeen) stat.lastSeen = p.date_made;
      themeStats.set(t, stat);
    }
  }
  console.log(`  Found ${themeStats.size} distinct themes`);

  let upserted = 0;
  for (const [name, s] of themeStats) {
    if (s.count < MIN_PREDICTIONS_PER_THEME) continue;
    const avgCred = s.credN > 0 ? Math.round((s.credSum / s.credN) * 100) / 100 : null;
    await supabase.from('themes').upsert({
      name,
      prediction_count: s.count,
      bullish_count: s.bull,
      bearish_count: s.bear,
      avg_credibility: avgCred,
      last_seen_at: s.lastSeen,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'name' });
    upserted++;
  }
  console.log(`  Upserted ${upserted} themes (filter: >=${MIN_PREDICTIONS_PER_THEME} predictions)\n`);

  if (themesOnly) { console.log('--themes-only — done.'); return; }

  // ── 2. Compute co-occurrence edges ──
  console.log('[2/3] Computing co-occurrence edges...');
  const { data: themesRows } = await supabase
    .from('themes').select('id, name');
  const themeIdByName = new Map<string, string>((themesRows || []).map((t) => [t.name, t.id]));

  // Pair count: theme1 → theme2 → count of co-occurring predictions
  const pairs = new Map<string, number>();
  function pairKey(a: string, b: string) { return [a, b].sort().join('::'); }
  for (const p of rows) {
    const themes = (p.themes || []).filter((t) => themeIdByName.has(t));
    for (let i = 0; i < themes.length; i++) {
      for (let j = i + 1; j < themes.length; j++) {
        if (themes[i] === themes[j]) continue;
        const k = pairKey(themes[i], themes[j]);
        pairs.set(k, (pairs.get(k) || 0) + 1);
      }
    }
  }
  let coEdges = 0;
  for (const [key, count] of pairs) {
    if (count < MIN_CO_OCCURRENCE) continue;
    const [a, b] = key.split('::');
    const aId = themeIdByName.get(a);
    const bId = themeIdByName.get(b);
    if (!aId || !bId) continue;
    // Symmetric — add both directions for query convenience
    for (const [src, tgt] of [[aId, bId], [bId, aId]] as const) {
      await supabase.from('theme_edges').upsert({
        source_theme_id: src,
        target_theme_id: tgt,
        edge_type: 'co_occurs',
        weight: count,
        derived_from: 'co_occurrence',
        occurrence_count: count,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'source_theme_id,target_theme_id,edge_type' });
    }
    coEdges += 2;
  }
  console.log(`  Wrote ${coEdges} co-occurrence edges (threshold: >=${MIN_CO_OCCURRENCE} co-occurring predictions)\n`);

  if (skipClaude) { console.log('--skip-claude — done after co-occurrence.'); return; }

  // ── 3. Claude-derived structured edges (implies / contradicts / amplifies) ──
  console.log('[3/3] Deriving structured edges from Claude...');
  const topThemes = (themesRows || [])
    .map((t) => ({ ...t, count: themeStats.get(t.name)?.count || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N_FOR_CLAUDE);

  const themeListBlock = topThemes.map((t) => {
    const s = themeStats.get(t.name)!;
    const dir = s.bull > s.bear ? `BULL+${s.bull}/${s.bear}` : s.bear > s.bull ? `BEAR+${s.bear}/${s.bull}` : `MIXED ${s.bull}/${s.bear}`;
    return `${t.name}  [${s.count} preds, ${dir}]`;
  }).join('\n');

  const prompt = `You are mapping the structural relationships between investment themes that recur in our analyst-source database.

THEMES (top ${topThemes.length} by recent prediction count, with bull/bear sentiment split):
${themeListBlock}

TASK
Identify directed edges between themes. Each edge:
- source_theme: theme on the left side
- target_theme: theme on the right side
- edge_type: one of:
  · "implies"     — source theme structurally drives target (e.g. "AI CapEx" implies "Data Centers", "Stealth Treasury Accord" implies "Bond Bear")
  · "contradicts" — themes are mutually exclusive or negate each other (e.g. "AI Disinflation" contradicts "Real Rate Spike")
  · "amplifies"   — themes reinforce each other in the same direction (e.g. "Memory Constraint" amplifies "AI CapEx")
  · "requires"    — target is necessary for source to play out (e.g. "AGI by 2027" requires "Continued Compute Scaling")
- reasoning: one sentence explaining the relationship

ONLY output edges between themes in the list above. Be selective — return edges where the relationship is clear and structural, not weak correlations. Aim for 15-30 high-quality edges.

Return ONLY a JSON array. Example:
[
  {
    "source_theme": "AI CapEx",
    "target_theme": "Data Centers",
    "edge_type": "implies",
    "reasoning": "AI capex spending is primarily allocated to data center buildout."
  },
  {
    "source_theme": "Memory Constraint",
    "target_theme": "AI CapEx",
    "edge_type": "amplifies",
    "reasoning": "Memory bottleneck constrains compute supply, increasing per-unit AI capex pricing power."
  }
]`;

  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = resp.content[0].type === 'text' ? resp.content[0].text : '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) { console.log('  no Claude edges parsed'); return; }
  let edges: Array<{ source_theme: string; target_theme: string; edge_type: string; reasoning: string }> = [];
  try {
    edges = JSON.parse(match[0]);
  } catch (e) {
    console.log(`  parse error: ${e instanceof Error ? e.message : e}`);
    return;
  }

  let claudeEdges = 0;
  for (const e of edges) {
    const srcId = themeIdByName.get(e.source_theme);
    const tgtId = themeIdByName.get(e.target_theme);
    if (!srcId || !tgtId || srcId === tgtId) continue;
    if (!['implies', 'contradicts', 'amplifies', 'requires'].includes(e.edge_type)) continue;
    await supabase.from('theme_edges').upsert({
      source_theme_id: srcId,
      target_theme_id: tgtId,
      edge_type: e.edge_type,
      weight: 1.0,
      reasoning: e.reasoning,
      derived_from: 'claude_derivation',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'source_theme_id,target_theme_id,edge_type' });
    claudeEdges++;
    console.log(`  ${e.edge_type.padEnd(11)} ${e.source_theme.padEnd(25)} → ${e.target_theme.padEnd(25)} [${e.reasoning.slice(0, 80)}]`);
  }
  console.log(`\n  Wrote ${claudeEdges} Claude-derived edges`);

  console.log('\nDone.');
}
main().catch((e) => { console.error(e); process.exit(1); });
