# Mobile App — Remaining Features (Route Gap Analysis)

## Context

Comparison between frontend (Next.js) and mobile (Expo/React Native) routes after initial nativization. All 18 mobile routes use native screens — zero DOM-component fallback routes remain active. All 16 backend API modules have matching mobile API clients. This doc covers only features that exist in the web frontend but are missing from mobile.

**Excluded**: Admin routes (desktop-only, per original plan).

## Current State

### Route Coverage (18/18 ✅)

| # | Screen | Frontend | Mobile | Implementation |
|---|--------|----------|--------|----------------|
| 1 | Login | `(auth)/login` | `(auth)/login` | LoginScreen — form + validation |
| 2 | Register | `(auth)/register` | `(auth)/register` | RegisterScreen — role picker + role-specific fields |
| 3 | Dashboard | `dashboard` | `(tabs)/index` | DashboardScreen — welcome + quick actions + recent activity |
| 4 | Workouts | `athlete/workouts` | `(tabs)/workouts` | WorkoutsScreen — FlatList + FAB create modal (multi-exercise, multi-set) |
| 5 | Meals | `athlete/meals` | `(tabs)/meals` | MealsScreen — FlatList + create modal (meal type picker, food items with macros) |
| 6 | Measurements | `athlete/measurements` | `(tabs)/measurements` | MeasurementsScreen — FlatList + sparkline (react-native-svg) + bottom-sheet create |
| 7 | Profile | `profile` | `(tabs)/profile` | ProfileScreen — view/edit + logout + role-based nav links |
| 8 | Trainer Catalog | `athlete/trainers` | `trainer-catalog/index` | TrainerCatalogScreen — search + card list |
| 9 | Trainer Detail | `athlete/trainers/[id]` | `trainer-catalog/[id]` | TrainerDetailScreen — profile + reviews (read) + availability (read) + coaching request form |
| 10 | My Trainer | `athlete/my-trainer/[id]` | `athlete/my-trainer/[id]` | MyTrainerScreen — detail + terminate |
| 11 | Coaching Requests (athlete) | `athlete/requests` | `athlete/requests` | CoachingRequestsScreen — dual-role (athlete sees sent, trainer sees incoming) |
| 12 | Coaching Requests (trainer) | `trainer/requests` | `trainer/requests` | Same screen, accepts/rejects when trainer |
| 13 | Workout Plans (athlete) | `athlete/workout-plans` | `athlete/workout-plans` | MyWorkoutPlansScreen — read-only list |
| 14 | Clients | `trainer/clients` | `trainer/clients` | ClientsScreen — FlatList with avatar cards |
| 15 | Client Detail | `trainer/client/[username]` | `trainer/client/[username]` | ClientDetailScreen — tabs (overview/workouts/meals/measurements) |
| 16 | Trainer Profile | `trainer/profile` | `trainer/profile` | TrainerProfileScreen — view/edit (name, bio, hourly rate) |
| 17 | Workout Plans (trainer) | `trainer/workout-plans` | `trainer/plans` | WorkoutPlansScreen — list + create modal |
| 18 | Plan Detail | `trainer/workout-plans/[id]` | `trainer/plans/[id]` | WorkoutPlanDetailScreen — read-only exercise list |

### API Client Coverage (16/16 ✅)

All backend API groups have matching mobile API client modules in `mobile/src/api/`:
`authApi`, `userApi`, `workoutApi`, `mealApi`, `bodyMeasurementApi`, `exerciseApi`, `commentApi`, `trainerCatalogApi`, `relationshipApi`, `coachingRequestApi`, `reviewApi`, `availabilityApi`, `trainerClientApi`, `workoutPlanApi`, `adminApi`.

---

## Gap Analysis — 8 Missing Features

| # | Feature | Mobile API Ready? | Backend Ready? | Priority | Effort |
|---|---------|:---:|:---:|---|---|---|
| G1 | **Workout/Meal/Measurement edit/delete** | ✅ | ✅ | P0 | Medium |
| G2 | **Comments UI** | ✅ | ✅ | P1 | Medium |
| G3 | **Submit trainer review** | ✅ | ✅ | P1 | Small |
| G4 | **Workout plan edit/delete** | ⚠️ | ✅ | P2 | Medium |
| G5 | **Workout plan assignment** | ⚠️ | ✅ | P2 | Medium |
| G6 | **Trainer availability CRUD** | ✅ | ✅ | P2 | Medium |
| G7 | **Invitation codes** | ✅ | ✅ | P2 | Small |
| G8 | **Exercise catalog picker** | ✅ | ✅ | P3 | Medium |


## Feature Cards

### G1 — Edit/Delete Workout, Meal, Measurement (P0)

**Why**: Athlete logs data, makes mistake, stuck. 24h edit window is core UX guarantee.

**Backend**: All three resources have PUT/DELETE endpoints with 24h window enforcement.

**Mobile API**: All three API clients have `update(id, data)` and `delete(id)` methods.

