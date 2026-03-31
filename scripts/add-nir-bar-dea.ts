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
    capital_at_risk: 5,
    reputational_sensitivity: 5,
    performance: 5,
  };

  const weighted = calculateWeightedScore(scores);
  console.log(`Nir Bar Dea credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error: sourceErr } = await supabase.from('sources').upsert({
    name: 'Nir Bar Dea',
    slug: 'nir-bar-dea',
    bio: 'CEO of Bridgewater Associates. Former COO who succeeded Ray Dalio. Leads the world\'s largest hedge fund with deep expertise in macro, systematic investing, and risk management.',
    avatar_url: '/avatars/nir-bar-dea.jpg',
    domains: ['Macro / Liquidity', 'Geopolitics'],
    scores: scores,
    weighted_score: weighted,
    youtube_search_queries: ['Nir Bar Dea', 'Nir Bar Dea Bridgewater', 'Nir Bar Dea interview'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (sourceErr) {
    console.error('Source insert failed:', sourceErr.message);
    process.exit(1);
  }
  console.log('Source added:', source.id);
}

main();
