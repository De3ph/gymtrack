# Plan: Athlete Self-Created Workout Plans (Mobile)

Status: DRAFT — not started
Scope: `mobile/` only. Backend requires **no changes** (verified).
Reference implementation: `frontend/` athlete workout-plans feature.

---

## 1. Problem

In the web app, an athlete can create, edit, delete, and start their own
workout plans (max 3), and separately see plans assigned by their trainer
(`frontend/src/app/[locale]/(dashboard)/athlete/workout-plans/page.tsx`).

In the mobile app the athlete only sees a **read-only list of trainer-assigned
plans** (`MyWorkoutPlansScreen` → `GET /workout-plans/assigned`). There is no
way for an athlete to create a plan for themselves. Only the trainer stack
(`/trainer/plans`) has a (minimal) create flow.

---

## 2. Findings from Investigation

### 2.1 Backend — already ready (no changes)

- `POST /api/workout-plans` handler allows `RoleTrainer || RoleAthlete`
  (`backend/internal/api/handlers/workout_plan_handler.go`).
- Service enforces athlete limit of **3** plans via `CountByCreatorID`
  (`backend/internal/domain/services/workout_plan_service.go`).
- Ownership uses `CreatorID` (role-agnostic); `workout_plans.creator_id` is
  `NOT NULL` FK to `users` (migration `001_initial_schema.up.sql`).
- Athlete can update/delete own plans; start-from-plan allows
  `plan.CreatorID == athleteID`.
- `GET /api/workout-plans` returns plans by creator → athlete's own plans.
- `GET /api/workout-plans/assigned` returns assignment-based plans only
  (trainer-assigned). The athlete screen must combine **both** sources.
- Assignment (`POST /:id/assign`) stays trainer-only — not needed here.

### 2.2 Mobile — current state

| Piece | File | State |
|---|---|---|
| API client | `mobile/src/api/workoutPlanApi.ts` | Has `create`, `getAll`, `getById`, `update`, `delete`, `assign`, `getMyPlans`. **No changes strictly required.** |
| Athlete list | `mobile/src/components/features/workout/workout-plan/MyWorkoutPlansScreen.tsx` | Assigned-only, read-only, no create. Navigates to `/trainer/plans/:id` (wrong role stack). |
| Trainer list | `.../workout-plan/WorkoutPlansScreen.tsx` | Create modal only name+description, sends `exercises: []`. No exercise builder. |
| Plan detail | `.../workout-plan/WorkoutPlanDetailScreen.tsx` | Trainer-only actions. Edit flattens sets and hardcodes `exerciseId: 0` / `restTime: 60` → **data loss on edit**. |
| Exercise picker | `mobile/src/components/features/workout/ExercisePicker.tsx` | Reusable, exported. |
| Plan-era state | `mobile/src/stores/workout-form-store.ts` | `NewExercise`/`NewSet` (id, name, notes, pickedExerciseId, reps, weight). Missing `weightUnit` / `restTime`. |
| Exercise/set UI | `mobile/src/components/features/workout/ActiveWorkoutScreen.tsx` | `SetRow` + `ExerciseSection` are good patterns but are **local, not exported**. |
| Routes | `mobile/app/athlete/workout-plans.tsx`, `mobile/app/athlete/_layout.tsx` | Single file route; no detail/create route registered. |
| i18n | `mobile/messages/{en,tr}.json` | `athlete.workout_plans` exists but only 8 read-only keys. `trainer.workout_plans` is full. |

### 2.3 Types

`mobile/src/types/index.ts` already defines `WorkoutPlan`,
`WorkoutPlanExercise`, `WorkoutPlanSet` (`setId?`, `weight`, `weightUnit`,
`reps`, `restTime`). No new model types needed; add request-payload aliases only
if useful.

---

## 3. Scope

**In scope**
- Athlete can create / edit / delete their own plans with a full exercise builder.
- Athlete screen shows "My Plans" (own) + "Assigned by Trainer" sections.
- Athlete max-3 limit surfaced in UI (mirrors backend + frontend).
- Athlete can open a plan detail and start a workout from it.
- Reuse the new form to upgrade the trainer create/edit flow (removes the
  `exercises: []` and flattened-edit bugs) — recommended, low extra cost.
- i18n keys added to `en.json` + `tr.json`.

**Out of scope**
- Any backend change.
- Trainer→athlete assignment UI changes (`AssignClientModal` untouched),
  except where it shares the detail screen.
- Offline support, plan sharing, analytics.

---

## 4. Design Decisions

1. **One shared plan form for both roles.** Build
   `WorkoutPlanFormModal` under
   `mobile/src/components/features/workout/workout-plan/` and use it from both
   the trainer and athlete screens. Avoids two divergent editors.
