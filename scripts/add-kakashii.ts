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
    access: 4,                  // very plugged in to AI/semis flow even without insider title
    independence: 5,            // anonymous, no commercial bias on positions
    capital_at_risk: 4,
    reputational_sensitivity: 3, // anonymous lowers this; less brand-protective than a Patel
    performance: 4,
  };
  const weighted = calculateWeightedScore(scores);
  console.log(`Kakashii credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error } = await supabase.from('sources').upsert({
    name: 'Kakashii',
    slug: 'kakashii',
    bio: 'Anonymous AI/semis researcher and writer of "Kakashii\'s Materials" on Substack. Deep technical coverage of AI compute supply, hyperscaler capex, semiconductor cycle dynamics. Strong call record on SOXX/NVDA/compute-shortage themes. Independent (anonymous) — no commercial conflicts.',
    avatar_url: '/avatars/kakashii.jpg',
    domains: ['ai-semis'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: [],
    substack_url: 'https://kakashii.substack.com',
  }, { onConflict: 'slug' }).select().single();

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Source added: ${source.id}`);
}
main();
