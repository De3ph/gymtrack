-- Migration 001: Initial PostgreSQL Schema for GymTrack
-- All domain tables use SERIAL (auto-incrementing INTEGER) primary keys.
-- Run order: Tables first (respecting FK dependencies), then indexes

-- ============================================================================
-- 1. USERS & PROFILES (no FK dependencies)
-- ============================================================================
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('trainer','athlete','admin')),
    profile JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- 2. LOOKUP TABLES (no FK dependencies, SERIAL PKs)
-- ============================================================================
CREATE TABLE muscle_groups (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE equipment_definitions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- ============================================================================
-- 3. EXERCISES (FK -> users, muscle_groups, equipment_definitions)
-- ============================================================================
CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    muscle_group_id INTEGER REFERENCES muscle_groups(id),
    equipment_id INTEGER REFERENCES equipment_definitions(id),
    instructions TEXT,
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_muscle ON exercises(muscle_group_id);
CREATE INDEX idx_exercises_equipment ON exercises(equipment_id);
CREATE INDEX idx_exercises_name ON exercises(name);

-- ============================================================================
-- 4. RELATIONSHIPS (FK -> users x2)
-- ============================================================================
CREATE TABLE relationships (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    athlete_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending','active','terminated')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trainer_id, athlete_id)
);
CREATE INDEX idx_relationships_trainer ON relationships(trainer_id, status);
CREATE INDEX idx_relationships_athlete ON relationships(athlete_id, status);

-- ============================================================================
-- 5. COACHING REQUESTS (FK -> users x2)
-- ============================================================================
CREATE TABLE coaching_requests (
    id SERIAL PRIMARY KEY,
    athlete_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    trainer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_coaching_requests_athlete ON coaching_requests(athlete_id, status);
CREATE INDEX idx_coaching_requests_trainer ON coaching_requests(trainer_id, status);

-- ============================================================================
-- 6. TRAINER REVIEWS (FK -> users x2)
-- ============================================================================
CREATE TABLE trainer_reviews (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    athlete_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trainer_id, athlete_id)
);
CREATE INDEX idx_reviews_trainer ON trainer_reviews(trainer_id);

-- ============================================================================
-- 7. TRAINER AVAILABILITIES (FK -> users)
-- ============================================================================
CREATE TABLE trainer_availabilities (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_booked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);
CREATE INDEX idx_availability_trainer_day ON trainer_availabilities(trainer_id, day_of_week);

-- ============================================================================
-- 8. INVITATIONS (FK -> users x2)
-- ============================================================================
CREATE TABLE invitations (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','used','expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    athlete_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL
);
CREATE INDEX idx_invitations_code ON invitations(code);
CREATE INDEX idx_invitations_trainer ON invitations(trainer_id, status);

-- ============================================================================
-- 9. COMMENTS (FK -> users, self-referencing; target_id polymorphic)
-- ============================================================================
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('workout','meal')),
    target_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    author_role VARCHAR(10) NOT NULL CHECK (author_role IN ('trainer','athlete')),
    content TEXT NOT NULL CHECK (LENGTH(content) BETWEEN 1 AND 2000),
    parent_comment_id INTEGER REFERENCES comments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ
);
CREATE INDEX idx_comments_target ON comments(target_type, target_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);

