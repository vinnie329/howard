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

// House Predictions — Howard's own synthesized, falsifiable predictions

export type HouseOutcome = 'correct' | 'incorrect' | 'partially_correct' | 'expired' | 'invalidated' | 'pending';

export interface HousePrediction {
  id: string;
  claim: string;
  asset: string;
  direction: 'long' | 'short' | 'neutral';
  target_value: number | null;
  target_condition: string;
  reference_value: number | null;
  time_horizon: string;
  deadline: string;
  confidence: number;          // 0-100
  conviction: 'high' | 'medium' | 'low';
  thesis: string;
  supporting_sources: string[];
  key_drivers: string[];
  invalidation_criteria: string | null;
  category: string;
  themes: string[];
  outcome: HouseOutcome;
  outcome_score: number | null;
  outcome_reasoning: string | null;
  final_value: number | null;
  evaluated_at: string | null;
  superseded_by: string | null;
  supersedes: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface HouseCalibration {
  confidence_bucket: number;   // 10, 20, ..., 90
  total_predictions: number;
  correct_predictions: number;
  actual_rate: number;
  calibration_error: number;
  category: string;
}

export interface HouseTrackRecord {
  id: string;
  total_predictions: number;
  evaluated: number;
  correct: number;
  partially_correct: number;
  incorrect: number;
  overall_accuracy: number;
  weighted_accuracy: number;   // weighted by confidence (high-confidence predictions matter more)
  brier_score: number;
  avg_confidence: number;
  best_category: string | null;
  worst_category: string | null;
  active_predictions: number;
  computed_at: string;
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
    insider_filings?: Array<{
      fund: string;
      manager?: string;
      form_type: string;
      filing_date: string;
      issuer?: string;
      ownership?: string;
      cost_basis_usd?: number;
      headline: string;
      significance?: string;
    }>;
    buildout_alerts?: Array<{
      ticker: string;
      name: string;
      category: string;
      agi_dependency: 'core' | 'optional' | 'hedge';
      current_price: number;
      buy_zone_max: number;
      in_zone: boolean;
      headline: string;
      significance?: string;
    }>;
    intelligence_signals?: Array<{
      signal_type: 'convergence' | 'tension';
      signal_kind: 'asset' | 'theme';
      signal_key: string;
      direction: 'bullish' | 'bearish' | null;
      source_count: number;
      avg_credibility: number;
      headline: string;
      implication?: string;
    }>;
    derived_implications?: Array<{
      order_n: number;
      affected_asset: string | null;
      affected_theme: string | null;
      direction: 'bullish' | 'bearish' | 'mixed';
      conviction: 'high' | 'medium' | 'low';
      parent_source: string;
      headline: string;
      reasoning: string;
    }>;
  };
  generated_at: string;
}

// ── Model Portfolio ──

export interface PortfolioSnapshot {
  id: string;
  generated_at: string;
  starting_capital: number;
  cash_allocation: number;
  total_positions: number;
  thesis_summary: string;
  risk_posture: 'aggressive' | 'moderate' | 'defensive';
  rebalance_reasoning: string | null;
  supersedes: string | null;
  is_current: boolean;
  created_at: string;
}

export interface PortfolioPosition {
  id: string;
  snapshot_id: string;
  ticker: string;
  asset_name: string;
  direction: 'long' | 'short';
  allocation_pct: number;
  entry_price: number | null;
  current_price: number | null;
  thesis: string;
  conviction: 'high' | 'medium' | 'low';
  confidence: number;
  category: string;
  time_horizon: string;
  house_prediction_ids: string[];
  source_prediction_ids: string[];
  supporting_sources: string[];
  key_drivers: string[];
  target_price: number | null;
  stop_loss_condition: string | null;
  created_at: string;
}

export interface PortfolioPerformance {
  id: string;
  snapshot_id: string;
  date: string;
  nav: number;
  daily_return_pct: number | null;
  cumulative_return_pct: number | null;
  spy_cumulative_pct: number | null;
  positions_data: Array<{ ticker: string; price: number; return_pct: number }>;
  created_at: string;
}
