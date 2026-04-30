-- Long-form research dossiers attached directly to a ticker.
-- Separate from the source/content/predictions flow — these are curated
-- synthesis (howard-research, oai-deep-research, claude-deep-research, etc.)
-- and should NOT feed back into house-view aggregation.
--
-- Compounder dossiers continue to live on `core_watchlist.dossier_md` for
-- compounder-specific framing; asset_dossiers covers everything else.

CREATE TABLE IF NOT EXISTS asset_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  author TEXT NOT NULL,                  -- 'howard-research' | 'oai-deep-research' | 'claude-deep-research' | etc.
  as_of_date DATE NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_dossiers_ticker_date ON asset_dossiers(ticker, as_of_date DESC);
