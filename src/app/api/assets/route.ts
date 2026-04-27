/**
 * GET /api/assets — list view powering /assets page.
 *
 * Returns one row per ticker in the technicals universe, joined with
 * intel from house_predictions, portfolio_positions, predictions
 * (assets_mentioned), and analyses (assets_mentioned).
 *
 * Heavy fetches (Yahoo prices + MA computation) are delegated to the
 * existing /api/technicals route. Here we focus on the intel join.
 */
import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { getEquitiesUniverse } from '@/lib/assets-universe';

export const dynamic = 'force-dynamic';

interface EquitiesRow {
  ticker: string;
  name: string;
  // Live price comes from /api/technicals merged client-side
  hasHouseView: boolean;
  houseDirection: 'long' | 'short' | null;
  houseConviction: 'high' | 'medium' | 'low' | null;
  houseConfidence: number | null;
  inPortfolio: boolean;
  portfolioDirection: 'long' | 'short' | null;
  portfolioAlloc: number | null;
  sourceMentions: number;       // count of analyses mentioning this asset
  sourcePredictions: number;    // count of predictions referencing this asset
}

export async function GET() {
  const sb = getSupabaseServiceClient();
  const universe = await getEquitiesUniverse(sb);
  const tickers = universe.map((s) => s.ticker);

  // Build a tolerant matcher: many predictions/analyses store the asset under
  // common alias forms (e.g. "Gold" instead of "GC=F", "Bitcoin" for "BTC-USD",
  // "Intel" for "INTC"). Map every alias back to the canonical ticker.
  const aliasToCanonical: Record<string, string> = {};
  for (const s of universe) {
    aliasToCanonical[s.ticker] = s.ticker;
    aliasToCanonical[s.ticker.toLowerCase()] = s.ticker;
    aliasToCanonical[s.name] = s.ticker;
    aliasToCanonical[s.name.toLowerCase()] = s.ticker;
  }
  // Hand-curated common aliases
  const HARD_ALIASES: Record<string, string> = {
    Gold: 'GC=F', GLD: 'GLD',
    Silver: 'SI=F', SLV: 'SI=F',
    Copper: 'HG=F', CPER: 'HG=F',
    Oil: 'CL=F', WTI: 'CL=F', USO: 'CL=F',
    Brent: 'BZ=F',
    Bitcoin: 'BTC-USD', BTC: 'BTC-USD',
    Ethereum: 'ETH-USD', ETH: 'ETH-USD',
    'S&P 500': 'SPY', SPX: 'SPY', '^GSPC': 'SPY',
    NASDAQ: 'QQQ', '^IXIC': 'QQQ',
    Intel: 'INTC',
    'NVIDIA': 'NVDA', Nvidia: 'NVDA',
    'GE Vernova': 'GEV',
    Microsoft: 'MSFT',
    Uranium: 'URA',
  };
  for (const [k, v] of Object.entries(HARD_ALIASES)) {
    aliasToCanonical[k] = v;
    aliasToCanonical[k.toLowerCase()] = v;
  }

  // Pull the data we'll join in parallel
  const [housePreds, portfolioRes, predictions, analyses] = await Promise.all([
    sb.from('house_predictions')
      .select('asset, direction, conviction, confidence, outcome')
      .eq('outcome', 'pending'),
    sb.from('portfolio_snapshots')
      .select('id, portfolio_positions(ticker, direction, allocation_pct)')
      .eq('is_current', true)
      .single(),
    sb.from('predictions')
      .select('id, assets_mentioned'),
    sb.from('analyses')
      .select('id, assets_mentioned'),
  ]);

  // Index house views by canonical ticker
  const houseByTicker = new Map<string, { direction: string; conviction: string; confidence: number }>();
  for (const h of housePreds.data || []) {
    const canon = aliasToCanonical[h.asset] || h.asset;
    // Last write wins; that's fine — most tickers have one active prediction
    houseByTicker.set(canon, { direction: h.direction, conviction: h.conviction, confidence: h.confidence });
  }

  // Index portfolio positions by ticker
  const portfolioByTicker = new Map<string, { direction: string; alloc: number }>();
  const positions = (portfolioRes.data?.portfolio_positions ?? []) as Array<{ ticker: string; direction: string; allocation_pct: number }>;
  for (const p of positions) {
    const canon = aliasToCanonical[p.ticker] || p.ticker;
    portfolioByTicker.set(canon, { direction: p.direction, alloc: p.allocation_pct });
  }

  // Count source predictions and analyses per canonical ticker
  const predCount = new Map<string, number>();
  for (const p of predictions.data || []) {
    const seen = new Set<string>();
    for (const a of (p.assets_mentioned as string[]) || []) {
      const canon = aliasToCanonical[a] || aliasToCanonical[a.toLowerCase()] || null;
      if (canon && !seen.has(canon)) {
        seen.add(canon);
        predCount.set(canon, (predCount.get(canon) || 0) + 1);
      }
    }
  }
  const mentionCount = new Map<string, number>();
  for (const a of analyses.data || []) {
    const seen = new Set<string>();
    for (const asset of (a.assets_mentioned as string[]) || []) {
      const canon = aliasToCanonical[asset] || aliasToCanonical[asset.toLowerCase()] || null;
      if (canon && !seen.has(canon)) {
        seen.add(canon);
        mentionCount.set(canon, (mentionCount.get(canon) || 0) + 1);
      }
    }
  }

  const rows: EquitiesRow[] = universe.map((s) => {
    const house = houseByTicker.get(s.ticker);
    const port = portfolioByTicker.get(s.ticker);
    return {
      ticker: s.ticker,
      name: s.name,
      hasHouseView: !!house,
      houseDirection: (house?.direction as 'long' | 'short') ?? null,
      houseConviction: (house?.conviction as 'high' | 'medium' | 'low') ?? null,
      houseConfidence: house?.confidence ?? null,
      inPortfolio: !!port,
      portfolioDirection: (port?.direction as 'long' | 'short') ?? null,
      portfolioAlloc: port?.alloc ?? null,
      sourceMentions: mentionCount.get(s.ticker) || 0,
      sourcePredictions: predCount.get(s.ticker) || 0,
    };
  });

  // Universe = technicals tickers as-is. Intel is overlaid where it exists;
  // tickers with no intel still appear in the table (per user direction).
  return NextResponse.json(rows, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  });
}
