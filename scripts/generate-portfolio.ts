/**
 * generate-portfolio.ts — Generate Howard's model portfolio.
 *
 * Synthesizes house predictions, outlooks, institutional holdings,
 * and positioning data into specific ticker allocations with theses.
 *
 * Usage:
 *   npx tsx scripts/generate-portfolio.ts              # generate (skip if < 7 days old)
 *   npx tsx scripts/generate-portfolio.ts --rebalance  # force rebalance
 *   npx tsx scripts/generate-portfolio.ts --dry-run    # preview without writing
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
const forceRebalance = process.argv.includes('--rebalance');

interface GeneratedPosition {
  ticker: string;
  asset_name: string;
  direction: 'long' | 'short';
  allocation_pct: number;
  thesis: string;
  conviction: 'high' | 'medium' | 'low';
  confidence: number;
  category: string;
  time_horizon: string;
  supporting_sources: string[];
  key_drivers: string[];
  stop_loss_condition: string;
}

interface GeneratedPortfolio {
  thesis_summary: string;
  risk_posture: 'aggressive' | 'moderate' | 'defensive';
  cash_pct: number;
  positions: GeneratedPosition[];
}

/** Fetch current price for an asset via Yahoo Finance. */
async function fetchPrice(ticker: string): Promise<number | null> {
  const tickerMap: Record<string, string> = {
    'S&P 500': '^GSPC', SPY: 'SPY', SPX: '^GSPC',
    NASDAQ: '^IXIC', QQQ: 'QQQ',
    Gold: 'GC=F', GLD: 'GLD', GC: 'GC=F',
    Bitcoin: 'BTC-USD', BTC: 'BTC-USD', 'BTC-USD': 'BTC-USD',
    Silver: 'SI=F', SI: 'SI=F', Oil: 'CL=F', CL: 'CL=F', Crude: 'CL=F',
    TLT: 'TLT', 'US10Y': '^TNX', DXY: 'DX-Y.NYB',
    Copper: 'HG=F', HG: 'HG=F', Uranium: 'URA',
    'Natural Gas': 'NG=F', NG: 'NG=F',
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
  console.log('=== Howard Model Portfolio Generator ===\n');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : forceRebalance ? 'FORCE REBALANCE' : 'Normal'}\n`);

  // Check if we need to rebalance
  if (!forceRebalance && !dryRun) {
    const { data: current } = await supabase
      .from('portfolio_snapshots')
      .select('generated_at')
      .eq('is_current', true)
      .single();

    if (current) {
      const daysSince = (Date.now() - new Date(current.generated_at).getTime()) / 86400000;
      if (daysSince < 7) {
        console.log(`Last rebalance was ${daysSince.toFixed(1)} days ago. Skipping (use --rebalance to force).`);
        return;
      }
      console.log(`Last rebalance was ${daysSince.toFixed(1)} days ago. Generating new portfolio.\n`);
    }
  }

  // 1. Gather all intelligence
  console.log('Gathering intelligence...\n');

  const [outlookRes, housePredRes, srcPredRes, sourcesRes, holdingsRes, cotRes] = await Promise.all([
    supabase.from('outlook').select('*'),
    supabase.from('house_predictions').select('*').eq('outcome', 'pending').order('confidence', { ascending: false }).limit(20),
    supabase.from('predictions').select('*, sources(name, weighted_score, scores)').order('created_at', { ascending: false }).limit(100),
    supabase.from('sources').select('id, name, weighted_score, scores, domains'),
    supabase.from('holdings').select('ticker, company_name, value, change_type, fund_id, funds(name)').order('value', { ascending: false }).limit(50),
    supabase.from('cot_snapshots').select('*').order('report_date', { ascending: false }).limit(11),
  ]);

  const outlooks = outlookRes.data || [];
  const housePredictions = housePredRes.data || [];
  const sourcePredictions = srcPredRes.data || [];
  const sources = sourcesRes.data || [];
  const holdings = holdingsRes.data || [];
  const cotData = cotRes.data || [];

  console.log(`  Outlooks: ${outlooks.length}`);
  console.log(`  House predictions: ${housePredictions.length}`);
  console.log(`  Source predictions: ${sourcePredictions.length}`);
  console.log(`  Sources: ${sources.length}`);
  console.log(`  Top holdings: ${holdings.length}`);
  console.log(`  COT contracts: ${cotData.length}\n`);

  // Fetch live market sentiment
  console.log('Fetching market sentiment data...');
  const [creditRecords, optionsSentiment] = await Promise.all([
    fetchCreditSpreads(supabase),
    fetchOptionsSentiment(supabase),
  ]);
  console.log('');

  // 2. Build context blocks

  const outlookBlock = outlooks.map((o) =>
    `[${o.time_horizon.toUpperCase()}] "${o.title}" — ${o.sentiment} (confidence: ${o.confidence}/100)
  Thesis: ${o.thesis_intro}
  Positioning: ${(o.positioning || []).join('; ')}`
  ).join('\n\n');

  const houseBlock = housePredictions.map((h) =>
    `[${h.confidence}% ${h.conviction}] ${h.claim} — ${h.asset} (${h.direction})
  Target: ${h.target_condition} | Deadline: ${h.deadline}
  Sources: ${(h.supporting_sources || []).join(', ')}`
  ).join('\n');

  const weightedPreds = sourcePredictions
    .map((p) => {
      const src = p.sources as { name: string; weighted_score: number } | null;
      return { ...p, source_name: src?.name || 'Unknown', weight: src?.weighted_score || 3 };
    })
    .sort((a, b) => b.weight - a.weight);

  const predBlock = weightedPreds.slice(0, 50).map((p) =>
    `[${p.source_name} (${p.weight}/5)] ${p.claim}
  Sentiment: ${p.sentiment} | Assets: ${(p.assets_mentioned || []).join(', ')} | Horizon: ${p.time_horizon}`
  ).join('\n');

  // Holdings consensus — find tickers held by multiple funds
  const tickerFunds = new Map<string, { names: string[]; totalValue: number; changes: string[] }>();
  for (const h of holdings) {
    if (!h.ticker) continue;
    const entry = tickerFunds.get(h.ticker) || { names: [], totalValue: 0, changes: [] };
    const fundName = (h.funds as { name: string } | null)?.name || 'Unknown';
    if (!entry.names.includes(fundName)) entry.names.push(fundName);
    entry.totalValue += h.value || 0;
    if (h.change_type && h.change_type !== 'unchanged') entry.changes.push(`${fundName}: ${h.change_type}`);
    tickerFunds.set(h.ticker, entry);
  }
  const holdingsBlock = Array.from(tickerFunds.entries())
    .filter(([, v]) => v.names.length >= 1)
    .sort((a, b) => b[1].totalValue - a[1].totalValue)
    .slice(0, 20)
    .map(([ticker, v]) =>
      `${ticker}: Held by ${v.names.join(', ')} ($${(v.totalValue / 1e6).toFixed(1)}M)${v.changes.length ? ` | Changes: ${v.changes.join(', ')}` : ''}`
    ).join('\n');

  // COT summary
  const cotBlock = cotData.map((c) => {
    const crowded = Math.abs(c.spec_net_pct) > 20 ? ' ⚠ CROWDED' : '';
    return `${c.commodity} (${c.ticker}): Spec net ${c.spec_net_pct > 0 ? '+' : ''}${c.spec_net_pct.toFixed(1)}% of OI${crowded}`;
  }).join('\n');

  // Get current portfolio if rebalancing
  let currentPortfolioBlock = '';
  if (forceRebalance) {
    const { data: currentSnap } = await supabase
      .from('portfolio_snapshots')
      .select('*, portfolio_positions(*)')
      .eq('is_current', true)
      .single();

    if (currentSnap) {
      const positions = (currentSnap as { portfolio_positions: Array<{ ticker: string; direction: string; allocation_pct: number; entry_price: number; current_price: number; thesis: string }> }).portfolio_positions || [];
      currentPortfolioBlock = `\n### Current Portfolio (rebalancing from)
${positions.map((p) => {
  const pnl = p.entry_price && p.current_price
    ? ((p.current_price - p.entry_price) / p.entry_price * (p.direction === 'long' ? 1 : -1) * 100).toFixed(1)
    : 'N/A';
  return `${p.direction.toUpperCase()} ${p.ticker} (${p.allocation_pct}%) — Entry: $${p.entry_price?.toFixed(2) || 'N/A'}, Current: $${p.current_price?.toFixed(2) || 'N/A'}, P&L: ${pnl}%
  Thesis: ${p.thesis}`;
}).join('\n')}

Evaluate each position: hold, increase, decrease, or exit. Then add any new positions warranted by current intelligence.`;
    }
  }

  // 3. Ask Claude to synthesize
  console.log('Generating portfolio with Claude...\n');

  const prompt = `You are Howard, an AI portfolio manager. You translate your financial intelligence network into a concentrated model portfolio with $10,000,000 starting capital.

## YOUR INTELLIGENCE

### Current Outlooks
${outlookBlock || 'No outlooks available yet.'}

### House Predictions (your own high-conviction calls)
${houseBlock || 'No house predictions yet.'}

### Source Predictions (weighted by credibility)
${predBlock || 'No source predictions yet.'}

### Institutional Holdings (13F smart money)
${holdingsBlock || 'No holdings data yet.'}

### CFTC COT Positioning
${cotBlock || 'No COT data yet.'}

### Credit Markets
${formatCreditBlock(creditRecords)}

### Options Market Sentiment
${formatOptionsBlock(optionsSentiment)}
${currentPortfolioBlock}

## INSTRUCTIONS

Generate a concentrated model portfolio with 8-12 positions. Rules:

1. **Allocations must sum to ≤95%** — maintain at least 5% cash reserve (more in uncertain markets)
2. **Each position: 5-20% allocation** — no position over 20%, no micro-positions under 5%
3. **Include both long AND short positions** if your intelligence warrants it
4. **Weight toward consensus** — positions where multiple high-credibility sources agree AND data confirms should get larger allocations
5. **Confidence drives sizing** — higher confidence = larger allocation
6. **Be specific** — use real tickers (ETFs like SPY, QQQ, GLD, TLT are fine for macro bets)
7. **Each position needs a thesis** — 2-3 sentences explaining WHY, referencing specific sources and data
8. **Include stop-loss conditions** — what would make you exit each position
9. **Time horizons should skew longer-term** — most positions should be 6-12 months. Short-term (30-90 day) positions are acceptable for unique, high-conviction tactical opportunities but should be the exception, not the norm.
10. **Categories**: macro, sector, single-stock, rates, commodities, crypto
11. **Risk posture**: assess overall portfolio risk as aggressive/moderate/defensive based on current conditions

Respond in valid JSON:
{
  "thesis_summary": "2-3 sentence overall portfolio thesis explaining your market view and positioning",
  "risk_posture": "aggressive|moderate|defensive",
  "cash_pct": 10,
  "positions": [
    {
      "ticker": "SPY",
      "asset_name": "S&P 500 ETF",
      "direction": "short",
      "allocation_pct": 15,
      "thesis": "Multiple high-credibility sources calling for correction. Credit spreads widening, VIX in backwardation signals near-term fear.",
      "conviction": "high",
      "confidence": 75,
      "category": "macro",
      "time_horizon": "3 months",
      "supporting_sources": ["Howard Marks", "Michael Howell"],
      "key_drivers": ["Credit spread widening", "VIX backwardation", "Liquidity withdrawal"],
      "stop_loss_condition": "SPY breaks above all-time highs with improving breadth"
    }
  ]
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('Failed to parse Claude response as JSON.');
    console.error('Raw response:', text.substring(0, 500));
    process.exit(1);
  }

  let portfolio: GeneratedPortfolio;
  try {
    portfolio = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Invalid JSON in response:', e);
    process.exit(1);
  }

  // Validate allocations
  const totalAlloc = portfolio.positions.reduce((s, p) => s + p.allocation_pct, 0) + portfolio.cash_pct;
  if (totalAlloc > 105) {
    console.error(`Allocations exceed 100%: ${totalAlloc.toFixed(1)}%`);
    process.exit(1);
  }

  console.log(`Portfolio: ${portfolio.risk_posture.toUpperCase()} | ${portfolio.positions.length} positions | ${portfolio.cash_pct}% cash`);
  console.log(`Thesis: ${portfolio.thesis_summary}\n`);

  // 4. Fetch entry prices
  console.log('Fetching entry prices...\n');

  const positionsWithPrices = [];
  for (const pos of portfolio.positions) {
    const price = await fetchPrice(pos.ticker);
    console.log(`  ${pos.direction.toUpperCase()} ${pos.ticker} (${pos.allocation_pct}%) — $${price?.toFixed(2) || 'N/A'} — ${pos.thesis.substring(0, 60)}...`);
    positionsWithPrices.push({ ...pos, entry_price: price });
  }

  if (dryRun) {
    console.log('\n=== DRY RUN — no data written ===');
    return;
  }

  // 5. Mark previous snapshot as not current
  await supabase
    .from('portfolio_snapshots')
    .update({ is_current: false })
    .eq('is_current', true);

  // Get previous snapshot ID for supersedes
  const { data: prevSnap } = await supabase
    .from('portfolio_snapshots')
    .select('id')
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  // 6. Insert new snapshot
  const { data: snapshot, error: snapErr } = await supabase
    .from('portfolio_snapshots')
    .insert({
      starting_capital: 10000000,
      cash_allocation: portfolio.cash_pct,
      total_positions: portfolio.positions.length,
      thesis_summary: portfolio.thesis_summary,
      risk_posture: portfolio.risk_posture,
      rebalance_reasoning: forceRebalance ? 'Manual rebalance' : 'Scheduled weekly rebalance',
      supersedes: prevSnap?.id || null,
      is_current: true,
    })
    .select('id')
    .single();

  if (snapErr) {
    console.error(`\nFailed to create snapshot: ${snapErr.message}`);
    process.exit(1);
  }

  console.log(`\nSnapshot created: ${snapshot.id}`);

  // 7. Insert positions
  let inserted = 0;
  for (const pos of positionsWithPrices) {
    const { error } = await supabase.from('portfolio_positions').insert({
      snapshot_id: snapshot.id,
      ticker: pos.ticker,
      asset_name: pos.asset_name,
      direction: pos.direction,
      allocation_pct: pos.allocation_pct,
      entry_price: pos.entry_price,
      current_price: pos.entry_price,
      thesis: pos.thesis,
      conviction: pos.conviction,
      confidence: pos.confidence,
      category: pos.category,
      time_horizon: pos.time_horizon,
      house_prediction_ids: [],
      source_prediction_ids: [],
      supporting_sources: pos.supporting_sources,
      key_drivers: pos.key_drivers,
      stop_loss_condition: pos.stop_loss_condition,
    });

    if (error) {
      console.error(`  Failed to insert ${pos.ticker}: ${error.message}`);
    } else {
      inserted++;
    }
  }

  // 8. Insert initial performance row
  const { error: perfErr } = await supabase.from('portfolio_performance').insert({
    snapshot_id: snapshot.id,
    date: new Date().toISOString().split('T')[0],
    nav: 10000000,
    daily_return_pct: 0,
    cumulative_return_pct: 0,
    spy_cumulative_pct: 0,
    positions_data: positionsWithPrices.map((p) => ({
      ticker: p.ticker,
      price: p.entry_price || 0,
      return_pct: 0,
    })),
  });

  if (perfErr) console.error(`  Performance insert error: ${perfErr.message}`);

  console.log(`\n=== Portfolio Generation Complete ===`);
  console.log(`Positions: ${inserted}/${portfolio.positions.length}`);
  console.log(`Cash: ${portfolio.cash_pct}%`);
  console.log(`Risk: ${portfolio.risk_posture}`);
}

main().catch((err) => {
  console.error('Portfolio generation failed:', err);
  process.exit(1);
});
