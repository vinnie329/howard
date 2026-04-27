import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { CORE_SYMBOLS, get13FTickers } from '@/lib/assets-universe';

export const dynamic = 'force-dynamic';

interface MaExtremesRow {
  ticker: string;
  max_dev_200d: number | null;
  min_dev_200d: number | null;
  max_dev_200w: number | null;
  min_dev_200w: number | null;
}

function computeSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((sum, p) => sum + p, 0) / period;
}

async function fetchChartData(
  ticker: string,
  range: string,
  interval: string
): Promise<number[]> {
  const r = await fetchChartSeries(ticker, range, interval);
  return r.closes;
}

async function fetchChartSeries(
  ticker: string,
  range: string,
  interval: string
): Promise<{ closes: number[]; timestamps: number[] }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) return { closes: [], timestamps: [] };
  const data = await res.json();
  const result = data.chart?.result?.[0];
  const rawCloses: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
  const rawTs: number[] = result?.timestamp ?? [];
  const closes: number[] = [];
  const timestamps: number[] = [];
  for (let i = 0; i < rawCloses.length; i++) {
    if (rawCloses[i] !== null && Number.isFinite(rawCloses[i] as number)) {
      closes.push(rawCloses[i] as number);
      timestamps.push(rawTs[i]);
    }
  }
  return { closes, timestamps };
}

interface TechnicalResult {
  symbol: string;
  name: string;
  tvSymbol: string;
  currentPrice: number;
  previousClose: number | null;
  change24h: number | null; // decimal (0.05 = +5%)
  changeYtd: number | null; // decimal
  ma200d: number | null;
  devFromMa200d: number | null;
  historicalMaxDev200d: number | null;
  historicalMinDev200d: number | null;
  ma200w: number | null;
  devFromMa200w: number | null;
  historicalMaxDev200w: number | null;
  historicalMinDev200w: number | null;
  source: 'core' | '13f';
}

async function fetchTechnicals(
  ticker: string,
  name: string,
  tv: string,
  source: 'core' | '13f',
  extremes: MaExtremesRow | undefined,
): Promise<{ result: TechnicalResult; update: MaExtremesRow | null } | null> {
  try {
    const [dailySeries, weeklyPrices] = await Promise.all([
      fetchChartSeries(ticker, '1y', '1d'),
      fetchChartData(ticker, '5y', '1wk'),
    ]);
    const dailyPrices = dailySeries.closes;

    if (dailyPrices.length === 0) return null;

    const currentPrice = dailyPrices[dailyPrices.length - 1];
    const previousClose = dailyPrices.length >= 2 ? dailyPrices[dailyPrices.length - 2] : null;
    const change24h = previousClose && previousClose !== 0 ? (currentPrice - previousClose) / previousClose : null;

    // YTD = % change from the first close on/after Jan 1 of the current year.
    const yearStartTs = Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000);
    let ytdStart: number | null = null;
    for (let i = 0; i < dailySeries.timestamps.length; i++) {
      if (dailySeries.timestamps[i] >= yearStartTs) {
        ytdStart = dailySeries.closes[i];
        break;
      }
    }
    const changeYtd = ytdStart && ytdStart !== 0 ? (currentPrice - ytdStart) / ytdStart : null;
    const displaySymbol = ticker
      .replace('=F', '')
      .replace('-Y.NYB', '')
      .replace('^', '');

    const ma200d = computeSMA(dailyPrices, 200);
    const devFromMa200d = ma200d ? ((currentPrice - ma200d) / ma200d) * 100 : null;

    const ma200w = computeSMA(weeklyPrices, 200);
    const devFromMa200w = ma200w ? ((currentPrice - ma200w) / ma200w) * 100 : null;

    let maxDev200d = extremes?.max_dev_200d ?? null;
    let minDev200d = extremes?.min_dev_200d ?? null;
    let maxDev200w = extremes?.max_dev_200w ?? null;
    let minDev200w = extremes?.min_dev_200w ?? null;

    let needsUpdate = false;

    if (devFromMa200d !== null) {
      if (maxDev200d === null || devFromMa200d > maxDev200d) {
        maxDev200d = devFromMa200d;
        needsUpdate = true;
      }
      if (minDev200d === null || devFromMa200d < minDev200d) {
        minDev200d = devFromMa200d;
        needsUpdate = true;
      }
    }

    if (devFromMa200w !== null) {
      if (maxDev200w === null || devFromMa200w > maxDev200w) {
        maxDev200w = devFromMa200w;
        needsUpdate = true;
      }
      if (minDev200w === null || devFromMa200w < minDev200w) {
        minDev200w = devFromMa200w;
        needsUpdate = true;
      }
    }

    const result: TechnicalResult = {
      symbol: displaySymbol,
      name,
      tvSymbol: tv,
      currentPrice,
      previousClose,
      change24h,
      changeYtd,
      ma200d,
      devFromMa200d,
      historicalMaxDev200d: maxDev200d,
      historicalMinDev200d: minDev200d,
      ma200w,
      devFromMa200w,
      historicalMaxDev200w: maxDev200w,
      historicalMinDev200w: minDev200w,
      source,
    };

    const update = needsUpdate
      ? { ticker, max_dev_200d: maxDev200d, min_dev_200d: minDev200d, max_dev_200w: maxDev200w, min_dev_200w: minDev200w }
      : null;

    return { result, update };
  } catch {
    return null;
  }
}

export async function GET() {
  const supabase = getSupabaseServiceClient();

  // Merge core symbols with 13F holdings tickers
  const holdingsTickers = await get13FTickers(supabase);
  const coreTickers = new Set(CORE_SYMBOLS.map((s) => s.ticker));
  const extraFromHoldings = holdingsTickers.filter((h) => !coreTickers.has(h.ticker));
  const SYMBOLS = [...CORE_SYMBOLS, ...extraFromHoldings];

  // Load stored extremes from Supabase
  const extremesMap = new Map<string, MaExtremesRow>();
  try {
    const { data } = await supabase.from('ma_extremes').select('ticker, max_dev_200d, min_dev_200d, max_dev_200w, min_dev_200w');
    if (data) {
      for (const row of data) {
        extremesMap.set(row.ticker, row);
      }
    }
  } catch {
    // Non-fatal — will proceed without stored extremes
  }

  // Fetch in batches of 15 to avoid hammering Yahoo Finance
  const BATCH_SIZE = 15;
  const fetched: (Awaited<ReturnType<typeof fetchTechnicals>>)[] = [];
  for (let i = 0; i < SYMBOLS.length; i += BATCH_SIZE) {
    const batch = SYMBOLS.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((s) => fetchTechnicals(s.ticker, s.name, s.tv, s.source, extremesMap.get(s.ticker)))
    );
    fetched.push(...results);
  }

  const technicals: TechnicalResult[] = [];
  const updates: Array<{ ticker: string; name: string; tv_symbol: string; max_dev_200d: number | null; min_dev_200d: number | null; max_dev_200w: number | null; min_dev_200w: number | null }> = [];

  for (let i = 0; i < fetched.length; i++) {
    const entry = fetched[i];
    if (!entry) continue;
    technicals.push(entry.result);
    if (entry.update) {
      const sym = SYMBOLS[i];
      updates.push({
        ...entry.update,
        name: sym.name,
        tv_symbol: sym.tv,
      });
    }
  }

  // Batch-update any new extremes back to Supabase
  if (updates.length > 0) {
    try {
      await supabase.from('ma_extremes').upsert(updates, { onConflict: 'ticker' });
    } catch {
      // Non-fatal
    }
  }

  return NextResponse.json(technicals, {
    headers: {
      'Cache-Control':
        'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
