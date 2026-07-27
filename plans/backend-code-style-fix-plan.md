# Go Code Style Fix Plan — Backend

**Date**: 2026-07-27
**Scope**: `backend/` (140 Go files)
**Style Guide**: [golang-code-style](../../.agents/skills/golang-code-style/SKILL.md)
**Status**: Plan only — not implemented

---

## P0 — Nil Slice Initialization (41 files, JSON serialization bug) ✅

**Rule**: Slices MUST be initialized explicitly. Nil slices serialize to `null` not `[]` in JSON.

**Fix**: Replace `var x []Type` with `x := make([]Type, 0)` (or `x := []Type{}`).

### Handler layer (6) ✅ — most critical, directly serialized to HTTP

| # | File | Line | Code |
|---|------|------|------|
| 1 | `internal/api/handlers/relationship_handler.go` | 336 | `var activeClients []*models.Relationship` |
| 2 | `internal/api/handlers/relationship_handler.go` | 349 | `var clientsWithAthlete []ClientWithAthlete` |
| 3 | `internal/api/handlers/relationship_handler.go` | 622 | `var weeklyData []WeeklyVolumePoint` |
| 4 | `internal/api/handlers/relationship_handler.go` | 688 | `var exerciseBreakdown []ExerciseStat` |
| 5 | `internal/api/handlers/relationship_handler.go` | 739 | `var weeklyAverages []WeeklyMealAvg` |
| 6 | `internal/api/handlers/relationship_handler.go` | 767 | `var mealTypeBreakdown []MealTypeStat` |

### Service layer (14) ✅ — return values that handlers serialize

| # | File | Line | Code |
|---|------|------|------|
| 7 | `internal/domain/services/workout_service.go` | 102 | `var workouts []*models.Workout` |
| 8 | `internal/domain/services/workout_service.go` | 211 | `var workouts []*models.Workout` |
| 9 | `internal/domain/services/workout_service.go` | 224 | `var filtered []*models.Workout` |
| 10 | `internal/domain/services/meal_service.go` | 104 | `var meals []*models.Meal` |
| 11 | `internal/domain/services/meal_service.go` | 225 | `var meals []*models.Meal` |
| 12 | `internal/domain/services/meal_service.go` | 238 | `var filtered []*models.Meal` |
| 13 | `internal/domain/services/body_measurement_service.go` | 129 | `var measurements []*models.BodyMeasurement` |
| 14 | `internal/domain/services/body_measurement_service.go` | 237 | `var measurements []*models.BodyMeasurement` |
| 15 | `internal/domain/services/coaching_request_service.go` | 172 | `var requests []*models.CoachingRequest` |
| 16 | `internal/domain/services/coaching_request_service.go` | 188 | `var requestsWithDetails []*models.CoachingRequestWithDetails` |
| 17 | `internal/domain/services/coaching_request_service.go` | 224 | `var requestsWithDetails []*models.CoachingRequestWithDetails` |
| 18 | `internal/domain/services/workout_plan_service.go` | 188 | `var created []*models.WorkoutPlanAssignment` |
| 19 | `internal/domain/services/workout_plan_service.go` | 241 | `var plans []*models.WorkoutPlan` |
| 20 | `internal/domain/services/workout_plan_service.go` | 307 | `var plans []*models.WorkoutPlan` |

### Repository layer (21) ✅ — return values that propagate through services to JSON

