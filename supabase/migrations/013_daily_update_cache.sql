CREATE TABLE IF NOT EXISTS daily_update_cache (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE daily_update_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_update_cache_read" ON daily_update_cache
  FOR SELECT USING (true);
