-- Rollback the squashed baseline migration.
-- Drops all application tables but preserves schema_migrations for golang-migrate.

-- Drop foreign key constraints first (order matters for FK chains)
ALTER TABLE IF EXISTS public.body_measurements DROP CONSTRAINT IF EXISTS body_measurements_athlete_id_fkey;
ALTER TABLE IF EXISTS public.coaching_requests DROP CONSTRAINT IF EXISTS coaching_requests_athlete_id_fkey;
ALTER TABLE IF EXISTS public.coaching_requests DROP CONSTRAINT IF EXISTS coaching_requests_trainer_id_fkey;
ALTER TABLE IF EXISTS public.comments DROP CONSTRAINT IF EXISTS comments_author_id_fkey;
ALTER TABLE IF EXISTS public.comments DROP CONSTRAINT IF EXISTS comments_parent_comment_id_fkey;
ALTER TABLE IF EXISTS public.exercises DROP CONSTRAINT IF EXISTS exercises_created_by_fkey;
ALTER TABLE IF EXISTS public.exercises DROP CONSTRAINT IF EXISTS exercises_equipment_id_fkey;
ALTER TABLE IF EXISTS public.exercises DROP CONSTRAINT IF EXISTS exercises_muscle_group_id_fkey;
ALTER TABLE IF EXISTS public.invitations DROP CONSTRAINT IF EXISTS invitations_athlete_id_fkey;
ALTER TABLE IF EXISTS public.invitations DROP CONSTRAINT IF EXISTS invitations_trainer_id_fkey;
ALTER TABLE IF EXISTS public.meals DROP CONSTRAINT IF EXISTS meals_athlete_id_fkey;
ALTER TABLE IF EXISTS public.relationships DROP CONSTRAINT IF EXISTS relationships_athlete_id_fkey;
ALTER TABLE IF EXISTS public.relationships DROP CONSTRAINT IF EXISTS relationships_trainer_id_fkey;
ALTER TABLE IF EXISTS public.trainer_availabilities DROP CONSTRAINT IF EXISTS trainer_availabilities_trainer_id_fkey;
ALTER TABLE IF EXISTS public.trainer_reviews DROP CONSTRAINT IF EXISTS trainer_reviews_athlete_id_fkey;
ALTER TABLE IF EXISTS public.trainer_reviews DROP CONSTRAINT IF EXISTS trainer_reviews_trainer_id_fkey;
ALTER TABLE IF EXISTS public.workout_plan_assignments DROP CONSTRAINT IF EXISTS workout_plan_assignments_athlete_id_fkey;
ALTER TABLE IF EXISTS public.workout_plan_assignments DROP CONSTRAINT IF EXISTS workout_plan_assignments_plan_id_fkey;
ALTER TABLE IF EXISTS public.workout_plan_assignments DROP CONSTRAINT IF EXISTS workout_plan_assignments_trainer_id_fkey;
ALTER TABLE IF EXISTS public.workout_plans DROP CONSTRAINT IF EXISTS workout_plans_creator_id_fkey;
ALTER TABLE IF EXISTS public.workouts DROP CONSTRAINT IF EXISTS workouts_athlete_id_fkey;
ALTER TABLE IF EXISTS public.workouts DROP CONSTRAINT IF EXISTS workouts_plan_id_fkey;

-- Drop all application tables
DROP TABLE IF EXISTS public.body_measurements;
DROP TABLE IF EXISTS public.coaching_requests;
DROP TABLE IF EXISTS public.comments;
DROP TABLE IF EXISTS public.equipment_definitions;
DROP TABLE IF EXISTS public.exercises;
DROP TABLE IF EXISTS public.invitations;
DROP TABLE IF EXISTS public.meals;
DROP TABLE IF EXISTS public.muscle_groups;
DROP TABLE IF EXISTS public.relationships;
DROP TABLE IF EXISTS public.trainer_availabilities;
DROP TABLE IF EXISTS public.trainer_reviews;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.workout_plan_assignments;
DROP TABLE IF EXISTS public.workout_plans;
DROP TABLE IF EXISTS public.workouts;

-- Drop sequences
DROP SEQUENCE IF EXISTS public.body_measurements_id_seq;
DROP SEQUENCE IF EXISTS public.coaching_requests_id_seq;
DROP SEQUENCE IF EXISTS public.comments_id_seq;
DROP SEQUENCE IF EXISTS public.equipment_definitions_id_seq;
DROP SEQUENCE IF EXISTS public.exercises_id_seq;
DROP SEQUENCE IF EXISTS public.invitations_id_seq;
DROP SEQUENCE IF EXISTS public.meals_id_seq;
DROP SEQUENCE IF EXISTS public.muscle_groups_id_seq;
DROP SEQUENCE IF EXISTS public.relationships_id_seq;
DROP SEQUENCE IF EXISTS public.trainer_availabilities_id_seq;
DROP SEQUENCE IF EXISTS public.trainer_reviews_id_seq;
DROP SEQUENCE IF EXISTS public.users_user_id_seq;
DROP SEQUENCE IF EXISTS public.workout_plan_assignments_id_seq;
DROP SEQUENCE IF EXISTS public.workout_plans_id_seq;
DROP SEQUENCE IF EXISTS public.workouts_id_seq;