-- Intelligence signals: convergence / tension detection across high-credibility
-- source predictions. Lets the daily briefing automatically surface "5 sources
-- stacking on memory bull" or "Leopold-vs-NF/DG inflation tension" without
-- relying on conversational synthesis to spot it.

CREATE TABLE IF NOT EXISTS intelligence_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type TEXT NOT NULL,                 -- 'convergence' | 'tension'
  signal_kind TEXT NOT NULL,                 -- 'asset' | 'theme'
  signal_key TEXT NOT NULL,                  -- ticker or theme name
  direction TEXT,                            -- 'bullish' | 'bearish' (NULL for tension)
  source_count INT NOT NULL,
  avg_credibility NUMERIC(4, 2) NOT NULL,
  prediction_ids UUID[] NOT NULL,
  source_slugs TEXT[] NOT NULL,
  source_names TEXT[] NOT NULL,
  first_signal_at TIMESTAMPTZ NOT NULL,
  last_signal_at TIMESTAMPTZ NOT NULL,
  -- For tension signals, store the bullish-side and bearish-side counts/sources
  bullish_count INT,
  bearish_count INT,
  bullish_sources TEXT[],
  bearish_sources TEXT[],
  -- Sample claim text for fast briefing rendering
  sample_claims TEXT[],
  status TEXT NOT NULL DEFAULT 'active',     -- 'active' | 'stale' | 'resolved'
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(signal_kind, signal_key, signal_type, direction)
);

CREATE INDEX IF NOT EXISTS idx_intelligence_signals_active ON intelligence_signals(status, last_signal_at DESC);
CREATE INDEX IF NOT EXISTS idx_intelligence_signals_kind_key ON intelligence_signals(signal_kind, signal_key);
