/**
 * CFTC Commitments of Traders (COT) fetcher.
 *
 * Uses the CFTC's public Socrata API to fetch weekly positioning data.
 * Focuses on commercial vs speculative (non-commercial) positioning
 * in futures markets — tells you when a trade is crowded.
 *
 * Particularly powerful for commodities and currencies.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface COTRecord {
  commodity: string;
  ticker: string;
  report_date: string;
  commercial_long: number;
  commercial_short: number;
  commercial_net: number;
  noncommercial_long: number;
  noncommercial_short: number;
  noncommercial_net: number;
  /** Noncommercial net as % of total open interest — high values = crowded trade */
  spec_net_pct: number;
}

/**
 * Contracts we track — maps CFTC commodity name fragments to our tickers.
 * CFTC data uses verbose names like "GOLD - COMMODITY EXCHANGE INC."
 */
const TRACKED_CONTRACTS: Record<string, { ticker: string; name: string }> = {
  'GOLD': { ticker: 'GC', name: 'Gold' },
  'SILVER': { ticker: 'SI', name: 'Silver' },
  'COPPER': { ticker: 'HG', name: 'Copper' },
  'CRUDE OIL': { ticker: 'CL', name: 'Crude Oil' },
  'NATURAL GAS': { ticker: 'NG', name: 'Natural Gas' },
  'EURO FX': { ticker: 'EUR', name: 'Euro' },
  'JAPANESE YEN': { ticker: 'JPY', name: 'Japanese Yen' },
  'BRITISH POUND': { ticker: 'GBP', name: 'British Pound' },
  'SWISS FRANC': { ticker: 'CHF', name: 'Swiss Franc' },
  'CANADIAN DOLLAR': { ticker: 'CAD', name: 'Canadian Dollar' },
  'S&P 500': { ticker: 'ES', name: 'S&P 500' },
  'NASDAQ': { ticker: 'NQ', name: 'NASDAQ 100' },
  'DOW JONES': { ticker: 'YM', name: 'Dow Jones' },
  'U.S. TREASURY BONDS': { ticker: 'ZB', name: 'Treasury Bonds' },
  '10-YEAR': { ticker: 'ZN', name: '10-Year Note' },
  'BITCOIN': { ticker: 'BTC', name: 'Bitcoin' },
};

function matchContract(cftcName: string): { ticker: string; name: string } | null {
  const upper = cftcName.toUpperCase();
  for (const [fragment, info] of Object.entries(TRACKED_CONTRACTS)) {
    if (upper.includes(fragment)) return info;
  }
  return null;
}

/**
 * Fetch COT data from CFTC Socrata API.
 * Dataset: Disaggregated Futures Only (legacy format also works).
 *
 * Legacy COT endpoint: https://publicreporting.cftc.gov/resource/6dca-aqww.json
 * We fetch the last 4 weeks to compute trend.
 */
async function fetchFromCFTC(): Promise<COTRecord[]> {
  // Legacy Futures Only report — most widely used
  const url = 'https://publicreporting.cftc.gov/resource/6dca-aqww.json?' +
    '$order=report_date_as_yyyy_mm_dd DESC&' +
    '$limit=2000&' +
    '$where=report_date_as_yyyy_mm_dd > ' +
    `'${fourWeeksAgo()}'`;

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = await res.json();
  const records: COTRecord[] = [];

  for (const row of rows) {
    const match = matchContract(row.commodity_name || row.market_and_exchange_names || '');
    if (!match) continue;

    const commLong = Number(row.comm_positions_long_all || 0);
    const commShort = Number(row.comm_positions_short_all || 0);
    const ncLong = Number(row.noncomm_positions_long_all || 0);
    const ncShort = Number(row.noncomm_positions_short_all || 0);
    const oi = Number(row.open_interest_all || 1);

    records.push({
      commodity: match.name,
      ticker: match.ticker,
      report_date: row.report_date_as_yyyy_mm_dd || row.report_date || '',
      commercial_long: commLong,
      commercial_short: commShort,
      commercial_net: commLong - commShort,
      noncommercial_long: ncLong,
      noncommercial_short: ncShort,
      noncommercial_net: ncLong - ncShort,
      spec_net_pct: oi > 0 ? ((ncLong - ncShort) / oi) * 100 : 0,
    });
  }

  return records;
}

function fourWeeksAgo(): string {
  const d = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/**
 * Format COT data as a text block for the positioning prompt.
 * Highlights crowded trades (>20% or <-20% spec net as % of OI).
 */
export function formatCOTBlock(records: COTRecord[]): string {
  if (records.length === 0) return 'No CFTC COT data available.';

  // Group by ticker, take latest report per contract
  const latest = new Map<string, COTRecord>();
  for (const r of records) {
    const existing = latest.get(r.ticker);
    if (!existing || r.report_date > existing.report_date) {
      latest.set(r.ticker, r);
    }
  }

  // Get previous week for trend
  const previous = new Map<string, COTRecord>();
  for (const r of records) {
    const lat = latest.get(r.ticker);
    if (lat && r.report_date < lat.report_date) {
      const existing = previous.get(r.ticker);
      if (!existing || r.report_date > existing.report_date) {
        previous.set(r.ticker, r);
      }
    }
  }

  const lines: string[] = [];
  for (const [ticker, rec] of Array.from(latest.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const prev = previous.get(ticker);
    const netChange = prev ? rec.noncommercial_net - prev.noncommercial_net : null;
    const crowdedFlag = Math.abs(rec.spec_net_pct) > 20 ? ' ⚠ CROWDED' : '';

    let line = `${rec.commodity} (${ticker}): Spec net ${rec.noncommercial_net.toLocaleString()} (${rec.spec_net_pct > 0 ? '+' : ''}${rec.spec_net_pct.toFixed(1)}% of OI)`;
    if (netChange !== null) line += ` | WoW: ${netChange > 0 ? '+' : ''}${netChange.toLocaleString()}`;
    line += ` | Comm net: ${rec.commercial_net.toLocaleString()}`;
    line += crowdedFlag;
    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Fetch and store CFTC COT data.
 */
export async function fetchCOT(supabase: SupabaseClient): Promise<COTRecord[]> {
  console.log('CFTC COT: Fetching positioning data...');

  const records = await fetchFromCFTC();

  if (records.length === 0) {
    console.log('  No CFTC COT data available.');
    return [];
  }

  console.log(`  ${records.length} records across ${new Set(records.map(r => r.ticker)).size} contracts`);

  // Store snapshots
  const now = new Date().toISOString();
  const rows = records.map(r => ({
    ticker: r.ticker,
    commodity: r.commodity,
    report_date: r.report_date,
    commercial_net: r.commercial_net,
    noncommercial_net: r.noncommercial_net,
    spec_net_pct: r.spec_net_pct,
    captured_at: now,
  }));

  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('cot_snapshots').upsert(batch, {
      onConflict: 'ticker,report_date',
    });
    if (error) {
      console.error('  Insert error:', error.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  Upserted ${inserted} COT rows`);
  return records;
}
