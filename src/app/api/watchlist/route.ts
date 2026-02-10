import { NextResponse } from 'next/server';

const SYMBOLS = [
  { ticker: 'BTC-USD', name: 'Bitcoin', tv: 'BITSTAMP:BTCUSD' },
  { ticker: 'ETH-USD', name: 'Ethereum', tv: 'BITSTAMP:ETHUSD' },
  { ticker: 'SOL-USD', name: 'Solana', tv: 'BITSTAMP:SOLUSD' },
  { ticker: 'NVDA', name: 'NVIDIA', tv: 'NASDAQ:NVDA' },
  { ticker: 'GOOG', name: 'Alphabet', tv: 'NASDAQ:GOOG' },
  { ticker: 'MSTR', name: 'MicroStrategy', tv: 'NASDAQ:MSTR' },
  { ticker: 'GC=F', name: 'Gold', tv: 'COMEX:GC1!' },
  { ticker: 'DX-Y.NYB', name: 'US Dollar Index', tv: 'TVC:DXY' },
  { ticker: '^TNX', name: 'US 10Y Yield', tv: 'TVC:US10Y' },
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
      .replace('^', '');

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
