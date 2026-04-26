/**
 * generate-house-view.ts — Maintain Howard's house predictions.
 *
 * The house view is a STABLE, HIGH-CONVICTION document. Views are typically
 * 3+ months in horizon and should only change when there is material reason.
 *
 * Default mode: REVIEW existing views against current intelligence and only
 * propose changes (add/update/remove) when there is significant conviction
 * and a clearly articulated reason.
 *
 * --force-regen: Bypass review mode and regenerate all predictions from scratch.
 *                Only use this for initial seeding or a full reset.
 *
 * Usage:
 *   npx tsx scripts/generate-house-view.ts              # review & material changes only
 *   npx tsx scripts/generate-house-view.ts --force-regen # full regeneration (rare)
 *   npx tsx scripts/generate-house-view.ts --dry-run     # preview without writing
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { fetchCreditSpreads, formatCreditBlock } from '../src/lib/fetchers/credit-spreads';
import { fetchOptionsSentiment, formatOptionsBlock } from '../src/lib/fetchers/options-sentiment';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = new Anthropic();

const dryRun = process.argv.includes('--dry-run');
const forceRegen = process.argv.includes('--force-regen');

const DOMAIN_LABELS: Record<string, string> = {
  'ai-semis': 'AI/Semis',
  'macro': 'Macro',
  'energy-commod': 'Energy/Commodities',
  'credit': 'Credit',
  'equities': 'Equities',
  'tech-platforms': 'Tech/Platforms',
  'crypto': 'Crypto',
  'geopolitics': 'Geopolitics',
};

// Infer which canonical domain(s) a prediction touches based on its themes,
// claim text, and assets. Used to match against the source's listed domains
// so we can flag domain-expert calls.
function inferPredictionDomains(themes: string[], claim: string, assets: string): string[] {
  const t = `${themes.join(' ')} ${claim} ${assets}`.toLowerCase();
  const out: string[] = [];
  if (/\b(ai|gpu|cpu|chip|semi|nvidia|nvda|amd|intel|intc|tsmc|tsm|llm|inference|train|datacenter|data center|hyperscaler|micron|mu\b|asml|robotics|agent)\b/.test(t)) out.push('ai-semis');
  if (/\b(liquidity|fed|rate|treasury|tlt|usd|dollar|fiscal|debt|monetary|inflation|cpi|pce|m2|qe|qt|powell|warsh)\b/.test(t)) out.push('macro');
  if (/\b(oil|gas|gold|silver|copper|uranium|commodity|commodities|energy|cl=f|gc=f|si=f|hg=f|bz=f|xle|cvx|royalty|mining|hormuz|ttf|opec)\b/.test(t)) out.push('energy-commod');
  if (/\b(credit|hyg|lqd|bdc|bizd|private credit|spread|default|junk bond|leveraged loan|cmbs)\b/.test(t)) out.push('credit');
  if (/\b(btc|bitcoin|eth|ethereum|crypto|stablecoin|usdt|usdc|web3|defi)\b/.test(t)) out.push('crypto');
  if (/\b(software|saas|platform|stratechery|fintech|stripe)\b/.test(t)) out.push('tech-platforms');
  if (/\b(china|iran|hormuz|geopolit|war|sanction|trade war|tariff|nuclear|israel)\b/.test(t)) out.push('geopolitics');
  if (/\b(spy|qqq|earnings|valuation|stock)\b/.test(t) && out.length === 0) out.push('equities');
  return out;
}

interface GeneratedPrediction {
  claim: string;
  asset: string;
  direction: 'long' | 'short' | 'neutral';
  target_value: number | null;
  target_condition: string;
  time_horizon: string;
  deadline_days: number;
  confidence: number;
  conviction: 'high' | 'medium' | 'low';
  thesis: string;
  supporting_sources: string[];
  key_drivers: string[];
  invalidation_criteria: string;
  category: string;
  themes: string[];
}

interface ReviewAction {
  action: 'add' | 'update' | 'remove' | 'keep';
  reason: string;
  existing_id?: string;
  prediction?: GeneratedPrediction;
}

// ── Technicals (200d/200w MA deviations) ────────────────────────────

const TECHNICAL_SYMBOLS = [
  { ticker: 'NVDA', name: 'NVIDIA' }, { ticker: 'AVGO', name: 'Broadcom' },
  { ticker: 'MSFT', name: 'Microsoft' }, { ticker: 'GOOGL', name: 'Google' },
  { ticker: 'AMZN', name: 'Amazon' }, { ticker: 'META', name: 'Meta' },
  { ticker: 'AMD', name: 'AMD' }, { ticker: 'TSM', name: 'TSMC' },
  { ticker: 'BTC-USD', name: 'Bitcoin' }, { ticker: 'ETH-USD', name: 'Ethereum' },
  { ticker: 'GC=F', name: 'Gold' }, { ticker: 'SI=F', name: 'Silver' },
  { ticker: 'HG=F', name: 'Copper' }, { ticker: 'CL=F', name: 'Crude Oil' },
  { ticker: '^GSPC', name: 'S&P 500' }, { ticker: '^IXIC', name: 'NASDAQ' },
  { ticker: 'SPY', name: 'S&P 500 ETF' }, { ticker: 'QQQ', name: 'NASDAQ 100 ETF' },
  { ticker: 'TLT', name: '20+ Year Treasury' },
];

function computeSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((sum, p) => sum + p, 0) / period;
}

async function fetchChartData(ticker: string, range: string, interval: string): Promise<number[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Howard/1.0' } });
    if (!res.ok) return [];
    const data = await res.json();
    const closes: (number | null)[] = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    return closes.filter((v): v is number => v !== null);
  } catch {
    return [];
  }
}

async function fetchTechnicalData(): Promise<string> {
  const lines: string[] = [];
  for (const sym of TECHNICAL_SYMBOLS) {
    try {
      const [daily, weekly] = await Promise.all([
        fetchChartData(sym.ticker, '1y', '1d'),
        fetchChartData(sym.ticker, '5y', '1wk'),
      ]);
      if (daily.length === 0) continue;
      const price = daily[daily.length - 1];
      const displaySymbol = sym.ticker.replace('=F', '').replace('^', '').replace('-USD', '');
      const ma200d = computeSMA(daily, 200);
      const dev200d = ma200d ? ((price - ma200d) / ma200d) * 100 : null;
      const ma200w = computeSMA(weekly, 200);
      const dev200w = ma200w ? ((price - ma200w) / ma200w) * 100 : null;

      let line = `${sym.name} (${displaySymbol}): $${Number(price).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      if (dev200d != null) line += ` | 200d: ${dev200d > 0 ? '+' : ''}${dev200d.toFixed(1)}%`;
      if (dev200w != null) line += ` | 200w: ${dev200w > 0 ? '+' : ''}${dev200w.toFixed(1)}%`;
      lines.push(line);
    } catch { /* skip */ }
  }
  return lines.join('\n');
}

