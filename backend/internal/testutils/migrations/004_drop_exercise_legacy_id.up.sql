-- Migration 004: Drop legacy_id column from exercises
-- The legacy_id column stored the original Couchbase UUID during the
-- Couchbase -> PostgreSQL migration. That migration is now complete, and no
-- application code reads or writes legacy_id. This migration drops the dead
-- column and adds a UNIQUE constraint on exercises.name, which the seed script
-- (seed_exercises.sql) uses as its idempotency conflict target.

ALTER TABLE exercises DROP COLUMN IF EXISTS legacy_id;
ALTER TABLE exercises ADD CONSTRAINT exercises_name_unique UNIQUE (name);
