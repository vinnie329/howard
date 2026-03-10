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
    sincerity: 4,
    access: 5,
    independence: 4,
    capital_at_risk: 3,
    reputational_sensitivity: 5,
    performance: 4,
  };

  const weighted = calculateWeightedScore(scores);
  console.log(`Jack Clark credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error: sourceErr } = await supabase.from('sources').upsert({
    name: 'Jack Clark',
    slug: 'jack-clark',
    bio: 'Co-founder of Anthropic, former Policy Director at OpenAI. Author of Import AI, one of the most widely read AI newsletters covering research, policy, and industry developments.',
    avatar_url: '/avatars/jack-clark.jpg',
    domains: ['AI / Technology'],
    scores: scores,
    weighted_score: weighted,
    youtube_search_queries: ['Jack Clark AI', 'Jack Clark Anthropic'],
    substack_url: 'https://importai.substack.com',
  }, { onConflict: 'slug' }).select().single();

  if (sourceErr) {
    console.error('Source insert failed:', sourceErr.message);
    process.exit(1);
  }
  console.log('Source added:', source.id);
}

main();
