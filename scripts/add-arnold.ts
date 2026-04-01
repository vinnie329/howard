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
    intuition_eq: 5,
    sincerity: 4,
    access: 5,
    independence: 5,
    capital_at_risk: 5,
    reputational_sensitivity: 4,
    performance: 5,
  };

  const weighted = calculateWeightedScore(scores);
  console.log('John Arnold credibility score:', weighted.toFixed(2));

  const { data, error } = await sb.from('sources').upsert({
    name: 'John Arnold',
    slug: 'john-arnold',
    bio: 'Former natural gas trader who built Centaurus Energy into one of the most successful commodity hedge funds in history. Retired in his late 30s as a billionaire. Now runs Arnold Ventures, focused on evidence-based philanthropy. Deep expertise in energy markets, commodities, and risk management.',
    avatar_url: '/avatars/john-arnold.jpg',
    domains: ['Commodities / Energy'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: ['John Arnold interview', 'John Arnold Centaurus'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
  console.log('Added:', data.id);
}

main();