2. **New reusable exercise editor.** Extract a `PlanExerciseEditor`
   (name + `ExercisePicker` trigger + set rows with weight / reps / unit /
   rest + notes) modeled on `ActiveWorkoutScreen`'s `ExerciseSection`
   (exported/reused rather than copy-pasted).
3. **Dedicated mobile plan state** instead of overloading
   `workout-form-store` (which is tuned for workout logging).
   Add `mobile/src/stores/plan-form-store.ts` with `PlanDraft` /
   `PlanDraftExercise` / `PlanDraftSet` carrying `weightUnit` and `restTime`.
   Alternative: extend `workout-form-store`; rejected to avoid regressing the
   active-workout flow.
4. **Convert the athlete route to a directory** so a detail screen can exist:
   - `app/athlete/workout-plans.tsx` → `app/athlete/workout-plans/index.tsx`
   - add `app/athlete/workout-plans/[id].tsx`
   (Expo Router cannot host both `workout-plans.tsx` and `workout-plans/`.)
5. **Generalize the detail screen** by role: athlete sees view + Start +
   Edit/Delete (own plan); trainer keeps Assign. Reuse one component with a
   `role`/ownership check, or split into `PlanDetailScreen` with conditional
   actions.
6. **Fix navigation targets**: athlete detail → `/athlete/workout-plans/[id]`;
   trainer detail → `/trainer/plans/[id]`. Update both `MyWorkoutPlansScreen`
   and `StartWorkoutScreen` (`handleOptions`).
7. **Start workout** reuses the existing `workout-form-store.startFromPlan()`
   + navigate to `/workout-log` (already how mobile starts from a plan). The
   `POST /workout-plans/:id/start` endpoint is not used by mobile today; leave it.

---

## 5. Work Breakdown

### Phase 1 — Data & state foundation
1. `mobile/src/stores/plan-form-store.ts` (new)
   - State: `name`, `description`, `exercises: PlanDraftExercise[]`,
     `editingPlanId: number | null`, `submitError`.
   - `PlanDraftSet { id, weight, reps, restTime, weightUnit }`,
     `PlanDraftExercise { id, exerciseId, name, notes, sets[] }`.
   - Actions: `startCreate()`, `startEdit(plan)`, `reset()`,
     `setName/setDescription`, `addExercise`, `removeExercise`,
     `updateExerciseName/PickedId/Notes`, `addSet/removeSet`,
     `updateSet{Weight,Reps,Rest,Unit}`.
   - `toRequest()` → `{ name, description, exercises: WorkoutPlanExercise[] }`
     mapping draft → API shape (`order` = index, numeric coercion, defaults
     `weightUnit: "kg"`, `restTime: 60`).
2. `mobile/src/api/workoutPlanApi.ts` (edit, minimal)
   - Add explicit payload types `CreateWorkoutPlanRequest` /
     `UpdateWorkoutPlanRequest` (drop the forced `creatorId` from the sent body
     if backend ignores it — verify in Phase 0 task). Keep method signatures
     compatible with existing callers.

### Phase 2 — Reusable UI components
3. `.../workout/workout-plan/PlanExerciseEditor.tsx` (new)
   - Props: `exercise`, callbacks. Name field + `ExercisePicker` open button,
     set rows (weight/reps/rest/unit), "+ Add set", remove exercise.
4. `.../workout/workout-plan/PlanSetRow.tsx` (new) — set row primitive.
5. `.../workout/workout-plan/WorkoutPlanFormModal.tsx` (new)
   - Fields name/description + list of `PlanExerciseEditor` + Add Exercise.
   - `useMutation` → `create` or `update`; on success invalidate
     `["workoutPlans"]`, `["myPlans"]`, `["workoutPlan", id]`.
   - Limit-aware: when creating as athlete and ≥3 own plans, disable submit and
     show `limit_reached`.

### Phase 3 — Athlete screens
6. `.../workout/workout-plan/MyWorkoutPlansScreen.tsx` (rewrite)
   - Section A "My Plans": `useQuery(["workoutPlans"], getAll)` + limit counter
     + Create FAB (disabled at limit) + per-card Edit/Delete + tap → athlete
     detail.
   - Section B "Assigned by Trainer": existing `getMyPlans` cards → detail /
     start workout.
7. `.../workout/workout-plan/AthletePlanDetailScreen.tsx` (new) — view
   exercises; actions Start Workout / Edit / Delete for own plan; view-only for
   assigned.
8. Routes:
   - Convert `mobile/app/athlete/workout-plans.tsx` →
     `mobile/app/athlete/workout-plans/index.tsx`.
   - Add `mobile/app/athlete/workout-plans/[id].tsx`.
   - Register `workout-plans/index` + `workout-plans/[id]` in
     `mobile/app/athlete/_layout.tsx`.

