-- Tension resolutions: structured adjudication of cross-source disagreements
-- detected by the convergence/tension layer.
--
-- For each active tension (e.g., ORCL bull/bear, US Treasuries 3v3), runs a
-- Claude pass that compares source credibilities, recency, time horizons, and
-- specializations. Output: which side has more weight, what the actual point
-- of disagreement is (often timing not direction), and what evidence would
-- resolve it.

CREATE TABLE IF NOT EXISTS tension_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL REFERENCES intelligence_signals(id) ON DELETE CASCADE,
  -- The resolution
  resolution_type TEXT NOT NULL,             -- 'side_a_wins' | 'side_b_wins' | 'both_right_different_horizons' | 'unresolvable_pending_evidence' | 'genuine_uncertainty'
  winning_side TEXT,                         -- 'bullish' | 'bearish' | null
  confidence INT NOT NULL,                   -- 0-100 confidence in the adjudication
  point_of_disagreement TEXT NOT NULL,       -- e.g. "This is timing not direction"
  reasoning TEXT NOT NULL,                   -- full analysis
  resolving_evidence TEXT[],                 -- what data would settle it
  net_recommendation TEXT,                   -- one-line trade / watch implication
  source_weighting_factor TEXT,              -- e.g. "Cred-weighted bull; Recency-weighted bear"
  -- Provenance
  bull_avg_cred NUMERIC(4, 2),
  bear_avg_cred NUMERIC(4, 2),
  bull_count INT,
  bear_count INT,
  bull_sources TEXT[],
  bear_sources TEXT[],
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  refresh_count INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_tension_resolutions_signal ON tension_resolutions(signal_id);
CREATE INDEX IF NOT EXISTS idx_tension_resolutions_resolved ON tension_resolutions(resolved_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tension_resolutions_signal_unique ON tension_resolutions(signal_id);
