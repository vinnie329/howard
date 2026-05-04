-- Conditional / sequenced predictions: capture predictions that are gated on
-- a future trigger (e.g. "S&P bottoms in Q3 2026, then 20%+ rally into pre-
-- election" — the rally leg is conditional on the bottom landing first).
--
-- Without this, the portfolio synthesizer treats forward-deployment plans
-- as live positions (the SPY long+short bug). With activation_condition
-- populated, generate-portfolio.ts can filter conditionals out of the live
-- book until their trigger fires.

ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS activation_condition TEXT;

ALTER TABLE house_predictions
  ADD COLUMN IF NOT EXISTS activation_condition TEXT,
  ADD COLUMN IF NOT EXISTS activation_status TEXT NOT NULL DEFAULT 'active';
  -- 'active' (no condition or condition met) | 'pending_trigger' | 'expired'

CREATE INDEX IF NOT EXISTS idx_house_predictions_activation_status
  ON house_predictions(activation_status);
