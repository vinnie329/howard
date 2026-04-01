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
    access: 4,
    independence: 5,
    capital_at_risk: 3,
    reputational_sensitivity: 5,
    performance: 5,
  };

  const weighted = calculateWeightedScore(scores);
  console.log(`Steve Eisman credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error: sourceErr } = await supabase.from('sources').upsert({
    name: 'Steve Eisman',
    slug: 'steve-eisman',
    bio: 'Legendary investor known for his Big Short trade against subprime mortgages. Portfolio manager at Neuberger Berman. Sharp macro thinker with deep expertise in financials, regulation, and contrarian positioning.',
    avatar_url: '/avatars/steve-eisman.jpg',
    domains: ['Macro / Liquidity', 'Geopolitics'],
    scores: scores,
    weighted_score: weighted,
    youtube_search_queries: ['Steve Eisman', 'Steve Eisman interview', 'Real Eisman Playbook'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (sourceErr) {
    console.error('Source insert failed:', sourceErr.message);
    process.exit(1);
  }
  console.log('Source added:', source.id);
}

main();
