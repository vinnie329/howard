/**
 * Options market sentiment fetcher.
 *
 * Sources (all free from CBOE):
 *   - Put/Call ratio (equity + index)
 *   - VIX term structure (VIX, VIX3M, VIX9D)
 *   - SKEW index — measures tail-risk hedging by institutions
 *
 * These are aggregate sentiment indicators, not individual options flow.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface OptionsSentiment {
  date: string;
  // Put/call ratios
  equity_pc_ratio: number | null;
  index_pc_ratio: number | null;
  total_pc_ratio: number | null;
  // VIX term structure
  vix: number | null;
  vix9d: number | null;
  vix3m: number | null;
  vix_term_spread: number | null;    // VIX3M - VIX: positive = contango (normal), negative = backwardation (fear)
  // Skew
  skew: number | null;               // CBOE SKEW index: >130 = institutions hedging hard
}

/**
 * Fetch VIX family + SKEW from Yahoo Finance.
 * Tickers: ^VIX, ^VIX9D, ^VIX3M, ^SKEW
 */
async function fetchYahooQuote(ticker: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === 'number' ? price : null;
  } catch {
    return null;
  }
}

/**
 * Fetch put/call ratio from CBOE.
 * CBOE publishes daily P/C data at a public CSV endpoint.
 */
async function fetchPutCallRatios(): Promise<{
  equity: number | null;
  index: number | null;
  total: number | null;
}> {
  try {
    // CBOE daily volume data
    const url = 'https://www.cboe.com/us/options/market_statistics/daily/';
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { equity: null, index: null, total: null };

    const text = await res.text();

    // Try to extract P/C ratios from the page
    const equityMatch = text.match(/equity[^}]*?put[/_\s]?call[^}]*?ratio[^}]*?([\d.]+)/i);
    const indexMatch = text.match(/index[^}]*?put[/_\s]?call[^}]*?ratio[^}]*?([\d.]+)/i);
    const totalMatch = text.match(/total[^}]*?put[/_\s]?call[^}]*?ratio[^}]*?([\d.]+)/i);

    return {
      equity: equityMatch ? parseFloat(equityMatch[1]) : null,
      index: indexMatch ? parseFloat(indexMatch[1]) : null,
      total: totalMatch ? parseFloat(totalMatch[1]) : null,
    };
  } catch {
    return { equity: null, index: null, total: null };
  }
}

/**
 * Format options sentiment as a text block for the positioning prompt.
 */
export function formatOptionsBlock(sentiment: OptionsSentiment): string {
  const lines: string[] = [];

  // VIX term structure
  if (sentiment.vix !== null) {
    let vixLine = `VIX: ${sentiment.vix.toFixed(2)}`;
    if (sentiment.vix9d !== null) vixLine += ` | VIX9D: ${sentiment.vix9d.toFixed(2)}`;
    if (sentiment.vix3m !== null) vixLine += ` | VIX3M: ${sentiment.vix3m.toFixed(2)}`;

    if (sentiment.vix_term_spread !== null) {
      const structure = sentiment.vix_term_spread > 0 ? 'CONTANGO (normal)' : 'BACKWARDATION (fear)';
      vixLine += ` | Term spread: ${sentiment.vix_term_spread > 0 ? '+' : ''}${sentiment.vix_term_spread.toFixed(2)} → ${structure}`;
    }

    if (sentiment.vix > 30) vixLine += ' ⚠ ELEVATED FEAR';
    if (sentiment.vix > 40) vixLine += ' 🔴 EXTREME FEAR';
    lines.push(vixLine);
  }

  // SKEW
  if (sentiment.skew !== null) {
    let skewLine = `CBOE SKEW: ${sentiment.skew.toFixed(1)}`;
    if (sentiment.skew > 140) skewLine += ' ⚠ HEAVY TAIL HEDGING — institutions pricing crash risk';
    else if (sentiment.skew > 130) skewLine += ' — elevated tail hedging';
    else if (sentiment.skew < 110) skewLine += ' — low tail concern (complacency?)';
    lines.push(skewLine);
  }

  // Put/call ratios
  const pcParts: string[] = [];
  if (sentiment.total_pc_ratio !== null) pcParts.push(`Total: ${sentiment.total_pc_ratio.toFixed(2)}`);
  if (sentiment.equity_pc_ratio !== null) pcParts.push(`Equity: ${sentiment.equity_pc_ratio.toFixed(2)}`);
  if (sentiment.index_pc_ratio !== null) pcParts.push(`Index: ${sentiment.index_pc_ratio.toFixed(2)}`);
  if (pcParts.length > 0) {
    let pcLine = `Put/Call Ratios — ${pcParts.join(' | ')}`;
    const total = sentiment.total_pc_ratio;
    if (total !== null && total > 1.2) pcLine += ' ⚠ HEAVY PUT BUYING (bearish sentiment)';
    if (total !== null && total < 0.7) pcLine += ' ⚠ LOW PUT DEMAND (complacent)';
    lines.push(pcLine);
  }

  return lines.length > 0 ? lines.join('\n') : 'No options sentiment data available.';
}

/**
 * Fetch and store options sentiment data.
 */
export async function fetchOptionsSentiment(supabase: SupabaseClient): Promise<OptionsSentiment> {
  console.log('Options Sentiment: Fetching VIX, SKEW, P/C ratios...');

  // Fetch VIX family + SKEW in parallel
  const [vix, vix9d, vix3m, skew] = await Promise.all([
    fetchYahooQuote('^VIX'),
    fetchYahooQuote('^VIX9D'),
    fetchYahooQuote('^VIX3M'),
    fetchYahooQuote('^SKEW'),
  ]);

  console.log(`  VIX: ${vix ?? 'N/A'} | VIX9D: ${vix9d ?? 'N/A'} | VIX3M: ${vix3m ?? 'N/A'} | SKEW: ${skew ?? 'N/A'}`);

  // Fetch put/call ratios
  const pcRatios = await fetchPutCallRatios();
  console.log(`  P/C — Total: ${pcRatios.total ?? 'N/A'} | Equity: ${pcRatios.equity ?? 'N/A'} | Index: ${pcRatios.index ?? 'N/A'}`);

  const today = new Date().toISOString().slice(0, 10);
  const sentiment: OptionsSentiment = {
    date: today,
    equity_pc_ratio: pcRatios.equity,
    index_pc_ratio: pcRatios.index,
    total_pc_ratio: pcRatios.total,
    vix,
    vix9d,
    vix3m,
    vix_term_spread: vix !== null && vix3m !== null ? vix3m - vix : null,
    skew,
  };

  // Store snapshot
  const { error } = await supabase.from('options_sentiment_snapshots').upsert({
    ...sentiment,
    captured_at: new Date().toISOString(),
  }, { onConflict: 'date' });

  if (error) {
    console.error('  Upsert error:', error.message);
  } else {
    console.log(`  Stored options sentiment for ${today}`);
  }

  return sentiment;
}
