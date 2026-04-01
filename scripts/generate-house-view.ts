/**
 * generate-house-view.ts — Generate Howard's house predictions.
 *
 * Synthesizes all source predictions, outlooks, market data, and sentiment
 * into specific, falsifiable, time-bound predictions with confidence ratings.
 *
 * The system biases towards predictions where Howard has higher confidence,
 * weighting source credibility, prediction consensus, and data quality.
 *
 * Usage:
 *   npx tsx scripts/generate-house-view.ts              # generate new house predictions
 *   npx tsx scripts/generate-house-view.ts --refresh     # supersede stale predictions
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
const refresh = process.argv.includes('--refresh');

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
    'Gold': 'GC=F', 'GLD': 'GLD',
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
  console.log(`Mode: ${dryRun ? 'DRY RUN' : refresh ? 'REFRESH' : 'Normal'}\n`);

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

  // Weight predictions by source credibility
  const weightedPredictions = predictions
    .map((p) => {
      const source = p.sources as { name: string; weighted_score: number; scores: Record<string, number> } | null;
      const weight = source?.weighted_score || 3;
      const perfScore = source?.scores?.performance || 3;
      return {
        claim: p.claim,
        sentiment: p.sentiment,
        confidence: p.confidence,
        specificity: p.specificity,
        time_horizon: p.time_horizon,
        assets: (p.assets_mentioned || []).join(', '),
        themes: (p.themes || []).join(', '),
        source_name: source?.name || 'Unknown',
        source_weight: weight,
        source_performance: perfScore,
        date_made: p.date_made || p.created_at,
      };
    })
    .sort((a, b) => b.source_weight - a.source_weight);

  const predictionsSummary = weightedPredictions.slice(0, 50).map((p) =>
    `[${p.source_name} (credibility: ${p.source_weight}/5, performance: ${p.source_performance}/5)] ${p.claim}
    Sentiment: ${p.sentiment} | Confidence: ${p.confidence} | Specificity: ${p.specificity} | Horizon: ${p.time_horizon} | Assets: ${p.assets || 'none'}`
  ).join('\n');

  const existingClaims = existingHouse.map((h) => `- ${h.claim} (${h.asset}, confidence: ${h.confidence}%, deadline: ${h.deadline})`).join('\n');

  // 3. Ask Claude to synthesize
  console.log('Synthesizing house view with Claude...\n');

  const prompt = `You are Howard, an AI financial intelligence system that synthesizes predictions from multiple expert sources into a coherent house view. Your job is to generate SPECIFIC, FALSIFIABLE, TIME-BOUND predictions with calibrated confidence ratings.

## YOUR INTELLIGENCE

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
${technicalsBlock || 'No technicals data available.'}

### Existing Active House Predictions (do not duplicate)
${existingClaims || 'None yet.'}

## INSTRUCTIONS

Generate 5-8 house predictions. Each must be:

1. **Asset-specific**: tied to a tradeable asset (ticker or commodity)
2. **Falsifiable**: has a clear target condition that can be measured
3. **Time-bound**: has a specific deadline (30 days to 12 months)
4. **Confidence-calibrated**:
   - Only assign high confidence (70-90%) when multiple high-credibility sources agree AND the data strongly supports it
   - Use medium confidence (40-69%) for directional calls with some uncertainty
   - Use low confidence (20-39%) for contrarian or speculative calls
   - NEVER go above 90% — markets are inherently uncertain
   - Your confidence should reflect the ACTUAL probability you believe this will happen

5. **Source-weighted**: Give more weight to predictions from sources with higher credibility scores and better track records (performance scores). A prediction backed by Howard Marks (4.39/5) should carry more weight than one from a lower-rated source.

6. **Bias towards conviction**: Prefer generating fewer, higher-confidence predictions over many low-confidence ones. Howard's value comes from having strong, well-reasoned calls — not from hedging everything.

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

  console.log(`Generated ${generated.length} house predictions:\n`);

  // 4. Fetch reference prices and store
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

      // Check if this supersedes an existing prediction on the same asset
      const existing = existingHouse.find(
        (h) => h.asset === pred.asset && h.category === pred.category
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
        supersedes: existing?.id || null,
        version: existing ? (existing.version || 1) + 1 : 1,
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
        // Mark the old one as superseded
        if (existing && inserted_row) {
          await supabase
            .from('house_predictions')
            .update({ superseded_by: inserted_row.id, outcome: 'expired' })
            .eq('id', existing.id);
        }
      }
    }
  }

  console.log(`\n=== House View Generation Complete ===`);
  console.log(`Predictions generated: ${generated.length}`);
  if (!dryRun) console.log(`Predictions stored: ${inserted}`);
  console.log(`Avg confidence: ${(generated.reduce((s, p) => s + p.confidence, 0) / generated.length).toFixed(1)}%`);

  // Sort by confidence to show bias towards high-confidence
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
