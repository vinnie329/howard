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
    sincerity: 5,
    access: 5,           // Google's Chief Scientist — direct line into Gemini, TPU, DeepMind
    independence: 4,     // Works at Google; commercial alignment with Gemini/TPU
    capital_at_risk: 3,  // Google equity but doesn't run an investment book
    reputational_sensitivity: 4,
    performance: 5,      // 25-yr record building the systems that run the world (MapReduce, BigTable, Spanner, TensorFlow, Brain, now Gemini); calls on scaling have been repeatedly validated
  };
  const weighted = calculateWeightedScore(scores);
  console.log(`Jeff Dean credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error } = await supabase.from('sources').upsert({
    name: 'Jeff Dean',
    slug: 'jeff-dean',
    bio: 'Chief Scientist at Google, leading Gemini. Founding member of Google Brain. Co-creator of MapReduce, BigTable, Spanner, TensorFlow. Among the most influential engineers in computing history; one of the deepest authorities on what frontier AI can actually do at scale.',
    avatar_url: '/avatars/jeff-dean.jpg',
    domains: ['ai-semis'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: ['Jeff Dean interview'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Source added: ${source.id}`);
}
main();
