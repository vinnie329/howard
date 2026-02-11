-- Replace asset_or_theme with separate themes and assets_mentioned columns
-- matching the analyses table structure

-- Add new columns
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS themes jsonb DEFAULT '[]';
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS assets_mentioned jsonb DEFAULT '[]';

-- Migrate existing data: put asset_or_theme into appropriate column
-- analyses.themes is jsonb, so use ? operator for containment check
UPDATE predictions p
SET themes = jsonb_build_array(p.asset_or_theme)
FROM analyses a
WHERE a.content_id = p.content_id
  AND p.asset_or_theme IS NOT NULL
  AND p.asset_or_theme != ''
  AND a.themes ? p.asset_or_theme;

UPDATE predictions p
SET assets_mentioned = jsonb_build_array(p.asset_or_theme)
FROM analyses a
WHERE a.content_id = p.content_id
  AND p.asset_or_theme IS NOT NULL
  AND p.asset_or_theme != ''
  AND a.assets_mentioned ? p.asset_or_theme;

-- For values that didn't match either, put in themes as fallback
UPDATE predictions
SET themes = jsonb_build_array(asset_or_theme)
WHERE asset_or_theme IS NOT NULL
  AND asset_or_theme != ''
  AND (themes IS NULL OR themes = '[]'::jsonb)
  AND (assets_mentioned IS NULL OR assets_mentioned = '[]'::jsonb);

-- Drop old column
ALTER TABLE predictions DROP COLUMN IF EXISTS asset_or_theme;
