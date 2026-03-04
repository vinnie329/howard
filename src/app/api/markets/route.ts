import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import type { MarketWithSnapshot } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabaseClient();

  // Fetch all markets
  const { data: markets, error: mErr } = await supabase
    .from('prediction_markets')
    .select('*')
    .order('category');

  if (mErr || !markets || markets.length === 0) {
    return NextResponse.json({ watched: [], discoveries: [] });
  }

  const marketIds = markets.map((m) => m.id);

  // Fetch recent snapshots (last 7 days for trend lines)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: snapshots } = await supabase
    .from('prediction_market_snapshots')
    .select('*')
    .in('market_id', marketIds)
    .gte('captured_at', sevenDaysAgo)
    .order('captured_at', { ascending: true });

  // Group snapshots by market_id
  const snapshotMap = new Map<string, Array<{ yes_price: number; volume_24h: number; captured_at: string }>>();
  for (const s of snapshots || []) {
    const arr = snapshotMap.get(s.market_id) || [];
    arr.push({ yes_price: Number(s.yes_price), volume_24h: Number(s.volume_24h || 0), captured_at: s.captured_at });
    snapshotMap.set(s.market_id, arr);
  }

  // Build enriched markets
  const enriched: MarketWithSnapshot[] = markets.map((m) => {
    const snaps = snapshotMap.get(m.id) || [];
    const latest = snaps.length > 0 ? snaps[snaps.length - 1] : null;
    const oldest = snaps.length > 1 ? snaps[0] : null;

    const currentPrice = latest ? latest.yes_price : 0;
    const priceChange = oldest ? currentPrice - oldest.yes_price : 0;
    const trend = snaps.map((s) => s.yes_price);

    return {
      ...m,
      current_price: currentPrice,
      price_change_24h: priceChange,
      volume_24h: latest ? latest.volume_24h : 0,
      trend,
    };
  });

  // Split into watched (sorted by volume) and discoveries
  const watched = enriched
    .filter((m) => m.is_watched)
    .sort((a, b) => b.volume_24h - a.volume_24h);

  const discoveries = enriched
    .filter((m) => !m.is_watched && m.volume_24h > 0)
    .sort((a, b) => b.volume_24h - a.volume_24h)
    .slice(0, 10);

  return NextResponse.json({ watched, discoveries });
}
