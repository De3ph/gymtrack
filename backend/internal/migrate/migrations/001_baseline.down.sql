-- Rollback the squashed GymTrack baseline (001 through 009).
-- Drops every object the baseline created, in reverse dependency order.

-- ============================================================================
-- 009 SEED — clear seeded media (only CDN links)
-- ============================================================================
UPDATE exercises
SET media_url = NULL, media_type = 'gif'
WHERE media_url LIKE 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/%';

-- ============================================================================
-- 005 ACCOUNT DELETION — restore original status values
-- ============================================================================
UPDATE users SET status = 'active' WHERE status = 'deleted';
DROP INDEX IF EXISTS idx_users_deleted_at;

-- ============================================================================
-- 008 EXERCISE MEDIA — remove columns and check constraint
-- ============================================================================
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_media_type_check;
ALTER TABLE exercises DROP COLUMN IF EXISTS media_type;
ALTER TABLE exercises DROP COLUMN IF EXISTS media_url;

-- ============================================================================
-- 006 PASSWORD RESET
-- ============================================================================
DROP TABLE IF EXISTS password_reset_tokens;

-- ============================================================================
-- 007 USER AUDIT
-- ============================================================================
DROP TABLE IF EXISTS user_audit_logs;

-- ============================================================================
-- 001 TABLES — drop in reverse dependency order
-- ============================================================================

DROP INDEX IF EXISTS idx_workouts_plan;
DROP INDEX IF EXISTS idx_workouts_exercises_gin;
DROP INDEX IF EXISTS idx_workouts_athlete_date;
DROP TABLE IF EXISTS workouts;

DROP INDEX IF EXISTS idx_wpa_trainer;
DROP INDEX IF EXISTS idx_wpa_athlete;
DROP TABLE IF EXISTS workout_plan_assignments;

DROP INDEX IF EXISTS idx_workout_plans_exercises_gin;
DROP INDEX IF EXISTS idx_workout_plans_creator;
DROP TABLE IF EXISTS workout_plans;

DROP INDEX IF EXISTS idx_comments_parent;
DROP INDEX IF EXISTS idx_comments_author;
DROP INDEX IF EXISTS idx_comments_target;
DROP TABLE IF EXISTS comments;

DROP INDEX IF EXISTS idx_bm_athlete_weight;
DROP INDEX IF EXISTS idx_bm_athlete_date;
DROP TABLE IF EXISTS body_measurements;

DROP INDEX IF EXISTS idx_meals_items_gin;
DROP INDEX IF EXISTS idx_meals_athlete_date;
DROP TABLE IF EXISTS meals;

DROP INDEX IF EXISTS idx_invitations_trainer;
DROP INDEX IF EXISTS idx_invitations_code;
DROP TABLE IF EXISTS invitations;

DROP INDEX IF EXISTS idx_availability_trainer_day;
DROP TABLE IF EXISTS trainer_availabilities;

DROP INDEX IF EXISTS idx_reviews_trainer;
DROP TABLE IF EXISTS trainer_reviews;

DROP INDEX IF EXISTS idx_coaching_requests_trainer;
DROP INDEX IF EXISTS idx_coaching_requests_athlete;
DROP TABLE IF EXISTS coaching_requests;

DROP INDEX IF EXISTS idx_relationships_athlete;
DROP INDEX IF EXISTS idx_relationships_trainer;
DROP TABLE IF EXISTS relationships;

DROP INDEX IF EXISTS idx_exercises_name;
DROP INDEX IF EXISTS idx_exercises_equipment;
DROP INDEX IF EXISTS idx_exercises_muscle;
DROP INDEX IF EXISTS idx_exercises_category;
DROP TABLE IF EXISTS exercises;

DROP TABLE IF EXISTS equipment_definitions;
DROP TABLE IF EXISTS muscle_groups;

DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_role;
DROP TABLE IF EXISTS users;

-- 007 USER AUDIT — the trigger is dropped with the users table above, so the
-- function can be removed here.
DROP FUNCTION IF EXISTS log_users_audit();