/** Fetch current price for an asset. */
async function fetchPrice(ticker: string): Promise<number | null> {
  const tickerMap: Record<string, string> = {
    'S&P 500': '^GSPC', 'SPY': 'SPY', 'SPX': '^GSPC',
    'NASDAQ': '^IXIC', 'QQQ': 'QQQ',
    'Gold': 'GC=F', 'GLD': 'GC=F',
    'Bitcoin': 'BTC-USD', 'BTC': 'BTC-USD', 'BTC-USD': 'BTC-USD',
    'Silver': 'SI=F', 'Oil': 'CL=F', 'Crude': 'CL=F',
    'TLT': 'TLT', 'US10Y': '^TNX', 'DXY': 'DX-Y.NYB',
    'NVDA': 'NVDA', 'AAPL': 'AAPL', 'MSFT': 'MSFT', 'AMD': 'AMD',
    'TSMC': 'TSM', 'SOXX': 'SOXX', 'PAVE': 'PAVE',
    'Copper': 'HG=F', 'Uranium': 'URA',
  };
  const symbol = tickerMap[ticker] || ticker;
  try {
    const end = Math.floor(Date.now() / 1000);
    const start = end - 5 * 24 * 60 * 60;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${end}&interval=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Howard/1.0' } });
    if (!res.ok) return null;
    const json = await res.json();
    const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    if (!closes || closes.length === 0) return null;
    return closes.filter((c: number | null) => c !== null).pop() || null;
  } catch {
    return null;
  }
}

