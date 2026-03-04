import { createClient } from '@supabase/supabase-js';
import { calculateWeightedScore } from '../src/lib/scoring';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function main() {
  const scores = {
    intelligence: 5,
    intuition_eq: 4,
    sincerity: 4,
    access: 5,
    independence: 4,
    capital_at_risk: 5,
    reputational_sensitivity: 4,
    performance: 5,
  };

  const weighted = calculateWeightedScore(scores);
  console.log('Jerry Murdock credibility score:', weighted.toFixed(2));

  const { data, error } = await sb.from('sources').upsert({
    name: 'Jerry Murdock',
    slug: 'jerry-murdock',
    bio: 'Co-founder of Insight Partners ($90B AUM), one of the largest global venture capital and private equity firms focused on software and technology. Over 30 years investing in and building technology companies.',
    avatar_url: '/avatars/jerry-murdock.jpg',
    domains: ['Technology / Venture Capital'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: ['Jerry Murdock Insight Partners', 'Jerry Murdock interview'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
  console.log('Added:', data.id);
}

main();
