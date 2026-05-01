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
    intelligence: 5,             // protocol research at the top of the field (Dan Robinson, Charlie Noyes, Georgios K, etc.)
    intuition_eq: 4,
    sincerity: 4,                // publishes pre-investment research; framing can be selective
    access: 5,                   // top-tier crypto + DeFi access
    independence: 3,             // commercial bias — Paradigm invests in protocols it researches
    capital_at_risk: 5,          // Paradigm fund actively deploying
    reputational_sensitivity: 5, // academic-style protocol papers; reputation is core
    performance: 4,              // strong early-stage DeFi calls (Uniswap, MakerDAO, many winners)
  };
  const weighted = calculateWeightedScore(scores);
  console.log(`Paradigm credibility score: ${weighted.toFixed(2)}`);

  const { data: source, error } = await supabase.from('sources').upsert({
    name: 'Paradigm',
    slug: 'paradigm',
    bio: 'Crypto-native investment + research firm. Top-tier protocol-level research — Dan Robinson, Charlie Noyes, Georgios Konstantopoulos, Jose Maria Macedo. Channel-as-source: deep technical papers on Bitcoin / Ethereum / DeFi mechanism design, MEV, cryptography. Note commercial bias — they invest in protocols they research.',
    avatar_url: '/avatars/paradigm.jpg',
    domains: ['crypto'],
    scores,
    weighted_score: weighted,
    youtube_search_queries: [],
  }, { onConflict: 'slug' }).select().single();

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Source added: ${source.id}`);
}
main();