async function main() {
  console.log('=== Howard House View Generator ===\n');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : forceRegen ? 'FORCE REGEN' : 'REVIEW (material changes only)'}\n`);

  // 1. Gather all intelligence
  console.log('Gathering intelligence...\n');

  const [outlookRes, predictionsRes, sourcesRes, existingRes] = await Promise.all([
    supabase.from('outlook').select('*'),
    supabase.from('predictions').select('*, sources(name, weighted_score, scores)').order('created_at', { ascending: false }).limit(100),
    supabase.from('sources').select('id, name, weighted_score, scores, domains'),
    supabase.from('house_predictions').select('*').eq('outcome', 'pending').order('created_at', { ascending: false }),
  ]);

  const outlooks = outlookRes.data || [];
  const predictions = predictionsRes.data || [];
  const sources = sourcesRes.data || [];
  const existingHouse = existingRes.data || [];

  console.log(`  Outlooks: ${outlooks.length}`);
  console.log(`  Source predictions: ${predictions.length}`);
  console.log(`  Sources: ${sources.length}`);
  console.log(`  Active house predictions: ${existingHouse.length}\n`);

  // Fetch live market sentiment + technicals
  console.log('Fetching market sentiment data...');
  const [creditRecords, optionsSentiment] = await Promise.all([
    fetchCreditSpreads(supabase),
    fetchOptionsSentiment(supabase),
  ]);

  console.log('Fetching technicals...');
  const technicalsBlock = await fetchTechnicalData();
  const techCount = technicalsBlock.split('\n').filter(Boolean).length;
  console.log(`  ${techCount} symbols\n`);

  // 2. Build context for Claude
  const outlookSummary = outlooks.map((o) => {
    return `[${o.time_horizon.toUpperCase()}] "${o.title}" — ${o.sentiment} (confidence: ${o.confidence}/100)
  Thesis: ${o.thesis_intro}
  Key themes: ${(o.key_themes || []).join(', ')}
  Positioning: ${(o.positioning || []).join('; ')}`;
  }).join('\n\n');

  // Weight predictions by source credibility AND domain expertise.
  // A solo call from a domain expert is a primary signal — see prompt rules below.
  const weightedPredictions = predictions
    .map((p) => {
      const source = p.sources as { name: string; weighted_score: number; scores: Record<string, number>; domains: string[] } | null;
      const weight = source?.weighted_score || 3;
      const perfScore = source?.scores?.performance || 3;
      const sourceDomains = (source?.domains as string[]) || [];
      const assetsStr = (p.assets_mentioned || []).join(', ');
      const themesArr = (p.themes || []) as string[];
      const predDomains = inferPredictionDomains(themesArr, p.claim || '', assetsStr);
      const matchedDomains = predDomains.filter((d) => sourceDomains.includes(d));
      const isDomainExpert = matchedDomains.length > 0 && weight >= 4.0;
      const sourceDomainLabels = sourceDomains.map((d) => DOMAIN_LABELS[d] || d).join('/') || 'unspecified';
      return {
        claim: p.claim,
        sentiment: p.sentiment,
        confidence: p.confidence,
        specificity: p.specificity,
        time_horizon: p.time_horizon,
        assets: assetsStr,
        themes: themesArr.join(', '),
        source_name: source?.name || 'Unknown',
        source_weight: weight,
        source_performance: perfScore,
        source_domain_label: sourceDomainLabels,
        is_domain_expert: isDomainExpert,
        cross_domain: predDomains.length > 0 && matchedDomains.length === 0,
        date_made: p.date_made || p.created_at,
      };
    })
    // Sort: domain experts first (within domain credibility), then by overall weight
    .sort((a, b) => {
      if (a.is_domain_expert !== b.is_domain_expert) return a.is_domain_expert ? -1 : 1;
      return b.source_weight - a.source_weight;
    });

  const predictionsSummary = weightedPredictions.slice(0, 50).map((p) => {
    const tag = p.is_domain_expert ? ' DOMAIN EXPERT' : p.cross_domain ? ' (cross-domain)' : '';
    return `[${p.source_name} · ${p.source_weight.toFixed(1)}/5 · ${p.source_domain_label}${tag}] ${p.claim}
    Sentiment: ${p.sentiment} | Confidence: ${p.confidence} | Specificity: ${p.specificity} | Horizon: ${p.time_horizon} | Assets: ${p.assets || 'none'}`;
  }).join('\n');

  const existingClaims = existingHouse.map((h) => `- ${h.claim} (${h.asset}, confidence: ${h.confidence}%, deadline: ${h.deadline})`).join('\n');

  // Normalize asset tickers to canonical form
  const assetNormMap: Record<string, string> = {
    'GLD': 'GC=F', 'IAU': 'GC=F', 'Gold': 'GC=F',
    'SLV': 'SI=F', 'Silver': 'SI=F',
    'USO': 'CL=F', 'Oil': 'CL=F', 'Crude': 'CL=F',
    'CPER': 'HG=F', 'Copper': 'HG=F',
    'SPX': 'SPY', 'S&P 500': 'SPY', '^GSPC': 'SPY',
    'NASDAQ': 'QQQ', '^IXIC': 'QQQ',
    'BTC': 'BTC-USD', 'Bitcoin': 'BTC-USD',
    'ETH': 'ETH-USD', 'Ethereum': 'ETH-USD',
  };
  for (const h of existingHouse) {
    if (assetNormMap[h.asset]) h.asset = assetNormMap[h.asset];
  }

  const intelligenceBlock = `## YOUR INTELLIGENCE

