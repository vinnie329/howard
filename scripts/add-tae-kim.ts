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
    intuition_eq: 4,
    sincerity: 4,
    access: 4,
    independence: 4,
    capital_at_risk: 3,
    reputational_sensitivity: 4,
    performance: 4,
  };

  const weighted = calculateWeightedScore(scores);
  console.log(`Tae Kim credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error: sourceErr } = await supabase.from('sources').upsert({
    name: 'Tae Kim',
    slug: 'tae-kim',
    bio: 'Former sell-side analyst and financial journalist. Host on TBPN covering semiconductors, AI infrastructure, and tech investing with deep industry sourcing.',
    avatar_url: '/avatars/tae-kim.jpg',
    domains: ['AI / Semiconductors', 'Technology'],
    scores: scores,
    weighted_score: weighted,
    youtube_search_queries: ['Tae Kim TBPN', 'Tae Kim interview', 'Tae Kim Nvidia'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (sourceErr) {
    console.error('Source insert failed:', sourceErr.message);
    process.exit(1);
  }
  console.log('Source added:', source.id);
}

main();
