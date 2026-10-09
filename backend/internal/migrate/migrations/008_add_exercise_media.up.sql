-- Migration 008: Add exercise media columns
--
-- The exercise library page needs a per-exercise demonstration asset. Rather
-- than hard-coding a third-party lookup in the frontend, the catalog carries
-- its own pointer:
--
--   media_url   - absolute https URL of the asset (GIF, MP4, or still image)
--   media_type  - which renderer to use: 'gif' | 'video' | 'image'
--
-- media_url is nullable because "no demonstration yet" is a normal state for
-- most of the catalog, not an error; the frontend renders a placeholder tile
-- rather than a broken frame. media_type defaults to 'gif' and is constrained
-- so the frontend can always decide between <img>, <video>, and a placeholder.

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'gif';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exercises_media_type_check'
  ) THEN
    ALTER TABLE exercises
      ADD CONSTRAINT exercises_media_type_check
      CHECK (media_type IN ('gif', 'video', 'image'));
  END IF;
END $$;

COMMENT ON COLUMN exercises.media_url IS 'Absolute https URL of the exercise demonstration asset (GIF, MP4, or image)';
COMMENT ON COLUMN exercises.media_type IS 'Renderer hint for media_url: gif | video | image';