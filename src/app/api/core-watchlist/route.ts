/**
 * GET /api/core-watchlist — compounder-watchlist candidates, joined with live
 * prices from /api/technicals so the buy-zone trigger is meaningful.
 *
 * Returns rows with: ticker, name, thesis, buy_zone_max, trim_zone_min,
 * status, current_price, distance_to_buy_zone (negative = below buy zone =
 * deployable now).
 */
import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { fetchPrice } from '@/lib/prices';

export const dynamic = 'force-dynamic';

interface CoreWatchlistRow {
  id: string;
  ticker: string;
  asset_name: string;
  thesis: string;
  reinvestment_runway: string | null;
  pricing_power_evidence: string | null;
  capital_allocation_notes: string | null;
  buy_zone_max: number | null;
  trim_zone_min: number | null;
  invalidation_criteria: string | null;
  status: 'watching' | 'in_position' | 'thesis_broken' | 'taken_profits';
  dossier_md: string | null;
  dossier_updated_at: string | null;
  flagged_by_sources: string[];
  position_opened_at: string | null;
  notes: string | null;
  added_at: string;
  updated_at: string;
}

export async function GET() {
  const sb = getSupabaseServiceClient();
  // Don't return dossier_md from the list endpoint — it can be tens of KB per row.
  // The per-ticker endpoint (/api/assets/[ticker]) returns the full markdown.
  const { data, error } = await sb.from('core_watchlist')
    .select('id, ticker, asset_name, thesis, reinvestment_runway, pricing_power_evidence, capital_allocation_notes, buy_zone_max, trim_zone_min, invalidation_criteria, status, dossier_updated_at, flagged_by_sources, position_opened_at, notes, added_at, updated_at')
    .order('added_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []) as CoreWatchlistRow[];

  // Pull live prices in parallel
  const priceMap = await Promise.all(
    rows.map((r) => fetchPrice(r.ticker).then((p) => [r.ticker, p] as const))
  ).then((pairs) => Object.fromEntries(pairs));

  const enriched = rows.map((r) => {
    const price = priceMap[r.ticker] ?? null;
    const inBuyZone = price !== null && r.buy_zone_max !== null && price <= r.buy_zone_max;
    const aboveTrimZone = price !== null && r.trim_zone_min !== null && price >= r.trim_zone_min;
    const distanceToBuyZone = price !== null && r.buy_zone_max !== null
      ? ((price - r.buy_zone_max) / r.buy_zone_max) * 100
      : null;
    return {
      ...r,
      has_dossier: r.dossier_updated_at !== null,
      current_price: price,
      in_buy_zone: inBuyZone,
      above_trim_zone: aboveTrimZone,
      distance_to_buy_zone_pct: distanceToBuyZone,
    };
  });

  return NextResponse.json(enriched, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  });
}
