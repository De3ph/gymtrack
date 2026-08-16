-- Migration 005: Allow athletes to create their own workout plans.
-- workout_plans.trainer_id is renamed to creator_id (the user who created the
-- plan, trainer OR athlete). workout_plan_assignments.trainer_id is unchanged
-- (it records which trainer assigned the plan).
ALTER TABLE workout_plans RENAME COLUMN trainer_id TO creator_id;
ALTER INDEX idx_workout_plans_trainer RENAME TO idx_workout_plans_creator;