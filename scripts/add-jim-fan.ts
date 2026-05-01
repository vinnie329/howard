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
    intelligence: 5,             // Stanford PhD; published heavily on robot foundation models
    intuition_eq: 4,
    sincerity: 5,                // academic-style, clear on uncertainty + limits
    access: 5,                   // inside NVIDIA; leads GEAR (Generalist Embodied AI Research) lab
    independence: 3,             // NVIDIA commercial bias — runs robotics at THE silicon vendor
    capital_at_risk: 3,
    reputational_sensitivity: 4,
    performance: 4,              // foundation-model + robotics-trajectory calls have held up
  };
  const weighted = calculateWeightedScore(scores);
  console.log(`Jim Fan credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error } = await supabase.from('sources').upsert({
    name: 'Jim Fan',
    slug: 'jim-fan',
    bio: 'VP of Research at NVIDIA; leads GEAR Lab (Generalist Embodied AI Research). Stanford PhD. Public voice on robot foundation models, embodied AI, and the path from LLMs to physical intelligence. Pairs with Sergey Levine as the second domain-expert robotics voice in the system.',
    avatar_url: '/avatars/jim-fan.jpg',
    domains: ['ai-semis'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: ['Jim Fan NVIDIA', 'Jim Fan GEAR', 'Jim Fan robotics'],
  }, { onConflict: 'slug' }).select().single();

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Source added: ${source.id}`);
}
main();
