/**
 * Canonical equities universe — the set of tickers Howard tracks technicals
 * and analytics against. Sourced from the technicals route's CORE_SYMBOLS
 * plus latest 13F holdings. Centralized here so /api/equities and
 * /api/technicals agree on the universe.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SymbolEntry {
  ticker: string;
  name: string;
  tv: string;
  source: 'core' | '13f';
}

export const CORE_SYMBOLS: SymbolEntry[] = [
  // Core AI/Semis
  { ticker: 'NVDA', name: 'NVIDIA', tv: 'NASDAQ:NVDA', source: 'core' },
  { ticker: 'MU', name: 'Micron', tv: 'NASDAQ:MU', source: 'core' },
  { ticker: 'MRVL', name: 'Marvell', tv: 'NASDAQ:MRVL', source: 'core' },
  { ticker: 'AVGO', name: 'Broadcom', tv: 'NASDAQ:AVGO', source: 'core' },
  { ticker: 'ANET', name: 'Arista', tv: 'NYSE:ANET', source: 'core' },
  { ticker: 'VST', name: 'Vistra', tv: 'NYSE:VST', source: 'core' },
  { ticker: 'ARM', name: 'ARM Holdings', tv: 'NASDAQ:ARM', source: 'core' },
  { ticker: 'CRWV', name: 'CoreWeave', tv: 'NASDAQ:CRWV', source: 'core' },
  { ticker: 'PLTR', name: 'Palantir', tv: 'NYSE:PLTR', source: 'core' },
  // Hyperscalers
  { ticker: 'MSFT', name: 'Microsoft', tv: 'NASDAQ:MSFT', source: 'core' },
  { ticker: 'GOOGL', name: 'Google', tv: 'NASDAQ:GOOGL', source: 'core' },
  { ticker: 'AMZN', name: 'Amazon', tv: 'NASDAQ:AMZN', source: 'core' },
  { ticker: 'META', name: 'Meta', tv: 'NASDAQ:META', source: 'core' },
  // Other tech
  { ticker: 'AMD', name: 'AMD', tv: 'NASDAQ:AMD', source: 'core' },
  { ticker: 'INTC', name: 'Intel', tv: 'NASDAQ:INTC', source: 'core' },
  { ticker: 'TSM', name: 'TSMC', tv: 'NYSE:TSM', source: 'core' },
  { ticker: 'CSCO', name: 'Cisco', tv: 'NASDAQ:CSCO', source: 'core' },
  { ticker: 'DELL', name: 'Dell', tv: 'NYSE:DELL', source: 'core' },
  { ticker: 'HPE', name: 'HPE', tv: 'NYSE:HPE', source: 'core' },
  // Data & Cybersecurity
  { ticker: 'SNOW', name: 'Snowflake', tv: 'NYSE:SNOW', source: 'core' },
  { ticker: 'MDB', name: 'MongoDB', tv: 'NASDAQ:MDB', source: 'core' },
  { ticker: 'CFLT', name: 'Confluent', tv: 'NASDAQ:CFLT', source: 'core' },
  { ticker: 'INFA', name: 'Informatica', tv: 'NYSE:INFA', source: 'core' },
  { ticker: 'CRWD', name: 'CrowdStrike', tv: 'NASDAQ:CRWD', source: 'core' },
  { ticker: 'PANW', name: 'Palo Alto Networks', tv: 'NASDAQ:PANW', source: 'core' },
  { ticker: 'ZS', name: 'Zscaler', tv: 'NASDAQ:ZS', source: 'core' },
  { ticker: 'FTNT', name: 'Fortinet', tv: 'NASDAQ:FTNT', source: 'core' },
  { ticker: 'S', name: 'SentinelOne', tv: 'NYSE:S', source: 'core' },
  // Crypto & commodities
  { ticker: 'BTC-USD', name: 'Bitcoin', tv: 'BITSTAMP:BTCUSD', source: 'core' },
  { ticker: 'ETH-USD', name: 'Ethereum', tv: 'BITSTAMP:ETHUSD', source: 'core' },
  { ticker: 'ZEC-USD', name: 'Zcash', tv: 'BINANCE:ZECUSDT', source: 'core' },
  { ticker: 'GC=F', name: 'Gold', tv: 'COMEX:GC1!', source: 'core' },
  { ticker: 'SI=F', name: 'Silver', tv: 'COMEX:SI1!', source: 'core' },
  { ticker: 'HG=F', name: 'Copper', tv: 'COMEX:HG1!', source: 'core' },
  { ticker: 'URA', name: 'Uranium ETF', tv: 'AMEX:URA', source: 'core' },
  // House view positions
  { ticker: 'SPY', name: 'S&P 500 ETF', tv: 'AMEX:SPY', source: 'core' },
  { ticker: 'QQQ', name: 'NASDAQ 100 ETF', tv: 'NASDAQ:QQQ', source: 'core' },
  { ticker: 'TLT', name: '20+ Year Treasury', tv: 'NASDAQ:TLT', source: 'core' },
  { ticker: 'GLD', name: 'Gold ETF', tv: 'AMEX:GLD', source: 'core' },
  { ticker: 'PAVE', name: 'Infrastructure ETF', tv: 'AMEX:PAVE', source: 'core' },
  { ticker: 'GEV', name: 'GE Vernova', tv: 'NYSE:GEV', source: 'core' },
  { ticker: 'BIZD', name: 'BDC Income ETF', tv: 'AMEX:BIZD', source: 'core' },
  // Indices
  { ticker: '^GSPC', name: 'S&P 500', tv: 'SP:SPX', source: 'core' },
  { ticker: '^DJI', name: 'Dow Jones', tv: 'DJ:DJI', source: 'core' },
  { ticker: '^IXIC', name: 'NASDAQ', tv: 'NASDAQ:IXIC', source: 'core' },
];

const NYSE_GUESS = new Set([
  'UBER', 'SNOW', 'HOOD', 'Z', 'CART', 'GRAB', 'RBLX', 'U', 'SOFI', 'NOW',
  'WDAY', 'ABNB', 'SQ', 'SE', 'ARM', 'ALAB', 'RBRK', 'TTAN', 'FLUT', 'S',
  'VST', 'ANET', 'PLTR', 'DELL', 'HPE', 'INFA', 'VRT',
]);

export function guessTvSymbol(ticker: string): string {
  const exchange = NYSE_GUESS.has(ticker) ? 'NYSE' : 'NASDAQ';
  return `${exchange}:${ticker}`;
}

export async function get13FTickers(supabase: SupabaseClient): Promise<SymbolEntry[]> {
  try {
    const { data: latestFiling } = await supabase
      .from('holdings')
      .select('filing_date')
      .order('filing_date', { ascending: false })
      .limit(1);
    if (!latestFiling || latestFiling.length === 0) return [];
    const latestDate = latestFiling[0].filing_date;

    const { data: holdings } = await supabase
      .from('holdings')
      .select('ticker, company_name')
      .eq('filing_date', latestDate)
      .is('option_type', null)
      .not('ticker', 'is', null);
    if (!holdings) return [];

    const seen = new Set<string>();
    const entries: SymbolEntry[] = [];
    for (const h of holdings) {
      if (!h.ticker || seen.has(h.ticker)) continue;
      seen.add(h.ticker);
      entries.push({ ticker: h.ticker, name: h.company_name, tv: guessTvSymbol(h.ticker), source: '13f' });
    }
    return entries;
  } catch {
    return [];
  }
}

export async function getEquitiesUniverse(supabase: SupabaseClient): Promise<SymbolEntry[]> {
  const holdings = await get13FTickers(supabase);
  const coreSet = new Set(CORE_SYMBOLS.map((s) => s.ticker));
  const extra = holdings.filter((h) => !coreSet.has(h.ticker));
  return [...CORE_SYMBOLS, ...extra];
}
