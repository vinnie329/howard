/**
 * Yahoo Finance fundamentals fetcher — best-effort.
 *
 * Yahoo's quoteSummary / v7 quote endpoints now require a crumb token
 * obtained via a browser-cookie flow — they reject anonymous requests
 * with "Unauthorized: Invalid Crumb". We rely on the public chart
 * endpoint (still anonymous) for: name, exchange, current price,
 * previous close, 52-week range, and we compute returns + MA50/MA200
 * directly from the daily price series.
 *
 * Valuation metrics (marketCap, P/E, P/S, margins, sector, business
 * summary) are NOT available via these endpoints — they will be null
 * until we either:
 *   - implement the Yahoo crumb auth flow, or
 *   - add an Alpha Vantage / Polygon / FMP API key.
 */

// Kept for reference; not currently used.
const QUOTE_SUMMARY_MODULES = ['assetProfile','summaryDetail','defaultKeyStatistics','financialData','price'].join(',');
void QUOTE_SUMMARY_MODULES;

export interface Fundamentals {
  ticker: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  businessSummary: string | null;
  employees: number | null;
  // Valuation
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToSales: number | null;
  priceToBook: number | null;
  // Yield / income
  dividendYield: number | null;
  beta: number | null;
  // Income statement signals
  revenue: number | null;
  revenueGrowth: number | null;       // YoY decimal (0.10 = 10%)
  grossMargin: number | null;         // decimal
  operatingMargin: number | null;
  profitMargin: number | null;
  // Balance sheet
  totalCash: number | null;
  totalDebt: number | null;
  // Returns
  return1d: number | null;            // decimal
  return1w: number | null;
  return1m: number | null;
  return3m: number | null;
  returnYtd: number | null;
  return1y: number | null;
  // 30-day price series for sparkline
  spark30d: number[];
  // Technical deviations (from prior close, not stored)
  currentPrice: number | null;
  previousClose: number | null;
  fiftyDayAvg: number | null;
  twoHundredDayAvg: number | null;
}

const HEADERS = { 'User-Agent': 'Mozilla/5.0' };

interface ChartResult {
  closes: (number | null)[];
  timestamps: number[];
  meta: Record<string, unknown>;
}
async function fetchChart(ticker: string, range: string, interval: string): Promise<ChartResult> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`;
    const res = await fetch(url, { headers: HEADERS, cache: 'no-store' });
    if (!res.ok) return { closes: [], timestamps: [], meta: {} };
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    return {
      closes: result?.indicators?.quote?.[0]?.close ?? [],
      timestamps: result?.timestamp ?? [],
      meta: result?.meta ?? {},
    };
  } catch {
    return { closes: [], timestamps: [], meta: {} };
  }
}

function computeSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((sum, p) => sum + p, 0) / period;
}

function num(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  if (typeof x === 'object' && x !== null && 'raw' in x) {
    const r = (x as { raw: unknown }).raw;
    return typeof r === 'number' && Number.isFinite(r) ? r : null;
  }
  return null;
}

function str(x: unknown): string | null {
  if (typeof x === 'string') return x;
  return null;
}

function pctChange(from: number | null, to: number | null): number | null {
  if (from === null || to === null || from === 0) return null;
  return (to - from) / from;
}

function findLastValid(arr: (number | null)[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null && Number.isFinite(arr[i] as number)) return arr[i] as number;
  }
  return null;
}

function findFirstValid(arr: (number | null)[]): number | null {
  for (const v of arr) if (v !== null && Number.isFinite(v)) return v;
  return null;
}

function valueAtDaysBack(closes: (number | null)[], daysBack: number): number | null {
  // For daily series only: index from end
  const idx = closes.length - 1 - daysBack;
  if (idx < 0 || idx >= closes.length) return null;
  // Walk back if null
  for (let i = idx; i >= 0; i--) {
    if (closes[i] !== null && Number.isFinite(closes[i] as number)) return closes[i] as number;
  }
  return null;
}

export async function fetchFundamentals(ticker: string): Promise<Fundamentals> {
  const [chartYear, chart30d] = await Promise.all([
    fetchChart(ticker, '1y', '1d'),
    fetchChart(ticker, '1mo', '1d'),
  ]);

  const meta = chartYear.meta;
  const closes = chartYear.closes;
  const numericCloses = closes.filter((c): c is number => c !== null && Number.isFinite(c));
  const currentPrice = num(meta.regularMarketPrice) ?? findLastValid(closes);
  // Yesterday's close = second-to-last numeric close. Yahoo's chartPreviousClose
  // for range=1y is the close from 1y-1d ago, which is wrong here.
  const previousClose = numericCloses.length >= 2 ? numericCloses[numericCloses.length - 2] : null;
  const yearStart = findFirstValid(closes);

  const return1d = pctChange(previousClose, currentPrice);
  const return1w = pctChange(valueAtDaysBack(closes, 5), currentPrice);
  const return1m = pctChange(valueAtDaysBack(closes, 21), currentPrice);
  const return3m = pctChange(valueAtDaysBack(closes, 63), currentPrice);
  const return1y = pctChange(yearStart, currentPrice);

  const yearStartTs = Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000);
  let ytdStart: number | null = null;
  for (let i = 0; i < chartYear.timestamps.length; i++) {
    if (chartYear.timestamps[i] >= yearStartTs && closes[i] !== null) {
      ytdStart = closes[i] as number;
      break;
    }
  }
  const returnYtd = pctChange(ytdStart, currentPrice);

  // 50d / 200d MAs computed from the daily series.
  const fiftyDayAvg = computeSMA(numericCloses, 50);
  const twoHundredDayAvg = computeSMA(numericCloses, 200);

  return {
    ticker,
    name: str(meta.longName) ?? str(meta.shortName) ?? null,
    // Yahoo's anonymous endpoints don't expose these; left null for now.
    sector: null,
    industry: null,
    exchange: str(meta.fullExchangeName) ?? str(meta.exchangeName),
    businessSummary: null,
    employees: null,
    marketCap: null,
    trailingPE: null,
    forwardPE: null,
    priceToSales: null,
    priceToBook: null,
    dividendYield: null,
    beta: null,
    revenue: null,
    revenueGrowth: null,
    grossMargin: null,
    operatingMargin: null,
    profitMargin: null,
    totalCash: null,
    totalDebt: null,
    return1d,
    return1w,
    return1m,
    return3m,
    returnYtd,
    return1y,
    spark30d: chart30d.closes.filter((c): c is number => c !== null && Number.isFinite(c)),
    currentPrice,
    previousClose,
    fiftyDayAvg,
    twoHundredDayAvg,
  };
}

export async function fetchSectorPeers(sector: string | null, industry: string | null): Promise<string[]> {
  // Yahoo's recommendationsBySymbol gives related tickers; for now we don't have a clean
  // peer endpoint without scraping. Return empty — caller can fill from CORE_SYMBOLS by sector.
  void sector;
  void industry;
  return [];
}
