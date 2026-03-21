-- Migration: Add prediction outcome tracking and source performance scoring
-- This enables automated backtesting of predictions and per-source accuracy dashboards.

-- Add resolution fields to predictions table
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('correct', 'incorrect', 'partially_correct', 'expired', 'pending')),
  ADD COLUMN IF NOT EXISTS outcome_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS outcome_score NUMERIC CHECK (outcome_score >= 0 AND outcome_score <= 1),
  ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS market_context JSONB DEFAULT '{}';

-- Default existing predictions to 'pending'
UPDATE predictions SET outcome = 'pending' WHERE outcome IS NULL;
ALTER TABLE predictions ALTER COLUMN outcome SET DEFAULT 'pending';

-- Source performance cache table
-- Stores computed accuracy metrics per source, refreshed by the backtesting pipeline
CREATE TABLE IF NOT EXISTS source_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  total_predictions INTEGER NOT NULL DEFAULT 0,
  evaluated_predictions INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  incorrect INTEGER NOT NULL DEFAULT 0,
  partially_correct INTEGER NOT NULL DEFAULT 0,
  expired INTEGER NOT NULL DEFAULT 0,
  accuracy_rate NUMERIC DEFAULT 0,
  weighted_accuracy NUMERIC DEFAULT 0,
  avg_confidence_when_correct NUMERIC DEFAULT 0,
  avg_confidence_when_incorrect NUMERIC DEFAULT 0,
  best_domain TEXT,
  worst_domain TEXT,
  performance_by_horizon JSONB DEFAULT '{}',
  performance_by_specificity JSONB DEFAULT '{}',
  streak_current INTEGER DEFAULT 0,
  streak_best INTEGER DEFAULT 0,
  last_evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id)
);

-- Backtest run log — records each batch evaluation run
CREATE TABLE IF NOT EXISTS backtest_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  predictions_evaluated INTEGER NOT NULL DEFAULT 0,
  predictions_resolved INTEGER NOT NULL DEFAULT 0,
  sources_updated INTEGER NOT NULL DEFAULT 0,
  run_duration_ms INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying predictions by outcome status
CREATE INDEX IF NOT EXISTS idx_predictions_outcome ON predictions(outcome);
CREATE INDEX IF NOT EXISTS idx_predictions_evaluated_at ON predictions(evaluated_at);
CREATE INDEX IF NOT EXISTS idx_source_performance_source_id ON source_performance(source_id);
