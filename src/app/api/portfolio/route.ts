import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { fetchPrice, fetchPrices } from '@/lib/prices';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  const supabase = getSupabaseServiceClient();

  // Fetch current snapshot directly with service key
  const { data: snapshot, error: snapErr } = await supabase
    .from('portfolio_snapshots')
    .select('*')
    .eq('is_current', true)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (snapErr || !snapshot) {
    return NextResponse.json(
      { snapshot: null, positions: [], performance: [], liveKpis: null, debug: { error: snapErr?.message } },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  const [{ data: positions }, { data: performance }] = await Promise.all([
    supabase
      .from('portfolio_positions')
      .select('*')
      .eq('snapshot_id', snapshot.id)
      .order('allocation_pct', { ascending: false }),
    supabase
      .from('portfolio_performance')
      .select('*')
      .eq('snapshot_id', snapshot.id)
      .order('date', { ascending: true })
      .limit(90),
  ]);

  const pos = positions || [];
  const perf = performance || [];

  // Fetch live prices for all position tickers + SPY benchmark
  const tickers = pos.map((p) => p.ticker);
  const [livePrices, spyPrice] = await Promise.all([
    fetchPrices(tickers),
    fetchPrice('SPY'),
  ]);

  // Overlay live prices onto positions
  const livePositions = pos.map((p) => ({
    ...p,
    current_price: livePrices[p.ticker] ?? p.current_price,
  }));

  // Compute live KPIs from current prices
  let weightedReturn = 0;
  for (const p of livePositions) {
    const entry = p.entry_price;
    const current = p.current_price;
    if (entry && current && entry > 0) {
      const rawReturn = (current - entry) / entry;
      const dirReturn = p.direction === 'long' ? rawReturn : -rawReturn;
      weightedReturn += dirReturn * (p.allocation_pct / 100);
    }
  }

  const nav = snapshot.starting_capital * (1 + weightedReturn);

  // Total return from inception (original 10M base), not just since last rebalance
  const INCEPTION_CAPITAL = 10_000_000;
  const totalReturnPct = ((nav - INCEPTION_CAPITAL) / INCEPTION_CAPITAL) * 100;

  // SPY benchmark
  let spyCumulativePct = 0;
  if (spyPrice && perf.length > 0) {
    const firstPerf = perf[0];
    const firstSpyEntry = (firstPerf.positions_data as Array<{ ticker: string; price: number }>)
      ?.find((e) => e.ticker === 'SPY');
    if (firstSpyEntry?.price && firstSpyEntry.price > 0) {
      spyCumulativePct = ((spyPrice - firstSpyEntry.price) / firstSpyEntry.price) * 100;
    }
  }

  // Daily return
  let dailyReturnPct = 0;
  if (perf.length > 0) {
    const prevNav = perf[perf.length - 1].nav;
    if (prevNav && prevNav > 0) {
      dailyReturnPct = ((nav - prevNav) / prevNav) * 100;
    }
  }

  const liveKpis = {
    nav,
    total_return_pct: totalReturnPct,
    spy_cumulative_pct: spyCumulativePct,
    daily_return_pct: dailyReturnPct,
  };

  return NextResponse.json(
    { snapshot, positions: livePositions, performance: perf, liveKpis },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    }
  );
}
