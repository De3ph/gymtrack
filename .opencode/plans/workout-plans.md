# Implementation Plan: Workout Plans (Trainer Templates)

---

## BREAKING CHANGES

| # | Change | Impact | How to Validate |
|---|--------|--------|-----------------|
| B1 | `NewWorkout()` in `models/workout.go` — new optional `planID` parameter | All callers must pass a value (empty string for non-plan workouts) | `go build ./...` fails if any call site isn't updated. Only caller is `workout_service.go:46`. |
| B2 | Existing `Workout` documents in Couchbase will lack the `planId` field | Read-safe: Go struct default `""` handles absence. No migration needed. | Query a pre-existing workout via API before and after — JSON output should omit `planId` (or show `""`). |
| B3 | `ClientTabs` component — self-fetching tab eliminates new props | Old pages continue to work unchanged | Existing client detail page loads without error. |

---

## PHASE 1: Backend Models + Collections ✅

### Sub-plan: Models

**File: `backend/internal/domain/models/workout_plan.go`** (new)

```go
type WorkoutPlan struct {
    Type        string               `json:"type"` // "workout_plan"
    PlanID      string               `json:"planId"`
    TrainerID   string               `json:"trainerId"`
    Name        string               `json:"name"`
    Description string               `json:"description"`
    Exercises   []WorkoutPlanExercise `json:"exercises"`
    CreatedAt   time.Time            `json:"createdAt"`
    UpdatedAt   time.Time            `json:"updatedAt"`
}

type WorkoutPlanExercise struct {
    ExerciseID string           `json:"exerciseId"`
    Name       string           `json:"name"`
    Sets       []WorkoutPlanSet `json:"sets"`
    Notes      string           `json:"notes,omitempty"`
    Order      int              `json:"order"`
}

type WorkoutPlanSet struct {
    SetID      string     `json:"setId"`
    Weight     float64    `json:"weight"`
    WeightUnit WeightUnit `json:"weightUnit"`
    Reps       int        `json:"reps"`
    RestTime   int        `json:"restTime"` // seconds
}

type WorkoutPlanAssignment struct {
    Type         string    `json:"type"` // "workout_plan_assignment"
    AssignmentID string    `json:"assignmentId"`
    PlanID       string    `json:"planId"`
    AthleteID    string    `json:"athleteId"`
    TrainerID    string    `json:"trainerId"`
    Status       string    `json:"status"` // "active" (only status — reusable plan)
    CreatedAt    time.Time `json:"createdAt"`
}
```

Factory functions:
- `NewWorkoutPlan(trainerID, name, description string, exercises []WorkoutPlanExercise) *WorkoutPlan`
- `NewWorkoutPlanExercise(exerciseID, name string, sets []WorkoutPlanSet, notes string, order int) *WorkoutPlanExercise`
- `NewWorkoutPlanSet(weight float64, weightUnit WeightUnit, reps, restTime int) *WorkoutPlanSet`
- `NewWorkoutPlanAssignment(planID, athleteID, trainerID string) *WorkoutPlanAssignment`

**File: `backend/internal/domain/models/workout.go`** (modify)

Add optional field:
```go
PlanID    string    `json:"planId,omitempty"`
```

New function signature:
```go
func NewWorkout(athleteID string, date time.Time, exercises []WorkoutExercise, planID string) *Workout
```

### Sub-plan: Collections

**File: `backend/internal/config/collections.go`** (modify)

Add constants:
```go
CollectionWorkoutPlans          = "workout_plans"
CollectionWorkoutPlanAssignments = "workout_plan_assignments"
```

Add to `InitializeCollections` array and `createIndexes` map:

```go
CollectionWorkoutPlans: {
    fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_wp_trainer ON `%s`.`%s`.`%s`(trainerId)",
        bucketName, scopeName, CollectionWorkoutPlans),
    fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_wp_type ON `%s`.`%s`.`%s`(type)",
        bucketName, scopeName, CollectionWorkoutPlans),
},
CollectionWorkoutPlanAssignments: {
    fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_wpa_plan ON `%s`.`%s`.`%s`(planId)",
        bucketName, scopeName, CollectionWorkoutPlanAssignments),
    fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_wpa_athlete ON `%s`.`%s`.`%s`(athleteId)",
        bucketName, scopeName, CollectionWorkoutPlanAssignments),
    fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_wpa_trainer ON `%s`.`%s`.`%s`(trainerId)",
        bucketName, scopeName, CollectionWorkoutPlanAssignments),
    fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_wpa_type ON `%s`.`%s`.`%s`(type)",
        bucketName, scopeName, CollectionWorkoutPlanAssignments),
},
```