-- ============================================================================
-- 10. WORKOUT PLANS (FK -> users) - must be before workouts
-- ============================================================================
CREATE TABLE workout_plans (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    exercises JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_workout_plans_trainer ON workout_plans(trainer_id);
CREATE INDEX idx_workout_plans_exercises_gin ON workout_plans USING GIN (exercises);

-- ============================================================================
-- 11. WORKOUTS (FK -> users, workout_plans)
-- ============================================================================
CREATE TABLE workouts (
    id SERIAL PRIMARY KEY,
    athlete_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    plan_id INTEGER NULL REFERENCES workout_plans(id) ON DELETE SET NULL,
    exercises JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_workouts_athlete_date ON workouts(athlete_id, date);
CREATE INDEX idx_workouts_plan ON workouts(plan_id);
CREATE INDEX idx_workouts_exercises_gin ON workouts USING GIN (exercises);

-- ============================================================================
-- 12. MEALS (FK -> users)
-- ============================================================================
CREATE TABLE meals (
    id SERIAL PRIMARY KEY,
    athlete_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_type VARCHAR(10) NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_meals_athlete_date ON meals(athlete_id, date);
CREATE INDEX idx_meals_items_gin ON meals USING GIN (items);

-- ============================================================================
-- 13. BODY MEASUREMENTS (FK -> users, JSONB parts with expression indexes)
-- ============================================================================
CREATE TABLE body_measurements (
    id SERIAL PRIMARY KEY,
    athlete_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight DECIMAL(10,2) NOT NULL CHECK (weight >= 0),
    weight_unit VARCHAR(3) NOT NULL CHECK (weight_unit IN ('kg','lbs')),
    body_fat_pct DECIMAL(5,2) CHECK (body_fat_pct >= 0 AND body_fat_pct <= 100),
    parts JSONB NOT NULL DEFAULT '{}',
    notes TEXT CHECK (LENGTH(notes) <= 500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_bm_athlete_date ON body_measurements(athlete_id, date);
CREATE INDEX idx_bm_athlete_weight ON body_measurements(athlete_id, weight);
-- Expression indexes for supported body parts
-- Parts are stored as {"partName": {"value": <number>}}, so drill into the nested object.
CREATE INDEX idx_bm_chest   ON body_measurements(athlete_id, ((parts->'chest'->>'value')::numeric))   WHERE parts ? 'chest';
CREATE INDEX idx_bm_waist   ON body_measurements(athlete_id, ((parts->'waist'->>'value')::numeric))   WHERE parts ? 'waist';
CREATE INDEX idx_bm_hips    ON body_measurements(athlete_id, ((parts->'hips'->>'value')::numeric))    WHERE parts ? 'hips';
CREATE INDEX idx_bm_bicep_left  ON body_measurements(athlete_id, ((parts->'bicepLeft'->>'value')::numeric))  WHERE parts ? 'bicepLeft';
CREATE INDEX idx_bm_bicep_right ON body_measurements(athlete_id, ((parts->'bicepRight'->>'value')::numeric)) WHERE parts ? 'bicepRight';
CREATE INDEX idx_bm_forearm_left  ON body_measurements(athlete_id, ((parts->'forearmLeft'->>'value')::numeric))  WHERE parts ? 'forearmLeft';
CREATE INDEX idx_bm_forearm_right ON body_measurements(athlete_id, ((parts->'forearmRight'->>'value')::numeric)) WHERE parts ? 'forearmRight';
CREATE INDEX idx_bm_thigh_left    ON body_measurements(athlete_id, ((parts->'thighLeft'->>'value')::numeric))    WHERE parts ? 'thighLeft';
CREATE INDEX idx_bm_thigh_right   ON body_measurements(athlete_id, ((parts->'thighRight'->>'value')::numeric))   WHERE parts ? 'thighRight';
CREATE INDEX idx_bm_calf_left     ON body_measurements(athlete_id, ((parts->'calfLeft'->>'value')::numeric))     WHERE parts ? 'calfLeft';
CREATE INDEX idx_bm_calf_right    ON body_measurements(athlete_id, ((parts->'calfRight'->>'value')::numeric))    WHERE parts ? 'calfRight';
CREATE INDEX idx_bm_neck          ON body_measurements(athlete_id, ((parts->'neck'->>'value')::numeric))          WHERE parts ? 'neck';
CREATE INDEX idx_bm_shoulder      ON body_measurements(athlete_id, ((parts->'shoulder'->>'value')::numeric))      WHERE parts ? 'shoulder';
CREATE INDEX idx_bm_parts_gin ON body_measurements USING GIN (parts);

-- ============================================================================
-- 14. WORKOUT PLAN ASSIGNMENTS (FK -> workout_plans, users x2)
-- ============================================================================
CREATE TABLE workout_plan_assignments (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    athlete_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    trainer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, athlete_id)
);
CREATE INDEX idx_wpa_athlete ON workout_plan_assignments(athlete_id);
CREATE INDEX idx_wpa_trainer ON workout_plan_assignments(trainer_id);