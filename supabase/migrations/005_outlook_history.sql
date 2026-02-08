-- Outlook history table for tracking evaluation results and changes
CREATE TABLE outlook_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlook_id UUID NOT NULL REFERENCES outlook(id) ON DELETE CASCADE,
  time_horizon TEXT NOT NULL CHECK (time_horizon IN ('short', 'medium', 'long')),
  evaluation_reasoning TEXT NOT NULL,
  changes_summary JSONB DEFAULT '[]',
  previous_sentiment TEXT,
  new_sentiment TEXT,
  previous_confidence INTEGER,
  new_confidence INTEGER,
  analyses_evaluated INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by outlook and time
CREATE INDEX idx_outlook_history_outlook_id ON outlook_history(outlook_id);
CREATE INDEX idx_outlook_history_created_at ON outlook_history(created_at DESC);

-- RLS
ALTER TABLE outlook_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON outlook_history
  FOR SELECT USING (true);

CREATE POLICY "Service role write access" ON outlook_history
  FOR ALL USING (auth.role() = 'service_role');