---

## PHASE 2: Backend Repository Layer ✅

### Sub-plan: WorkoutPlanRepository

**File: `backend/internal/domain/repositories/workout_plan_repository.go`** (new)

```go
type WorkoutPlanRepository interface {
    Create(plan *models.WorkoutPlan) error
    GetByID(planID string) (*models.WorkoutPlan, error)
    GetByTrainerID(trainerID string) ([]*models.WorkoutPlan, error)
    Update(plan *models.WorkoutPlan) error
    Delete(planID string) error
}
```

Each method follows the exact pattern in `workout_repository.go`:
- `Create` → `collection.Insert(plan.PlanID, plan, ...)`
- `GetByID` → `collection.Get(planID, ...)` → `result.Content(&plan)`
- `GetByTrainerID` → N1QL: `SELECT * FROM ... WHERE type='workout_plan' AND trainerId=$1 ORDER BY createdAt DESC`
- `Update` → `collection.Replace(plan.PlanID, plan, ...)`
- `Delete` → `collection.Remove(planID, ...)`

### Sub-plan: WorkoutPlanAssignmentRepository

In same file:

```go
type WorkoutPlanAssignmentRepository interface {
    Create(assignment *models.WorkoutPlanAssignment) error
    GetByPlanID(planID string) ([]*models.WorkoutPlanAssignment, error)
    GetByAthleteID(athleteID string) ([]*models.WorkoutPlanAssignment, error)
    GetByAthleteAndPlan(athleteID, planID string) (*models.WorkoutPlanAssignment, error)
    GetByTrainerID(trainerID string) ([]*models.WorkoutPlanAssignment, error)
    DeleteByPlanID(planID string) error
}
```

---

## PHASE 3: Backend Service Layer ✅

**File: `backend/internal/domain/services/workout_plan_service.go`** (new)

Dependencies:
- `WorkoutPlanRepository`
- `WorkoutPlanAssignmentRepository`
- `RelationshipRepository`
- `WorkoutRepository`
- `validator.Validate`

Methods:

| Method | Description |
|--------|-------------|
| `CreatePlan(ctx, trainerID, name, description string, exercises []WorkoutPlanExercise)` | Validates, creates plan |
| `GetPlans(ctx, trainerID string)` | Returns all plans for trainer |
| `GetPlan(ctx, planID, requesterID string, requesterRole UserRole)` | Access-controlled plan fetch |
| `UpdatePlan(ctx, planID, trainerID, name, description string, exercises []WorkoutPlanExercise)` | Owner-only update |
| `DeletePlan(ctx, planID, trainerID string, force bool)` | Blocks if active assignments + no force |
| `AssignPlan(ctx, planID, trainerID string, athleteIDs []string)` | Assigns to verified clients (idempotent) |
| `GetAssignmentsForPlan(ctx, planID, trainerID string)` | List assignments |
| `GetMyPlans(ctx, athleteID string)` | Athlete's assigned plans (returns [] if none) |
| `StartWorkoutFromPlan(ctx, planID, athleteID string)` | Creates logged Workout from plan template |
| `GetClientPlans(ctx, trainerID, athleteID string)` | Trainer views client's plans |

---

## PHASE 4: Backend Handler + Routes ✅

**File: `backend/internal/api/handlers/workout_plan_handler.go`** (new)

Each handler follows the exact pattern in `workout_handler.go`:
1. Extract `userID`, `userRole` from context
2. Role-check trainer-only endpoints
3. Bind JSON
4. Delegate to service
5. Handle errors with proper HTTP codes

Request types: `CreatePlanRequest`, `UpdatePlanRequest`, `AssignPlanRequest`

**File: `backend/internal/api/routes/workout_plan_routes.go`** (new)

```
POST   /api/workout-plans                          trainer
GET    /api/workout-plans                          trainer (own plans)
GET    /api/workout-plans/assigned                 athlete (my assigned plans)
GET    /api/workout-plans/:id                      trainer/athlete
PUT    /api/workout-plans/:id                      trainer
DELETE /api/workout-plans/:id                      trainer
POST   /api/workout-plans/:id/assign               trainer
GET    /api/workout-plans/:id/assignments          trainer
POST   /api/workout-plans/:id/start                athlete
GET    /api/clients/:username/workout-plans        trainer
```