### Current Outlooks
${outlookSummary || 'No outlooks available yet.'}

### Source Predictions (weighted by credibility)
${predictionsSummary || 'No source predictions available yet.'}

### Credit Markets
HY/IG spreads are leading risk sentiment indicators. TED spread and SOFR signal funding stress. These move before equities.
${formatCreditBlock(creditRecords)}

### Options Market Sentiment
VIX term structure, SKEW (institutional tail-risk hedging), and put/call ratios.
${formatOptionsBlock(optionsSentiment)}

### Technicals (deviation from 200-day and 200-week moving averages)
Assets far above their MAs may be extended; assets far below may be mean-reversion candidates. Use this to calibrate entry timing and confidence.
${technicalsBlock || 'No technicals data available.'}`;

  // ── Route: REVIEW mode (default) vs FORCE REGEN ──────────────────
  if (!forceRegen && existingHouse.length > 0) {
    await runReviewMode(existingHouse, intelligenceBlock, existingClaims);
  } else {
    if (!forceRegen && existingHouse.length === 0) {
      console.log('No existing house predictions — running initial generation.\n');
    }
    await runFullGeneration(existingHouse, intelligenceBlock, existingClaims);
  }
}

// ── REVIEW MODE: Only propose material changes ──────────────────────

async function runReviewMode(
  existingHouse: Array<Record<string, unknown>>,
  intelligenceBlock: string,
  existingClaims: string,
) {
  console.log('Reviewing existing house view for material changes...\n');

  const prompt = `You are Howard, an AI financial intelligence system. You maintain a STABLE, HIGH-CONVICTION house view.

The house view is NOT regenerated frequently. Views are typically 3+ months in horizon. Your job right now is to REVIEW the existing predictions against current intelligence and determine if any MATERIAL changes are warranted.

## EXISTING HOUSE PREDICTIONS (the current view)
${existingClaims}

${intelligenceBlock}

## REVIEW INSTRUCTIONS

For EACH existing prediction, decide: KEEP or UPDATE or REMOVE.
Then decide if any genuinely NEW predictions should be ADDED.

## DOMAIN AUTHORITY (read this first)

Each source prediction is tagged with that source's listed domain (e.g., AI/Semis, Macro, Energy/Commodities, Credit, Crypto, Tech/Platforms, Geopolitics, Equities). When a prediction is tagged "DOMAIN EXPERT", it means a high-credibility source (≥4.0/5) is speaking in their listed specialty.

**Domain-expert solo calls are primary signals — NOT down-weighted for lack of triangulation.** The roster has different specialists for different areas; the rest of the roster being silent on a topic is *non-coverage*, not *disagreement*.

Examples:
- A solo Patel or Tae Kim call on chips/CPUs/AI infra is a strong signal even if no other source touches it. They ARE the semis specialists.
- A solo Rule call on uranium/copper/gold royalty is a strong signal even if no other source touches it. He IS the resource specialist.
- A solo Marks/Howell/Burry/Eisman call on credit cycles or liquidity is a strong signal even if no other source touches it. They ARE the credit/macro specialists.
- A solo Currie call on energy supply / Hormuz is a strong signal.
- A solo Amodei or Karpathy call on AI capability trajectory is a strong signal.

When sources OUTSIDE their domain weigh in (tagged "cross-domain"), their call is informational but should NOT itself drive high-confidence house views. Marks on chips, or Patel on credit, is interesting but not authoritative.

