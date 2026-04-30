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
    sincerity: 4,
    access: 5,
    independence: 3,
    capital_at_risk: 2,
    reputational_sensitivity: 5,
    performance: 3,
  };

  const weighted = calculateWeightedScore(scores);
  console.log(`Joe Weisenthal credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error: sourceErr } = await supabase.from('sources').upsert({
    name: 'Joe Weisenthal',
    slug: 'joe-weisenthal',
    bio: 'Co-host of Bloomberg\'s Odd Lots podcast and newsletter. Covers macro, markets, commodities, and the underlying plumbing of the financial system.',
    avatar_url: '/avatars/joe-weisenthal.jpg',
    domains: ['Macro / Liquidity', 'Commodities'],
    scores: scores,
    weighted_score: weighted,
    youtube_search_queries: ['Joe Weisenthal', 'Joe Weisenthal Odd Lots', 'Odd Lots podcast'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (sourceErr) {
    console.error('Source insert failed:', sourceErr.message);
    process.exit(1);
  }
  console.log('Source added:', source.id);
}

main();
