import { createClient } from '@supabase/supabase-js';
import { calculateWeightedScore } from '../src/lib/scoring';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // --- Driss Ben-Brahim ---
  const drissScores = {
    intelligence: 5,
    intuition_eq: 5,
    sincerity: 3,
    access: 5,
    independence: 4,
    capital_at_risk: 5,
    reputational_sensitivity: 3,
    performance: 5,
  };

  const drissWeighted = calculateWeightedScore(drissScores);
  console.log(`Driss Ben-Brahim credibility score: ${drissWeighted.toFixed(2)}`);

  const { data: driss, error: drissErr } = await supabase.from('sources').upsert({
    name: 'Driss Ben-Brahim',
    slug: 'driss-ben-brahim',
    bio: 'Moroccan-German quantitative trader. Studied AI in Munich in 1987 before it was a field. Built Goldman Sachs\' rates volatility franchise into one of the most profitable desks on Wall Street. Co-founded BlueCrest Capital with Michael Platt. Known for combining deep mathematical intuition with macro trading across rates, FX, and volatility.',
    avatar_url: '/avatars/driss-ben-brahim.jpg',
    domains: ['Macro / Liquidity', 'Rates / Volatility', 'AI / Technology'],
    scores: drissScores,
    weighted_score: drissWeighted,
    youtube_search_queries: ['Driss Ben-Brahim', 'Driss Ben-Brahim BlueCrest', 'Driss Ben-Brahim Goldman Sachs'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (drissErr) {
    console.error('Driss insert failed:', drissErr.message);
  } else {
    console.log('Driss added:', driss.id);
  }

  // --- Greg Coffey ---
  const gregScores = {
    intelligence: 5,
    intuition_eq: 5,
    sincerity: 4,
    access: 5,
    independence: 5,
    capital_at_risk: 5,
    reputational_sensitivity: 3,
    performance: 5,
  };

  const gregWeighted = calculateWeightedScore(gregScores);
  console.log(`Greg Coffey credibility score: ${gregWeighted.toFixed(2)}`);

  const { data: greg, error: gregErr } = await supabase.from('sources').upsert({
    name: 'Greg Coffey',
    slug: 'greg-coffey',
    bio: 'Australian macro trader. Rose to become one of the highest-paid traders in London at GLG Partners, earning £100M+ annually. Famous for walking away from £200M at Moore Capital to return to Australia. Founded Kirkoswald Capital Partners. Known for extraordinary conviction trading across emerging markets, rates, and FX.',
    avatar_url: '/avatars/greg-coffey.jpg',
    domains: ['Macro / Liquidity', 'Emerging Markets'],
    scores: gregScores,
    weighted_score: gregWeighted,
    youtube_search_queries: ['Greg Coffey trader', 'Greg Coffey Kirkoswald', 'Greg Coffey GLG'],
    substack_url: null,
  }, { onConflict: 'slug' }).select().single();

  if (gregErr) {
    console.error('Greg insert failed:', gregErr.message);
  } else {
    console.log('Greg added:', greg.id);
  }
}

main();