**Triangulation matters most when**: (a) the call crosses domains, (b) no domain expert in the roster has weighed in on the topic, or (c) the domain expert's credibility is only moderate.

**The most interesting case is when domain experts DISAGREE** — that's where you slow down and reason carefully. Patel-vs-Kim on Intel matters. Patel-vs-Marks on Intel doesn't.

## DECISION RULES

**Default is KEEP.** The bar for changes is HIGH:

- **KEEP** (default): The thesis is intact, no material new information contradicts it. Minor price moves within the expected range do NOT warrant changes.
- **UPDATE**: Only if there is material new evidence that significantly changes the confidence, target, or timeline. Examples: a key driver has reversed, invalidation criteria have been partially triggered, OR a domain expert has materially changed their view. Updating the confidence by <10 points is NOT material — leave it alone.
- **REMOVE**: Only if the invalidation criteria have been clearly met, the thesis has been fundamentally broken, or the prediction is no longer relevant. A view moving against us in the short term is NOT reason to remove — that's just volatility.
- **ADD**: Add when there is a clear, actionable, high-conviction thesis that isn't already covered. **A high-credibility domain expert (≥4.0 in-domain) making a specific, falsifiable call is sufficient grounds to ADD** — you do NOT need cross-roster triangulation. For cross-domain or non-expert claims, the multi-source bar still applies.

For each action that is NOT "keep", you MUST provide a detailed reason explaining what material change in the intelligence justifies the action.

Respond in valid JSON array format:
[
  {
    "action": "keep",
    "existing_id": "uuid-of-prediction",
    "reason": "Thesis intact — no material change in drivers"
  },
  {
    "action": "update",
    "existing_id": "uuid-of-prediction",
    "reason": "Detailed explanation of what material evidence changed...",
    "prediction": {
      "claim": "Updated claim text",
      "asset": "SPY",
      "direction": "short",
      "target_value": 480,
      "target_condition": "below 480",
      "time_horizon": "6 months",
      "deadline_days": 180,
      "confidence": 65,
      "conviction": "medium",
      "thesis": "Updated thesis...",
      "supporting_sources": ["Source1"],
      "key_drivers": ["Driver1"],
      "invalidation_criteria": "What would prove this wrong",
      "category": "macro",
      "themes": ["Theme1"]
    }
  },
  {
    "action": "remove",
    "existing_id": "uuid-of-prediction",
    "reason": "Detailed explanation of why the thesis is broken..."
  },
  {
    "action": "add",
    "reason": "Detailed explanation of strong multi-source conviction...",
    "prediction": { ... full prediction object ... }
  }
]

