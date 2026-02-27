import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface SymbolEntry {
  ticker: string;
  name: string;
  tv: string;
  source: 'core' | '13f';
}

const CORE_SYMBOLS: SymbolEntry[] = [
  // Core
  { ticker: 'NVDA', name: 'NVIDIA', tv: 'NASDAQ:NVDA', source: 'core' },
  { ticker: 'MU', name: 'Micron', tv: 'NASDAQ:MU', source: 'core' },
  { ticker: 'MRVL', name: 'Marvell', tv: 'NASDAQ:MRVL', source: 'core' },
  { ticker: 'AVGO', name: 'Broadcom', tv: 'NASDAQ:AVGO', source: 'core' },
  { ticker: 'ANET', name: 'Arista', tv: 'NYSE:ANET', source: 'core' },
  { ticker: 'VST', name: 'Vistra', tv: 'NYSE:VST', source: 'core' },
  // Monitoring
  { ticker: 'ARM', name: 'ARM Holdings', tv: 'NASDAQ:ARM', source: 'core' },
  { ticker: 'CRWV', name: 'CoreWeave', tv: 'NASDAQ:CRWV', source: 'core' },
  { ticker: 'PLTR', name: 'Palantir', tv: 'NYSE:PLTR', source: 'core' },
  // Hyperscalers
  { ticker: 'MSFT', name: 'Microsoft', tv: 'NASDAQ:MSFT', source: 'core' },
  { ticker: 'GOOGL', name: 'Google', tv: 'NASDAQ:GOOGL', source: 'core' },
  { ticker: 'AMZN', name: 'Amazon', tv: 'NASDAQ:AMZN', source: 'core' },
  { ticker: 'META', name: 'Meta', tv: 'NASDAQ:META', source: 'core' },
  // Other Tech
  { ticker: 'AMD', name: 'AMD', tv: 'NASDAQ:AMD', source: 'core' },
  { ticker: 'INTC', name: 'Intel', tv: 'NASDAQ:INTC', source: 'core' },
  { ticker: 'TSM', name: 'TSMC', tv: 'NYSE:TSM', source: 'core' },
  { ticker: 'CSCO', name: 'Cisco', tv: 'NASDAQ:CSCO', source: 'core' },
  { ticker: 'DELL', name: 'Dell', tv: 'NYSE:DELL', source: 'core' },
  { ticker: 'HPE', name: 'HPE', tv: 'NYSE:HPE', source: 'core' },
  // Data & Cybersecurity (GS Software Opportunities thesis)
  { ticker: 'SNOW', name: 'Snowflake', tv: 'NYSE:SNOW', source: 'core' },
  { ticker: 'MDB', name: 'MongoDB', tv: 'NASDAQ:MDB', source: 'core' },
  { ticker: 'CFLT', name: 'Confluent', tv: 'NASDAQ:CFLT', source: 'core' },
  { ticker: 'INFA', name: 'Informatica', tv: 'NYSE:INFA', source: 'core' },
  { ticker: 'CRWD', name: 'CrowdStrike', tv: 'NASDAQ:CRWD', source: 'core' },
  { ticker: 'PANW', name: 'Palo Alto Networks', tv: 'NASDAQ:PANW', source: 'core' },
  { ticker: 'ZS', name: 'Zscaler', tv: 'NASDAQ:ZS', source: 'core' },
  { ticker: 'FTNT', name: 'Fortinet', tv: 'NASDAQ:FTNT', source: 'core' },
  { ticker: 'S', name: 'SentinelOne', tv: 'NYSE:S', source: 'core' },
  // Crypto & Commodities
  { ticker: 'BTC-USD', name: 'Bitcoin', tv: 'BITSTAMP:BTCUSD', source: 'core' },
  { ticker: 'ETH-USD', name: 'Ethereum', tv: 'BITSTAMP:ETHUSD', source: 'core' },
  { ticker: 'ZEC-USD', name: 'Zcash', tv: 'BINANCE:ZECUSDT', source: 'core' },
  { ticker: 'GC=F', name: 'Gold', tv: 'COMEX:GC1!', source: 'core' },
  { ticker: 'SI=F', name: 'Silver', tv: 'COMEX:SI1!', source: 'core' },
  { ticker: 'HG=F', name: 'Copper', tv: 'COMEX:HG1!', source: 'core' },
  // Indices
  { ticker: '^GSPC', name: 'S&P 500', tv: 'SP:SPX', source: 'core' },
  { ticker: '^DJI', name: 'Dow Jones', tv: 'DJ:DJI', source: 'core' },
  { ticker: '^IXIC', name: 'NASDAQ', tv: 'NASDAQ:IXIC', source: 'core' },
];

// Guess a TradingView symbol from a plain ticker
function guessTvSymbol(ticker: string): string {
  // Common NYSE-listed tickers
  const nyse = new Set(['UBER', 'SNOW', 'HOOD', 'Z', 'CART', 'GRAB', 'RBLX', 'U', 'SOFI', 'NOW', 'WDAY', 'ABNB', 'SQ', 'SE', 'ARM', 'ALAB', 'RBRK', 'TTAN', 'FLUT', 'S', 'VST', 'ANET', 'PLTR', 'DELL', 'HPE', 'INFA', 'VRT']);
  const exchange = nyse.has(ticker) ? 'NYSE' : 'NASDAQ';
  return `${exchange}:${ticker}`;
}

async function get13FTickers(supabase: ReturnType<typeof getSupabaseServiceClient>): Promise<SymbolEntry[]> {
  try {
    // Get the latest filing date
    const { data: latestFiling } = await supabase
      .from('holdings')
      .select('filing_date')
      .order('filing_date', { ascending: false })
      .limit(1);

    if (!latestFiling || latestFiling.length === 0) return [];

    const latestDate = latestFiling[0].filing_date;

    // Get unique tickers from that filing date (equity positions only, skip options)
    const { data: holdings } = await supabase
      .from('holdings')
      .select('ticker, company_name')
      .eq('filing_date', latestDate)
      .is('option_type', null)
      .not('ticker', 'is', null);

    if (!holdings) return [];

    // Deduplicate by ticker
    const seen = new Set<string>();
    const entries: SymbolEntry[] = [];
    for (const h of holdings) {
      if (!h.ticker || seen.has(h.ticker)) continue;
      seen.add(h.ticker);
      entries.push({
        ticker: h.ticker,
        name: h.company_name,
        tv: guessTvSymbol(h.ticker),
        source: '13f',
      });
    }
    return entries;
  } catch {
    return [];
  }
}

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