**What to build**:
- **Workout**: Edit button on WorkoutCard opens same modal pre-filled. Delete with confirmation alert.
- **Meal**: Edit button on MealCard opens same modal pre-filled. Delete with confirmation.
- **Measurement**: Edit button on measurement cards opens bottom-sheet form pre-filled. Swipe-to-delete.

**Files to touch** (~3 files):
- `mobile/src/components/features/workout/WorkoutsScreen.tsx`
- `mobile/src/components/features/meal/MealsScreen.tsx`
- `mobile/src/components/features/measurement/MeasurementsScreen.tsx`

**Note**: Date field should be locked during edit (changing date would bypass 24h window).

---

### G2 — Comments UI (P1)

**Why**: Trainer-athlete interaction loop broken without comments.

**Backend**: POST/GET/PUT/DELETE `/api/comments` with targetType (workout/meal) and targetId.

**Mobile API**: `commentApi.getByTarget()`, `.create()`, `.update()`, `.delete()`.

**What to build**:
- Reusable `CommentSection` component: FlatList of threaded comments + TextInput for new comment
- Currently mobile has no workout/meal detail screen. Create detail screens with embedded comments:
  - `WorkoutDetailScreen` — tap card navigates to detail
  - `MealDetailScreen` — same pattern
- Embed `CommentSection` in ClientDetailScreen (trainer viewing client workouts/meals)

**Decision**: Create dedicated detail screens (cleaner than inline expandable card).

**Files to touch** (~5 files):
- `mobile/src/components/features/comments/CommentSection.tsx` (new)
- `mobile/src/components/features/workout/WorkoutDetailScreen.tsx` (new)
- `mobile/app/(tabs)/workouts/[id].tsx` (new route)
- `mobile/src/components/features/meal/MealDetailScreen.tsx` (new)
- `mobile/app/(tabs)/meals/[id].tsx` (new route)

---

### G3 — Submit Trainer Review (P1)

**Why**: Athlete can see reviews in TrainerDetailScreen but can't submit own.

**Backend**: POST `/api/trainers/:id/reviews` (rating 1-5 + optional comment).

**Mobile API**: `reviewApi.createReview(trainerId, { rating, comment })`, `.updateReview()`, `.deleteReview()`.

**What to build**:
- Star rating picker (5 tappable stars) + optional comment TextInput
- Embed in `TrainerDetailScreen` below existing reviews section
- Only show for athlete role when relationship is active

**Files to touch** (~2 files):
- `mobile/src/components/features/trainer/TrainerDetailScreen.tsx`
- `mobile/src/components/features/trainer/StarRatingInput.tsx` (new, reusable)


### G4 — Workout Plan Edit/Delete (P2)

**Why**: Trainer creates plan, wants to fix exercise list or delete obsolete plan.

**Backend**: PUT/DELETE `/api/workout-plans/:id`.

**Mobile API**: Verify `workoutPlanApi` has `update(id, data)` and `delete(id)`. Add if missing.

**What to build**:
- Edit button on `WorkoutPlanDetailScreen` toggles edit mode
- Delete button with confirmation alert
- Swipe-to-delete on plan cards in `WorkoutPlansScreen`

**Files to touch** (~2 files):
- `mobile/src/components/features/workout-plan/WorkoutPlanDetailScreen.tsx`
- `mobile/src/components/features/workout-plan/WorkoutPlansScreen.tsx`
- `mobile/src/api/workoutPlanApi.ts` (verify/add methods)

---

### G5 — Workout Plan Assignment (P2)

**Why**: Trainer creates plan but can't assign it to athletes.

**Backend**: POST `/api/workout-plans/:id/assign` (athleteId, startDate, endDate), DELETE `/api/workout-plans/:id/assign/:assignmentId`, GET `/api/workout-plans/my-assignments`.

**Mobile API**: Add assignment methods to `workoutPlanApi.ts`.

**What to build**:
- "Assign to Athlete" button on `WorkoutPlanDetailScreen`
- Modal: FlatList of trainer's active clients + start/end date pickers
- Athlete's `MyWorkoutPlansScreen` already queries plans — should show assigned plans

**Files to touch** (~3 files):
- `mobile/src/api/workoutPlanApi.ts` (add assignment methods)
- `mobile/src/components/features/workout-plan/WorkoutPlanDetailScreen.tsx`
- `mobile/src/components/features/workout-plan/AssignClientModal.tsx` (new)

---

### G6 — Trainer Availability CRUD (P2)

**Why**: Trainer profile has no availability settings. Athletes see empty availability.

**Backend**: GET/PUT `/api/trainers/me/availability`, DELETE `/api/trainers/me/availability/:id`.

**Mobile API**: `availabilityApi.getMyAvailability()`, `.setMyAvailability()`, `.deleteSlot()`.

**What to build**:
- "Availability" section in `TrainerProfileScreen`
- Day-of-week picker + start/end time inputs per slot (add/remove)
- Save calls `setMyAvailability` with all slots

