-- Drop and recreate outlook table with structured format
DROP TABLE IF EXISTS outlook;

CREATE TABLE outlook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_horizon TEXT NOT NULL CHECK (time_horizon IN ('short', 'medium', 'long')),
  domain TEXT DEFAULT 'general',
  title TEXT NOT NULL,
  subtitle TEXT,
  thesis_intro TEXT,
  thesis_points JSONB DEFAULT '[]',
  positioning JSONB DEFAULT '[]',
  key_themes JSONB DEFAULT '[]',
  sentiment TEXT CHECK (sentiment IN ('bullish', 'bearish', 'cautious', 'neutral')),
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  supporting_sources JSONB DEFAULT '[]',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(time_horizon, domain)
);

ALTER TABLE outlook ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON outlook FOR SELECT USING (true);
CREATE POLICY "Service role write access" ON outlook FOR ALL USING (auth.role() = 'service_role');
