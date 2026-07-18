# Review: Functions that should be React hooks — `frontend/src/components`

## Context
User asked to review `frontend/src/components` and detect functions that should be React
hooks. Scan covered all 91 component files (273 hook usages) via 4 parallel Explore agents,
then findings were independently verified with targeted greps and file reads.

## Verdict

### Category A — Rules of Hooks violations (functions calling hooks but not named `use*` and not components): **NONE.**
All hook-using functions are either React components (PascalCase) or properly named `use*`
custom hooks. The one agent that reported 9 "violations" was wrong:
- It mislabeled real components (`WorkoutCalendar`, `WorkoutPlanForm`, `ClientPlansTab`) as
  non-components.
- It treated `setX()` **state-setter calls** as hook calls. Calling a setter inside an event
  handler (`handleFilterChange`, `generateCode`, `copyToClipboard`, etc.) is normal React and
  is NOT a Rules-of-Hooks violation.
Conclusion: the codebase is clean on this axis. No refactor needed.

### Category B — Logic that could be extracted (judgment calls, not bugs):

1. **DUPLICATED PURE LOGIC (highest value, not a hook):** `combineDateTime` is copy-pasted
   verbatim in `BodyMeasurementForm.tsx:29` and `WorkoutForm.tsx:46`. Siblings
   `buildEmptyParts` / `formatPartsForApi` (body-measurement) are also pure duplicates.
   These contain **no hooks** → extract to a shared util module
   (e.g. `frontend/src/lib/utils/datetime.ts`), not a hook. This is the one concrete fix worth
   doing.

2. **OPTIONAL — consolidate inline mutations into domain hooks (low/moderate value):**
   No `useComment` / `useCoaching` / `useWorkout` hooks exist; mutations are inline per
   component (e.g. comment create in `CommentForm.tsx:64`, update/delete in
   `CommentItem.tsx:42,51`; accept/reject in `CoachingRequestsList.tsx:29,40`). If desired,
   extract `useCommentMutations` / `useCoachingRequestActions` into `frontend/src/lib/hooks/`
   (the established custom-hook location — see `useDeferredFilter`, `useDebounce`). This is a
   style improvement, not a correctness fix, and only spans 2 components each — optional.

3. **NOT recommended:** Several agents suggested extracting entire components
   (`WorkoutList`, `WorkoutCalendar`, `WorkoutPlanForm`, `AvailabilityCard`) into hooks.
   These are render components, not "functions that should be hooks" — extracting a whole
   component into a `use*` hook is the wrong pattern. Skip.

## Recommended action (small, safe)
- Extract `combineDateTime` (+ `buildEmptyParts`, `formatPartsForApi`) into
  `frontend/src/lib/utils/datetime.ts` and import in both form files. Pure refactor, zero
  behavior change.
- Leave Category A as-is (no violations).
- Treat the domain-hook consolidations (item 2) as optional follow-ups only if the user wants
  them.

## Verification
- `pnpm lint` and `pnpm test` pass after the util extraction.
- Grep confirms `combineDateTime` now defined once: `grep -rn "const combineDateTime" frontend/src`.
- Manually confirm both forms still compile (same dayjs logic moved verbatim).
