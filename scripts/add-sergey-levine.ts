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
    intelligence: 5,             // top-tier academic; one of the most-cited researchers in robot learning
    intuition_eq: 4,
    sincerity: 5,                // academic, no commercial pump in his framing
    access: 5,                   // co-founder of Physical Intelligence (PI); UC Berkeley RAIL lab
    independence: 4,             // academic standing offsets PI commercial interest
    capital_at_risk: 3,          // founder, not capital allocator
    reputational_sensitivity: 5, // academic reputation is the whole asset
    performance: 4,              // research record is exceptional; PI commercial outcome TBD
  };
  const weighted = calculateWeightedScore(scores);
  console.log(`Sergey Levine credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error } = await supabase.from('sources').upsert({
    name: 'Sergey Levine',
    slug: 'sergey-levine',
    bio: 'UC Berkeley professor (RAIL lab); co-founder of Physical Intelligence. One of the most-cited researchers in robot learning. Domain expert on imitation learning, RL, and what it actually takes to make robots generalize. Primary signal source on robotics + foundation models intersection.',
    avatar_url: '/avatars/sergey-levine.jpg',
    domains: ['ai-semis'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: ['Sergey Levine', 'Sergey Levine Physical Intelligence', 'Sergey Levine Berkeley'],
  }, { onConflict: 'slug' }).select().single();

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Source added: ${source.id}`);
}
main();
