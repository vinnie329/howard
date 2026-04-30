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
    intelligence: 3,
    intuition_eq: 3,
    sincerity: 3,                // anonymous, polemical, traffic-driven
    access: 3,                   // well-sourced for sell-side flow / market color
    independence: 4,
    capital_at_risk: 2,
    reputational_sensitivity: 2, // anonymous → low brand cost for being wrong
    performance: 3,
  };
  const weighted = calculateWeightedScore(scores);
  console.log(`ZeroHedge credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error } = await supabase.from('sources').upsert({
    name: 'ZeroHedge',
    slug: 'zerohedge',
    bio: 'Anonymous markets/macro aggregator with bearish-contrarian bias. Useful for fast sell-side flow color and tape commentary; signal value mixed — treat as input, not authority.',
    avatar_url: '/avatars/zerohedge.jpg',
    domains: ['macro'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: [],
  }, { onConflict: 'slug' }).select().single();

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Source added: ${source.id}`);
}
main();