**Files to touch** (~1 file):
- `mobile/src/components/features/trainer/TrainerProfileScreen.tsx`

---

### G7 — Invitation Codes (P2)

**Why**: No way to generate invite code (trainer) or accept one (athlete).

**Backend**: POST `/api/relationships/invite` (generates code), POST `/api/relationships/accept`.

**Mobile API**: `relationshipApi.generateInvitation()`, `.acceptInvitation()`.

**What to build**:
- **Trainer**: "Generate Invite Code" button on `ClientsScreen`. Shows generated code (copyable).
- **Athlete**: "Enter Invite Code" input on `MyTrainerScreen` when no trainer assigned.

**Files to touch** (~2 files):
- `mobile/src/components/features/trainer/ClientsScreen.tsx`
- `mobile/src/components/features/trainer/MyTrainerScreen.tsx`

---

### G8 — Exercise Catalog Picker (P3)

**Why**: Workout create form uses free-text exercise name. Should pick from structured catalog.

**Backend**: GET `/api/exercises` (with filters), GET `/api/muscle-groups`, GET `/api/equipment`.

**Mobile API**: `exerciseApi.getAll()`, `.search()`, `.getByMuscleGroup()`, `.getMuscleGroups()`, `.getEquipment()`.

**What to build**:
- `ExercisePicker` component: searchable FlatList of exercises from catalog
- Replace free-text exercise name input in Workout create/edit form
- Keep free-text fallback for custom exercises

**Files to touch** (~2 files):
- `mobile/src/components/features/workout/ExercisePicker.tsx` (new)
- `mobile/src/components/features/workout/WorkoutsScreen.tsx`


## Execution Order

### Phase 1 — CRUD Completeness (P0)

| Task | Feature | Est. |
|------|---------|------|
| 1.1 | G1: Edit/delete workout | 2h |
| 1.2 | G1: Edit/delete meal | 2h |
| 1.3 | G1: Edit/delete measurement | 1.5h |

**Deliverable**: Athlete can fix mistakes within 24h window on all three resources.

### Phase 2 — Social & Interaction Layer (P1)

| Task | Feature | Est. |
|------|---------|------|
| 2.1 | G2: Workout/meal detail screens + comment section | 3h |
| 2.2 | G3: Submit trainer review | 1.5h |

**Deliverable**: Trainer-athlete feedback loop working.

### Phase 3 — Trainer Tools (P2)

| Task | Feature | Est. |
|------|---------|------|
| 3.1 | G4: Workout plan edit/delete | 2h |
| 3.2 | G5: Workout plan assignment | 2.5h |
| 3.3 | G6: Trainer availability CRUD | 1.5h |
| 3.4 | G7: Invitation codes (generate + accept) | 1.5h |

**Deliverable**: Full trainer workflow (create plan → assign → monitor → comment).

### Phase 4 — Polish (P3)

| Task | Feature | Est. |
|------|---------|------|
| 4.1 | G8: Exercise catalog picker | 2h |

**Deliverable**: Structured exercise selection in workout form.

**Total estimate**: ~19h (2.5 days) for all gaps.

---

## Risk Notes

| Risk | Mitigation |
|------|------------|
| **CORS** — `module.go` has `AllowAllOrigins` enabled. | Verify it covers all mobile origins. |
| **Auth** — Mobile uses `expo-secure-store` + direct REST. No session cookie. | Already implemented; token refresh via `POST /api/auth/refresh`. |
| **Types codegen** — API response types may change. | Regenerate `src/types/generated.ts` from `backend/docs/swagger.json` if needed. |
| **24h window** — Edit/delete enforcement is server-side. | Verify backend PUT endpoints ignore date field changes for window calculation. |
| **Comment threading** — Backend supports `parentCommentId`. | Mobile CommentSection flat list first; threading later. |

---

## Files Summary

| File | Action | Feature |
|------|--------|---------|
| `WorkoutsScreen.tsx` | Edit | G1, G8 |
| `MealsScreen.tsx` | Edit | G1 |
| `MeasurementsScreen.tsx` | Edit | G1 |
| `WorkoutDetailScreen.tsx` | **New** | G2 |
| `MealDetailScreen.tsx` | **New** | G2 |
| `CommentSection.tsx` | **New** | G2 |
| `workouts/[id].tsx` (route) | **New** | G2 |
| `meals/[id].tsx` (route) | **New** | G2 |
| `TrainerDetailScreen.tsx` | Edit | G3 |
| `StarRatingInput.tsx` | **New** | G3 |
| `WorkoutPlanDetailScreen.tsx` | Edit | G4, G5 |
| `WorkoutPlansScreen.tsx` | Edit | G4 |
| `AssignClientModal.tsx` | **New** | G5 |
| `workoutPlanApi.ts` | Edit | G5 |
| `TrainerProfileScreen.tsx` | Edit | G6 |
| `ClientsScreen.tsx` | Edit | G7 |
| `MyTrainerScreen.tsx` | Edit | G7 |
| `ExercisePicker.tsx` | **New** | G8 |
