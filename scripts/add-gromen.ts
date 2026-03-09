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
    intelligence: 4,
    intuition_eq: 4,
    sincerity: 5,
    access: 4,
    independence: 5,
    capital_at_risk: 2,
    reputational_sensitivity: 4,
    performance: 4,
  };

  const weighted = calculateWeightedScore(scores);
  console.log(`Luke Gromen credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error: sourceErr } = await supabase.from('sources').upsert({
    name: 'Luke Gromen',
    slug: 'luke-gromen',
    bio: 'Founder and president of Forest for the Trees (FFTT). Macro strategist focused on global capital flows, fiscal dominance, energy markets, and the intersection of sovereign debt and commodity cycles.',
    avatar_url: '/avatars/luke-gromen.jpg',
    domains: ['Macro / Liquidity'],
    scores: scores,
    weighted_score: weighted,
    youtube_search_queries: ['Luke Gromen', 'Luke Gromen FFTT', 'Luke Gromen interview'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (sourceErr) {
    console.error('Source insert failed:', sourceErr.message);
    process.exit(1);
  }
  console.log('Source added:', source.id);
}

main();
