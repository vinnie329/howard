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
    independence: 5,
    capital_at_risk: 5,
    reputational_sensitivity: 4,
    performance: 5,
  };

  const weighted = calculateWeightedScore(scores);
  console.log('Rick Rule credibility score:', weighted.toFixed(2));

  const { data, error } = await sb.from('sources').upsert({
    name: 'Rick Rule',
    slug: 'rick-rule',
    bio: 'Veteran natural resources investor and former president of Sprott US Holdings. Over 50 years of experience in mining, energy, and commodities investing.',
    avatar_url: '/avatars/rick-rule.jpg',
    domains: ['Commodities / Resources'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: ['Rick Rule interview', 'Rick Rule mining', 'Rick Rule commodities'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
  console.log('Added:', data.id);
}

main();
