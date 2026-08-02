# Mobile G1-G8 Review Fix Plan

## Verified Bugs (Phase 1 — ~2h)

### 1. WorkoutPlanDetailScreen.tsx:L37-43 — stale exercises on save

`savePlan` reads `(data as PlanDetail)?.exercises ?? []` from query cache, not edit state.
If data stale (refetch while editing), exercises revert silently.

**Fix:** Track `editExercises` in state alongside `editName`/`editDescription`.
In `handleEdit`, copy all three from `data`. Save sends `editExercises`.

### 2. AssignClientModal.tsx:L140 — Math.random() in keyExtractor

`String(item.relationship?.relationshipId ?? item.athlete?.userId ?? Math.random())`
`Math.random()` creates new key every render, causing FlatList full re-mount on toggle.

**Fix:** `String(item.relationship?.relationshipId ?? index)` — stable fallback.

### 3. WorkoutsScreen.tsx:L195-202 — handleExerciseSelect replaces notes

Picking exercise from catalog sets notes to `"Category: {category}"`, destroying existing notes.

**Fix (preferred):** Add `pickedExerciseId` field to `NewExercise` interface.
Set it on select, leave notes untouched. Notes field stays user-editable, catalog link tracked separately.

Alternative: append to existing notes: read current, concatenate with separator.

### 4. TrainerProfileScreen.tsx:L72-126 — deleteSlot called with undefined

`removeSlot(index)` calls `deleteSlot(slot.availabilityId)` when slot has ID.
`slot.availabilityId` is `number | undefined`. `String(undefined)` → `"undefined"` → bad DELETE request.

**Fix:** Guard in `removeSlot`:
```

## Verified Risks (Phase 2 — ~3h)

### 5. TrainerDetailScreen.tsx:L67 — id! assertion on mutation

`useLocalSearchParams` can return `undefined` on first render. `reviewApi.createReview(id!, ...)` uses
non-null assertion without guard.

**Fix:** Guard mutation: `if (!id) return;` at top of `submitReview` call, or disable submit button while `!id`.

### 6. WorkoutPlanDetailScreen.tsx:L55-61 — router.back() before invalidation

`deletePlan` onSuccess navigates away before `queryClient.invalidateQueries` resolves.
List screen may show deleted plan briefly.

**Fix:** Use `queryClient.removeQueries({ queryKey: ["workoutPlan", id] })` synchronously before `router.back()`.
Keep `invalidateQueries(["workoutPlans"])` after.

### 7. WorkoutsScreen.tsx:L188-196 — stale pickingForExId after exercise removal

If user opens picker, removes that exercise slot, then picks an exercise,
`pickingForExId` references deleted slot. `updateExerciseName` silently no-ops.

**Fix:** In `removeExercise`, clear `pickingForExId` if it matches removed exercise:
`if (pickingForExId === exId) setPickingForExId(null)`.

### 8. CommentSection.tsx:L105-106 — stale currentUserId in renderItem

`renderComment` reads `currentUserId` from closure, wrapped in `useCallback` with `[t, deleteMutation]` deps.
If user reference changes (token refresh), `isOwn` comparison is stale.

**Fix:** Add `currentUserId` to `useCallback` dependency array on `renderComment`.

### 9. WorkoutPlansScreen.tsx:L67-69 — stopPropagation no-op in RN

`e.stopPropagation?.()` is DOM API, has no effect in React Native. UI works incidentally because
RN native gesture system fires inner handler before parent card `onPress`.

**Fix:** Remove `e.stopPropagation?.()`. Add comment explaining RN gesture responder behavior.

## Verified Nits (Phase 3 — ~30min)

### 13. WorkoutPlanDetailScreen.tsx:L100-107 — edit enabled while data loading

Edit button shows before query resolves. `handleEdit` reads `data` as `undefined` → `plan.name` undefined → `editName = ""`.

**Fix:** Guard `handleEdit` with `if (!data) return;`.

### 14. TrainerProfileScreen.tsx:L37-38 — availSlots not synced to server data

When query refetches while editing (`editingAvail` stays true but unlikely),
`availSlots` stays stale.

**Fix:** `useEffect(() => { if (!editingAvail) setAvailSlots(serverSlots.length > 0 ? serverSlots.map(s => ({ ...s })) : []) }, [serverSlots, editingAvail])`.

### 15. MyTrainerScreen.tsx:L43 — no loading after accepting invite


## Struck From Review (verified false)

| Item | Why false |
|------|-----------|
| CommentSection targetType missing "measurement" | Backend `TargetType` const = `workout \| meal` (comment.go L10-11) |
| MealDetailScreen mealType undefined crash | `mealType` is required field, TS non-null |
| canEdit uses createdAt instead of date | Backend `CanEdit()` uses `CreatedAt` (workout.go L43, meal.go L58, body_measurement.go L49) |
| TrainerProfile timeInput missing base styles | Uses `[styles.input, styles.timeInput]` — L181, L244 provides all border/padding |
| CommentSection persistTaps typo | `keyboardShouldPersistTaps` IS correct RN prop name |
| AssignClientModal Set<number>→map(String) mismatch | Backend expects `string[]`, conversion is correct |

## Files Affected (11 files total)

| File | Phases | Items |
|------|--------|-------|
| `WorkoutPlanDetailScreen.tsx` | 1, 2, 3 | 1, 6, 13 |
| `AssignClientModal.tsx` | 1 | 2 |
| `WorkoutsScreen.tsx` | 1, 2 | 3, 7 |
| `TrainerProfileScreen.tsx` | 1, 3 | 4, 14 |
| `TrainerDetailScreen.tsx` | 2 | 5 |
| `WorkoutPlansScreen.tsx` | 2 | 9 |
| `ClientsScreen.tsx` | 2 | 10 |
| `ExercisePicker.tsx` | 2 | 11 |
| `CommentSection.tsx` | 2 | 8 |
| `StarRatingInput.tsx` | 2 | 12 |
| `MyTrainerScreen.tsx` | 3 | 15 |

All changes in `mobile/src/`. Verify with `npx tsc --noEmit` after each phase.
After accept mutation, query invalidates. Between invalidation and fresh data, empty state visible.

**Fix:** Show `ActivityIndicator` when `isFetching` after success, or add `showSuccess` flag to `acceptInvite` mutation `onSuccess`.

### 10. ClientsScreen.tsx:L32 — unused inviteCode state

`setInviteCode(invite.code)` called but `inviteCode` never read. Code displayed only via Alert.
State is dead code.

**Fix:** Remove `inviteCode` state declaration and its setter call. Keep Alert with closure variable.

### 11. ExercisePicker.tsx:L86-88 — no retry on error

Error state shows only "Failed to load exercises" text. No way to retry without closing modal.

**Fix:** Add `TouchableOpacity` retry button next to error text, calling `refetch()` from `useQuery`.

### 12. StarRatingInput.tsx:L24 — hover leak on touch outside

If user presses one star, drags to another, releases outside the row,
`onPressOut` fires on the overlapping star but `setHover(0)` may not trigger.

**Fix:** Wrap stars row in `View` with `onTouchEnd={() => setHover(0)}` as fallback.
Or use `Pressable` component with `onPressOut` on parent.
if (slot.availabilityId != null) {
  // existing slot: confirm + DELETE
} else {
  // new slot: local removal only
}
```