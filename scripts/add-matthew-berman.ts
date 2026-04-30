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
    sincerity: 4,
    access: 4,                   // gets sit-downs with AI / cloud execs (Kurian, etc.)
    independence: 3,             // depends on AI industry for guests / sponsorships
    capital_at_risk: 2,
    reputational_sensitivity: 3,
    performance: 3,              // no explicit prediction track record — value is in his guests
  };
  const weighted = calculateWeightedScore(scores);
  console.log(`Matthew Berman credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error } = await supabase.from('sources').upsert({
    name: 'Matthew Berman',
    slug: 'matthew-berman',
    bio: 'AI-focused YouTuber who interviews tech / cloud / model-lab execs (Google Cloud, Anthropic, etc.). Channel-as-source — value is in the access to guests, not Berman\'s own takes.',
    avatar_url: '/avatars/matthew-berman.jpg',
    domains: ['ai-semis'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: ['Matthew Berman'],
  }, { onConflict: 'slug' }).select().single();

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Source added: ${source.id}`);
}
main();
