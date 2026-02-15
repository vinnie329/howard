-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns (voyage-finance-2 = 1024 dimensions)
ALTER TABLE content ADD COLUMN IF NOT EXISTS embedding vector(1024);
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS embedding vector(1024);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS embedding vector(1024);
ALTER TABLE sources ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- HNSW indexes for fast approximate nearest-neighbor search
CREATE INDEX IF NOT EXISTS idx_content_embedding ON content
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);

CREATE INDEX IF NOT EXISTS idx_analyses_embedding ON analyses
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);

CREATE INDEX IF NOT EXISTS idx_predictions_embedding ON predictions
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);

CREATE INDEX IF NOT EXISTS idx_sources_embedding ON sources
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);

-- RPC: match_content
CREATE OR REPLACE FUNCTION match_content(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  source_id uuid,
  platform text,
  url text,
  published_at timestamptz,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.title,
    c.source_id,
    c.platform,
    c.url,
    c.published_at,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM content c
  WHERE c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- RPC: match_analyses
CREATE OR REPLACE FUNCTION match_analyses(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content_id uuid,
  display_title text,
  summary text,
  sentiment_overall text,
  themes jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    a.id,
    a.content_id,
    a.display_title,
    a.summary,
    a.sentiment_overall,
    a.themes,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM analyses a
  WHERE a.embedding IS NOT NULL
    AND 1 - (a.embedding <=> query_embedding) > match_threshold
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- RPC: match_predictions
CREATE OR REPLACE FUNCTION match_predictions(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content_id uuid,
  source_id uuid,
  claim text,
  themes jsonb,
  assets_mentioned jsonb,
  sentiment text,
  time_horizon text,
  confidence text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id,
    p.content_id,
    p.source_id,
    p.claim,
    p.themes,
    p.assets_mentioned,
    p.sentiment,
    p.time_horizon,
    p.confidence,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM predictions p
  WHERE p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- RPC: match_sources
CREATE OR REPLACE FUNCTION match_sources(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  bio text,
  domains jsonb,
  weighted_score real,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    s.id,
    s.name,
    s.slug,
    s.bio,
    s.domains,
    s.weighted_score,
    1 - (s.embedding <=> query_embedding) AS similarity
  FROM sources s
  WHERE s.embedding IS NOT NULL
    AND 1 - (s.embedding <=> query_embedding) > match_threshold
  ORDER BY s.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- RPC: search_all — unified search across all tables
CREATE OR REPLACE FUNCTION search_all(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  type text,
  title text,
  summary text,
  source_id uuid,
  content_id uuid,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  (
    SELECT
      c.id,
      'content'::text AS type,
      c.title,
      LEFT(c.raw_text, 200) AS summary,
      c.source_id,
      NULL::uuid AS content_id,
      1 - (c.embedding <=> query_embedding) AS similarity
    FROM content c
    WHERE c.embedding IS NOT NULL
      AND 1 - (c.embedding <=> query_embedding) > match_threshold
  )
  UNION ALL
  (
    SELECT
      a.id,
      'analysis'::text AS type,
      a.display_title AS title,
      a.summary,
      NULL::uuid AS source_id,
      a.content_id,
      1 - (a.embedding <=> query_embedding) AS similarity
    FROM analyses a
    WHERE a.embedding IS NOT NULL
      AND 1 - (a.embedding <=> query_embedding) > match_threshold
  )
  UNION ALL
  (
    SELECT
      p.id,
      'prediction'::text AS type,
      p.claim AS title,
      NULL::text AS summary,
      p.source_id,
      p.content_id,
      1 - (p.embedding <=> query_embedding) AS similarity
    FROM predictions p
    WHERE p.embedding IS NOT NULL
      AND 1 - (p.embedding <=> query_embedding) > match_threshold
  )
  UNION ALL
  (
    SELECT
      s.id,
      'source'::text AS type,
      s.name AS title,
      s.bio AS summary,
      s.id AS source_id,
      NULL::uuid AS content_id,
      1 - (s.embedding <=> query_embedding) AS similarity
    FROM sources s
    WHERE s.embedding IS NOT NULL
      AND 1 - (s.embedding <=> query_embedding) > match_threshold
  )
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
