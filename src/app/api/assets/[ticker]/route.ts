/**
 * GET /api/assets/[ticker] — full profile for a single ticker.
 *
 * Joins:
 *   - Yahoo fundamentals (lib/fundamentals)
 *   - house_predictions where asset matches
 *   - portfolio_positions in the current snapshot
 *   - source predictions where assets_mentioned contains the ticker (or name alias)
 *   - source analyses (with the parent content + source) where assets_mentioned contains it
 *   - sector peers from CORE_SYMBOLS within the same sector (best-effort)
 */
import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { fetchFundamentals } from '@/lib/fundamentals';
import { CORE_SYMBOLS } from '@/lib/assets-universe';

export const dynamic = 'force-dynamic';

const HARD_ALIASES: Record<string, string[]> = {
  'GC=F': ['Gold', 'GLD'],
  'SI=F': ['Silver', 'SLV'],
  'HG=F': ['Copper', 'CPER'],
  'CL=F': ['Oil', 'WTI', 'USO', 'Crude'],
  'BZ=F': ['Brent'],
  'BTC-USD': ['Bitcoin', 'BTC'],
  'ETH-USD': ['Ethereum', 'ETH'],
  'SPY': ['S&P 500', 'SPX', '^GSPC'],
  'QQQ': ['NASDAQ', '^IXIC'],
  'INTC': ['Intel'],
  'NVDA': ['NVIDIA', 'Nvidia'],
  'GEV': ['GE Vernova'],
  'MSFT': ['Microsoft'],
  'URA': ['Uranium'],
};

function aliasesFor(ticker: string, name: string): string[] {
  const out = new Set<string>([ticker, name, ticker.toLowerCase(), name.toLowerCase()]);
  for (const v of HARD_ALIASES[ticker] || []) {
    out.add(v);
    out.add(v.toLowerCase());
  }
  return Array.from(out);
}

export async function GET(_request: Request, { params }: { params: { ticker: string } }) {
  const ticker = decodeURIComponent(params.ticker);
  const sb = getSupabaseServiceClient();

  // Find the symbol entry from the universe (gives us name + sector hints)
  const symEntry = CORE_SYMBOLS.find((s) => s.ticker === ticker);
  const displayName = symEntry?.name || ticker;
  const aliases = aliasesFor(ticker, displayName);

  // Run everything in parallel
  const [fundamentals, housePredsRes, portfolioRes, sourcePredsRes, contentMentionsRes] = await Promise.all([
    fetchFundamentals(ticker),
    sb.from('house_predictions')
      .select('id, claim, direction, conviction, confidence, target_value, target_condition, reference_value, deadline, thesis, supporting_sources, key_drivers, invalidation_criteria, themes, outcome, created_at')
      .eq('asset', ticker)
      .eq('outcome', 'pending')
      .order('created_at', { ascending: false }),
    sb.from('portfolio_snapshots')
      .select('id, generated_at, portfolio_positions(ticker, direction, allocation_pct, entry_price, current_price, conviction, confidence, thesis, time_horizon, supporting_sources, key_drivers)')
      .eq('is_current', true)
      .single(),
    // assets_mentioned is JSONB, not a Postgres array — .overlaps() doesn't apply.
    // Pull recent rows and filter in JS by alias match.
    sb.from('predictions')
      .select('id, claim, sentiment, time_horizon, confidence, specificity, themes, assets_mentioned, source_id, date_made, sources(name, slug, weighted_score, domains)')
      .order('date_made', { ascending: false })
      .limit(2000),
    sb.from('analyses')
      .select('id, content_id, summary, sentiment_overall, themes, key_quotes, assets_mentioned, created_at, content(id, title, published_at, source_id, sources(name, slug, weighted_score))')
      .order('created_at', { ascending: false })
      .limit(2000),
  ]);

  // Filter by alias match (case-insensitive)
  const aliasSet = new Set(aliases.map((a) => a.toLowerCase()));
  function mentionsTicker(arr: unknown): boolean {
    if (!Array.isArray(arr)) return false;
    return arr.some((a) => typeof a === 'string' && aliasSet.has(a.toLowerCase()));
  }
  const filteredPreds = (sourcePredsRes.data || []).filter((p) => mentionsTicker(p.assets_mentioned)).slice(0, 50);
  const filteredMentions = (contentMentionsRes.data || []).filter((a) => mentionsTicker(a.assets_mentioned)).slice(0, 40);

  // Find the live portfolio position for this ticker (if any)
  const positions = (portfolioRes.data?.portfolio_positions ?? []) as Array<{ ticker: string; direction: string; allocation_pct: number; entry_price: number | null; current_price: number | null; conviction: string; confidence: number; thesis: string; time_horizon: string; supporting_sources: string[]; key_drivers: string[] }>;
  const portfolioPosition = positions.find((p) => p.ticker === ticker) ?? null;

  // Sector peers from CORE_SYMBOLS — same-sector tickers, best-effort by industry mapping
  // We'd need a sector cache to do this properly; for now, use a simple grouping.
  const SECTOR_GROUPS: Record<string, string[]> = {
    'AI/Semis': ['NVDA', 'MU', 'AMD', 'AVGO', 'MRVL', 'INTC', 'TSM', 'ARM', 'ANET', 'CRWV'],
    'Hyperscalers': ['MSFT', 'GOOGL', 'AMZN', 'META'],
    'Software': ['SNOW', 'MDB', 'CFLT', 'INFA', 'CRWD', 'PANW', 'ZS', 'FTNT', 'S', 'PLTR'],
    'Hardware/Networking': ['DELL', 'HPE', 'CSCO', 'ANET'],
    'Energy/Utilities': ['VST', 'GEV', 'XLE', 'CVX', 'CL=F', 'BZ=F'],
    'Crypto': ['BTC-USD', 'ETH-USD', 'ZEC-USD'],
    'Metals': ['GC=F', 'SI=F', 'HG=F', 'GLD', 'URA'],
    'Indices/ETFs': ['SPY', 'QQQ', 'TLT', 'PAVE', 'BIZD'],
  };
  let peers: string[] = [];
  for (const [, members] of Object.entries(SECTOR_GROUPS)) {
    if (members.includes(ticker)) {
      peers = members.filter((m) => m !== ticker).slice(0, 8);
      break;
    }
  }

  return NextResponse.json({
    ticker,
    name: fundamentals.name || displayName,
    fundamentals,
    housePredictions: housePredsRes.data || [],
    portfolioPosition,
    portfolioGeneratedAt: portfolioRes.data?.generated_at || null,
    sourcePredictions: filteredPreds,
    sourceMentions: filteredMentions,
    peers,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  });
}
