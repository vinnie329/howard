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
    sincerity: 3,
    access: 5,
    independence: 3,
    capital_at_risk: 5,
    reputational_sensitivity: 4,
    performance: 4,
  };

  const weighted = calculateWeightedScore(scores);
  console.log(`All-In Podcast credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error: sourceErr } = await supabase.from('sources').upsert({
    name: 'All-In Podcast',
    slug: 'all-in-podcast',
    bio: 'Weekly podcast hosted by Chamath Palihapitiya, Jason Calacanis, David Sacks, and David Friedberg. Covers technology, economics, politics, and social issues from a Silicon Valley investor perspective.',
    avatar_url: '/avatars/all-in-podcast.jpg',
    domains: ['Macro / Liquidity', 'Venture / Startups', 'AI / Semiconductors', 'Geopolitics'],
    scores: scores,
    weighted_score: weighted,
    youtube_search_queries: ['All-In Podcast'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (sourceErr) {
    console.error('Source insert failed:', sourceErr.message);
    process.exit(1);
  }
  console.log('Source added:', source.name, source.id);
}

main();
