import { createClient } from '@supabase/supabase-js';
import { calculateWeightedScore } from '../src/lib/scoring';
import type { CredibilityScores } from '../src/types';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sources: Array<{
  name: string;
  slug: string;
  bio: string;
  avatar_url: string;
  domains: string[];
  scores: CredibilityScores;
  youtube_search_queries: string[];
  substack_url: string | null;
}> = [
  {
    name: 'Howard Marks',
    slug: 'howard-marks',
    bio: 'Co-chairman of Oaktree Capital Management. Known for his insightful memos on market cycles, risk assessment, and investor psychology.',
    avatar_url: '/avatars/howard-marks.jpg',
    domains: ['Macro / Liquidity'],
    scores: {
      intelligence: 4,
      intuition_eq: 5,
      sincerity: 4,
      access: 4,
      independence: 4,
      capital_at_risk: 5,
      reputational_sensitivity: 4,
      performance: 5,
    },
    youtube_search_queries: ['Howard Marks Oaktree', 'Howard Marks interview'],
    substack_url: null,
  },
  {
    name: 'Michael Howell',
    slug: 'michael-howell',
    bio: 'CEO of CrossBorder Capital. Leading authority on global liquidity flows and their impact on asset prices.',
    avatar_url: '/avatars/michael-howell.jpg',
    domains: ['Macro / Liquidity'],
    scores: {
      intelligence: 4,
      intuition_eq: 4,
      sincerity: 5,
      access: 5,
      independence: 4,
      capital_at_risk: 2,
      reputational_sensitivity: 5,
      performance: 5,
    },
    youtube_search_queries: ['Michael Howell CrossBorder Capital', 'Michael Howell liquidity'],
    substack_url: null,
  },
  {
    name: 'Mike Burry',
    slug: 'mike-burry',
    bio: 'Founder of Scion Asset Management. Famous for predicting the 2008 financial crisis. Contrarian investor with deep value focus.',
    avatar_url: '/avatars/mike-burry.jpg',
    domains: ['Macro / Liquidity'],
    scores: {
      intelligence: 5,
      intuition_eq: 3,
      sincerity: 5,
      access: 3,
      independence: 5,
      capital_at_risk: 5,
      reputational_sensitivity: 2,
      performance: 5,
    },
    youtube_search_queries: ['Michael Burry interview', 'Michael Burry 13F'],
    substack_url: null,
  },
  {
    name: 'Ashok Varadhan',
    slug: 'ashok-varadhan',
    bio: 'Co-head of Goldman Sachs Global Banking & Markets. Deep expertise in rates, currencies, and macro trading.',
    avatar_url: '/avatars/ashok-varadhan.jpg',
    domains: ['Macro / Liquidity'],
    scores: {
      intelligence: 4,
      intuition_eq: 5,
      sincerity: 3,
      access: 5,
      independence: 4,
      capital_at_risk: 4,
      reputational_sensitivity: 4,
      performance: 4,
    },
    youtube_search_queries: ['Ashok Varadhan Goldman Sachs', 'Ashok Varadhan interview'],
    substack_url: null,
  },
  {
    name: 'Dylan Patel',
    slug: 'dylan-patel',
    bio: 'Chief analyst at SemiAnalysis. Leading voice on semiconductor supply chains, AI compute infrastructure, and chip architecture.',
    avatar_url: '/avatars/dylan-patel.jpg',
    domains: ['AI / Semiconductors'],
    scores: {
      intelligence: 4,
      intuition_eq: 4,
      sincerity: 4,
      access: 5,
      independence: 4,
      capital_at_risk: 2,
      reputational_sensitivity: 4,
      performance: 4,
    },
    youtube_search_queries: ['Dylan Patel SemiAnalysis', 'Dylan Patel interview'],
    substack_url: null,
  },
];

async function seed() {
  console.log('Seeding Howard sources to Supabase...\n');

  for (const source of sources) {
    const weightedScore = calculateWeightedScore(source.scores);

    const { error } = await supabase.from('sources').upsert(
      {
        name: source.name,
        slug: source.slug,
        bio: source.bio,
        avatar_url: source.avatar_url,
        domains: source.domains,
        scores: source.scores,
        weighted_score: weightedScore,
        youtube_search_queries: source.youtube_search_queries,
        substack_url: source.substack_url,
      },
      { onConflict: 'slug' }
    );

    if (error) {
      console.error(`  Error seeding ${source.name}:`, error.message);
    } else {
      console.log(`  Seeded: ${source.name} (score: ${weightedScore})`);
    }
  }

  console.log('\nDone!');
}

seed();
