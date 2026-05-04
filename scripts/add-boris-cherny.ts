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
    intelligence: 5,             // top-tier eng at Anthropic
    intuition_eq: 4,
    sincerity: 5,                // engineer-direct framing; less marketing-laden than executives
    access: 5,                   // architect of Claude Code; sees Anthropic roadmap from inside
    independence: 3,             // Anthropic commercial bias — promoting their product
    capital_at_risk: 4,          // Anthropic equity
    reputational_sensitivity: 4,
    performance: 4,              // Claude Code = single most successful agentic AI product to date
  };
  const weighted = calculateWeightedScore(scores);
  console.log(`Boris Cherny credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error } = await supabase.from('sources').upsert({
    name: 'Boris Cherny',
    slug: 'boris-cherny',
    bio: 'Lead engineer / architect of Claude Code at Anthropic. Most direct technical voice on agentic AI from inside the team that built the breakthrough product. Best read in the system on what coding agents can / cannot do, where the next inflections are, and what compute they consume. Anthropic commercial bias to factor in.',
    avatar_url: '/avatars/boris-cherny.jpg',
    domains: ['ai-semis'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: ['Boris Cherny Anthropic', 'Claude Code engineering'],
  }, { onConflict: 'slug' }).select().single();

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Source added: ${source.id}`);
}
main();
