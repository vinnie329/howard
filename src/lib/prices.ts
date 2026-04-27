/**
 * Live price fetching via Yahoo Finance API.
 * Shared between API routes and scripts.
 */

const TICKER_MAP: Record<string, string> = {
  'S&P 500': '^GSPC', SPY: 'SPY', SPX: '^GSPC',
  NASDAQ: '^IXIC', QQQ: 'QQQ',
  Gold: 'GC=F', GLD: 'GLD', GC: 'GC=F',
  Bitcoin: 'BTC-USD', BTC: 'BTC-USD', 'BTC-USD': 'BTC-USD',
  Silver: 'SI=F', SI: 'SI=F', Oil: 'CL=F', CL: 'CL=F',
  TLT: 'TLT', 'US10Y': '^TNX', DXY: 'DX-Y.NYB',
  Copper: 'HG=F', HG: 'HG=F', Uranium: 'URA',
  'Natural Gas': 'NG=F', NG: 'NG=F',
  // Berkshire shares — Yahoo uses dash, not dot
  'BRK.B': 'BRK-B', 'BRK.A': 'BRK-A',
};

export async function fetchPrice(ticker: string): Promise<number | null> {
  const symbol = TICKER_MAP[ticker] || ticker;
  try {
    const end = Math.floor(Date.now() / 1000);
    const start = end - 5 * 24 * 60 * 60;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${end}&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Howard/1.0' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    if (!closes || closes.length === 0) return null;
    return closes.filter((c: number | null) => c !== null).pop() || null;
  } catch (err) {
    console.error(`[prices] Error fetching ${ticker} (${symbol}):`, err);
    return null;
  }
}

/** Fetch prices for multiple tickers in parallel. Returns a map of ticker → price. */
export async function fetchPrices(tickers: string[]): Promise<Record<string, number | null>> {
  const results = await Promise.all(
    tickers.map(async (ticker) => [ticker, await fetchPrice(ticker)] as const)
  );
  return Object.fromEntries(results);
}
