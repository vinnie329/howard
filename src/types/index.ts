export interface Source {
  id: string;
  name: string;
  slug: string;
  bio: string;
  avatar_url: string;
  domains: string[];
  scores: CredibilityScores;
  weighted_score: number;
  created_at: string;
  updated_at: string;
}

export interface CredibilityScores {
  intelligence: number;
  intuition_eq: number;
  sincerity: number;
  access: number;
  independence: number;
  capital_at_risk: number;
  reputational_sensitivity: number;
  performance: number;
}

export type CredibilityDimension = keyof CredibilityScores;

export interface Content {
  id: string;
  source_id: string;
  platform: 'youtube' | 'substack' | 'twitter';
  external_id: string;
  title: string;
  url: string;
  published_at: string;
  raw_text: string;
  created_at: string;
}

export interface Analysis {
  id: string;
  content_id: string;
  sentiment_overall: 'bullish' | 'bearish' | 'neutral';
  sentiment_score: number;
  assets_mentioned: string[];
  themes: string[];
  predictions: string[];
  key_quotes: string[];
  referenced_people: string[];
  summary: string;
  created_at: string;
}

export interface Prediction {
  id: string;
  content_id: string;
  source_id: string;
  claim: string;
  asset_or_theme: string;
  direction: string;
  time_horizon: string;
  confidence: string;
  status: 'pending' | 'correct' | 'incorrect' | 'unfalsifiable';
  resolved_at: string | null;
  notes: string;
  created_at: string;
}

export interface ContentWithAnalysis extends Content {
  source: Source;
  analysis: Analysis;
}

export interface TrendingTopic {
  rank: number;
  title: string;
  mentions: number;
  trend: 'up' | 'down' | 'stable';
}

export interface UntrackedSignal {
  name: string;
  mentioned_by: string[];
  context: string;
}

export interface PulseSummaryData {
  sentiment: string;
  theme: string;
  divergences: string;
  signal_count: string;
}

export const DOMAINS = [
  'Macro / Liquidity',
  'AI / Semiconductors',
  'Crypto / Digital Assets',
  'Credit / Fixed Income',
  'Commodities / Energy',
  'Geopolitics',
  'Venture / Startups',
] as const;

export type Domain = (typeof DOMAINS)[number];
