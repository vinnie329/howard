import { createClient } from '@supabase/supabase-js';
import { calculateWeightedScore } from '../src/lib/scoring';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const scores = {
    intelligence: 5,
    intuition_eq: 5,
    sincerity: 5,
    access: 5,
    independence: 5,
    capital_at_risk: 5,
    reputational_sensitivity: 5,
    performance: 5,
  };

  const weighted = calculateWeightedScore(scores);
  console.log(`Bill Gurley credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error: sourceErr } = await supabase.from('sources').upsert({
    name: 'Bill Gurley',
    slug: 'bill-gurley',
    bio: 'General Partner at Benchmark. One of the most successful venture capitalists in history (Uber, OpenDoor, Zillow). Known for deep thinking on marketplace dynamics, pricing, and market structure.',
    avatar_url: '/avatars/bill-gurley.jpg',
    domains: ['Tech / AI', 'Macro / Liquidity'],
    scores: scores,
    weighted_score: weighted,
    youtube_search_queries: ['Bill Gurley', 'Bill Gurley Benchmark', 'Bill Gurley interview'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (sourceErr) {
    console.error('Source insert failed:', sourceErr.message);
    process.exit(1);
  }
  console.log('Source added:', source.id);
}

main();
