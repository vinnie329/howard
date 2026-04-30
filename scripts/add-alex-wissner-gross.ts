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
    capital_at_risk: 5,
    reputational_sensitivity: 4,
    performance: 3,
  };

  const weighted = calculateWeightedScore(scores);
  console.log(`Alex Wissner-Gross credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error: sourceErr } = await supabase.from('sources').upsert({
    name: 'Alex Wissner-Gross',
    slug: 'alex-wissner-gross',
    bio: 'Harvard research fellow, physicist, and AI researcher. Co-founder of O21T venture fund and Physical Super Intelligence (PSI). Co-hosts Moonshots podcast with Peter Diamandis. Focuses on post-singularity investing, AI rights, and using superintelligence to solve physics.',
    avatar_url: '/avatars/alex-wissner-gross.jpg',
    domains: ['AI / Technology', 'Venture Capital', 'Macro / Liquidity'],
    scores: scores,
    weighted_score: weighted,
    youtube_search_queries: ['Alex Wissner-Gross', 'Alex Wissner-Gross AI', 'Wissner-Gross singularity', 'Moonshots podcast'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (sourceErr) {
    console.error('Source insert failed:', sourceErr.message);
    process.exit(1);
  }
  console.log('Source added:', source.id);
}

main();