**IMPORTANT:** `/assigned` route must be registered **before** `/:id` in Gin.

---

## PHASE 5: Backend Wiring ✅

**File: `backend/cmd/server/main.go`** (modify)

Wire new collections, repos, service, handler, and routes.

**File: `backend/internal/domain/services/workout_service.go`** (modify)

Update `NewWorkout` call to pass `""` for planID.

---

## PHASE 6: Frontend Types & Validation ✅

**File: `frontend/src/types/index.ts`** (modify)

Add: `WorkoutPlanSet`, `WorkoutPlanExercise`, `WorkoutPlan`, `WorkoutPlanAssignment`, `CreateWorkoutPlanRequest`, `UpdateWorkoutPlanRequest`, `AssignPlanRequest`
Modify: `Workout` — add `planId?: string`

**File: `frontend/src/lib/validations/workoutPlan.ts`** (new)

Zod schemas: `workoutPlanSetSchema`, `workoutPlanExerciseSchema`, `workoutPlanSchema`

---

## PHASE 7: Frontend API Layer ✅

**File: `frontend/src/lib/api/workoutPlanApi.ts`** (new)

9 methods mirroring all backend endpoints.

**File: `frontend/src/lib/api/index.ts`** (modify)

Import and export `workoutPlanApi`.

---

## PHASE 8: Frontend Components ✅

**All new under `frontend/src/components/features/workout-plan/`**

| File | Description |
|------|-------------|
| `WorkoutPlanForm.tsx` | Create/edit form with exercise selector + set inputs |
| `WorkoutPlanCard.tsx` | Card display with action buttons |
| `WorkoutPlanList.tsx` | Grid of plan cards (trainer) |
| `AssignPlanDialog.tsx` | Client selection dialog |
| `MyWorkoutPlans.tsx` | Athlete's assigned plans view |
| `ClientPlansTab.tsx` | Trainer's client detail tab (self-fetching) |

---

## PHASE 9: Frontend Pages ✅

| File | Description |
|------|-------------|
| `athlete/workout-plans/page.tsx` | Athlete's assigned plans |
| `trainer/workout-plans/page.tsx` | Trainer's plan list + create |
| `trainer/workout-plans/[id]/page.tsx` | Trainer's plan detail/edit/assign |

---

## PHASE 10: Frontend Navigation & Routes ✅

- `routes.ts`: Add `ATHLETE_WORKOUT_PLANS`, `TRAINER_WORKOUT_PLANS`, `TRAINER_WORKOUT_PLAN_DETAIL`
- `athlete-nav.tsx`: Add nav link
- `trainer-nav.tsx`: Add nav link

---

## PHASE 11: Client Dashboard Plans Tab ✅

- `ClientTabs.tsx`: Add `plans` tab trigger → `ClientPlansTab` (self-fetching, no new props)

---

## PHASE 12: i18n Messages ✅

Add keys to `messages/en.json` and `messages/tr.json` under:
- `common.navigation.workout_plans`
- `athlete.workout_plans.*`
- `trainer.workout_plans.*`
- `trainer.client_detail.tabs.plans`

---

## DEPENDENCY GRAPH

```
Phase 1 (Models + Collections)
        │
        ▼
Phase 2 (Repositories)
        │
        ▼
Phase 3 (Service)
        │
        ▼
Phase 4 (Handler + Routes)
        │
        ▼
Phase 5 (Wiring)

Phase 6 (Types + Validation) ── parallel with Phase 1-5
        │
        ▼
Phase 7 (Frontend API)
        │
        ▼
Phase 8 (Components)
        │
        ├──► Phase 9a (Athlete page)
        ├──► Phase 9b (Trainer list page)
        └──► Phase 9c (Trainer detail page)
        │
        ▼
Phase 10 (Nav + Routes)
Phase 11 (Client Tab)
Phase 12 (i18n)
```

---

## START WORKOUT FLOW

```
Athlete clicks "Start Workout" on plan card
  → POST /api/workout-plans/:id/start
  → Backend: verify assignment → fetch plan → convert PlanSets to ExerciseSets (completed=false)
  → NewWorkout(athleteID, time.Now(), exercises, planID) → save → return 201
  → Frontend: redirect to /athlete/workouts → toast "Workout started from '[Name]'!"
  → Athlete: opens workout, edits actual weights/reps (within 24h)
```
