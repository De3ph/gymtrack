-- Rollback migration 002: Clear seeded exercise media URLs
--
-- Only clears rows that point to the seeded GitHub CDN.
-- Rows with custom media_url (operator-added) are preserved.

UPDATE exercises
SET media_url = NULL,
    media_type = NULL
WHERE media_url LIKE 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/%';