Remember: if nothing material has changed, it is CORRECT to return all "keep" actions. An unchanged house view is a sign of conviction, not laziness.`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('Failed to parse Claude response as JSON array.');
    console.error('Raw response:', text.substring(0, 500));
    process.exit(1);
  }

  let actions: ReviewAction[];
  try {
    actions = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Invalid JSON in response:', e);
    process.exit(1);
  }

  // Normalize any new prediction assets
  const assetNormMap: Record<string, string> = {
    'GLD': 'GC=F', 'IAU': 'GC=F', 'Gold': 'GC=F',
    'SLV': 'SI=F', 'Silver': 'SI=F',
    'USO': 'CL=F', 'Oil': 'CL=F', 'Crude': 'CL=F',
    'CPER': 'HG=F', 'Copper': 'HG=F',
    'SPX': 'SPY', 'S&P 500': 'SPY', '^GSPC': 'SPY',
    'NASDAQ': 'QQQ', '^IXIC': 'QQQ',
    'BTC': 'BTC-USD', 'Bitcoin': 'BTC-USD',
    'ETH': 'ETH-USD', 'Ethereum': 'ETH-USD',
  };
  for (const a of actions) {
    if (a.prediction && assetNormMap[a.prediction.asset]) {
      a.prediction.asset = assetNormMap[a.prediction.asset];
    }
  }

  // Report
  const keeps = actions.filter(a => a.action === 'keep');
  const updates = actions.filter(a => a.action === 'update');
  const removes = actions.filter(a => a.action === 'remove');
  const adds = actions.filter(a => a.action === 'add');

  console.log(`Review results:`);
  console.log(`  Keep:   ${keeps.length}`);
  console.log(`  Update: ${updates.length}`);
  console.log(`  Remove: ${removes.length}`);
  console.log(`  Add:    ${adds.length}\n`);

  for (const a of keeps) {
    console.log(`  ✓ KEEP: ${a.existing_id} — ${a.reason}`);
  }

  const now = new Date();
  let changes = 0;

  // Process updates
  for (const a of updates) {
    if (!a.prediction || !a.existing_id) continue;
    console.log(`\n  ↻ UPDATE: ${a.existing_id}`);
    console.log(`    Reason: ${a.reason}`);
    console.log(`    New claim: ${a.prediction.claim}`);
    console.log(`    Confidence: ${a.prediction.confidence}% (${a.prediction.conviction})`);

    if (!dryRun) {
      const existing = existingHouse.find(h => h.id === a.existing_id);
      const refPrice = await fetchPrice(a.prediction.asset);
      const deadline = new Date(now.getTime() + a.prediction.deadline_days * 24 * 60 * 60 * 1000);

      const row = {
        ...a.prediction,
        reference_value: refPrice,
        deadline: deadline.toISOString(),
        outcome: 'pending',
        supersedes: a.existing_id,
        version: existing ? ((existing.version as number) || 1) + 1 : 1,
      };

      const { data: inserted_row, error } = await supabase
        .from('house_predictions')
        .insert(row)
        .select('id')
        .single();

      if (error) {
        console.error(`    Failed to insert: ${error.message}`);
      } else {
        changes++;
        if (inserted_row) {
          await supabase
            .from('house_predictions')
            .update({ superseded_by: inserted_row.id, outcome: 'expired' })
            .eq('id', a.existing_id);
        }
      }
    }
  }

  // Process removals
  for (const a of removes) {
    if (!a.existing_id) continue;
    console.log(`\n  ✗ REMOVE: ${a.existing_id}`);
    console.log(`    Reason: ${a.reason}`);

    if (!dryRun) {
      const { error } = await supabase
        .from('house_predictions')
        .update({ outcome: 'expired' })
        .eq('id', a.existing_id);

      if (error) {
        console.error(`    Failed to remove: ${error.message}`);
      } else {
        changes++;
      }
    }
  }

  // Process additions
  for (const a of adds) {
    if (!a.prediction) continue;
    console.log(`\n  + ADD: ${a.prediction.claim}`);
    console.log(`    Reason: ${a.reason}`);
    console.log(`    Asset: ${a.prediction.asset} | Confidence: ${a.prediction.confidence}% (${a.prediction.conviction})`);

    if (!dryRun) {
      const refPrice = await fetchPrice(a.prediction.asset);
      const deadline = new Date(now.getTime() + a.prediction.deadline_days * 24 * 60 * 60 * 1000);

      const row = {
        ...a.prediction,
        reference_value: refPrice,
        deadline: deadline.toISOString(),
        outcome: 'pending',
        supersedes: null,
        version: 1,
      };

      const { error } = await supabase
        .from('house_predictions')
        .insert(row);

      if (error) {
        console.error(`    Failed to insert: ${error.message}`);
      } else {
        changes++;
      }
    }
  }

  console.log(`\n=== House View Review Complete ===`);
  console.log(`Total changes: ${changes} (of ${existingHouse.length} existing views)`);
  if (changes === 0) console.log('House view unchanged — thesis intact across the board.');
}

// ── FULL GENERATION MODE (initial seed or forced reset) ─────────────

async function runFullGeneration(
  existingHouse: Array<Record<string, unknown>>,
  intelligenceBlock: string,
  existingClaims: string,
) {
  console.log('Running full house view generation...\n');

  const prompt = `You are Howard, an AI financial intelligence system that synthesizes predictions from multiple expert sources into a coherent house view. Your job is to generate SPECIFIC, FALSIFIABLE, TIME-BOUND predictions with calibrated confidence ratings.

These predictions form a STABLE house view — they will persist for months and only be updated when there is material reason to change. Generate only predictions where you have genuine, high conviction.

${intelligenceBlock}

### Existing Active House Predictions (do not duplicate)
${existingClaims || 'None yet.'}

## DOMAIN AUTHORITY (read this first)

