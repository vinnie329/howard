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
    independence: 4,
    capital_at_risk: 4,
    reputational_sensitivity: 4,
    performance: 5,
  };

  const weighted = calculateWeightedScore(scores);
  console.log(`Elad Gil credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error: sourceErr } = await supabase.from('sources').upsert({
    name: 'Elad Gil',
    slug: 'elad-gil',
    bio: 'Serial entrepreneur, investor, and author of the High Growth Handbook. Former VP at Twitter, early investor in Airbnb, Stripe, and numerous AI companies. Known for deep insight into AI infrastructure, startup scaling, and technology platform shifts.',
    avatar_url: '/avatars/elad-gil.jpg',
    domains: ['AI / Semiconductors', 'Venture / Startups', 'Macro / Liquidity'],
    scores: scores,
    weighted_score: weighted,
    youtube_search_queries: ['Elad Gil interview', 'Elad Gil AI', 'Elad Gil South Park Commons'],
  }, { onConflict: 'slug' }).select().single();

  if (sourceErr) {
    console.error('Source insert failed:', sourceErr.message);
    process.exit(1);
  }
  console.log('Source added:', source.id);
}

main();
