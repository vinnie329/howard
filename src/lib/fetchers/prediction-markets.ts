import type { SupabaseClient } from '@supabase/supabase-js';

const POLY_BASE = 'https://gamma-api.polymarket.com';

// Keyword categories for filtering Polymarket results locally
const POLY_KEYWORDS: Record<string, string[]> = {
  rates: ['fed', 'federal reserve', 'interest rate', 'rate cut', 'rate hike', 'fomc', 'fed chair'],
  macro: ['recession', 'inflation', 'gdp', 'unemployment', 'cpi', 'tariff', 'debt ceiling', 'default'],
  crypto: ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'solana'],
  geopolitics: ['iran', 'russia', 'ukraine', 'china', 'war', 'ceasefire', 'strait of hormuz', 'nato', 'strike', 'regime'],
  politics: ['trump', 'election', 'president', 'congress', 'senate', 'nomination', 'impeach'],
};

const DISCOVERY_VOLUME_THRESHOLD = 500000;  // >$500k 24h volume → discovery
const MAX_WATCHED_PER_CATEGORY = 5;         // cap per category
const MAX_DISCOVERIES_PER_CATEGORY = 3;     // cap discoveries per category

interface PolymarketMarket {
  id: string;
  question: string;
  outcomePrices: string;
  volume24hr: number;
  volume: number;
  liquidityNum: number;
  endDate: string;
  active: boolean;
  closed: boolean;
}

function categorizeByKeywords(question: string): string | null {
  const q = question.toLowerCase();
  for (const [cat, keywords] of Object.entries(POLY_KEYWORDS)) {
    if (keywords.some((kw) => q.includes(kw))) return cat;
  }
  return null;
}

async function fetchPolymarketMarkets(supabase: SupabaseClient): Promise<{ upserted: number; snapshots: number }> {
  let upserted = 0;
  let snapshots = 0;

  try {
    const url = `${POLY_BASE}/markets?active=true&closed=false&order=volume24hr&ascending=false&limit=200`;
    const res = await fetch(url);

    if (!res.ok) {
      console.log(`  Polymarket: ${res.status} ${res.statusText}`);
      return { upserted, snapshots };
    }

    const allMarkets: PolymarketMarket[] = await res.json();
    console.log(`  Fetched ${allMarkets.length} top markets`);

    // Group by category, sorted by volume within each
    const byCategory = new Map<string, PolymarketMarket[]>();
    for (const m of allMarkets) {
      if (m.closed || !m.active) continue;
      const cat = categorizeByKeywords(m.question);
      if (!cat) continue;
      const arr = byCategory.get(cat) || [];
      arr.push(m);
      byCategory.set(cat, arr);
    }

    for (const [cat, markets] of Array.from(byCategory.entries())) {
      // Top N per category become watched, rest are discoveries if high enough volume
      const watchedMarkets = markets.slice(0, MAX_WATCHED_PER_CATEGORY);
      const discoveryMarkets = markets.slice(MAX_WATCHED_PER_CATEGORY)
        .filter((m) => m.volume24hr > DISCOVERY_VOLUME_THRESHOLD)
        .slice(0, MAX_DISCOVERIES_PER_CATEGORY);

      for (const m of [...watchedMarkets, ...discoveryMarkets]) {
        const isWatched = watchedMarkets.includes(m);

        let yesPrice = 0.5;
        try {
          const prices = JSON.parse(m.outcomePrices);
          yesPrice = parseFloat(prices[0]) || 0.5;
        } catch { /* default */ }

        const { data: row, error } = await supabase
          .from('prediction_markets')
          .upsert({
            source: 'polymarket',
            market_id: m.id,
            title: m.question,
            category: cat,
            tags: [cat],
            resolution_date: m.endDate || null,
            is_watched: isWatched,
          }, { onConflict: 'source,market_id' })
          .select('id')
          .single();

        if (error) {
          if (error.code !== '23505') console.log(`    Upsert error: ${error.message}`);
          continue;
        }
        upserted++;

        if (row) {
          const { error: snapErr } = await supabase
            .from('prediction_market_snapshots')
            .insert({
              market_id: row.id,
              yes_price: yesPrice,
              volume_24h: m.volume24hr,
              open_interest: m.liquidityNum,
              total_volume: m.volume,
            });
          if (!snapErr) snapshots++;
        }
      }

      const wCount = watchedMarkets.length;
      const dCount = discoveryMarkets.length;
      console.log(`  ${cat}: ${wCount} watched + ${dCount} discoveries`);
    }
  } catch (err) {
    console.log(`  Polymarket error: ${err instanceof Error ? err.message : err}`);
  }

  return { upserted, snapshots };
}

async function cleanupResolvedMarkets(supabase: SupabaseClient): Promise<number> {
  // Mark markets with past resolution dates as not watched
  const { data: resolved } = await supabase
    .from('prediction_markets')
    .select('id')
    .lt('resolution_date', new Date().toISOString());

  if (!resolved || resolved.length === 0) return 0;

  // Delete snapshots and markets for resolved
  const ids = resolved.map((r) => r.id);
  await supabase.from('prediction_market_snapshots').delete().in('market_id', ids);
  await supabase.from('prediction_markets').delete().in('id', ids);

  return resolved.length;
}

export async function fetchPredictionMarkets(supabase: SupabaseClient): Promise<number> {
  console.log('=== Howard Prediction Markets Fetcher ===\n');
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Clean up resolved markets first
  console.log('Cleaning up resolved markets...');
  const cleaned = await cleanupResolvedMarkets(supabase);
  console.log(`  Removed ${cleaned} resolved markets\n`);

  console.log('Fetching Polymarket markets...');
  const poly = await fetchPolymarketMarkets(supabase);
  console.log(`  Total: ${poly.upserted} markets, ${poly.snapshots} snapshots\n`);

  console.log(`=== Done! ===`);
  return poly.upserted;
}