| # | File | Line | Code |
|---|------|------|------|
| 21 | `internal/infrastructure/persistence/postgres/comment.go` | 78 | `var comments []*models.Comment` |
| 22 | `internal/infrastructure/persistence/postgres/comment.go` | 102 | `var comments []*models.Comment` |
| 23 | `internal/infrastructure/persistence/postgres/comment.go` | 126 | `var comments []*models.Comment` |
| 24 | `internal/infrastructure/persistence/postgres/comment.go` | 177 | `var comments []*models.Comment` |
| 25 | `internal/infrastructure/persistence/postgres/coaching_request.go` | 132 | `var requests []*models.CoachingRequest` |
| 26 | `internal/infrastructure/persistence/postgres/workout_plan_assignment.go` | 57 | `var results []*models.WorkoutPlanAssignment` |
| 27 | `internal/infrastructure/persistence/postgres/workout_plan.go` | 78 | `var plans []*models.WorkoutPlan` |
| 28 | `internal/infrastructure/persistence/postgres/workout.go` | 100 | `var workouts []*models.Workout` |
| 29 | `internal/infrastructure/persistence/postgres/workout.go` | 124 | `var workouts []*models.Workout` |
| 30 | `internal/infrastructure/persistence/postgres/relationship.go` | 75 | `var rels []*models.Relationship` |
| 31 | `internal/infrastructure/persistence/postgres/relationship.go` | 117 | `var rels []*models.Relationship` |
| 32 | `internal/infrastructure/persistence/postgres/user.go` | 177 | `var users []*models.User` |
| 33 | `internal/infrastructure/persistence/postgres/user.go` | 279 | `var users []*models.User` |
| 34 | `internal/infrastructure/persistence/postgres/body_measurement.go` | 156 | `var results []*models.BodyMeasurement` |
| 35 | `internal/infrastructure/persistence/postgres/meal.go` | 117 | `var meals []*models.Meal` |
| 36 | `internal/infrastructure/persistence/postgres/availability.go` | 35 | `var slots []models.TrainerAvailability` |
| 37 | `internal/infrastructure/persistence/postgres/availability.go` | 128 | `var slots []models.TrainerAvailability` |
| 38 | `internal/infrastructure/persistence/postgres/exercise.go` | 74 | `var exercises []models.Exercise` |
| 39 | `internal/infrastructure/persistence/postgres/equipment.go` | 32 | `var equipment []models.EquipmentDefinition` |
| 40 | `internal/infrastructure/persistence/postgres/muscle_group.go` | 32 | `var muscleGroups []models.MuscleGroupDefinition` |
| 41 | `internal/infrastructure/persistence/postgres/trainer_profile.go` | 237 | `var trainers []models.TrainerWithProfile` |

---

## P1 — Error Code If-Chains → Switch (6 handler files, ~25 instances) ✅

**Rule**: Sequential `if svcErr.Code == "X"` chains MUST use `switch`.

**Fix**: Create a shared `handleServiceError(c *gin.Context, err error)` helper, then update all handlers.

### Files to create/update

| File | Instances | Current Pattern |
|------|-----------|----------------|
| **(new)** `internal/api/handlers/error_response.go` | — | New file: `handleServiceError(c, err)` with `switch svcErr.Code` |
| `internal/api/handlers/workout_plan_handler.go` | 5 | Sequential `if` on `svcErr.Code` |
| `internal/api/handlers/workout_handler.go` | 4 | Same pattern |
| `internal/api/handlers/meal_handler.go` | 3 | Same pattern |
| `internal/api/handlers/body_measurement_handler.go` | 2 | Combined `\|\|` + sequential `if` |
| `internal/api/handlers/comment_handler.go` | 4 | Sentinel errors (not string codes — separate switch) |
| `internal/api/handlers/admin_handler.go` | 5 | `svcErr.Code` checks |
| `internal/api/handlers/user_handler.go` | 2 | `svcErr.Code` checks |

---

## P2 — Complex Boolean Conditions (4 cases) ✅

**Rule**: If conditions with 3+ operands MUST be extracted to named booleans.

### Extraction targets

| # | File:Line | Condition | Named Bool |
|---|-----------|-----------|------------|
| 1 | `internal/api/middleware/auth_middleware.go:50` | `err == nil && user != nil && user.Status != "" && user.Status != models.UserStatusActive` | `isNonActiveUser` |
| 2 | `internal/domain/services/trainer_catalog_service.go:48` | `filters.Specialization != "" \|\| filters.Location != "" \|\| filters.MinRating > 0 \|\| filters.AvailableForNewClients != nil` | `hasFilters` |
| 3 | `internal/api/handlers/auth_handler.go:193` | `err == services.ErrInvalidToken \|\| err == services.ErrTokenExpired \|\| err == services.ErrInvalidTokenType` | `isTokenError` |
| 4 | `internal/api/handlers/relationship_handler.go:712,748` | `item.Macros.Protein > 0 \|\| item.Macros.Carbs > 0 \|\| item.Macros.Fats > 0` (duplicated twice) | `hasAnyMacros` |

---

## P3 — Guard Clause & Else-If Chain Fixes (5 cases) ✅

### Action items

