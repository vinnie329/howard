/**
 * track-portfolio-performance.ts — Daily NAV tracking for the model portfolio.
 *
 * Fetches current prices for all positions, calculates returns,
 * and stores a daily performance snapshot. No Claude calls needed.
 *
 * Usage:
 *   npx tsx scripts/track-portfolio-performance.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Inline price fetcher (mirrors src/lib/prices.ts but avoids path-alias issues in scripts)
async function fetchPrice(ticker: string): Promise<number | null> {
  const tickerMap: Record<string, string> = {
    'S&P 500': '^GSPC', SPY: 'SPY', SPX: '^GSPC',
    NASDAQ: '^IXIC', QQQ: 'QQQ',
    Gold: 'GC=F', GLD: 'GLD', GC: 'GC=F',
    Bitcoin: 'BTC-USD', BTC: 'BTC-USD', 'BTC-USD': 'BTC-USD',
    Silver: 'SI=F', SI: 'SI=F', Oil: 'CL=F', CL: 'CL=F',
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
  console.log('=== Portfolio Performance Tracker ===\n');

  // Get current snapshot
  const { data: snapshot, error: snapErr } = await supabase
    .from('portfolio_snapshots')
    .select('id, starting_capital, cash_allocation')
    .eq('is_current', true)
    .single();

  if (snapErr || !snapshot) {
    console.log('No active portfolio snapshot. Run generate-portfolio.ts first.');
    return;
  }

  // Get positions
  const { data: positions } = await supabase
    .from('portfolio_positions')
    .select('*')
    .eq('snapshot_id', snapshot.id);

  if (!positions || positions.length === 0) {
    console.log('No positions in current portfolio.');
    return;
  }

  const today = new Date().toISOString().split('T')[0];

  // Check if we already tracked today
  const { data: existing } = await supabase
    .from('portfolio_performance')
    .select('id')
    .eq('snapshot_id', snapshot.id)
    .eq('date', today)
    .single();

  if (existing) {
    console.log(`Already tracked performance for ${today}. Updating...`);
  }

  // Fetch current prices for all positions + SPY benchmark
  console.log('Fetching prices...\n');

  const spyPrice = await fetchPrice('SPY');
  console.log(`  SPY: $${spyPrice?.toFixed(2) || 'N/A'}`);

  const positionsData: Array<{ ticker: string; price: number; return_pct: number }> = [];
  let weightedReturn = 0;

  for (const pos of positions) {
    const currentPrice = await fetchPrice(pos.ticker);
    const entryPrice = pos.entry_price;

    let returnPct = 0;
    if (currentPrice && entryPrice && entryPrice > 0) {
      const rawReturn = (currentPrice - entryPrice) / entryPrice;
      returnPct = pos.direction === 'long' ? rawReturn : -rawReturn;
      weightedReturn += returnPct * (pos.allocation_pct / 100);
    }

    console.log(`  ${pos.direction.toUpperCase()} ${pos.ticker}: $${entryPrice?.toFixed(2) || 'N/A'} → $${currentPrice?.toFixed(2) || 'N/A'} (${(returnPct * 100).toFixed(2)}%)`);

    positionsData.push({
      ticker: pos.ticker,
      price: currentPrice || 0,
      return_pct: returnPct * 100,
    });

    // Update current_price on the position
    if (currentPrice) {
      await supabase
        .from('portfolio_positions')
        .update({ current_price: currentPrice })
        .eq('id', pos.id);
    }
  }

  // Calculate NAV (starting_capital carries forward from previous portfolio)
  const nav = snapshot.starting_capital * (1 + weightedReturn);

  // Cumulative return is relative to the ORIGINAL $10M, not the carry-forward capital
  const ORIGINAL_CAPITAL = 10000000;
  const cumulativeReturn = ((nav - ORIGINAL_CAPITAL) / ORIGINAL_CAPITAL) * 100;

  // Get previous day's NAV for daily return
  const { data: prevPerf } = await supabase
    .from('portfolio_performance')
    .select('nav')
    .eq('snapshot_id', snapshot.id)
    .lt('date', today)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  const dailyReturn = prevPerf ? ((nav - prevPerf.nav) / prevPerf.nav) * 100 : 0;

  // Get SPY benchmark return (need SPY entry price from day 1)
  const { data: firstPerf } = await supabase
    .from('portfolio_performance')
    .select('positions_data')
    .eq('snapshot_id', snapshot.id)
    .order('date', { ascending: true })
    .limit(1)
    .single();

  let spyCumulative = 0;
  if (firstPerf && spyPrice) {
    const firstSpyEntry = (firstPerf.positions_data as Array<{ ticker: string; price: number }>)?.find(
      (p) => p.ticker === 'SPY'
    );
    // If SPY is in positions, use that; otherwise look for stored benchmark
    const spyEntry = firstSpyEntry?.price;
    if (spyEntry && spyEntry > 0) {
      spyCumulative = ((spyPrice - spyEntry) / spyEntry) * 100;
    }
  }

  console.log(`\n  NAV: $${nav.toFixed(2)} (${cumulativeReturn >= 0 ? '+' : ''}${cumulativeReturn.toFixed(2)}%)`);
  console.log(`  Daily: ${dailyReturn >= 0 ? '+' : ''}${dailyReturn.toFixed(2)}%`);
  if (spyCumulative !== 0) console.log(`  SPY: ${spyCumulative >= 0 ? '+' : ''}${spyCumulative.toFixed(2)}%`);

  // Upsert performance row
  const row = {
    snapshot_id: snapshot.id,
    date: today,
    nav,
    daily_return_pct: dailyReturn,
    cumulative_return_pct: cumulativeReturn,
    spy_cumulative_pct: spyCumulative,
    positions_data: positionsData,
  };

  if (existing) {
    const { error } = await supabase
      .from('portfolio_performance')
      .update(row)
      .eq('id', existing.id);
    if (error) console.error(`Update error: ${error.message}`);
    else console.log('\nPerformance updated.');
  } else {
    const { error } = await supabase
      .from('portfolio_performance')
      .insert(row);
    if (error) console.error(`Insert error: ${error.message}`);
    else console.log('\nPerformance recorded.');
  }

  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('Performance tracking failed:', err);
  process.exit(1);
});
