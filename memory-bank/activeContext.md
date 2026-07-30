# Active Context

## Current Focus
Completed Phase 4 (Re-render hygiene) of the Vercel React Best Practices remediation plan.

## Phase 4 — Completed Changes

### Files Created
- `frontend/src/components/features/workout/WorkoutCard.tsx` — Extracted memo'd WorkoutCard component from inline rendering in WorkoutList.tsx. Uses `React.memo`, wraps CommentThread with `dynamic` import.

### Files Modified
- `frontend/src/components/features/workout/WorkoutList.tsx` — Removed unused imports (lucide-react icons, Card components, TARGET_TYPES). Replaced inline Card rendering with `<WorkoutCard>` component with stable callbacks.
- `frontend/src/components/features/comments/CommentList.tsx` — Added reference-equality micro-cache to `buildTree` function to avoid re-building the comment tree when the same array reference is passed.

### Already Implemented (verified)
- **4.1**: `ExerciseSetInput`/`PlanSetInput` already use `useEffect` (not `useMemo`)
- **4.3**: `useDeferredFilter` hook exists and is used by all 3 filter bars
- **4.4**: `CommentList` uses `useCallback` for event handlers
- **4.5**: `TrainerClientsPage` already uses `useDeferredValue` + `useMemo`
- **4.8**: `WorkoutsClient.tsx` has clean `useState("log")` (no ternary)
- **4.10**: `ClientRow` already extracted in `TrainerDashboardContent`
- Many list components already memo'd: `MealCard`, `ClientCard`, `BodyMeasurementListItem`, `WorkoutPlanCard`, `TodayClientRow`

### Pending Minor Items
- `CoachingRequestsList.tsx`: Extract inline Card into memo'd `CoachingRequestRow`
- `WorkoutCard.tsx` line 100 formatting (minor)

## Bug Fixes

### Logout Redirect Fix
- **Problem**: `authStore.logout()` cleared the session cookie and in-memory tokens but never redirected the user to the login page. After logout, the user remained on the dashboard with an empty/blank state.
- **Fix** (`frontend/src/stores/authStore.ts`):
  1. Removed the wrapping `finally` block — the session cookie delete is now independent from token cleanup.
  2. Added best-effort backend logout call (`authApi.logout()`) to invalidate the refresh token server-side.
  3. **Added redirect**: `window.location.href = ROUTES.LOGIN` — a hard redirect (full page reload) so the middleware (`proxy.ts`) detects the cleared session cookie and the auth store re-initialises cleanly.

## Next Steps
Proceed to Phase 5 (Misc cleanups & ESLint) when ready.

## Mobile E2E — Phase 1 Complete

### Installed
- Maestro CLI 2.7.0 at `C:\maestro\bin\maestro.bat`
- Java 25 (Temurin) — prerequisite satisfied
- Added to User PATH permanently

### Files Created
- `.maestro/maestro.yaml` — shared env config (appId, credentials, base URL)
- `.maestro/README.md` — usage docs
- `.maestro/auth/` — 8 auth flow YAML files (login x4, register x3, session-restore x1)
- `mobile/package.json` — added 5 npm scripts (`e2e:local`, `e2e:ci`, `e2e:auth`, `e2e:athlete`, `e2e:trainer`)

### Known Issue
TextInputs in LoginScreen/RegisterScreen lack `testID` props. Maestro taps label text to focus inputs. Consider adding `testID` for reliability.