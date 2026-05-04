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
  target_price: number | null;
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

  // Check if we need to rebalance — only on house view changes or stop/target hits
  if (!forceRebalance && !dryRun) {
    const { data: current } = await supabase
      .from('portfolio_snapshots')
      .select('id, generated_at')
      .eq('is_current', true)
      .single();

    if (current) {
      // High bar to rebalance — flip-flopping the book on every new daily prediction is bad.
      // Required: EITHER (a) a stop/target hit (risk event, always trigger) OR
      // (b) ≥7 days since last rebalance AND a prediction was *resolved* (a known view actually changed).
      // New pending predictions alone do NOT trigger — they roll into the next scheduled rebalance.
      const MIN_DWELL_DAYS = 7;
      const daysSinceRebalance = (Date.now() - new Date(current.generated_at).getTime()) / (1000 * 60 * 60 * 24);

      const { data: resolvedHousePreds } = await supabase
        .from('house_predictions')
        .select('id')
        .gt('evaluated_at', current.generated_at)
        .neq('outcome', 'pending')
        .limit(1);

      const houseViewChanged = !!(resolvedHousePreds && resolvedHousePreds.length > 0);

      // Check 2: Any positions hit stop-loss or targets?
      const { data: positions } = await supabase
        .from('portfolio_positions')
        .select('ticker, direction, entry_price, current_price, target_price, stop_loss_condition')
        .eq('snapshot_id', current.id);

      let stopOrTargetHit = false;
      if (positions) {
        for (const pos of positions) {
          if (!pos.entry_price || !pos.current_price) continue;
          const rawReturn = (pos.current_price - pos.entry_price) / pos.entry_price;
          const dirReturn = pos.direction === 'long' ? rawReturn : -rawReturn;

          // Target hit: position returned 80%+ of target move
          if (pos.target_price && pos.entry_price) {
            const targetReturn = Math.abs((pos.target_price - pos.entry_price) / pos.entry_price);
            if (dirReturn >= targetReturn * 0.8) {
              console.log(`  ⚡ Target approaching: ${pos.ticker} (${(dirReturn * 100).toFixed(1)}% vs ${(targetReturn * 100).toFixed(1)}% target)`);
              stopOrTargetHit = true;
            }
          }

          // Stop-loss: position lost more than 10%
          if (dirReturn < -0.10) {
            console.log(`  ⚡ Stop-loss triggered: ${pos.ticker} (${(dirReturn * 100).toFixed(1)}%)`);
            stopOrTargetHit = true;
          }
        }
      }

      const meetsHighBar = stopOrTargetHit || (daysSinceRebalance >= MIN_DWELL_DAYS && houseViewChanged);

      if (!meetsHighBar) {
        console.log('No rebalance needed:');
        console.log(`  - Days since last rebalance: ${daysSinceRebalance.toFixed(1)} (min ${MIN_DWELL_DAYS})`);
        console.log(`  - Resolved predictions: ${houseViewChanged ? 'yes' : 'no'}`);
        console.log(`  - Stops/targets hit: ${stopOrTargetHit ? 'yes' : 'no'}`);
        console.log('  (use --rebalance to force)');
        return;
      }

      const reasons: string[] = [];
      if (stopOrTargetHit) reasons.push('stop/target hit');
      if (houseViewChanged && daysSinceRebalance >= MIN_DWELL_DAYS) reasons.push(`view resolved (${daysSinceRebalance.toFixed(1)}d since last)`);
      console.log(`Rebalance triggered: ${reasons.join(' + ')}\n`);
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

  // 3. Mechanically translate house predictions into portfolio positions
  // The house view is the PM. The portfolio is the execution. No discretion.
  console.log('Translating house view into portfolio...\n');

  // Filter to tradeable predictions:
  //   1. Confidence > 50% (below that, conviction is too low to commit capital)
  //   2. Asset is set
  //   3. Not gated on a future trigger (activation_status='active'). Conditional /
  //      forward-deployment predictions ('accumulate during Q3 weakness for the
  //      pre-election rally') belong in a deployment plan, not the live book.
  const tradeablePreds = housePredictions.filter((h) =>
    h.confidence > 50 &&
    h.asset &&
    (h.activation_status ?? 'active') === 'active'
  );

  if (tradeablePreds.length === 0) {
    console.log('No tradeable house predictions (>= 40% confidence). Skipping portfolio generation.');
    return;
  }

  // Dedup by ticker — keep the highest-confidence prediction per asset.
  // A live book cannot simultaneously hold long + short the same ticker (that's the absence of a position).
  // When the house view emits opposing predictions on one asset (typically a sequenced trade like
  // "short now, flip long after the drawdown"), the lower-confidence leg belongs in a deployment plan,
  // not the live portfolio. Same-direction duplicates also collapse — we don't stack the same exposure.
  const byTicker = new Map<string, typeof tradeablePreds[number]>();
  for (const h of tradeablePreds) {
    const existing = byTicker.get(h.asset);
    if (!existing || h.confidence > existing.confidence) byTicker.set(h.asset, h);
  }
  const dedupedPreds = Array.from(byTicker.values());
  const droppedCount = tradeablePreds.length - dedupedPreds.length;
  if (droppedCount > 0) console.log(`  Deduped ${droppedCount} same-ticker prediction(s) — kept highest-confidence per asset`);

  // Size positions proportional to confidence, normalize to sum to ~90% (10% cash)
  const totalConfidence = dedupedPreds.reduce((s, h) => s + h.confidence, 0);
  const targetInvested = 90; // 90% invested, 10% cash

  const mechanicalPositions = dedupedPreds.map((h) => {
    const rawAlloc = (h.confidence / totalConfidence) * targetInvested;
    // Clamp to 5-20% range
    const allocation = Math.max(5, Math.min(20, Math.round(rawAlloc * 10) / 10));
    return {
      ticker: h.asset,
      asset_name: h.asset,
      direction: h.direction as 'long' | 'short',
      allocation_pct: allocation,
      thesis: h.thesis || h.claim,
      conviction: h.conviction as 'high' | 'medium' | 'low',
      confidence: h.confidence,
      category: h.category || 'macro',
      time_horizon: h.time_horizon || '6 months',
      target_price: h.target_value,
      supporting_sources: h.supporting_sources || [],
      key_drivers: h.key_drivers || [],
      stop_loss_condition: h.invalidation_criteria || '',
      house_prediction_ids: [h.id],
    };
  });

  // Normalize allocations to sum to targetInvested
  const totalAlloc = mechanicalPositions.reduce((s, p) => s + p.allocation_pct, 0);
  if (totalAlloc > 0) {
    const scale = targetInvested / totalAlloc;
    for (const p of mechanicalPositions) {
      p.allocation_pct = Math.round(p.allocation_pct * scale * 10) / 10;
    }
  }

  // Now ask Claude only for the thesis summary and risk posture — NOT position selection
  const positionsSummary = mechanicalPositions.map((p) =>
    `${p.direction.toUpperCase()} ${p.ticker} ${p.allocation_pct}% (${p.confidence}% confidence) — ${p.thesis.slice(0, 80)}`
  ).join('\n');

  const prompt = `You are Howard, an AI portfolio manager. The house view has generated the following positions mechanically from house predictions. Your job is NOT to change the positions — only to provide:

1. A 2-3 sentence thesis summary explaining the overall portfolio positioning
2. A risk posture assessment (aggressive/moderate/defensive)

## POSITIONS (already decided — do not modify)
${positionsSummary}

## MARKET CONTEXT
### Credit Markets
${formatCreditBlock(creditRecords)}

### Options Market Sentiment
${formatOptionsBlock(optionsSentiment)}

Respond in valid JSON:
{
  "thesis_summary": "2-3 sentence overall thesis",
  "risk_posture": "aggressive|moderate|defensive"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  let thesisSummary = 'Portfolio mechanically derived from house view predictions.';
  let riskPosture = 'defensive';
  if (jsonMatch) {
    try {
      const meta = JSON.parse(jsonMatch[0]);
      thesisSummary = meta.thesis_summary || thesisSummary;
      riskPosture = meta.risk_posture || riskPosture;
    } catch { /* use defaults */ }
  }

  const cashPct = Math.round(100 - mechanicalPositions.reduce((s, p) => s + p.allocation_pct, 0));

  const portfolio: GeneratedPortfolio = {
    thesis_summary: thesisSummary,
    risk_posture: riskPosture,
    cash_pct: cashPct,
    positions: mechanicalPositions,
  };

  // Validate and normalize allocations if needed
  const positionTotal = portfolio.positions.reduce((s, p) => s + p.allocation_pct, 0);
  const totalAllocCheck = positionTotal + portfolio.cash_pct;
  if (totalAllocCheck > 100) {
    console.log(`Allocations total ${totalAllocCheck.toFixed(1)}% — normalizing to 100%`);
    const scale = (100 - portfolio.cash_pct) / positionTotal;
    for (const pos of portfolio.positions) {
      pos.allocation_pct = Math.round(pos.allocation_pct * scale * 10) / 10;
    }
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

  // 5. Calculate carry-forward NAV from previous portfolio
  const { data: prevSnap } = await supabase
    .from('portfolio_snapshots')
    .select('id, starting_capital')
    .eq('is_current', true)
    .single();

  let carryForwardNav = 10000000; // Default for first portfolio
  const realizedPnl: Array<{ ticker: string; direction: string; entry: number; exit: number; pnl_pct: number; pnl_usd: number; allocation: number }> = [];

  if (prevSnap) {
    // Get latest performance record for current NAV
    const { data: lastPerf } = await supabase
      .from('portfolio_performance')
      .select('nav')
      .eq('snapshot_id', prevSnap.id)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (lastPerf?.nav) {
      carryForwardNav = lastPerf.nav;
    }

    // Calculate realized PnL on positions being closed
    const { data: oldPositions } = await supabase
      .from('portfolio_positions')
      .select('ticker, direction, allocation_pct, entry_price, current_price')
      .eq('snapshot_id', prevSnap.id);

    const newTickers = new Set(portfolio.positions.map((p: GeneratedPosition) => `${p.ticker}:${p.direction}`));

    for (const old of oldPositions || []) {
      const key = `${old.ticker}:${old.direction}`;
      if (!newTickers.has(key) && old.entry_price && old.current_price) {
        const rawReturn = (old.current_price - old.entry_price) / old.entry_price;
        const dirReturn = old.direction === 'long' ? rawReturn : -rawReturn;
        const positionValue = carryForwardNav * (old.allocation_pct / 100);
        realizedPnl.push({
          ticker: old.ticker,
          direction: old.direction,
          entry: old.entry_price,
          exit: old.current_price,
          pnl_pct: dirReturn * 100,
          pnl_usd: positionValue * dirReturn,
          allocation: old.allocation_pct,
        });
      }
    }

    if (realizedPnl.length > 0) {
      console.log('\n  Realized PnL on closed positions:');
      for (const r of realizedPnl) {
        console.log(`    ${r.direction.toUpperCase()} ${r.ticker}: $${r.entry.toFixed(2)} → $${r.exit.toFixed(2)} = ${r.pnl_pct >= 0 ? '+' : ''}${r.pnl_pct.toFixed(2)}% ($${r.pnl_usd >= 0 ? '+' : ''}${r.pnl_usd.toFixed(0)})`);
      }
      const totalRealizedUsd = realizedPnl.reduce((s, r) => s + r.pnl_usd, 0);
      console.log(`    Total realized: $${totalRealizedUsd >= 0 ? '+' : ''}${totalRealizedUsd.toFixed(0)}`);
    }

    console.log(`\n  Carry-forward NAV: $${carryForwardNav.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
  }

  // Mark previous snapshot as not current
  await supabase
    .from('portfolio_snapshots')
    .update({ is_current: false })
    .eq('is_current', true);

  // 6. Insert new snapshot with carry-forward NAV
  const { data: snapshot, error: snapErr } = await supabase
    .from('portfolio_snapshots')
    .insert({
      starting_capital: carryForwardNav,
      cash_allocation: portfolio.cash_pct,
      total_positions: portfolio.positions.length,
      thesis_summary: portfolio.thesis_summary,
      risk_posture: portfolio.risk_posture,
      rebalance_reasoning: forceRebalance ? 'Manual rebalance' : 'House view changed or stop/target hit',
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
      target_price: pos.target_price ?? null,
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
