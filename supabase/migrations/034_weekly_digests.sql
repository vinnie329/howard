-- Weekly meta-synthesis: every Monday morning, a Claude pass that reviews
-- the week's convergences, tensions resolved, derived implications, and
-- new high-cred predictions, and writes a structured "what changed in the
-- system's view this week" digest.
--
-- Distinct from the daily briefing — this is the meta layer that captures
-- thesis evolution rather than day-to-day intelligence.

CREATE TABLE IF NOT EXISTS weekly_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,            -- Monday of the week (UTC)
  week_end DATE NOT NULL,                     -- Sunday of the week
  -- Free-form synthesis
  digest_md TEXT NOT NULL,                    -- markdown body
  thesis_summary TEXT NOT NULL,               -- 2-3 sentence top-line
  -- Structured highlights
  thesis_evolution JSONB,                     -- { theme: change_description }
  net_directional_calls JSONB,                -- { asset: 'bullish' | 'bearish' | 'mixed' }
  watchlist_movers JSONB,                     -- buildout / compounder names that hit zones
  -- Provenance
  signals_count INT NOT NULL DEFAULT 0,
  resolutions_count INT NOT NULL DEFAULT 0,
  implications_count INT NOT NULL DEFAULT 0,
  new_predictions_count INT NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_digests_week ON weekly_digests(week_start DESC);