### Phase 4 — Trainer parity (reuse form; fixes existing bugs)
9. `.../workout/workout-plan/WorkoutPlansScreen.tsx` — replace inline create
   modal with `WorkoutPlanFormModal`; keep delete FAB.
10. `.../workout/workout-plan/WorkoutPlanDetailScreen.tsx` — replace flattened
    edit with `WorkoutPlanFormModal` so exercises/sets/units are preserved.

### Phase 5 — i18n
11. `mobile/messages/en.json` + `mobile/messages/tr.json`
    - Extend `athlete.workout_plans` with: `create`, `edit`, `delete`,
      `delete_confirm`, `own_plans`, `assigned_plans`, `limit_counter`,
      `limit_reached`, `plan_name`, `description_label`, `description_placeholder`,
      `add_exercise`, `no_plans`, `notes_placeholder`, `plan_create`,
      `plan_update`, `exercise_name_placeholder`, `fallback_exercise_name`,
      `back`, `start_workout`, `view_plan`, `load_failed`.
    - Add a shared form namespace (e.g. `workout.plan_form.*`) for set columns:
      `name`, `description`, `weight`, `reps`, `rest`, `unit`, `add_set`,
      `remove_set`, `notes`, `save`, `cancel`, `sets_label`.
    - Keep `en`/`tr` key sets identical.

### Phase 6 — Verification
12. `npx tsc --noEmit` in `mobile/` clean.
13. `pnpm lint` in `mobile/` clean.
14. Manual flows on Android emulator (see §6).
15. Confirm no `[trainer/plans` links remain in athlete components.

---

## 6. Acceptance Criteria / Manual Test Matrix

| # | Flow | Expected |
|---|---|---|
| A1 | Athlete opens My Plans with 0 own plans | Empty state + Create enabled |
| A2 | Create plan: name + 1 exercise + 2 sets (weight/reps/rest/unit) | POST `/workout-plans`; card appears; `creatorId` = athlete |
| A3 | Create 3 plans, try 4th | Create disabled / `limit_reached` shown |
| A4 | Edit own plan (change set weight + rest) | PUT preserves all exercises, units, rest (no flattening) |
| A5 | Delete own plan | Confirm dialog → DELETE → removed from list |
| A6 | Assigned-by-trainer section | Still lists `/workout-plans/assigned`; open works |
| A7 | Start workout from own plan | `startFromPlan` → `/workout-log` pre-filled |
| A8 | Start workout from assigned plan | Same, no crash |
| A9 | Athlete taps plan | Navigates to `/athlete/workout-plans/[id]` (never trainer stack) |
| A10 | Trainer existing flows | Create/edit plan now includes exercises; assign unchanged |
| A11 | Backend limit | 4th create via direct API still rejected by server with message |

---

## 7. Risks & Edge Cases

- **Route conflict**: cannot keep `workout-plans.tsx` and add
  `workout-plans/`. Must move to directory; verify `expo-router` picks up
  `index.tsx`.
- **Existing broken edit**: `WorkoutPlanDetailScreen` currently loses data; new
  form must round-trip `exerciseId`, `weightUnit`, `restTime`, `notes`, `order`.
- **Exercise id**: when user doesn't pick from catalog, backend accepts
  `exerciseId: 0` + free-text `name`; ensure mapping keeps `0` allowed.
- **Numeric coercion**: set fields are strings in UI; coerce with `Number(...)`
  and default to `0`, guard `NaN`.
- **Query-key collision**: trainer and athlete both use `["workoutPlans"]` from
  `getAll`; that is correct (creator-scoped by auth) but invalidate consistently
  in every mutation.
- **Assign data contract mismatch**: mobile `assign` sends `{ athleteId }`
  while web sends `{ athleteIds: [] }`. Out of scope, but do not accidentally
  "fix" it as part of this feature.
- **Stale `create` typing**: `Omit<WorkoutPlan,…>` forces `creatorId` into the
  request body. Verify against handler; prefer an explicit request type.

---

## 8. Open Questions (confirm before Phase 1)

1. Should the trainer flow be upgraded in the same PR, or ship athlete-only
   first? (Plan assumes same PR, Phases 3–4; trainer parity can be split out.)
2. Detail/start UX: full-screen detail route (plan) vs bottom-sheet preview?
   (Plan assumes full-screen route, matching web `PlanViewDialog` content.)
3. Should athletes be able to start an assigned plan from the My Plans screen,
   or only from Start Workout? (Plan: both.)

---

## 9. Suggested Execution Order

Phase 0 (verify handler request contract) → 1 → 2 → 3 → 5 → 6, then 4 (trainer)
→ final 6. Delegate Phase 2 (UI, `visual-engineering`) and Phase 1/3 wiring in
parallel where files do not overlap.
