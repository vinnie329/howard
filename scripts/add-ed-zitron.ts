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
    intuition_eq: 3,            // can be one-note / polemical
    sincerity: 5,                // very willing to put name on contrarian takes
    access: 3,                   // PR-side access, not capital-allocator access
    independence: 5,             // no AI commercial bias — actively critical of AI cos
    capital_at_risk: 2,          // not an investor; runs PR firm
    reputational_sensitivity: 4, // brand IS being the AI critic — reputation rides on being right
    performance: 3,              // OpenAI cash burn / GenAI ROI calls directionally right; bear side not fully priced in
  };
  const weighted = calculateWeightedScore(scores);
  console.log(`Ed Zitron credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error } = await supabase.from('sources').upsert({
    name: 'Ed Zitron',
    slug: 'ed-zitron',
    bio: 'Author of "Where\'s Your Ed At" newsletter and host of Better Offline podcast. Runs EZPR. Loud, sustained critic of GenAI economics — OpenAI/Oracle cash burn, capex-vs-revenue gap, hyperscaler ROI. Useful as a counterweight to AI-bull consensus among other sources.',
    avatar_url: '/avatars/ed-zitron.jpg',
    domains: ['ai-semis'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: [],
  }, { onConflict: 'slug' }).select().single();

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Source added: ${source.id}`);
}
main();
