import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

async function fetchPrices(ticker: string, range: string, interval: string): Promise<number[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const closes: (number | null)[] = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
  return closes.filter((v): v is number => v !== null);
}

function computeRollingExtremes(prices: number[], period: number): { max: number; min: number } | null {
  if (prices.length < period) return null;
  let max = -Infinity;
  let min = Infinity;
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const sma = slice.reduce((s, p) => s + p, 0) / period;
    const dev = ((prices[i] - sma) / sma) * 100;
    if (dev > max) max = dev;
    if (dev < min) min = dev;
  }
  return { max, min };
}

async function seed() {
  console.log('Seeding MA extremes to Supabase...\n');

  for (const sym of SYMBOLS) {
    process.stdout.write(`  ${sym.name} (${sym.ticker})...`);

    try {
      const [dailyPrices, weeklyPrices] = await Promise.all([
        fetchPrices(sym.ticker, '10y', '1d'),
        fetchPrices(sym.ticker, '10y', '1wk'),
      ]);

      const daily = computeRollingExtremes(dailyPrices, 200);
      const weekly = computeRollingExtremes(weeklyPrices, 200);

      const { error } = await supabase.from('ma_extremes').upsert(
        {
          ticker: sym.ticker,
          name: sym.name,
          tv_symbol: sym.tv,
          max_dev_200d: daily?.max ?? null,
          min_dev_200d: daily?.min ?? null,
          max_dev_200w: weekly?.max ?? null,
          min_dev_200w: weekly?.min ?? null,
        },
        { onConflict: 'ticker' }
      );

      if (error) {
        console.log(` error: ${error.message}`);
      } else {
        const parts: string[] = [];
        if (daily) parts.push(`200d: ${daily.min.toFixed(1)}% to +${daily.max.toFixed(1)}%`);
        else parts.push('200d: insufficient data');
        if (weekly) parts.push(`200w: ${weekly.min.toFixed(1)}% to +${weekly.max.toFixed(1)}%`);
        else parts.push('200w: insufficient data');
        console.log(` ${parts.join(' | ')}`);
      }
    } catch (err) {
      console.log(` error: ${err}`);
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  console.log('\nDone!');
}

seed();
