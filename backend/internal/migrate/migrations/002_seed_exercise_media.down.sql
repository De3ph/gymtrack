SET search_path = public;

-- Rollback migration 002: Clear seeded exercise media URLs
--
-- Only clears rows that point to the seeded GitHub CDN.
-- Rows with custom media_url (operator-added) are preserved.
--
-- media_type is NOT NULL DEFAULT 'gif', so it is reset to that default
-- rather than to NULL — setting it to NULL aborts the rollback with a
-- not-null violation. This mirrors the media reset in
-- 001_baseline.down.sql.

UPDATE exercises
SET media_url = NULL,
    media_type = 'gif'
WHERE media_url LIKE 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/%';