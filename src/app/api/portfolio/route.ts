import { NextResponse } from 'next/server';
import {
  getPortfolioSnapshot,
  getPortfolioPositions,
  getPortfolioPerformance,
} from '@/lib/data';
import { fetchPrice, fetchPrices } from '@/lib/prices';

export const dynamic = 'force-dynamic';

export async function GET() {
  const snapshot = await getPortfolioSnapshot();

  if (!snapshot) {
    return NextResponse.json({ snapshot: null, positions: [], performance: [], liveKpis: null });
  }

  const [positions, performance] = await Promise.all([
    getPortfolioPositions(snapshot.id),
    getPortfolioPerformance(snapshot.id),
  ]);

  // Fetch live prices for all position tickers + SPY benchmark
  const tickers = positions.map((p) => p.ticker);
  const [livePrices, spyPrice] = await Promise.all([
    fetchPrices(tickers),
    fetchPrice('SPY'),
  ]);

  // Overlay live prices onto positions
  const livePositions = positions.map((pos) => ({
    ...pos,
    current_price: livePrices[pos.ticker] ?? pos.current_price,
  }));

  // Compute live KPIs from current prices
  let weightedReturn = 0;
  for (const pos of livePositions) {
    const entry = pos.entry_price;
    const current = pos.current_price;
    if (entry && current && entry > 0) {
      const rawReturn = (current - entry) / entry;
      const dirReturn = pos.direction === 'long' ? rawReturn : -rawReturn;
      weightedReturn += dirReturn * (pos.allocation_pct / 100);
    }
  }

  const nav = snapshot.starting_capital * (1 + weightedReturn);
  const totalReturnPct = weightedReturn * 100;

  // SPY benchmark: compare current SPY to SPY price on portfolio inception
  let spyCumulativePct = 0;
  if (spyPrice && performance.length > 0) {
    const firstPerf = performance[0];
    const firstSpyEntry = (firstPerf.positions_data as Array<{ ticker: string; price: number }>)
      ?.find((p) => p.ticker === 'SPY');
    if (firstSpyEntry?.price && firstSpyEntry.price > 0) {
      spyCumulativePct = ((spyPrice - firstSpyEntry.price) / firstSpyEntry.price) * 100;
    }
  }

  // Daily return: compare live NAV to previous day's stored NAV
  let dailyReturnPct = 0;
  if (performance.length > 0) {
    const prevNav = performance[performance.length - 1].nav;
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
    { snapshot, positions: livePositions, performance, liveKpis },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
