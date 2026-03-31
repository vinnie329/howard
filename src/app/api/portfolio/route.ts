import { NextResponse } from 'next/server';
import {
  getPortfolioSnapshot,
  getPortfolioPositions,
  getPortfolioPerformance,
} from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const snapshot = await getPortfolioSnapshot();

  if (!snapshot) {
    return NextResponse.json({ snapshot: null, positions: [], performance: [] });
  }

  const [positions, performance] = await Promise.all([
    getPortfolioPositions(snapshot.id),
    getPortfolioPerformance(snapshot.id),
  ]);

  return NextResponse.json(
    { snapshot, positions, performance },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    }
  );
}
