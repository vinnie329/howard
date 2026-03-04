CREATE TABLE IF NOT EXISTS prediction_markets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('kalshi', 'polymarket')),
  market_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  resolution_date TIMESTAMPTZ,
  is_watched BOOLEAN DEFAULT false,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (source, market_id)
);

CREATE TABLE IF NOT EXISTS prediction_market_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
  yes_price NUMERIC NOT NULL,
  volume_24h NUMERIC,
  open_interest NUMERIC,
  total_volume NUMERIC,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pm_snapshots_market_captured ON prediction_market_snapshots(market_id, captured_at DESC);
CREATE INDEX idx_pm_markets_category ON prediction_markets(category);
CREATE INDEX idx_pm_markets_watched ON prediction_markets(is_watched);

ALTER TABLE prediction_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_market_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prediction_markets_read" ON prediction_markets FOR SELECT USING (true);
CREATE POLICY "prediction_market_snapshots_read" ON prediction_market_snapshots FOR SELECT USING (true);
