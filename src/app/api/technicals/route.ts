import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';

const SYMBOLS = [
  // Core
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
  // Crypto & Commodities
  { ticker: 'BTC-USD', name: 'Bitcoin', tv: 'BITSTAMP:BTCUSD' },
  { ticker: 'ETH-USD', name: 'Ethereum', tv: 'BITSTAMP:ETHUSD' },
  { ticker: 'ZEC-USD', name: 'Zcash', tv: 'BINANCE:ZECUSDT' },
  { ticker: 'GC=F', name: 'Gold', tv: 'COMEX:GC1!' },
  { ticker: 'SI=F', name: 'Silver', tv: 'COMEX:SI1!' },
  { ticker: 'HG=F', name: 'Copper', tv: 'COMEX:HG1!' },
  // Indices
  { ticker: '^GSPC', name: 'S&P 500', tv: 'SP:SPX' },
  { ticker: '^DJI', name: 'Dow Jones', tv: 'DJ:DJI' },
  { ticker: '^IXIC', name: 'NASDAQ', tv: 'NASDAQ:IXIC' },
];

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
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!res.ok) return [];

  const data = await res.json();
  const closes: (number | null)[] =
    data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
  return closes.filter((v): v is number => v !== null);
}

interface TechnicalResult {
  symbol: string;
  name: string;
  tvSymbol: string;
  currentPrice: number;
  ma200d: number | null;
  devFromMa200d: number | null;
  historicalMaxDev200d: number | null;
  historicalMinDev200d: number | null;
  ma200w: number | null;
  devFromMa200w: number | null;
  historicalMaxDev200w: number | null;
  historicalMinDev200w: number | null;
}

async function fetchTechnicals(
  ticker: string,
  name: string,
  tv: string,
  extremes: MaExtremesRow | undefined,
): Promise<{ result: TechnicalResult; update: MaExtremesRow | null } | null> {
  try {
    const [dailyPrices, weeklyPrices] = await Promise.all([
      fetchChartData(ticker, '1y', '1d'),
      fetchChartData(ticker, '5y', '1wk'),
    ]);

    if (dailyPrices.length === 0) return null;

    const currentPrice = dailyPrices[dailyPrices.length - 1];
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
      ma200d,
      devFromMa200d,
      historicalMaxDev200d: maxDev200d,
      historicalMinDev200d: minDev200d,
      ma200w,
      devFromMa200w,
      historicalMaxDev200w: maxDev200w,
      historicalMinDev200w: minDev200w,
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

  const fetched = await Promise.all(
    SYMBOLS.map((s) => fetchTechnicals(s.ticker, s.name, s.tv, extremesMap.get(s.ticker)))
  );

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
