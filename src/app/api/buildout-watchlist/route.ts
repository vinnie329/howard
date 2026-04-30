/**
 * GET /api/buildout-watchlist — buy-and-hold AGI/robotics buildout exposures,
 * joined with live prices so buy-zone trigger is meaningful.
 *
 * Companion to /api/core-watchlist (compounders). A ticker can appear in both.
 */
import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { fetchPrice } from '@/lib/prices';

export const dynamic = 'force-dynamic';

interface BuildoutRow {
  id: string;
  ticker: string;
  asset_name: string;
  category: string;
  value_chain_layer: 'foundational' | 'enabling' | 'application' | null;
  thesis: string;
  agi_dependency: 'core' | 'optional' | 'hedge';
  buy_zone_max: number | null;
  trim_zone_min: number | null;
  invalidation_capex_stall: string | null;
  invalidation_disintermediation: string | null;
  status: 'watching' | 'in_position' | 'thesis_broken';
  dossier_updated_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  const sb = getSupabaseServiceClient();
  const { data, error } = await sb.from('buildout_watchlist')
    .select('id, ticker, asset_name, category, value_chain_layer, thesis, agi_dependency, buy_zone_max, trim_zone_min, invalidation_capex_stall, invalidation_disintermediation, status, dossier_updated_at, notes, created_at, updated_at')
    .order('category')
    .order('ticker');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []) as BuildoutRow[];

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
