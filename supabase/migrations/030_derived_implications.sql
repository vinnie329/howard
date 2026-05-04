-- Derived implications: 2nd / 3rd order chains from high-credibility predictions
-- to OTHER tracked assets and themes.
--
-- Example: SemiAnalysis predicts Anthropic ARR $9B → $44B (parent, 1st order)
--   → 2nd order: NVDA pricing power validated
--   → 2nd order: MU / SK Hynix margin expansion
--   → 3rd order: AAPL bear (smartphone DRAM reallocated to DCs)
--
-- Each implication carries provenance back to the parent prediction so we
-- can show the chain. The daily briefing surfaces new derivations
-- separately from direct predictions — they are weaker signal individually
-- but useful for tracing how a single landing thesis ripples through the
-- portfolio surface.

CREATE TABLE IF NOT EXISTS derived_implications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  parent_source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  parent_source_name TEXT,                     -- snapshot for fast rendering
  parent_source_credibility NUMERIC(4, 2),     -- snapshot at derivation time
  parent_claim TEXT NOT NULL,                  -- snapshot of parent claim
  -- The implication
  order_n INT NOT NULL,                        -- 2 or 3 (or higher)
  affected_asset TEXT,                         -- ticker (NULL if theme-only)
  affected_theme TEXT,                         -- theme name (NULL if asset-only)
  direction TEXT NOT NULL,                     -- 'bullish' | 'bearish' | 'mixed'
  conviction TEXT NOT NULL,                    -- 'high' | 'medium' | 'low'
  reasoning TEXT NOT NULL,                     -- one-sentence justification
  derivation_steps TEXT[],                     -- chain of intermediate steps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_derived_implications_parent ON derived_implications(parent_prediction_id);
CREATE INDEX IF NOT EXISTS idx_derived_implications_asset ON derived_implications(affected_asset);
CREATE INDEX IF NOT EXISTS idx_derived_implications_theme ON derived_implications(affected_theme);
CREATE INDEX IF NOT EXISTS idx_derived_implications_created ON derived_implications(created_at DESC);
