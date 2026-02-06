export const SCHEMA = `
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  domains TEXT NOT NULL DEFAULT '[]',
  scores TEXT NOT NULL DEFAULT '{}',
  weighted_score REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  external_id TEXT,
  title TEXT NOT NULL,
  url TEXT,
  published_at TEXT,
  raw_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  sentiment_overall TEXT NOT NULL,
  sentiment_score REAL NOT NULL DEFAULT 0,
  assets_mentioned TEXT NOT NULL DEFAULT '[]',
  themes TEXT NOT NULL DEFAULT '[]',
  predictions TEXT NOT NULL DEFAULT '[]',
  key_quotes TEXT NOT NULL DEFAULT '[]',
  referenced_people TEXT NOT NULL DEFAULT '[]',
  summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (content_id) REFERENCES content(id)
);

CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  claim TEXT NOT NULL,
  asset_or_theme TEXT,
  direction TEXT,
  time_horizon TEXT,
  confidence TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (content_id) REFERENCES content(id),
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

CREATE INDEX IF NOT EXISTS idx_content_source_id ON content(source_id);
CREATE INDEX IF NOT EXISTS idx_content_published_at ON content(published_at);
CREATE INDEX IF NOT EXISTS idx_analyses_content_id ON analyses(content_id);
CREATE INDEX IF NOT EXISTS idx_predictions_source_id ON predictions(source_id);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
`;
