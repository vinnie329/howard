import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SYMBOLS = [
  // Crypto
  { ticker: 'BTC-USD', name: 'Bitcoin', tv: 'BITSTAMP:BTCUSD' },
  { ticker: 'ETH-USD', name: 'Ethereum', tv: 'BITSTAMP:ETHUSD' },
  { ticker: 'ZEC-USD', name: 'Zcash', tv: 'BINANCE:ZECUSDT' },
  // Commodities
  { ticker: 'GC=F', name: 'Gold', tv: 'COMEX:GC1!' },
  { ticker: 'SI=F', name: 'Silver', tv: 'COMEX:SI1!' },
  { ticker: 'HG=F', name: 'Copper', tv: 'COMEX:HG1!' },
  // Indices
  { ticker: '^GSPC', name: 'S&P 500', tv: 'SP:SPX' },
  { ticker: '^IXIC', name: 'NASDAQ', tv: 'NASDAQ:IXIC' },
  // Core Semis
  { ticker: 'NVDA', name: 'NVIDIA', tv: 'NASDAQ:NVDA' },
  { ticker: 'MU', name: 'Micron', tv: 'NASDAQ:MU' },
  { ticker: 'MRVL', name: 'Marvell', tv: 'NASDAQ:MRVL' },
  { ticker: 'AVGO', name: 'Broadcom', tv: 'NASDAQ:AVGO' },
  { ticker: 'ANET', name: 'Arista', tv: 'NYSE:ANET' },
  { ticker: 'VST', name: 'Vistra', tv: 'NYSE:VST' },
  // Monitoring
  { ticker: 'ARM', name: 'ARM Holdings', tv: 'NASDAQ:ARM' },
  { ticker: 'PLTR', name: 'Palantir', tv: 'NYSE:PLTR' },
  // Hyperscalers
  { ticker: 'MSFT', name: 'Microsoft', tv: 'NASDAQ:MSFT' },
  { ticker: 'GOOGL', name: 'Google', tv: 'NASDAQ:GOOGL' },
  { ticker: 'AMZN', name: 'Amazon', tv: 'NASDAQ:AMZN' },
  { ticker: 'META', name: 'Meta', tv: 'NASDAQ:META' },
  // Other Tech
  { ticker: 'AMD', name: 'AMD', tv: 'NASDAQ:AMD' },
  { ticker: 'INTC', name: 'Intel', tv: 'NASDAQ:INTC' },
  { ticker: 'TSM', name: 'TSMC', tv: 'NYSE:TSM' },
  { ticker: 'CSCO', name: 'Cisco', tv: 'NASDAQ:CSCO' },
  { ticker: 'DELL', name: 'Dell', tv: 'NYSE:DELL' },
  { ticker: 'HPE', name: 'HPE', tv: 'NYSE:HPE' },
];

interface QuoteResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sparkline: number[];
  tvSymbol: string;
}

async function fetchQuote(ticker: string, name: string, tv: string): Promise<QuoteResult | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=5m`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const result = data.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

    // Extract close prices for sparkline
    const closes: number[] = result?.indicators?.quote?.[0]?.close ?? [];
    const sparkline = closes.filter((v: number | null) => v !== null) as number[];

    // Clean up symbol display
    const displaySymbol = ticker
      .replace('=F', '')
      .replace('-Y.NYB', '')
      .replace('^', '')
      .replace('-USD', '');

    return {
      symbol: displaySymbol,
      name,
      price,
      change,
      changePercent,
      sparkline,
      tvSymbol: tv,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const results = await Promise.all(
    SYMBOLS.map((s) => fetchQuote(s.ticker, s.name, s.tv))
  );

  const quotes = results.filter((r): r is QuoteResult => r !== null);

  return NextResponse.json(quotes, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
  });
}
