# Mobile App — Feature Audit (2026-09-11)

Audit of `mobile/` (Expo Router + React Native) against the full GymTrack feature set (backend API + web frontend). Supersedes the gap analysis in `mobile-remaining-features.md` where status has changed.

**Scope**: Features that are broken (code exists but doesn't work) or missing (backend endpoint exists, no mobile UI).

**Excluded**: Admin moderation (intentionally desktop-only per project plan). `@expo/ui` coexistence with gluestack (by design).

---

## PART A — Confirmed Bugs

These features have mobile code that exists but is broken or non-functional.

---

### B1. "Forgot Password" button is a dead no-op

**Severity**: Medium
**File**: `src/components/features/auth/LoginScreen.tsx` (line 178-187)

The "Forgot password?" link renders but does nothing:
```tsx
<Pressable onPress={() => {}} ...>
```

**Backend endpoints exist**:
- `POST /api/auth/password-reset/request` — sends reset email
- `POST /api/auth/password-reset/confirm` — confirms new password

**What's missing**:
- ForgotPasswordRequest screen (enter email)
- ForgotPasswordConfirm screen (enter token + new password)
- API client methods for both endpoints
- Navigation from login screen to forgot-password flow

**Effort**: Medium (~3-4h)

---

### B2. Create Workout Plan always fails with 400

**Severity**: High
**File**: `src/components/features/workout-plan/WorkoutPlansScreen.tsx` (line 47)

The create mutation sends `exercises: []`:
```tsx
mutationFn: () => workoutPlanApi.create({
  creatorId: user?.userId ?? 0,
  name: newName,
  description: newDesc,
  exercises: []   // ← backend validates min=1
})
```

Backend `CreatePlanRequest` requires `validate:"required,min=1,dive"` on exercises.

**Result**: User taps "Create" → silent failure (no `onError` handler) → nothing happens.

**What's missing**:
- Exercise picker/creator in the create modal (must add at least 1 exercise)
- `onError` handler on the mutation to show user feedback
- Remove unnecessary `creatorId` field (backend derives from JWT)

**Effort**: Medium (~3-4h) — requires ExercisePicker component for the create flow

---

### B3. Workout Plan Detail save sends invalid exerciseId

**Severity**: High
**File**: `src/components/features/workout-plan/WorkoutPlanDetailScreen.tsx` (line 65-76)

The update mutation hardcodes `exerciseId: 0`:
```tsx
exercises: editExercises.map((ex, index) => ({
  exerciseId: 0,  // ← invalid, backend rejects
  name: ex.name || "",
  sets: Array(ex.sets || 0).fill(0).map(() => ({
    setId: "", weight: ex.weight || 0, weightUnit: "kg",
    reps: ex.reps || 0, restTime: 60
  })),
  notes: "", order: index
}))
```

Code comment says: `// This should be set properly`

**Result**: Any edit to a plan that has exercises → backend returns validation error.

**What's missing**:
- Proper exercise selection (resolve exerciseId from exercise name or catalog)
- Proper set/rep editing UI (current edit mode only edits the first set's reps/weight)

**Effort**: Medium (~3h) — coupled to B2 (exercise catalog)

---

### B4. Dashboard recent items don't navigate to detail

**Severity**: Medium
**File**: `src/components/features/dashboard/DashboardScreen.tsx` (lines 231-234)

Pressing a workout/meal in "Recent Activity" navigates to the list, not the detail:
```tsx
router.push(
  item.type === "workout" ? "/(tabs)/workouts" : "/(tabs)/meals"
)
```

**Expected**: Should navigate to `/workouts/${id}` or `/meals/${id}` (detail screens exist at `app/(detail)/`).

**Fix**: Change to `router.push("/workouts/" + workout.workoutId)` / `router.push("/meals/" + meal.mealId)`.

**Effort**: Small (~15min)

---

### B5. Trainer dashboard shows error state

**Severity**: Medium
**File**: `src/components/features/dashboard/DashboardScreen.tsx` (lines 73-81)

Dashboard always calls `workoutApi.getAll()` and `mealApi.getAll()`. Backend handlers for `GET /workouts` and `GET /meals` enforce athlete role — trainer gets 403.

**Result**: Trainer logs in → dashboard shows error banner or empty state with no useful content.

**What's needed**:
- Role-aware dashboard: trainer sees client overview / stats instead of own workouts/meals
- Quick actions should differ by role (trainer: clients, plans, catalog)

**Effort**: Medium (~2-3h)

---

### B6. Workout Plan Detail save sends unnecessary creatorId

**Severity**: Low (cosmetic)
**File**: `src/components/features/workout-plan/WorkoutPlanDetailScreen.tsx` (line 62)

```tsx
workoutPlanApi.update(id!, { creatorId: user?.userId ?? 0, ... })
```

Backend `UpdatePlanRequest` has no `creatorId` field. Harmless but misleading dead code.

**Fix**: Remove `creatorId` from the update payload.

**Effort**: Trivial (~5min)

---

## PART B — Missing Features

Features where backend endpoints exist but mobile has no UI or incomplete UI.

---

### M1. Admin dashboard (desktop-only by design)

**Status**: Intentionally excluded from mobile (per `mobile-remaining-features.md`).

Admin role on mobile: user sees athlete tabs, workout/meal queries return 403, profile shows no admin actions. This is acceptable for the current scope but means admin users on mobile get a degraded experience.

**If needed later**: Add admin routes under `app/admin/` with user management screens.

---

### M2. "Start Workout from Plan" (athlete)

**Severity**: Medium
**Backend**: `POST /api/workout-plans/:id/start`

`WorkoutPlanDetailScreen` exists and shows plan details for athletes. However, there is no "Start Workout" button that would create a workout from the plan template.

**What's needed**:
- "Start Workout" button on `WorkoutPlanDetailScreen` for athletes
- Confirmation dialog (optional: date picker)
- Call `POST /workout-plans/:id/start` → navigate to new workout

**Effort**: Small (~1-2h)

---

### M3. Trainer comments on client workouts/meals

**Severity**: Medium
**Backend**: `POST /api/comments` (targetType + targetId)

`ClientDetailScreen` shows read-only lists of client workouts/meals/measurements. Trainer cannot:
- Tap into a client's workout to see full exercise details
- Add a comment on a client's workout or meal

**What's needed**:
- Make workout/meal items in `ClientDetailScreen` tappable
- Navigate to detail screens (reuse `app/(detail)/workouts/[id].tsx` with trainer-aware comment permissions)
- Or inline comment section in the trainer's client view

**Effort**: Small-Medium (~2h)

---

### M4. Workout calendar / training frequency view

**Severity**: Low
**Web has**: `CalendarHeatmap` component showing training days per month.

Mobile has only a flat list of workouts. No visual calendar or frequency heatmap.

**What's needed**:
- Calendar/heatmap component in Workouts tab or Dashboard
- `react-native-calendars` or similar

**Effort**: Medium (~3h)

---

### M5. Trainer availability not visible to athletes

**Severity**: Medium
**Backend**: `GET /api/trainers/:id/availability` (public)

`TrainerDetailScreen` shows profile, reviews, and has a coaching request form. It does NOT display the trainer's weekly availability schedule.

**What's needed**:
- Availability section in `TrainerDetailScreen` showing available time slots per day
- Data from `availabilityApi` (exists in mobile API clients)

**Effort**: Small (~1h)

---

### M6. Trainer workout plans per client

**Severity**: Medium
**Backend**: `GET /api/clients/:username/workout-plans`

`ClientDetailScreen` has tabs: overview, workouts, meals, measurements. No "Plans" tab. Trainer cannot see which plans are assigned to a specific client.

**What's needed**:
- Add "plans" tab to `ClientDetailScreen`
- Query `GET /clients/:username/workout-plans`
- Optionally: assign new plan from client detail view

**Effort**: Small (~1.5h)

---

### M7. i18n not applied to tab bar labels

**Severity**: Low
**File**: `app/(tabs)/_layout.tsx`

Tab titles are hardcoded English:
```tsx
<Tabs.Screen name="index" options={{ title: "Home", ... }} />
<Tabs.Screen name="workouts" options={{ title: "Workouts", ... }} />
```

App supports `en` and `tr` locales via `useI18n()`, but tab labels always show English.

**What's needed**:
- Replace hardcoded strings with `t("common.navigation.home")` etc.
- Tab layout is a static component — needs to use `useI18n` hook or pass titles from parent

**Effort**: Small (~30min)

---

### M8. Trainer review edit/delete

**Severity**: Low
**Backend**: `PUT/DELETE /api/reviews/:id`

`TrainerDetailScreen` lets athletes submit reviews. No UI to edit or delete own reviews.

**What's needed**:
- Edit/delete actions on user's own review card (if owned)
- Confirmation dialog for delete

**Effort**: Small (~1h)

---

### M9. Exercise catalog browsing

**Severity**: Low
**Backend**: `GET /api/exercises`, `GET /api/muscle-groups`, `GET /api/equipment`

Exercise catalog is only used inside `ExercisePicker` (embedded in workout/plan edit). No standalone browse/search screen for athletes to explore exercises.

**What's needed** (optional):
- Exercise catalog screen (search by name, filter by muscle group/equipment)
- Could be accessed from dashboard or workouts tab

**Effort**: Medium (~2-3h)

---

## PART C — Already Implemented (outdated in mobile-remaining-features.md)

These features were listed as gaps in the earlier analysis but are now implemented:

| Feature | Status | Evidence |
|---------|--------|----------|
| G1: Edit/delete workout, meal, measurement | **Done** | `WorkoutsScreen`, `MealsScreen`, `MeasurementsScreen` all have edit/delete with `canEdit` + confirmation dialogs |
| G2: Comments UI | **Done** | `CommentSection.tsx` exists, wired into `app/(detail)/workouts/[id].tsx` and `app/(detail)/meals/[id].tsx` |
| G3: Submit trainer review | **Done** | `TrainerDetailScreen` has star rating input + review submission |
| G4: Workout plan edit/delete | **Partially done** | Edit mode exists in `WorkoutPlanDetailScreen` but broken (B3). Delete works. |
| G5: Workout plan assignment | **Partially done** | `AssignClientModal` exists, wired in detail screen. May have issues. |
| G6: Trainer availability CRUD | **Done** | `TrainerProfileScreen` has availability section with day/time editing |
| G7: Invitation codes | **Done** | `ClientsScreen` has invite code generation. `MyTrainerScreen` has code acceptance. |
| G8: Exercise catalog picker | **Done** | `ExercisePicker.tsx` exists, used in workout + plan edit forms |

---

## Execution Priority

### Quick Wins (< 1h each)
| ID | Fix | Effort |
|----|-----|--------|
| B4 | Dashboard → detail navigation | 15min |
| B6 | Remove dead `creatorId` from plan update | 5min |
| M7 | i18n tab bar labels | 30min |
| M5 | Show trainer availability on detail | 1h |

### Core Fixes (1-4h each)
| ID | Fix | Effort |
|----|-----|--------|
| B1 | Password reset flow (request + confirm screens) | 3-4h |
| B2 | Workout plan create with exercise selection | 3-4h |
| B3 | Workout plan save with valid exerciseId | 3h |
| B5 | Role-aware trainer dashboard | 2-3h |
| M2 | "Start workout from plan" button | 1-2h |
| M3 | Trainer comments on client workouts/meals | 2h |
| M6 | Client detail plans tab | 1.5h |

### Nice-to-Have
| ID | Feature | Effort |
|----|---------|--------|
| M4 | Workout calendar heatmap | 3h |
| M8 | Review edit/delete | 1h |
| M9 | Exercise catalog browse screen | 2-3h |

**Total quick fixes**: ~2h
**Total core fixes**: ~14-17h
**Total nice-to-have**: ~6-7h

---

## Files Reference

| File | Bugs | Missing Features |
|------|------|------------------|
| `src/components/features/auth/LoginScreen.tsx` | B1 | M1 |
| `src/components/features/workout-plan/WorkoutPlansScreen.tsx` | B2 | — |
| `src/components/features/workout-plan/WorkoutPlanDetailScreen.tsx` | B3, B6 | M2 |
| `src/components/features/dashboard/DashboardScreen.tsx` | B4, B5 | — |
| `src/components/features/trainer/ClientDetailScreen.tsx` | — | M3, M6 |
| `src/components/features/trainer/TrainerDetailScreen.tsx` | — | M5 |
| `app/(tabs)/_layout.tsx` | — | M7 |
| `src/components/features/trainer/TrainerProfileScreen.tsx` | — | M8 |
| `app/(detail)/workouts/[id].tsx` | — | M3 (reuse for trainer) |
| `app/(detail)/meals/[id].tsx` | — | M3 (reuse for trainer) |
