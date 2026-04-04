-- Per-source compiled knowledge state
-- Maintains a running summary of each source's current thesis, positions, and evolving views
CREATE TABLE source_state (
  source_id UUID PRIMARY KEY REFERENCES sources(id) ON DELETE CASCADE,
  state TEXT NOT NULL,  -- markdown knowledge doc
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-theme cross-source knowledge state
-- Synthesizes bull/bear cases, key debates, and contributing sources for each theme
CREATE TABLE theme_state (
  theme TEXT PRIMARY KEY,  -- canonical theme name (e.g. 'Liquidity', 'AI CapEx')
  state TEXT NOT NULL,  -- markdown knowledge doc
  sources JSONB DEFAULT '[]',  -- array of source slugs contributing to this theme
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
