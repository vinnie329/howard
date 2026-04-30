-- Allow a dossier to be attached to multiple tickers (thematic dossiers like
-- "robotics silicon winners" naturally span TI / ADI / NVDA / Sony / Infineon).
-- The primary `ticker` field stays as the anchor; `related_tickers` lets the
-- dossier surface on additional asset pages without duplicating the body.

ALTER TABLE asset_dossiers
  ADD COLUMN IF NOT EXISTS related_tickers TEXT[];

CREATE INDEX IF NOT EXISTS idx_asset_dossiers_related_tickers
  ON asset_dossiers USING GIN(related_tickers);
