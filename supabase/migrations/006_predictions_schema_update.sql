-- Update predictions table: remove status/direction/resolved_at, add sentiment/specificity/date_made
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS sentiment text DEFAULT 'neutral';
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS specificity text DEFAULT 'thematic';
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS date_made timestamptz DEFAULT now();

-- Migrate existing data: direction -> sentiment
UPDATE predictions SET sentiment =
  CASE
    WHEN direction ILIKE '%bull%' OR direction = 'up' THEN 'bullish'
    WHEN direction ILIKE '%bear%' OR direction = 'down' THEN 'bearish'
    ELSE 'neutral'
  END
WHERE sentiment = 'neutral' AND direction IS NOT NULL;

-- Set date_made from created_at for existing rows
UPDATE predictions SET date_made = created_at WHERE date_made IS NULL OR date_made = created_at;

-- Drop old columns
ALTER TABLE predictions DROP COLUMN IF EXISTS direction;
ALTER TABLE predictions DROP COLUMN IF EXISTS status;
ALTER TABLE predictions DROP COLUMN IF EXISTS resolved_at;
