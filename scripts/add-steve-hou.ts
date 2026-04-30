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
    intelligence: 4,             // sharp quantitative framing
    intuition_eq: 4,
    sincerity: 4,
    access: 3,                   // HF / sell-side researcher level access
    independence: 4,
    capital_at_risk: 4,          // works at a fund (inferred from posts)
    reputational_sensitivity: 3,
    performance: 4,              // factor / macro calls have been directionally solid on FinTwit
  };
  const weighted = calculateWeightedScore(scores);
  console.log(`Steve Hou credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error } = await supabase.from('sources').upsert({
    name: 'Steve Hou',
    slug: 'steve-hou',
    bio: 'Quant / markets researcher on FinTwit (@stevehou). Macro, factor investing, and semis cycle commentary — typically grounded in flow / cross-sectional data rather than narrative. Sharp on inflection points (memory cycle, value-vs-growth rotations).',
    avatar_url: '/avatars/steve-hou.jpg',
    domains: ['macro', 'equities', 'ai-semis'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: [],
  }, { onConflict: 'slug' }).select().single();

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Source added: ${source.id}`);
}
main();
