/**
 * Credit market spreads fetcher.
 *
 * Fetches from FRED (Federal Reserve Economic Data) — free, no API key required
 * for low-volume usage. These are leading risk sentiment indicators that move
 * before equities.
 *
 * Series:
 *   BAMLH0A0HYM2 — ICE BofA US High Yield OAS (HY spread)
 *   BAMLC0A0CM    — ICE BofA US Corporate OAS (IG spread)
 *   TEDRATE       — TED Spread (3m LIBOR - 3m T-Bill, funding stress)
 *   SOFR          — Secured Overnight Financing Rate
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreditSpreadRecord {
  series: string;
  label: string;
  date: string;
  value: number;
}

const SERIES: Record<string, string> = {
  'BAMLH0A0HYM2': 'HY Spread (OAS)',
  'BAMLC0A0CM': 'IG Spread (OAS)',
  'TEDRATE': 'TED Spread',
  'SOFR': 'SOFR Rate',
};

/**
 * Fetch a single FRED series. Uses the public observations endpoint.
 * FRED allows limited unauthenticated access; for heavier use set FRED_API_KEY.
 */
async function fetchFREDSeries(
  seriesId: string,
  apiKey: string | undefined,
  lookbackDays: number = 90,
): Promise<Array<{ date: string; value: number }>> {
  const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);

  // With API key: use official API. Without: try the public observations endpoint.
  const url = apiKey
    ? `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&observation_start=${startDate}&file_type=json&api_key=${apiKey}`
    : `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}&cosd=${startDate}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];

  if (apiKey) {
    // JSON API response
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.observations || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((o: any) => o.value !== '.')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((o: any) => ({ date: o.date, value: parseFloat(o.value) }));
  } else {
    // CSV fallback
    const text = await res.text();
    const lines = text.trim().split('\n').slice(1); // skip header
    return lines
      .map(line => {
        const [date, val] = line.split(',');
        const value = parseFloat(val);
        if (isNaN(value) || val === '.') return null;
        return { date, value };
      })
      .filter((r): r is { date: string; value: number } => r !== null);
  }
}

/**
 * Format credit spread data as a text block for the positioning prompt.
 * Shows latest value, 30d change, and flags stress levels.
 */
export function formatCreditBlock(records: CreditSpreadRecord[]): string {
  if (records.length === 0) return 'No credit spread data available.';

  // Group by series, sort by date
  const bySeries = new Map<string, CreditSpreadRecord[]>();
  for (const r of records) {
    const arr = bySeries.get(r.series) || [];
    arr.push(r);
    bySeries.set(r.series, arr);
  }

  const lines: string[] = [];
  for (const [series, recs] of Array.from(bySeries.entries())) {
    const sorted = recs.sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const prev = sorted.find(r => r.date >= thirtyDaysAgo) || sorted[0];
    const change30d = latest.value - prev.value;

    let stressFlag = '';
    if (series === 'BAMLH0A0HYM2' && latest.value > 500) stressFlag = ' ⚠ ELEVATED';
    if (series === 'BAMLH0A0HYM2' && latest.value > 800) stressFlag = ' 🔴 STRESS';
    if (series === 'TEDRATE' && latest.value > 0.5) stressFlag = ' ⚠ FUNDING STRESS';

    const label = SERIES[series] || series;
    let line = `${label}: ${latest.value.toFixed(2)}`;
    if (series.startsWith('BAML')) line += ' bps';
    if (series === 'TEDRATE') line += '%';
    if (series === 'SOFR') line += '%';
    line += ` (${latest.date})`;
    line += ` | 30d change: ${change30d > 0 ? '+' : ''}${change30d.toFixed(2)}`;
    line += stressFlag;
    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Fetch and store credit spread data from FRED.
 */
export async function fetchCreditSpreads(supabase: SupabaseClient): Promise<CreditSpreadRecord[]> {
  console.log('Credit Spreads: Fetching from FRED...');

  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.log('  No FRED_API_KEY — using CSV fallback (limited)');
  }

  const allRecords: CreditSpreadRecord[] = [];

  for (const [seriesId, label] of Object.entries(SERIES)) {
    try {
      const obs = await fetchFREDSeries(seriesId, apiKey, 90);
      console.log(`  ${label}: ${obs.length} observations`);
      for (const o of obs) {
        allRecords.push({ series: seriesId, label, date: o.date, value: o.value });
      }
    } catch (err) {
      console.error(`  ${label}: fetch failed —`, err instanceof Error ? err.message : err);
    }
  }

  if (allRecords.length === 0) {
    console.log('  No credit spread data available.');
    return [];
  }

  // Store snapshots
  const rows = allRecords.map(r => ({
    series: r.series,
    label: r.label,
    observation_date: r.date,
    value: r.value,
    captured_at: new Date().toISOString(),
  }));

  const BATCH_SIZE = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('credit_spread_snapshots').upsert(batch, {
      onConflict: 'series,observation_date',
    });
    if (error) {
      console.error('  Upsert error:', error.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  Upserted ${inserted} credit spread rows`);
  return allRecords;
}
