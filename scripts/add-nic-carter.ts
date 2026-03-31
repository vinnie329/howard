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
    access: 4,
    independence: 5,
    capital_at_risk: 3,
    reputational_sensitivity: 4,
    performance: 4,
  };

  const weighted = calculateWeightedScore(scores);
  console.log(`Nic Carter credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error: sourceErr } = await supabase.from('sources').upsert({
    name: 'Nic Carter',
    slug: 'nic-carter',
    bio: 'Partner at Castle Island Ventures. Leading voice on Bitcoin, crypto regulation, proof-of-reserves, and digital asset infrastructure. Former Fidelity analyst.',
    avatar_url: '/avatars/nic-carter.jpg',
    domains: ['Crypto / Digital Assets', 'Technology'],
    scores: scores,
    weighted_score: weighted,
    youtube_search_queries: ['Nic Carter', 'Nic Carter Bitcoin', 'Nic Carter interview'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (sourceErr) {
    console.error('Source insert failed:', sourceErr.message);
    process.exit(1);
  }
  console.log('Source added:', source.id);
}

main();
