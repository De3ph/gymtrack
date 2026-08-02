-- Rollback migration 004: re-add legacy_id column, drop name unique constraint

ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_name_unique;
ALTER TABLE exercises ADD COLUMN legacy_id TEXT UNIQUE;
