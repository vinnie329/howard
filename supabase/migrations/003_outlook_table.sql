-- Outlook table: Howard's synthesized market thesis across time horizons
CREATE TABLE outlook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_horizon TEXT NOT NULL CHECK (time_horizon IN ('short', 'medium', 'long')),
  domain TEXT NOT NULL DEFAULT 'general',
  thesis TEXT NOT NULL,
  key_themes JSONB DEFAULT '[]',
  sentiment TEXT NOT NULL CHECK (sentiment IN ('bullish', 'bearish', 'cautious', 'neutral')),
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  supporting_sources JSONB DEFAULT '[]',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(time_horizon, domain)
);

-- Indexes
CREATE INDEX idx_outlook_time_horizon ON outlook(time_horizon);
CREATE INDEX idx_outlook_domain ON outlook(domain);

-- Row Level Security
ALTER TABLE outlook ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read access" ON outlook FOR SELECT USING (true);
CREATE POLICY "Service role write access" ON outlook FOR ALL USING (auth.role() = 'service_role');
