-- Theme graph: themes become first-class queryable nodes with directed edges.
-- Lets the system traverse "AI capex → memory constraint → smartphone
-- reallocation → AAPL bear" structurally instead of relying on Claude to
-- re-derive the chain in conversation each time.

CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,                                -- 'macro' | 'sector' | 'asset_class' | 'meta' | etc.
  description TEXT,
  prediction_count INT NOT NULL DEFAULT 0,
  bullish_count INT NOT NULL DEFAULT 0,
  bearish_count INT NOT NULL DEFAULT 0,
  avg_credibility NUMERIC(4, 2),
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_themes_count ON themes(prediction_count DESC);

CREATE TABLE IF NOT EXISTS theme_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  target_theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL,                      -- 'implies' | 'contradicts' | 'amplifies' | 'co_occurs' | 'requires'
  weight NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
  reasoning TEXT,
  derived_from TEXT NOT NULL,                   -- 'co_occurrence' | 'claude_derivation' | 'implication_chain' | 'manual'
  occurrence_count INT,                          -- predictions co-mentioning both themes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_theme_id, target_theme_id, edge_type)
);

CREATE INDEX IF NOT EXISTS idx_theme_edges_source ON theme_edges(source_theme_id, edge_type);
CREATE INDEX IF NOT EXISTS idx_theme_edges_target ON theme_edges(target_theme_id, edge_type);
