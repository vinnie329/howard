-- Sources table
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  domains JSONB DEFAULT '[]',
  scores JSONB DEFAULT '{}',
  weighted_score REAL,
  youtube_search_queries JSONB DEFAULT '[]',
  substack_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content table
CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  external_id TEXT,
  title TEXT NOT NULL,
  url TEXT,
  published_at TIMESTAMPTZ,
  raw_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, external_id)
);

-- Analyses table
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  sentiment_overall TEXT,
  sentiment_score REAL,
  assets_mentioned JSONB DEFAULT '[]',
  themes JSONB DEFAULT '[]',
  predictions JSONB DEFAULT '[]',
  key_quotes JSONB DEFAULT '[]',
  referenced_people JSONB DEFAULT '[]',
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predictions table
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  claim TEXT NOT NULL,
  asset_or_theme TEXT,
  direction TEXT,
  time_horizon TEXT,
  confidence TEXT,
  status TEXT DEFAULT 'pending',
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_content_source_id ON content(source_id);
CREATE INDEX idx_content_published_at ON content(published_at DESC);
CREATE INDEX idx_analyses_content_id ON analyses(content_id);
CREATE INDEX idx_predictions_source_id ON predictions(source_id);
CREATE INDEX idx_predictions_status ON predictions(status);

-- Row Level Security
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Policies: anyone can read, only service_role can write
CREATE POLICY "Public read access" ON sources FOR SELECT USING (true);
CREATE POLICY "Public read access" ON content FOR SELECT USING (true);
CREATE POLICY "Public read access" ON analyses FOR SELECT USING (true);
CREATE POLICY "Public read access" ON predictions FOR SELECT USING (true);

CREATE POLICY "Service role write access" ON sources FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON content FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON analyses FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON predictions FOR ALL USING (auth.role() = 'service_role');
