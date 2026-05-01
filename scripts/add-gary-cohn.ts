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
    intuition_eq: 4,             // strong political + market read; reads room well
    sincerity: 3,                // politically + commercially constrained (IBM)
    access: 5,                   // ran Goldman; ran NEC; current IBM Vice Chair
    independence: 3,             // IBM commercial bias; still politically influenced
    capital_at_risk: 4,
    reputational_sensitivity: 4,
    performance: 4,              // decent macro / oil / tariff / dollar calls
  };
  const weighted = calculateWeightedScore(scores);
  console.log(`Gary Cohn credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error } = await supabase.from('sources').upsert({
    name: 'Gary Cohn',
    slug: 'gary-cohn',
    bio: 'Former Goldman Sachs President + COO; former Trump NEC Director (2017–18); current IBM Vice Chairman. Top-tier political + market access; macro / oil / inflation / tariff commentary on CNBC. Useful for high-altitude policy + market read; less for granular trading calls.',
    avatar_url: '/avatars/gary-cohn.jpg',
    domains: ['macro'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: ['Gary Cohn interview', 'Gary Cohn CNBC'],
  }, { onConflict: 'slug' }).select().single();

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Source added: ${source.id}`);
}
main();
