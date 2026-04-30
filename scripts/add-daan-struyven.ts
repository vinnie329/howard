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
    sincerity: 4,
    access: 5,
    independence: 3,
    capital_at_risk: 3,
    reputational_sensitivity: 5,
    performance: 4,
  };

  const weighted = calculateWeightedScore(scores);
  console.log(`Daan Struyven credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error: sourceErr } = await supabase.from('sources').upsert({
    name: 'Daan Struyven',
    slug: 'daan-struyven',
    bio: 'Co-Head of Global Commodities Research and Head of Oil Research at Goldman Sachs. Covers oil, natural gas, precious metals, and energy transition.',
    avatar_url: '/avatars/daan-struyven.jpg',
    domains: ['Commodities', 'Macro / Liquidity'],
    scores: scores,
    weighted_score: weighted,
    youtube_search_queries: ['Daan Struyven', 'Daan Struyven Goldman Sachs', 'Daan Struyven commodities'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (sourceErr) {
    console.error('Source insert failed:', sourceErr.message);
    process.exit(1);
  }
  console.log('Source added:', source.id);
}

main();