Each source prediction is tagged with that source's listed domain (AI/Semis, Macro, Energy/Commodities, Credit, Crypto, Tech/Platforms, Geopolitics, Equities). When a prediction is tagged "DOMAIN EXPERT", it means a high-credibility source (≥4.0/5) is speaking in their listed specialty.

**Domain-expert solo calls are primary signals — NOT down-weighted for lack of triangulation.** The roster has different specialists for different areas; the rest of the roster being silent on a topic is *non-coverage*, not *disagreement*.

Examples:
- Patel + Tae Kim are the AI/Semis specialists. A solo call from either is a strong signal on chips/CPUs/AI infra.
- Rick Rule is the resource specialist. A solo call from him on uranium/copper/gold royalty is a strong signal.
- Marks/Howell/Burry/Eisman are the credit/macro specialists. A solo call from any of them on credit cycles or liquidity is a strong signal.
- Currie is the energy supply / commodities specialist.
- Amodei / Karpathy are the AI capability specialists.

When sources weigh in OUTSIDE their domain (tagged "cross-domain"), their call is informational but should NOT itself drive high-confidence house views.

**The most interesting case is when domain experts DISAGREE** — slow down and reason carefully there.

## INSTRUCTIONS

Generate 5-8 house predictions. Each must be:

1. **Asset-specific**: tied to a tradeable asset (ticker or commodity)
2. **Falsifiable**: has a clear target condition that can be measured
3. **Time-bound**: has a specific deadline (30 days to 12 months)
4. **Confidence-calibrated** with domain weighting:
   - **High confidence (70-90%)**: A high-credibility (≥4.0) DOMAIN EXPERT is bullish/bearish AND the data supports it AND no other domain expert disagrees. OR multiple high-credibility sources across complementary domains converge on the same view (e.g., a chip-specialist + a macro-specialist + a credit-specialist all align).
   - **Medium confidence (40-69%)**: Directional call from a credible source with some support; or domain expert with moderate confidence; or non-domain-expert sources clustering on a view.
   - **Low confidence (20-39%)**: Contrarian or speculative; sparse signal; or thesis-only with no domain expert engagement.
   - **NEVER above 90%** — markets are inherently uncertain.
   - Your confidence should reflect the ACTUAL probability you believe this will happen.

5. **Domain-expert weighting**: A solo high-credibility (≥4.0) domain-expert call in their specialty is sufficient grounds for a prediction with medium-to-high confidence. Triangulation across non-domain sources is NOT required and adds little. Triangulation matters when (a) the call crosses domains, (b) no domain expert has weighed in, or (c) the domain expert's credibility is moderate.

6. **Bias towards conviction**: Prefer generating fewer, higher-confidence predictions over many low-confidence ones. Howard's value comes from having strong, well-reasoned calls — not from hedging everything. Only include a prediction if you would be comfortable defending it for the next 3+ months.

Categories: macro, sector, single-stock, rates, commodities, crypto

For each prediction, provide invalidation criteria — what would prove it wrong early, so we can cut losses on bad calls.

