-- FedWatch rate probability snapshots
-- Tracks CME FedWatch-style probabilities for each FOMC meeting date
CREATE TABLE fedwatch_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_date DATE NOT NULL,
  rate_range TEXT NOT NULL,        -- e.g. "350-375" means 3.50%-3.75%
  probability NUMERIC NOT NULL,    -- 0.0 to 1.0
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fedwatch_meeting_captured
  ON fedwatch_snapshots(meeting_date, captured_at DESC);

CREATE INDEX idx_fedwatch_captured_at
  ON fedwatch_snapshots(captured_at DESC);

ALTER TABLE fedwatch_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fedwatch_read" ON fedwatch_snapshots FOR SELECT USING (true);
CREATE POLICY "fedwatch_insert" ON fedwatch_snapshots FOR INSERT WITH CHECK (true);
