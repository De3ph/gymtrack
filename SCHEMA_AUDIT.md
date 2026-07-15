# Database Schema Audit Report

Generated: 2026-07-12

## 1. Missing data integrity for `trainer_availabilities`

**Status:** Issue found

**Evidence:**
- Schema: `trainer_availabilities.is_booked BOOLEAN NOT NULL DEFAULT FALSE` - no `athlete_id` FK (schema.sql line 109)
- Model: `TrainerAvailability` has no `AthleteID` field (models/availability.go line 7-25)
- Repository: `BookSlotAtomic` only sets `is_booked = true` without linking athlete (repository/postgres/availability.go line 143-156)

**Risk:** High

**Proposed fix:**
Add `athlete_id` FK to track bookings. Either:
```sql
-- Option A: Add athlete_id FK (nullable until booked)
ALTER TABLE trainer_availabilities 
ADD COLUMN athlete_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;
CREATE INDEX CONCURRENTLY idx_availability_athlete ON trainer_availabilities(athlete_id);
```
Or create separate `bookings` table for full audit trail.

---

## 2. Polymorphic `comments` table

**Status:** Issue found (partial)

**Evidence:**
- Schema: No FK constraint on `(target_type, target_id)` - polymorphic reference cannot be enforced (schema.sql lines 135-148)
- Schema: Index exists on `(target_type, target_id)` - OK (schema.sql line 146)
- Repository: `Create` and `GetByTarget` do not verify target exists (repository/postgres/comment.go lines 35-90)
- No code checks workout/meal existence before comment creation

**Risk:** Medium

**Proposed fix:**
Add application-level checks in `comment_repository.Create()`:
```go
func (r *PostgresCommentRepository) Create(ctx context.Context, comment *models.Comment) error {
    // Verify target exists before inserting
    var exists bool
    switch comment.TargetType {
    case "workout":
        err := r.pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM workouts WHERE id = $1)", comment.TargetID).Scan(&exists)
    case "meal":
        err := r.pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM meals WHERE id = $1)", comment.TargetID).Scan(&exists)
    default:
        return fmt.Errorf("invalid target_type: %s", comment.TargetType)
    }
    if err != nil || !exists {
        return fmt.Errorf("target not found")
    }
    // ... proceed with insert
}
```

---

## 3. Missing indexes on FK columns

**Status:** Issue found

**Evidence:** Schema analysis shows these FKs lack proper indexes:

| FK Column | Current Index | Risk |
|-----------|---------------|------|
| `body_measurements.athlete_id` | Composite `(athlete_id, date)` OK (line 211) | Low |
| `meals.athlete_id` | Composite `(athlete_id, date)` OK (line 193) | Low |
| `workouts.athlete_id` | Composite `(athlete_id, date)` OK (line 177) | Low |
| `coaching_requests.athlete_id` | Composite `(athlete_id, status)` OK (line 82) | Low |
| `coaching_requests.trainer_id` | Composite `(trainer_id, status)` OK (line 83) | Low |
| `invitations.trainer_id` | Composite `(trainer_id, status)` OK (line 130) | Low |
| `trainer_availabilities.trainer_id` | Composite `(trainer_id, day_of_week)` OK (line 114) | Low |
| `exercises.created_by` | No index on FK column (only `idx_exercises_name`, `idx_exercises_category` etc.) | **High** |
| `relationships.athlete_id` | Composite `(trainer_id, athlete_id)` but athlete_id is trailing (line 67) | **Medium** |

**Risk:** High (exercises.created_by), Medium (relationships.athlete_id)

**Proposed fix:**
```sql
-- Add index on exercises.created_by
CREATE INDEX CONCURRENTLY idx_exercises_created_by ON exercises(created_by);

-- Add standalone index for relationships.athlete_id (trainer_id already covered)
CREATE INDEX CONCURRENTLY idx_relationships_athlete ON relationships(athlete_id);
```

---

## 4. No CHECK constraints on enum-like columns

**Status:** Mostly OK

**Evidence:** Most columns have CHECK constraints in schema:

| Column | Current Constraint | Go constants |
|--------|-------------------|--------------|
| `users.role` | `CHECK (role IN ('trainer','athlete','admin'))` (line 13) | `RoleTrainer`, `RoleAthlete`, `RoleAdmin` (user.go lines 9-13) |
| `coaching_requests.status` | `CHECK (status IN ('pending','accepted','rejected'))` (line 78) | `CoachingRequestStatusPending` etc. |
| `invitations.status` | `CHECK (status IN ('pending','used','expired'))` (line 123) | Hardcoded strings in service |
| `relationships.status` | `CHECK (status IN ('pending','active','terminated'))` (line 62) | `RelationshipStatus*` constants (relationship.go lines 9-11) |
| `meals.meal_type` | `CHECK (meal_type IN ('breakfast','lunch','dinner','snack'))` (line 188) | Hardcoded strings |
| `comments.target_type` | `CHECK (target_type IN ('workout','meal'))` (line 137) | `TargetTypeWorkout`, `TargetTypeMeal` (comment.go lines 9-12) |
| `comments.author_role` | `CHECK (author_role IN ('trainer','athlete'))` (line 140) | `AuthorRoleTrainer`, `AuthorRoleAthlete` (comment.go lines 16-19) |
| `trainer_availabilities.day_of_week` | `CHECK (day_of_week BETWEEN 0 AND 6)` (line 106) | No Go constants - direct int |
| `trainer_reviews.rating` | `CHECK (rating BETWEEN 1 AND 5)` (line 92) | Hardcoded int in API |

