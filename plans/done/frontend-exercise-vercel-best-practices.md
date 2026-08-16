# Plan for Applying Vercel React Best Practices to Exercise Components

## Context
The exercise component directory (`frontend/src/components/features/exercise`) contains several React components that could benefit from Vercel React best practices optimizations. After reviewing the code, we've identified opportunities to improve re-render performance, reduce unnecessary computations, and optimize bundle size.

## Recommendations

### 1. Memoize Joined Exercises in ExerciseSelector.tsx
**Issue**: The `exercises` array is computed by mapping over `rawExercises` and joining with muscle group and equipment data on every render. This operation is unnecessary when the underlying data hasn't changed.

**Fix**: Use `useMemo` to memoize the joined exercises computation, depending on `rawExercises`, `muscleGroups`, and `equipment`.

**File**: `frontend/src/components/features/exercise/ExerciseSelector.tsx`
**Change**: 
```diff
- const exercises = rawExercises.map((exercise: ExerciseLibrary) => ({
-   ...exercise,
-   muscleGroup: muscleGroups.find((mg) => mg.id === exercise.muscleGroupId),
-   equipment: equipment.find((eq) => eq.id === exercise.equipmentId),
- }));
+ const exercises = useMemo(() => {
+   return rawExercises.map((exercise: ExerciseLibrary) => ({
+     ...exercise,
+     muscleGroup: muscleGroups.find((mg) => mg.id === exercise.muscleGroupId),
+     equipment: equipment.find((eq) => eq.id === exercise.equipmentId),
+   }));
+ }, [rawExercises, muscleGroups, equipment]);
```

### 2. Memoize Filter Items in ExerciseFilters.tsx
**Issue**: The `muscleGroupItems` and `equipmentItems` arrays are created on every render, causing potential unnecessary re-renders of the Select components when the muscleGroups/equipment props change reference.

**Fix**: Use `useMemo` to memoize these arrays.

**File**: `frontend/src/components/features/exercise/exercise-selector/ExerciseFilters.tsx`
**Change**:
```diff
- const muscleGroupItems = [
-   { value: "", label: t("filters.all_muscle_groups") },
-   ...muscleGroups.map((mg) => ({
-     value: String(mg.id),
-     label: mg.description,
-   })),
- ];
+ const muscleGroupItems = useMemo(() => [
+   { value: "", label: t("filters.all_muscle_groups") },
+   ...muscleGroups.map((mg) => ({
+     value: String(mg.id),
+     label: mg.description,
-   })),
- ], [muscleGroups, t]);
+   })),
+ ], [muscleGroups, t]);
 
- const equipmentItems = [
-   { value: "", label: t("filters.all_equipment") },
-   ...equipment.map((eq) => ({ value: String(eq.id), label: eq.description })),
- ];
+ const equipmentItems = useMemo(() => [
+   { value: "", label: t("filters.all_equipment") },
+   ...equipment.map((eq) => ({ value: String(eq.id), label: eq.description })),
+ ], [equipment, t]);
```

### 3. Consider Dynamic Import for ExerciseSelector
**Issue**: The ExerciseSelector component is only needed when the dialog is open, but it's included in the initial bundle.

**Fix**: Use `next/dynamic` to lazily load ExerciseSelector when the dialog opens.

**File**: Where ExerciseSelector is used (likely in workout plan creation/edit forms)
**Note**: This requires identifying where ExerciseSelector is used and replacing the static import with a dynamic one. Since we didn't see the usage in the exercise directory, we note this as a potential optimization for the caller.

### 4. Add useDeferredValue for Search Input
**Issue**: The search input updates state on every keystroke, which triggers expensive filtering operations and may cause input lag.

**Fix**: Use `useDeferredValue` to defer the search query update for expensive operations while keeping the input responsive.

**File**: `frontend/src/components/features/exercise/ExerciseSelector.tsx`
**Change**:
```diff
- const [searchQuery, setSearchQuery] = useState("");
- const debouncedSearch = useDebounce(searchQuery, 300);
+ const [searchQuery, setSearchQuery] = useState("");
+ const deferredSearchQuery = useDeferredValue(searchQuery);
+ const debouncedSearch = useDebounce(deferredSearchQuery, 300);
```

### 5. Consider Content-Visibility for Exercise Cards
**Issue**: While the exercise list is limited to 20 items, applying `content-visibility: auto` to each card could improve rendering performance by offscreen rendering.

**Fix**: Add inline style or class to ExerciseCard components in the list.

**File**: `frontend/src/components/features/exercise/ExerciseSelector.tsx` (in the exercise list mapping)
**Change**:
```diff
<Card
  key={exercise.exerciseId}
  className="cursor-pointer hover:bg-accent transition-colors rounded-none border-0"
  onClick={() => handleSelect(exercise)}
+ style={{ contentVisibility: "auto" }}
>
```

## Verification
1. Run the application and verify that all exercise-related features still work correctly.
2. Check that the memoization does not break any functionality (exercise data should update when filters change).
3. Verify that the dynamic import (if implemented) loads the selector only when needed.
4. Ensure that the search input remains responsive with deferred value.
5. Confirm no regression in unit or integration tests.

## Files to Modify
- `frontend/src/components/features/exercise/ExerciseSelector.tsx`
- `frontend/src/components/features/exercise/exercise-selector/ExerciseFilters.tsx`
- Potentially other files where ExerciseSelector is used (for dynamic import)