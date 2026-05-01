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
    intuition_eq: 5,             // taste at the absolute top of operator-investor talent
    sincerity: 5,                // direct, no spin
    access: 5,                   // ex-GitHub CEO; Meta Superintelligence head; runs NFDG / AI Grant
    independence: 4,             // Meta affiliation now muddies marginally
    capital_at_risk: 5,          // NFDG portfolio is concentrated and personal
    reputational_sensitivity: 4,
    performance: 5,              // early-stage AI calls have been outstanding (Cursor, etc.)
  };
  const weighted = calculateWeightedScore(scores);
  console.log(`Nat Friedman credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error } = await supabase.from('sources').upsert({
    name: 'Nat Friedman',
    slug: 'nat-friedman',
    bio: 'Former CEO of GitHub; current head of Meta Superintelligence Labs. Co-runs NFDG investment vehicle and AI Grant with Daniel Gross. Operator-investor at the absolute top of the AI ecosystem — sees deal flow, talent, and infrastructure that almost no one else does. Famously contrarian + early on AI infra and tooling.',
    avatar_url: '/avatars/nat-friedman.jpg',
    domains: ['ai-semis'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: ['Nat Friedman interview', 'Nat Friedman AI'],
  }, { onConflict: 'slug' }).select().single();

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Source added: ${source.id}`);
}
main();
