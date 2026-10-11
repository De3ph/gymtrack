-- Rollback migration 005: remove soft-delete support.
--
-- The rows must be remapped before the narrower CHECK is restored. PostgreSQL
-- validates a new CHECK against every existing row, so an account soft-deleted
-- since this migration applied would fail validation here, abort the rollback,
-- and leave schema_migrations dirty. A dirty schema_migrations blocks every
-- subsequent `migrate up` until an operator runs `-dir force 5`, so the damage
-- outlives the rollback that caused it.
--
-- 'banned' is the closest state this constraint admits. It preserves the
-- account rather than deleting it, and it is where an account that was
-- soft-deleted belongs once soft deletion is no longer representable.

UPDATE users SET status = 'banned' WHERE status = 'deleted';

DROP INDEX IF EXISTS idx_users_deleted_at;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'suspended', 'banned'));
ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
