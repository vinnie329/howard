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
  guest: string | null;
  created_at: string;
}

export interface Analysis {
  id: string;
  content_id: string;
  display_title?: string;
  sentiment_overall: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  sentiment_score: number;
  assets_mentioned: string[];
  themes: string[];
  predictions: string[];
  key_quotes: string[];
  referenced_people: string[];
  summary: string;
  created_at: string;
}

export type PredictionOutcome = 'correct' | 'incorrect' | 'partially_correct' | 'expired' | 'pending';

export interface Prediction {
  id: string;
  content_id: string;
  source_id: string;
  claim: string;
  themes: string[];
  assets_mentioned: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  time_horizon: string;
  confidence: string;
  specificity: 'hard' | 'directional' | 'thematic';
  date_made: string;
  notes: string;
  outcome: PredictionOutcome;
  outcome_reasoning: string | null;
  outcome_score: number | null;
  evaluated_at: string | null;
  market_context: Record<string, unknown>;
  created_at: string;
}

export interface SourcePerformance {
  id: string;
  source_id: string;
  total_predictions: number;
  evaluated_predictions: number;
  correct: number;
  incorrect: number;
  partially_correct: number;
  expired: number;
  accuracy_rate: number;
  weighted_accuracy: number;
  avg_confidence_when_correct: number;
  avg_confidence_when_incorrect: number;
  best_domain: string | null;
  worst_domain: string | null;
  performance_by_horizon: Record<string, { total: number; correct: number; accuracy: number }>;
  performance_by_specificity: Record<string, { total: number; correct: number; accuracy: number }>;
  streak_current: number;
  streak_best: number;
  last_evaluated_at: string | null;
  updated_at: string;
}

export interface BacktestRun {
  id: string;
  predictions_evaluated: number;
  predictions_resolved: number;
  sources_updated: number;
  run_duration_ms: number | null;
  notes: string | null;
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

export interface OutlookThesisPoint {
  heading: string;
  content: string;
}

export interface Outlook {
  id: string;
  time_horizon: 'short' | 'medium' | 'long';
  domain: string;
  title: string;
  subtitle: string;
  thesis_intro: string;
  thesis_points: OutlookThesisPoint[];
  positioning: string[];
  key_themes: string[];
  sentiment: 'bullish' | 'bearish' | 'cautious' | 'neutral';
  confidence: number;
  supporting_sources: { name: string; weight: number }[];
  last_updated: string;
  created_at: string;
}

export interface OutlookHistory {
  id: string;
  outlook_id: string;
  time_horizon: 'short' | 'medium' | 'long';
  evaluation_reasoning: string;
  changes_summary: string[];
  previous_sentiment: string;
  new_sentiment: string;
  previous_confidence: number;
  new_confidence: number;
  analyses_evaluated: number;
  created_at: string;
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

// Prediction Markets

export interface PredictionMarket {
  id: string;
  source: 'kalshi' | 'polymarket';
  market_id: string;
  title: string;
  category: string | null;
  tags: string[];
  resolution_date: string | null;
  is_watched: boolean;
  discovered_at: string;
}

export interface PredictionMarketSnapshot {
  id: string;
  market_id: string;
  yes_price: number;
  volume_24h: number | null;
  open_interest: number | null;
  total_volume: number | null;
  captured_at: string;
}

export interface MarketWithSnapshot extends PredictionMarket {
  current_price: number;
  price_change_24h: number;
  volume_24h: number;
  trend: number[];
}

// Daily Update

export interface DailyUpdate {
  date: string;
  summary: string;
  sections: {
    new_content: {
      count: number;
      highlights: Array<{
        source: string;
        title: string;
        sentiment: string;
        summary: string;
      }>;
    };
    technical_moves: Array<{
      ticker: string;
      name: string;
      change: string;
      significance: string;
    }>;
    market_moves: Array<{
      title: string;
      source: string;
      previous_price: number;
      current_price: number;
      change: number;
    }>;
    signal_changes: Array<{
      type: string;
      headline: string;
      detail: string;
      severity: string;
    }>;
    outlook_changes: Array<{
      time_horizon: string;
      previous_sentiment: string;
      new_sentiment: string;
      reasoning: string;
    }>;
    fedwatch_changes: {
      summary: string;
      meetings: Array<{
        date: string;
        most_likely_range: string;
        probability: number;
        change_vs_prior?: string;
      }>;
    };
    holdings_changes: Array<{
      fund: string;
      action: string;
      ticker: string;
      detail: string;
    }>;
  };
  generated_at: string;
}
