-- Rollback migration 004: drop the name unique constraint.
--
-- Deliberately does NOT re-add legacy_id. Migration 001 never created that
-- column, so the previous version of this file introduced a column the schema
-- had never had. A down -> up -> down round trip therefore left a phantom
-- legacy_id behind, and the second `up` would drop it again, so the drift was
-- invisible until someone compared the schema against migration 001.
--
-- Re-adding it would be guesswork regardless: nothing records the column's
-- original type, default, or position, and the data it held was dropped by 004.

ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_name_unique;
