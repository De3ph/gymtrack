# Zustand Migration Audit — `frontend/src/components/features/**`

## Summary
Audited all 111 feature components (~40 use `useState`). The project already uses Zustand correctly for **global auth** (`authStore`) and React Query for **all server data**. The decision rule applied:

- **Zustand = only for UI state that must survive navigation (route/tab switches) or be shared across sibling views with no common owner.**
- **`useState` = correct for local, single-owner, ephemeral UI state** (dialogs, form fields, edit targets, transient flags).

Per your answers, the driver is **"survive navigation"**: filter/pagination and the selected calendar date should persist when the athlete switches routes/tabs across meals, workouts, measurements.

---

## ✅ KEEP as `useState` — do NOT convert
These are local, single-owner, or ephemeral. Converting them to Zustand would add boilerplate and hurt locality with no benefit:

- **Dialog open/close + lifecycle**: `AcceptInvitationDialog`, `CoachingRequestDialog`, `CreateReviewDialog`, `ReviewActions`, `DeleteWorkoutDialog`, `DeleteBodyMeasurementDialog`, `EditBodyMeasurementDialog`, `GenerateInvitationDialog`, `TerminateRelationshipDialog`, `PlanViewDialog`, `AssignPlanDialog`, `WorkoutPlanFormDialog`.
- **Edit targets / inline-edit (tied to list instance)**: `MealList` (`editingMeal`/`isEditDialogOpen`), `WorkoutList` (`editingWorkout`/`workoutToDelete`/`deleteDialogOpen`/`isEditDialogOpen`/`expandedCommentsId`), `BodyMeasurementList` (`editing`/`editOpen`/`deleting`/`deleteOpen`), `CommentItem` (`isEditing`/`editContent`), `CommentThread` (`replyingToId`).
- **Form field values**: `WorkoutForm` (`collapsedMap`/`selectedPlanId`/`loadedPlanName`), `BodyMeasurementForm` (`partInputs`/`partErrors`), `WorkoutPlanForm` (`name`/`description`/`exercises`), `ExerciseCard` (`showFullInstructions`), `TrainerProfileView` (`isEditing`).
- **Transient async flags**: `loading`/`submitting`/`error`/`submitError`/`copied`/`copying`/`isDeleting`/`terminateError` across the dialogs above.
- **Controlled input arrays**: `ExerciseSetInput` (`setsWithIds`), `PlanSetInput` (`setsWithIds`).
- **Image fallback**: `TrainerAvatar` (`hasError`).
- **Self-owned calendar (single screen)**: `CombinedTrainingCalendar` (`selectedDate`/`viewMonth`) — its date coordinates `CalendarGrid` + `DashboardEventList` within one owner component; `useState` is correct *unless* you also want dashboard ↔ route sync (see optional below).

---

## 🔁 CONVERT to Zustand — genuine candidates (survive navigation)

### 1. List filter + pagination state → per-domain list-filter stores
Currently local `internalFilter` / `internalPage`, reset on every route/tab switch. With the "survive navigation" driver, extract into stores so the athlete keeps their filter/page when moving between `/meals`, `/workouts`, `/measurements` and dashboard tabs.

- `MealList.tsx` → `useMealListStore`
- `WorkoutList.tsx` → `useWorkoutListStore`
- `BodyMeasurementList.tsx` → `useMeasurementListStore`

Proposed shape (each):
```ts
interface ListUiState<TFilter> {
  filter: TFilter
  page: number
  setFilter: (f: TFilter) => void   // resets page to 1
  setPage: (p: number) => void
  reset: () => void
}
```
Keep the existing controlled-props API (`filter`/`onFilterChange`/`page`/`onPageChange`) intact — stores back the *uncontrolled* fallback only. `expandedCommentsId` stays local `useState`.

### 2. Calendar selected date → shared calendar store
`selectedDate`/`viewMonth` currently owned independently by each calendar, so the date is lost when navigating between meal/workout views. Extract into one store so the "active date" persists across routes (and can drive measurement filtering too).

- `MealCalendar.tsx` (`selectedDate`) → `useCalendarStore`
- `WorkoutCalendar.tsx` (`selectedDate`/`currentMonth`) → `useCalendarStore`
- `body-measurement/BodyMeasurementCharts.tsx` (`internalFilter` date) → optionally read `useCalendarStore.activeDate` for consistency.

Proposed shape:
```ts
interface CalendarUiState {
  activeDate: Date
  viewMonth: Date
  setActiveDate: (d: Date) => void
  setViewMonth: (d: Date) => void
}
```

### 3. ExerciseSelector catalog filter → optional `useExerciseCatalogStore`
`ExerciseSelector.tsx` (`searchQuery`/`selectedMuscleGroup`/`selectedEquipment`) is reused in 4 places (`WorkoutForm`, `WorkoutExerciseCard`, `EditWorkoutDialog`, `WorkoutPlanForm`). A session-persistent catalog filter store keeps the athlete's last filter across openings. **Lower priority** than #1/#2 — convert only if the filter-reset-on-reopen is a real UX annoyance.

---

## ⚠️ Optional / borderline (decide if needed)
- `CombinedTrainingCalendar` (`selectedDate`/`viewMonth`): join `useCalendarStore` **only if** you want the dashboard calendar to stay in sync with the standalone meal/workout calendars. Otherwise leave as `useState`.
- `BodyMeasurementCharts` (`internalFilter`): minor — only relevant once measurement views also key off `useCalendarStore.activeDate`.

---

## Assumptions
- Auth (`authStore`) and all server-state (React Query) are **not** touched.
- The migration keeps each component's existing controlled-props API; stores back only the uncontrolled fallback state.
- This is an **audit/recommendation only** — no files are modified. When implemented later, each new store follows the existing `create` pattern in `frontend/src/stores/authStore.ts`.

## Verification (manual, post-implementation)
1. Set a meal date filter + page 2 → navigate to `/workouts` → back to `/meals`: filter and page retained.
2. Switch athlete dashboard tabs (Meals/Workouts/Measurements): filter/pagination retained per domain.
3. Pick a date in `MealCalendar` → navigate to `WorkoutCalendar`: same `activeDate` selected.
4. (If #3 done) Reopen `ExerciseSelector` in a different form: previous muscle-group/equipment filter restored.
