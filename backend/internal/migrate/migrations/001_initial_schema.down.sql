-- Migration 001: Rollback - Drop all tables in reverse dependency order
-- Run order: Most dependent tables first, then their parents

-- Workout Plan Assignments (depends on workout_plans, users)
DROP TABLE IF EXISTS workout_plan_assignments CASCADE;

-- Workout Plans (depends on users)
DROP TABLE IF EXISTS workout_plans CASCADE;

-- Body Measurements (depends on users)
DROP TABLE IF EXISTS body_measurements CASCADE;

-- Meals (depends on users)
DROP TABLE IF EXISTS meals CASCADE;

-- Workouts (depends on users, workout_plans)
DROP TABLE IF EXISTS workouts CASCADE;

-- Comments (depends on users, self-referencing)
DROP TABLE IF EXISTS comments CASCADE;

-- Invitations (depends on users)
DROP TABLE IF EXISTS invitations CASCADE;

-- Trainer Availabilities (depends on users)
DROP TABLE IF EXISTS trainer_availabilities CASCADE;

-- Trainer Reviews (depends on users)
DROP TABLE IF EXISTS trainer_reviews CASCADE;

-- Coaching Requests (depends on users)
DROP TABLE IF EXISTS coaching_requests CASCADE;

-- Relationships (depends on users)
DROP TABLE IF EXISTS relationships CASCADE;

-- Exercises (depends on users, muscle_groups, equipment_definitions)
DROP TABLE IF EXISTS exercises CASCADE;

-- Lookup tables (no dependencies)
DROP TABLE IF EXISTS equipment_definitions CASCADE;
DROP TABLE IF EXISTS muscle_groups CASCADE;

-- Users (base table)
DROP TABLE IF EXISTS users CASCADE;