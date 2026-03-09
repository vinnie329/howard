-- Add guest/sub-attribution field to content
-- For podcast episodes, panels, etc. where the primary source is the show
-- but the guest is the key voice being tracked.
ALTER TABLE content ADD COLUMN guest TEXT;
