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
    intuition_eq: 5,             // real-estate cycle calls have been generationally good
    sincerity: 4,                // Blackstone commercial position constrains candor
    access: 5,                   // President / COO of $1T+ alt-asset manager
    independence: 3,             // institutional commercial bias
    capital_at_risk: 5,          // Blackstone GP exposure + personal equity
    reputational_sensitivity: 5,
    performance: 5,              // built Blackstone real estate platform; among the great institutional records
  };
  const weighted = calculateWeightedScore(scores);
  console.log(`Jon Gray credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error } = await supabase.from('sources').upsert({
    name: 'Jon Gray',
    slug: 'jon-gray',
    bio: 'President + COO of Blackstone. Built the firm\'s real estate platform; now responsible across the entire alt-asset complex (~$1T+ AUM). Quarterly Market Views videos lay out the institutional view on macro, sectors, and capital deployment. Top-tier institutional read on real estate, hard assets, and large-cap private investing — with the commercial bias inherent to a Blackstone executive.',
    avatar_url: '/avatars/jon-gray.jpg',
    domains: ['equities', 'macro'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: ['Jon Gray Blackstone', 'Jon Gray interview'],
  }, { onConflict: 'slug' }).select().single();

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Source added: ${source.id}`);
}
main();