| # | File | Line | Issue | Fix |
|---|------|------|-------|-----|
| 1 | `internal/domain/services/auth_service.go` | 189-195 | Nested `if exp, ok := ...; ok { if expired { return } } else { return }` | Flatten: check `!ok` return early, then check expiry |
| 2 | `internal/domain/services/workout_plan_service.go` | 150-165 | `if !force { check+return } else { delete }` | Put `if force { delete }` first, then fall-through delete |
| 3 | `internal/domain/services/coaching_request_service.go` | 175-181 | `if userRole == "athlete" {} else if == "trainer" {} else { return }` | Convert to `switch userRole` + use `models.Role*` constants |
| 4 | `internal/domain/services/admin_service.go` | 115-128 | `.After(x) \|\| .Equal(x)` repeated 4x | Extract `isOnOrAfter(t, boundary time.Time) bool` as `!t.Before(boundary)` |
| 5 | `internal/domain/services/workout_service.go` | 261 | `err1 != nil \|\| err2 != nil` (duplicated in 3 services) | Extract `parseRFC3339Range(start, end string) (*time.Time, *time.Time, error)` helper |

Files with the duplicated `err1 || err2` pattern:
- `internal/domain/services/workout_service.go:261`
- `internal/domain/services/meal_service.go:267`
- `internal/domain/services/body_measurement_service.go:300`

**Status**: Implemented. `go build ./...` passes.

---

## P4 — Long Functions (>50 lines, 6 cases)

| # | File | Function | Lines (~) | Extract Into |
|---|------|----------|-----------|-------------|
| 1 | `internal/api/handlers/relationship_handler.go:619-699` | `calculateWorkoutStats()` | 80 | `calculateExerciseBreakdown()`, `calculateWeeklyVolume()`, `calculateConsistency()` |
| 2 | `internal/api/handlers/relationship_handler.go:701-783` | `calculateMealStats()` | 82 | `calculateWeeklyMealAverages()`, `buildMealTypeBreakdown()` |
| 3 | `internal/api/handlers/relationship_handler.go:380-463` | `GetClientDetails()` | 83 | Extract stats computation (lines 431-456) into helper |
| 4 | `internal/api/handlers/relationship_handler.go:552-617` | `GetClientStats()` | 65 | Extract date-query building into helper |
| 5 | `internal/api/handlers/comment_handler.go:76-155` | `CreateComment()` | 79 | Extract parent resolution + role mapping into helpers |
| 6 | `internal/infrastructure/persistence/postgres/trainer_profile.go:142-199` | `UpdateTrainerProfile()` | 57 | Extract profile field mapping into helper |

---

## P5 — Long Lines >120 chars (~40 lines)

### High priority — wrap at semantic boundaries

| # | File:Line | Chars | Issue | Fix |
|---|-----------|-------|-------|-----|
| 1 | `internal/domain/services/admin_service.go:24` | **246** | `NewAdminService(5 repos)` → use `AdminServiceDeps` struct | Param struct |
| 2 | `internal/domain/models/body_measurement.go:30` | **184** | `NewBodyMeasurement(7 params)` → use `BodyMeasurementInput` struct | Param struct |
| 3 | `internal/domain/services/comment_service.go:90` | **174** | `CanCreateComment(6 params)` → use `CommentAuthInput` struct | Param struct |
| 4 | `internal/domain/services/exercise_service.go:42` | **163** | `CreateExercise(5 params)` → use `CreateExerciseInput` struct | Param struct |
| 5 | `internal/app/module.go:85` | **199** | fx anonymous func | Break params across lines |
| 6 | `internal/infrastructure/persistence/postgres/cached_trainer_profile.go:55` | **186** | `SearchTrainers` | Break params across lines |
| 7 | `internal/infrastructure/persistence/postgres/cached_trainer_profile.go:50` | **175** | `GetPublicTrainers` | Break params across lines |
| 8 | `internal/infrastructure/persistence/postgres/trainer_profile.go:201` | **188** | `SearchTrainers` | Break params across lines |
| 9 | `internal/domain/services/review_service.go:18` | **160** | `NewReviewService` | Break params across lines |

### Medium priority — structural literals & multi-arg calls

| # | File:Line | Chars | Issue | Fix |
|---|-----------|-------|-------|-----|
| 10 | `internal/infrastructure/persistence/postgres/availability.go:57` | 143 | `row.Scan()` 8 dest args | Break across lines |
| 11 | `internal/infrastructure/persistence/postgres/availability.go:174` | 144 | `rows.Scan()` 8 dest args | Break across lines |
| 12 | `internal/infrastructure/persistence/postgres/exercise.go:79` | 167 | `rows.Scan()` 9 dest args | Break across lines |
| 13 | `internal/app/module.go:210` | 132 | CORS `AllowHeaders` slice | Break items across lines |
| 14 | `internal/testutils/testutils.go:102` | 181 | `TrainerAvailability{...}` literal | Break fields across lines |
| 15 | `internal/testutils/testutils.go:95` | 173 | `CreateTestCommentWithParent` sig | Break params |

