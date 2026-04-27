-- Migration: long-form research dossier on compounder watchlist entries.
-- The thesis/runway/pricing-power fields are short summaries; dossier_md is
-- the full markdown research note (e.g. a Claude-generated company report).
-- One dossier per ticker; replaced wholesale on update. (Versioning can come
-- later if we need to track how a thesis evolved.)

ALTER TABLE core_watchlist
  ADD COLUMN IF NOT EXISTS dossier_md TEXT,
  ADD COLUMN IF NOT EXISTS dossier_updated_at TIMESTAMPTZ;