**Risk:** Low - All critical enum columns have CHECK constraints.

**Proposed fix:** None required. Consider adding Go constants for `day_of_week` and `rating` for documentation.

---

## 5. `updated_at` not auto-updating

**Status:** Issue found

**Evidence:**
- Repository pattern uses manual `time.Now()` for each UPDATE (workout.go line 139, meal.go line 87, body_measurement.go line 118)
- Consistency check: All repositories DO set `updated_at` in UPDATE queries
- However, no trigger/backup mechanism exists if Go code path forgets

**Risk:** Low (Go code is consistent) but DB-level protection would be safer

**Proposed fix:** Add Postgres trigger for safety:
```sql
-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_workouts_updated_at BEFORE UPDATE ON workouts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_meals_updated_at BEFORE UPDATE ON meals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ... repeat for all tables
```

---

## 6. JSONB columns used for relational data

**Status:** OK (querying not required)

**Evidence:**
- `workouts.exercises` -> `[]WorkoutExercise` (models/workout.go line 19, exercise.go line 27) - stored as JSONB
- `workout_plans.exercises` -> `[]WorkoutPlanExercise` (models/workout_plan.go line 13, line 18)
- Repository: All JSONB scanned into typed structs via `UnmarshalFromJSONB` (repository/postgres/helpers.go)
- All queries fetch by PK or FK, no "find by exercise X" queries found

**Risk:** Low - JSONB is appropriate here for embedded data

**Proposed fix:** None. JSONB trade-off is acceptable since no relational querying of exercises is needed.

---

## 7. `ON DELETE CASCADE` from `users`

**Status:** Issue found

**Evidence:**
- Schema: Most FK references use `ON DELETE CASCADE` (workouts, meals, body_measurements, relationships, coaching_requests, comments, etc.)
- No user deletion endpoint found in handlers
- No soft-delete column (`deleted_at`) exists on users table

**Risk:** High

**Proposed fix:**
Add soft-delete pattern:
```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- Replace CASCADE with SET NULL where appropriate, or keep CASCADE for true children
-- Consider explicit confirmation flow before hard delete
```

---

## 8. No protection against duplicate pending coaching requests

**Status:** Partially handled

**Evidence:**
- Repository: `Create` has no uniqueness check
- Service: Application-level check exists in `CreateCoachingRequest` (lines 43-53) that queries existing requests and checks for pending
- However, check-fetch-insert is not atomic - race condition possible

**Risk:** Medium

**Proposed fix:** Add database-level constraint:
```sql
CREATE UNIQUE INDEX CONCURRENTLY uniq_pending_request 
ON coaching_requests(athlete_id, trainer_id) 
WHERE status = 'pending';
```

---

## 9. PK sizing

**Status:** Issue found

**Evidence:**
- All PKs use `SERIAL` (INTEGER, 32-bit) - schema.sql lines 9, 25, 30, 40, 59, etc.
- No `BIGSERIAL` usage anywhere
- High-write tables: workouts, meals, body_measurements all SERIAL

**Risk:** Low-Medium (depends on scale)

**Proposed fix:**
For tables expected to grow beyond 2.1 billion rows:
```sql
-- If migration needed, convert primary key type (requires careful planning)
-- For new tables, consider BIGSERIAL:
-- id BIGSERIAL PRIMARY KEY
```
Current volume unknown - recommend monitoring and converting before hitting limit.

---

## 10. JSONB Go type safety

**Status:** OK

**Evidence:**
| Column | Go Type | Safety |
|--------|---------|--------|
| `users.profile` | `UserProfile` struct (user.go lines 15-36) | OK - typed struct |
| `workouts.exercises` | `[]WorkoutExercise` (exercise.go lines 27-32) | OK - typed struct |
| `workout_plans.exercises` | `[]WorkoutPlanExercise` (workout_plan.go lines 18-24) | OK - typed struct |
| `meals.items` | `[]FoodItem` (meal.go lines 22-27) | OK - typed struct |
| `body_measurements.parts` | `map[string]BodyMeasurementPart` (body_measurement.go line 23) | OK - typed struct |

All JSONB columns are scanned into typed structs via `UnmarshalFromJSONB`. No loose `map[string]interface{}` usage found.

**Risk:** Low

**Proposed fix:** None required.

---

# Prioritized Action List

1. **High Priority**
   - Add `athlete_id` FK to `trainer_availabilities` to track who booked (or separate `bookings` table)
   - Add index on `exercises.created_by` FK column

2. **Medium Priority**
   - Add index on `relationships.athlete_id` for better query performance
   - Add unique partial index on `coaching_requests(athlete_id, trainer_id)` WHERE status = 'pending'
   - Implement soft-delete for users before adding account deletion flow

3. **Low Priority**
   - Add application-level target validation in comments Create()
   - Add Postgres trigger for `updated_at` auto-update (defensive)
   - Monitor PK growth on high-write tables, plan BIGSERIAL migration if needed