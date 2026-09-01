# Mobile App API Type Safety Implementation Plan

## Summary
Add proper TypeScript return types to all API functions and eliminate type assertions (`as Promise<...>`) throughout the mobile app's React Query usage.

## Changes

### 1. API Client (`src/api/client.ts`)
- Keep generic `apiRequest<T>()` signature
- Add `ApiError` class with status/code properties
- Add `AbortController` support for request cancellation

### 2. Type All API Endpoints (`src/api/*.ts`)
- Add generic type parameters to all API functions
- Examples: `getAll(): apiRequest<WorkoutListResponse>()`, `create(): apiRequest<Workout>()`

### 3. Fix Component Usage (11 files)
Remove `as Promise<...>` casts from `useQuery` calls in:
- `DashboardScreen.tsx`
- `WorkoutsScreen.tsx`
- `MealsScreen.tsx`
- `MeasurementsScreen.tsx`
- `TrainerCatalogScreen.tsx`
- `TrainerDetailScreen.tsx`
- `TrainerProfileScreen.tsx`
- `ClientDetailScreen.tsx`
- `ClientsScreen.tsx`
- `MyWorkoutPlansScreen.tsx`
- `WorkoutPlanDetailScreen.tsx`

### 4. New Query Key Factory (`src/lib/query-keys.ts`)
```typescript
export const queryKeys = {
  workouts: { all: ["workouts"] as const, list: (f) => ["workouts", "list", f] as const, detail: (id) => ["workouts", id] as const },
  meals: { all: ["meals"] as const, list: (f) => ["meals", "list", f] as const, detail: (id) => ["meals", id] as const },
  bodyMeasurements: { all: ["measurements"] as const },
  trainerProfile: { profile: (id) => ["trainer", id, "profile"] as const },
  workoutsAssigned: { all: ["workouts", "assigned"] as const },
};
```

### 5. Update Types (`src/types/index.ts`)
Add convenience re-exports from generated.ts for cleaner imports.

## Test Cases
- Type check: `pnpm tsc --noEmit` passes
- Build: `pnpm start` compiles without errors
- Runtime: Data loads correctly on device

## Estimated Files Changed
- Modified: 16 API files + 11 component files + 5 existing files
- New: `src/lib/query-keys.ts`, updated `src/types/index.ts`, updated `src/api/client.ts`
