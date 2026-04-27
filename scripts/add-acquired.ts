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
    intuition_eq: 5,
    sincerity: 5,
    access: 5,
    independence: 4,    // run a fund, take sponsorships
    capital_at_risk: 4, // ACQ.VC fund deploys real capital
    reputational_sensitivity: 5,
    performance: 5,
  };
  const weighted = calculateWeightedScore(scores);
  console.log(`Acquired credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error } = await supabase.from('sources').upsert({
    name: 'Acquired',
    slug: 'acquired',
    bio: 'Ben Gilbert and David Rosenthal — long-form podcast on company stories, business strategy, and capital allocation. Has interviewed Buffett, Pichai, Zuck, Cook, Huang, Dean. Highest-quality long-form business research available; runs ACQ.VC fund investing in sponsors. Per principal thesis, the canonical example of the media-finance convergence pattern.',
    avatar_url: '/avatars/acquired.jpg',
    domains: ['tech-platforms', 'equities'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: ['Acquired podcast interview'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Source added: ${source.id}`);
}
main();
