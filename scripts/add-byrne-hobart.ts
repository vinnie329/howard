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
    access: 3,
    independence: 5,
    capital_at_risk: 3,
    reputational_sensitivity: 4,
    performance: 3,
  };

  const weighted = calculateWeightedScore(scores);
  console.log(`Byrne Hobart credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error: sourceErr } = await supabase.from('sources').upsert({
    name: 'Byrne Hobart',
    slug: 'byrne-hobart',
    bio: 'Author of The Diff, a newsletter on inflections in finance and technology. Known for deep-dive analysis on business models, capital allocation, and macro themes.',
    avatar_url: '/avatars/byrne-hobart.jpg',
    domains: ['Macro / Liquidity', 'AI / Semiconductors', 'Venture / Startups'],
    scores: scores,
    weighted_score: weighted,
    youtube_search_queries: ['Byrne Hobart interview', 'Byrne Hobart The Diff'],
    substack_url: 'https://www.thediff.co',
  }, { onConflict: 'slug' }).select().single();

  if (sourceErr) {
    console.error('Source insert failed:', sourceErr.message);
    process.exit(1);
  }
  console.log('Source added:', source.id);
}

main();
