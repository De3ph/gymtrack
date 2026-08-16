-- Migration 005 (down): revert creator_id back to trainer_id.
ALTER INDEX idx_workout_plans_creator RENAME TO idx_workout_plans_trainer;
ALTER TABLE workout_plans RENAME COLUMN creator_id TO trainer_id;