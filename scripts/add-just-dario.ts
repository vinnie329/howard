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
    intuition_eq: 3,            // "I told you so" tone, polemical
    sincerity: 4,
    access: 3,                   // independent blogger, no obvious privileged access
    independence: 5,             // independent, no commercial bias
    capital_at_risk: 3,          // writes like a trader but skin not verifiable
    reputational_sensitivity: 3,
    performance: 4,              // data-center / OpenAI capex bear calls look directionally right
  };
  const weighted = calculateWeightedScore(scores);
  console.log(`Just Dario credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error } = await supabase.from('sources').upsert({
    name: 'Just Dario',
    slug: 'just-dario',
    bio: 'Independent macro/markets blogger at justdario.com. Persistent bear on the data-center capex cycle and OpenAI revenue/cash story. Pairs well with Ed Zitron as the AI-skeptic counterweight to bullish AI/semis sources.',
    avatar_url: '/avatars/just-dario.jpg',
    domains: ['macro', 'ai-semis'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: [],
  }, { onConflict: 'slug' }).select().single();

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Source added: ${source.id}`);
}
main();
