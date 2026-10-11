-- Reverse of migration 009.
--
-- Only clears the rows this migration wrote: any media_url pointing at the
-- free-exercise-db dataset was installed by 009 and is safe to remove. Rows an
-- operator filled in by hand are left untouched.

UPDATE exercises
SET media_url = NULL,
    media_type = 'gif'
WHERE media_url LIKE 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/%';