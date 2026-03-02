CREATE TABLE IF NOT EXISTS positioning_cache (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE positioning_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "positioning_cache_read" ON positioning_cache
  FOR SELECT USING (true);