Respond in valid JSON array format:
[
  {
    "claim": "S&P 500 will decline 10%+ from current levels",
    "asset": "SPY",
    "direction": "short",
    "target_value": 480,
    "target_condition": "below 480 (10% decline from ~533)",
    "time_horizon": "6 months",
    "deadline_days": 180,
    "confidence": 65,
    "conviction": "medium",
    "thesis": "Liquidity withdrawal + elevated valuations + multiple credible sources calling for correction",
    "supporting_sources": ["Howard Marks", "Michael Howell", "Mike Burry"],
    "key_drivers": ["Fed liquidity drain", "Valuation compression", "Credit tightening"],
    "invalidation_criteria": "SPY breaks above 560 with expanding breadth and improving liquidity metrics",
    "category": "macro",
    "themes": ["Market Correction", "Liquidity Tightening"]
  }
]`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('Failed to parse Claude response as JSON array.');
    console.error('Raw response:', text.substring(0, 500));
    process.exit(1);
  }

  let generated: GeneratedPrediction[];
  try {
    generated = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Invalid JSON in response:', e);
    process.exit(1);
  }

  // Normalize asset tickers
  const assetNormMap: Record<string, string> = {
    'GLD': 'GC=F', 'IAU': 'GC=F', 'Gold': 'GC=F',
    'SLV': 'SI=F', 'Silver': 'SI=F',
    'USO': 'CL=F', 'Oil': 'CL=F', 'Crude': 'CL=F',
    'CPER': 'HG=F', 'Copper': 'HG=F',
    'SPX': 'SPY', 'S&P 500': 'SPY', '^GSPC': 'SPY',
    'NASDAQ': 'QQQ', '^IXIC': 'QQQ',
    'BTC': 'BTC-USD', 'Bitcoin': 'BTC-USD',
    'ETH': 'ETH-USD', 'Ethereum': 'ETH-USD',
  };
  for (const pred of generated) {
    if (assetNormMap[pred.asset]) pred.asset = assetNormMap[pred.asset];
  }

  // Deduplicate: keep higher confidence on same asset+direction
  const seen = new Map<string, number>();
  generated = generated.filter((pred, idx) => {
    const key = `${pred.asset}:${pred.direction}`;
    const existing = seen.get(key);
    if (existing !== undefined) {
      if (pred.confidence > generated[existing].confidence) {
        generated[existing] = { ...generated[existing], confidence: -1 };
        seen.set(key, idx);
        return true;
      }
      console.log(`  Deduplicating: "${pred.claim}" (duplicate ${pred.asset} ${pred.direction})`);
      return false;
    }
    seen.set(key, idx);
    return true;
  }).filter(p => p.confidence >= 0);

  console.log(`Generated ${generated.length} house predictions:\n`);

  const now = new Date();
  let inserted = 0;

  for (const pred of generated) {
    const refPrice = await fetchPrice(pred.asset);

    console.log(`  [${pred.confidence}% ${pred.conviction}] ${pred.claim}`);
    console.log(`    Asset: ${pred.asset} (current: ${refPrice ? `$${refPrice.toFixed(2)}` : 'N/A'})`);
    console.log(`    Target: ${pred.target_condition}`);
    console.log(`    Deadline: ${pred.deadline_days} days`);
    console.log(`    Thesis: ${pred.thesis.substring(0, 80)}...`);
    console.log(`    Invalidation: ${pred.invalidation_criteria}\n`);

    if (!dryRun) {
      const deadline = new Date(now.getTime() + pred.deadline_days * 24 * 60 * 60 * 1000);

      const existingPred = existingHouse.find(
        (h) => h.asset === pred.asset && h.direction === pred.direction
      );

      const row = {
        claim: pred.claim,
        asset: pred.asset,
        direction: pred.direction,
        target_value: pred.target_value,
        target_condition: pred.target_condition,
        reference_value: refPrice,
        time_horizon: pred.time_horizon,
        deadline: deadline.toISOString(),
        confidence: pred.confidence,
        conviction: pred.conviction,
        thesis: pred.thesis,
        supporting_sources: pred.supporting_sources,
        key_drivers: pred.key_drivers,
        invalidation_criteria: pred.invalidation_criteria,
        category: pred.category,
        themes: pred.themes,
        outcome: 'pending',
        supersedes: (existingPred?.id as string) || null,
        version: existingPred ? ((existingPred.version as number) || 1) + 1 : 1,
      };

      const { data: inserted_row, error } = await supabase
        .from('house_predictions')
        .insert(row)
        .select('id')
        .single();

      if (error) {
        console.error(`    Failed to insert: ${error.message}`);
      } else {
        inserted++;
        if (existingPred && inserted_row) {
          await supabase
            .from('house_predictions')
            .update({ superseded_by: inserted_row.id, outcome: 'expired' })
            .eq('id', existingPred.id);
        }
      }
    }
  }

  console.log(`\n=== House View Generation Complete ===`);
  console.log(`Predictions generated: ${generated.length}`);
  if (!dryRun) console.log(`Predictions stored: ${inserted}`);
  console.log(`Avg confidence: ${(generated.reduce((s, p) => s + p.confidence, 0) / generated.length).toFixed(1)}%`);

  const sorted = [...generated].sort((a, b) => b.confidence - a.confidence);
  console.log(`\nConfidence distribution:`);
  console.log(`  High (70-90%): ${sorted.filter((p) => p.confidence >= 70).length} predictions`);
  console.log(`  Medium (40-69%): ${sorted.filter((p) => p.confidence >= 40 && p.confidence < 70).length} predictions`);
  console.log(`  Low (20-39%): ${sorted.filter((p) => p.confidence < 40).length} predictions`);
}

main().catch((err) => {
  console.error('House view generation failed:', err);
  process.exit(1);
});
