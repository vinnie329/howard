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
    reputational_sensitivity: 4,
    performance: 4,
  };

  const weighted = calculateWeightedScore(scores);
  console.log(`Sholto Douglas credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error: sourceErr } = await supabase.from('sources').upsert({
    name: 'Sholto Douglas',
    slug: 'sholto-douglas',
    bio: 'AI researcher and analyst known for deep technical analysis of AI scaling laws, GPU economics, and semiconductor supply chains. Prolific writer on the intersection of AI infrastructure and financial markets.',
    avatar_url: '/avatars/sholto-douglas.jpg',
    domains: ['AI / Semiconductors', 'Macro / Liquidity'],
    scores: scores,
    weighted_score: weighted,
    youtube_search_queries: ['Sholto Douglas interview', 'Sholto Douglas AI'],
  }, { onConflict: 'slug' }).select().single();

  if (sourceErr) {
    console.error('Source insert failed:', sourceErr.message);
    process.exit(1);
  }
  console.log('Source added:', source.id);
}

main();
