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
    intelligence: 5,             // rigorous, peer-reviewed-style methodology
    intuition_eq: 4,             // good framing but data-driven, not vibes
    sincerity: 5,                // transparent on methodology + limitations
    access: 4,                   // direct relationships with labs for compute data
    independence: 5,             // independent research org, no commercial bias
    capital_at_risk: 1,          // research org, not investors
    reputational_sensitivity: 4, // academic-style — credibility tied to methodology rigor
    performance: 4,              // compute / scaling-laws forecasts have held up
  };
  const weighted = calculateWeightedScore(scores);
  console.log(`Epoch AI credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error } = await supabase.from('sources').upsert({
    name: 'Epoch AI',
    slug: 'epoch-ai',
    bio: 'Independent research organization tracking empirical AI metrics — compute capacity, scaling laws, training datasets, frontier model trends. Highly cited; no commercial AI bias. Their data feeds (chip owners hub, compute index) are the closest thing to ground truth on the AI buildout.',
    avatar_url: '/avatars/epoch-ai.jpg',
    domains: ['ai-semis'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: [],   // explicitly excluded from YouTube daily search
  }, { onConflict: 'slug' }).select().single();

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Source added: ${source.id}`);
}
main();