### Low priority — SQL strings (conventional, acceptable as-is)

| # | File:Line | Chars | Query |
|---|-----------|-------|-------|
| 16 | `internal/infrastructure/persistence/postgres/body_measurement.go:37` | 181 | INSERT |
| 17 | `internal/infrastructure/persistence/postgres/body_measurement.go:131` | 153 | UPDATE |
| 18 | `internal/infrastructure/persistence/postgres/coaching_request.go:91` | 178 | SELECT+WHERE |
| 19 | `internal/infrastructure/persistence/postgres/exercise.go:35` | 161 | INSERT |
| 20 | `internal/infrastructure/persistence/postgres/meal.go:79` | 162 | SELECT+WHERE |
| 21 | `internal/infrastructure/persistence/postgres/relationship.go:109` | 165 | SELECT+WHERE |
| 22 | `internal/infrastructure/persistence/postgres/comment.go:40` | 169 | INSERT |

---

## P6 — `interface{}` → `any` (15+ locations, mechanical)

**Rule**: Go 1.18+ idiomatic. Simple find-and-replace.

| # | File | Lines | Current | Fix |
|---|------|-------|---------|-----|
| 1 | `internal/infrastructure/persistence/postgres/helpers.go` | 11, 22 | `MarshalToJSONB(v interface{})` | `MarshalToJSONB(v any)` |
| 2 | `internal/infrastructure/persistence/postgres/helpers.go` | 22 | `UnmarshalFromJSONB(data []byte, v interface{})` | `v any` |
| 3 | `internal/infrastructure/persistence/postgres/workout.go` | 58, 147 | `var planID interface{}` | `var planID any` |
| 4 | `internal/infrastructure/persistence/postgres/exercise.go` | 30 | `var createdBy interface{}` | `var createdBy any` |
| 5 | `internal/infrastructure/persistence/postgres/exercise.go` | 125 | `args := []interface{}{query}` | `args := []any{query}` |
| 6 | `internal/infrastructure/persistence/postgres/trainer_profile.go` | 30 | returns `[]interface{}` | `[]any` |
| 7 | `internal/infrastructure/persistence/postgres/trainer_profile.go` | 120 | `args ...interface{}` | `args ...any` |
| 8 | `internal/api/handlers/auth_handler.go` | 33 | `Profile interface{}` | `Profile any` |

---

## Execution Order

```
Phase 1 — JSON Safety (P0, ~5 min per file)
  1. Repository layer (21 files) — bottom-up so callers auto-benefit
  2. Service layer (14 files)
  3. Handler layer (6 files)
  Verify: go build ./... passes, JSON responses return [] not null

Phase 2 — Readability (P1-P3, ~30 min)
  1. Create internal/api/handlers/error_response.go
  2. Update 6 handlers to use handleServiceError()
  3. Extract 4 complex boolean conditions
  4. Fix 2 guard clause patterns + 1 else-if → switch
  5. Extract isOnOrAfter() + parseRFC3339Range() helpers

Phase 3 — Line Lengths (P4-P5, ~30 min)
  1. Input structs for multi-param constructors (Big 4)
  2. Break remaining ~15 long lines at semantic boundaries
  3. Split 6 long functions into smaller helpers

Phase 4 — Modernization (P6, ~10 min)
  1. interface{} → any (15 locations)
  Verify: go build ./... passes
```

---

## Existing Correct Patterns (don't change)

These already follow the style guide — use them as reference:

- `admin_handler.go:69` — `items := make([]AdminUserListItem, 0, len(users))`
- `admin_handler.go:374` — `items := make([]AdminCommentListItem, 0, len(comments))`
- `trainer_review.go:80` — `reviews := make([]models.TrainerReview, 0)`

## Excluded (not violations)

- All `var x []byte` patterns (SQL scan destinations — correctly handled by `Scan()`)
- Singleflight callbacks returning `interface{}` (constrained by `golang.org/x/sync/singleflight` API)
- `var decoded []string` in test unmarshal targets (not production JSON serialization)
- `var slots []models.TrainerAvailability` as BindJSON target (will be overwritten)
