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
    intuition_eq: 4,
    sincerity: 5,
    access: 5,                   // ex-YC partner; ex-Apple AI; co-runs NFDG / AI Grant
    independence: 4,
    capital_at_risk: 5,          // NFDG portfolio
    reputational_sensitivity: 4,
    performance: 5,              // top-tier early-stage AI portfolio (Perplexity, etc.)
  };
  const weighted = calculateWeightedScore(scores);
  console.log(`Daniel Gross credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error } = await supabase.from('sources').upsert({
    name: 'Daniel Gross',
    slug: 'daniel-gross',
    bio: 'Ex-YC partner, ex-Apple Director of ML, ex-Cue (acq. Apple). Co-runs NFDG investment vehicle and AI Grant with Nat Friedman. Founder-tier operator-investor with deep AI portfolio (Perplexity, Cursor, Character, etc.). Pairs with Nat as the highest-conviction "what is actually happening at the AI frontier" voice in the system.',
    avatar_url: '/avatars/daniel-gross.jpg',
    domains: ['ai-semis'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: ['Daniel Gross AI', 'Daniel Gross interview'],
  }, { onConflict: 'slug' }).select().single();

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Source added: ${source.id}`);
}
main();
