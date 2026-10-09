-- Reverse of migration 008.

ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_media_type_check;
ALTER TABLE exercises DROP COLUMN IF EXISTS media_type;
ALTER TABLE exercises DROP COLUMN IF EXISTS media_url;