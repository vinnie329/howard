import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SCHEMA } from '../src/lib/db/schema';
import { calculateWeightedScore } from '../src/lib/scoring';
import type { CredibilityScores } from '../src/types';

const DB_PATH = path.join(process.cwd(), 'data', 'howard.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(SCHEMA);

const sources: Array<{
  name: string;
  slug: string;
  bio: string;
  avatar_url: string;
  domains: string[];
  scores: CredibilityScores;
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
  },
];

const now = new Date().toISOString();

const insertSource = db.prepare(`
  INSERT OR REPLACE INTO sources (id, name, slug, bio, avatar_url, domains, scores, weighted_score, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertContent = db.prepare(`
  INSERT OR REPLACE INTO content (id, source_id, platform, external_id, title, url, published_at, raw_text, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertAnalysis = db.prepare(`
  INSERT OR REPLACE INTO analyses (id, content_id, sentiment_overall, sentiment_score, assets_mentioned, themes, predictions, key_quotes, referenced_people, summary, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertPrediction = db.prepare(`
  INSERT OR REPLACE INTO predictions (id, content_id, source_id, claim, asset_or_theme, direction, time_horizon, confidence, status, notes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const seedAll = db.transaction(() => {
  const sourceIds: Record<string, string> = {};

  // Insert sources
  for (const source of sources) {
    const id = uuidv4();
    sourceIds[source.slug] = id;
    const weightedScore = calculateWeightedScore(source.scores);
    insertSource.run(
      id,
      source.name,
      source.slug,
      source.bio,
      source.avatar_url,
      JSON.stringify(source.domains),
      JSON.stringify(source.scores),
      weightedScore,
      now,
      now
    );
    console.log(`  Seeded source: ${source.name} (score: ${weightedScore})`);
  }

  // Insert mock content + analyses
  const mockContent = [
    {
      sourceSlug: 'howard-marks',
      platform: 'substack' as const,
      title: 'The Illusion of Knowledge',
      url: 'https://example.com/howard-marks/illusion-of-knowledge',
      published_at: '2026-02-05T10:00:00Z',
      raw_text:
        'We are entering a period where investors believe they know more than they actually do. The current market reminds me of 2007 — not in terms of specific mechanics, but in the overwhelming confidence that "this time is different." When everyone agrees on the outlook, the outlook is usually wrong.',
      analysis: {
        sentiment_overall: 'bearish' as const,
        sentiment_score: -0.6,
        assets_mentioned: ['S&P 500', 'US Treasuries', 'Credit'],
        themes: ['Market Complacency', 'Risk Assessment', 'Cycle Positioning'],
        predictions: ['Market correction within 12 months'],
        key_quotes: [
          'When everyone agrees on the outlook, the outlook is usually wrong.',
          'The current market reminds me of 2007.',
        ],
        referenced_people: ['Warren Buffett', 'Charlie Munger'],
        summary:
          'Marks warns of excessive market complacency, drawing parallels to pre-2008 sentiment. Advocates for defensive positioning and heightened risk awareness.',
      },
    },
    {
      sourceSlug: 'michael-howell',
      platform: 'youtube' as const,
      title: 'Global Liquidity Update: February 2026',
      url: 'https://youtube.com/watch?v=mock123',
      published_at: '2026-02-04T14:00:00Z',
      raw_text:
        'Global liquidity is entering a critical inflection point. The Fed\'s balance sheet is contracting, but private credit creation is offsetting some of the tightening. Net-net, we\'re seeing about $500B in liquidity drain over the next quarter. The key metric to watch is the Global Liquidity Index — it leads risk assets by about 6 weeks.',
      analysis: {
        sentiment_overall: 'bearish' as const,
        sentiment_score: -0.45,
        assets_mentioned: ['Bitcoin', 'NASDAQ', 'Gold', 'US Dollar'],
        themes: [
          'Liquidity Tightening',
          'Fed Balance Sheet',
          'Private Credit',
        ],
        predictions: [
          'Risk assets face headwinds in Q1 2026',
          '$500B liquidity drain over next quarter',
        ],
        key_quotes: [
          'Global liquidity is entering a critical inflection point.',
          'The Global Liquidity Index leads risk assets by about 6 weeks.',
        ],
        referenced_people: ['Jay Powell', 'Stanley Druckenmiller'],
        summary:
          'Howell identifies a net liquidity drain despite private credit offsetting Fed tightening. Signals caution for risk assets over the next quarter.',
      },
    },
    {
      sourceSlug: 'dylan-patel',
      platform: 'substack' as const,
      title: 'GPU CapEx: The Coming Correction',
      url: 'https://semianalysis.com/gpu-capex-correction',
      published_at: '2026-02-03T08:00:00Z',
      raw_text:
        'Hyperscaler GPU CapEx is reaching unsustainable levels. Microsoft alone is spending $80B+ annualized on AI infrastructure. The question isn\'t whether this spending slows — it\'s when and how abruptly. NVIDIA\'s forward guidance assumes continued acceleration, but our supply chain checks suggest a 15-20% reduction in orders for H2 2026.',
      analysis: {
        sentiment_overall: 'bearish' as const,
        sentiment_score: -0.35,
        assets_mentioned: ['NVIDIA', 'Microsoft', 'AMD', 'TSMC'],
        themes: [
          'GPU CapEx Saturation',
          'AI Infrastructure',
          'Semiconductor Cycle',
        ],
        predictions: [
          '15-20% reduction in GPU orders H2 2026',
          'NVIDIA guidance revision likely',
        ],
        key_quotes: [
          "The question isn't whether this spending slows — it's when and how abruptly.",
          'Our supply chain checks suggest a 15-20% reduction in orders.',
        ],
        referenced_people: ['Jensen Huang', 'Satya Nadella', 'Lisa Su'],
        summary:
          'Patel presents supply chain evidence of upcoming GPU CapEx reduction. Argues hyperscaler spending has overshot near-term AI revenue potential.',
      },
    },
    {
      sourceSlug: 'mike-burry',
      platform: 'twitter' as const,
      title: 'Burry 13F Filing Analysis — Q4 2025',
      url: 'https://example.com/burry-13f-q4-2025',
      published_at: '2026-02-01T12:00:00Z',
      raw_text:
        'Scion\'s latest 13F reveals a massive increase in put positions on QQQ and a new long position in physical gold ETFs. Burry appears to be positioning for a tech-led correction while seeking safety in hard assets. His portfolio concentration in these two trades suggests high conviction.',
      analysis: {
        sentiment_overall: 'bearish' as const,
        sentiment_score: -0.7,
        assets_mentioned: ['QQQ', 'Gold', 'GLD', 'NASDAQ'],
        themes: [
          'Tech Correction',
          'Hard Assets',
          'Portfolio Positioning',
        ],
        predictions: [
          'Tech-led market correction imminent',
          'Gold outperforms in H1 2026',
        ],
        key_quotes: [
          'Massive increase in put positions on QQQ.',
          'Portfolio concentration suggests high conviction.',
        ],
        referenced_people: ['Michael Burry'],
        summary:
          'Burry\'s 13F shows aggressive bearish positioning on tech via QQQ puts, paired with gold longs. High conviction contrarian bet on tech correction.',
      },
    },
  ];

  for (const item of mockContent) {
    const contentId = uuidv4();
    const sourceId = sourceIds[item.sourceSlug];

    insertContent.run(
      contentId,
      sourceId,
      item.platform,
      `mock-${contentId.slice(0, 8)}`,
      item.title,
      item.url,
      item.published_at,
      item.raw_text,
      now
    );

    const analysisId = uuidv4();
    insertAnalysis.run(
      analysisId,
      contentId,
      item.analysis.sentiment_overall,
      item.analysis.sentiment_score,
      JSON.stringify(item.analysis.assets_mentioned),
      JSON.stringify(item.analysis.themes),
      JSON.stringify(item.analysis.predictions),
      JSON.stringify(item.analysis.key_quotes),
      JSON.stringify(item.analysis.referenced_people),
      item.analysis.summary,
      now
    );

    // Create predictions from analysis
    for (const pred of item.analysis.predictions) {
      const predId = uuidv4();
      insertPrediction.run(
        predId,
        contentId,
        sourceId,
        pred,
        item.analysis.assets_mentioned[0] || 'Market',
        item.analysis.sentiment_overall === 'bearish' ? 'down' : 'up',
        '3-6 months',
        'medium',
        'pending',
        '',
        now
      );
    }

    console.log(`  Seeded content: "${item.title}"`);
  }
});

console.log('Seeding Howard database...\n');
seedAll();
console.log('\nDone! Database seeded at:', DB_PATH);

db.close();
