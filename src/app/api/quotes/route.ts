import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function fetchQuote(ticker: string): Promise<{ ticker: string; change: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=2d&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const closes: (number | null)[] =
      data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const valid = closes.filter((v): v is number => v !== null);
    if (valid.length < 2) return null;

    const prev = valid[valid.length - 2];
    const curr = valid[valid.length - 1];
    const change = ((curr - prev) / prev) * 100;
    return { ticker, change };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const tickers = req.nextUrl.searchParams.get('tickers');
  if (!tickers) return NextResponse.json({});

  const symbols = tickers.split(',').slice(0, 30);
  const results = await Promise.all(symbols.map(fetchQuote));

  const map: Record<string, number> = {};
  for (const r of results) {
    if (r) map[r.ticker] = r.change;
  }

  return NextResponse.json(map, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  });
}
