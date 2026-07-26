# TypeScript Codegen Pipeline — Replace Manual Type Duplication

## Context

Backend (Go) is source of truth for domain models. `swag init` already generates `backend/docs/swagger.json` from Go struct JSON tags. But frontend (`frontend/src/types/index.ts`) manually duplicates these types (~460 lines). Mobile app (submodule, future) would need third copy.

## Pipeline

```
Go structs (source of truth)
  → swag init → swagger.json
    → openapi-typescript → generated.ts
      → frontend/src/types/generated.ts
      → (future) mobile/src/types/generated.ts
```

Generated types are committed to version control. CI re-runs on backend model changes.

## Steps

### Step 0 — Fix Swagger type accuracy (est. 30 min) - DONE

26 int fields show `"type": "string"` in swagger.json. Add `// @Description` annotations or use `swagger:type` comment directives on Go struct fields where `swag` misdetects `int` as `string`. Run `swag init -g cmd/server/main.go -o docs/` after each fix, verify output.

### Step 1 — Install openapi-typescript in frontend (est. 1 hr)

```bash
cd frontend
pnpm add -D openapi-typescript
```

Add to `frontend/package.json`:

```json
"codegen:types": "openapi-typescript ../backend/docs/swagger.json -o ./src/types/generated.ts"
```

Run:

```bash
pnpm codegen:types
```

Verify `src/types/generated.ts` contains all domain types (Workout, Meal, User, Exercise, etc).

### Step 2 — Audit types: keep vs delete (est. 2 hr)

Three files hold duplicated types:

| File | Keep in place | Delete (replaced by generated) | Move to index.ts |
|---|---|---|---|
| `src/types/index.ts` | UI-only types (CommentTargetType, CommentAuthorRole, ClientStats, sort direction, form state) | All model interfaces (Workout, Meal, User, Exercise, etc), all request/response types (CreateWorkoutRequest, etc) | — |
| `src/lib/api/api-types.ts` | — | WorkoutListResponse, MealListResponse, RegisterResponse, LoginResponse, UserResponse, CommentListResponse, BodyMeasurementListResponse | ClientStats, WorkoutStats, MealStats, PaginationParams, ListParams |
| `src/lib/api/adminApi.ts` | AdminUserListItem (if no generated equivalent), AdminDashboardStats | AdminUserListResponse | — |

### Step 3 — Selective re-export from generated.ts (est. 30 min)

Add to `src/types/index.ts`:

```typescript
// Re-export generated API types
export {
  Workout, Meal, User, Exercise, UserProfile, UserRole,
  WorkoutExercise, ExerciseSet, FoodItem, Macros,
  CreateWorkoutRequest, UpdateWorkoutRequest,
  CreateMealRequest, UpdateMealRequest,
  // ... all needed types
} from './generated';

// UI-only types (not in API)
export type CommentTargetType = "workout" | "meal";
export type CommentAuthorRole = "trainer" | "athlete" | "admin";
// etc
```

66 files import from `@/types`. Re-export preserves all existing imports. Zero refactors needed.

### Step 4 — Delete duplicated manual types (est. 1 hr)

After re-export verified working:
1. Remove all model interfaces from `src/types/index.ts` that now re-export from generated
2. Remove `src/lib/api/api-types.ts` (move ClientStats/WorkoutStats/MealStats to index.ts first)
3. Remove inline response types from `src/lib/api/adminApi.ts`

### Step 5 — Mobile app (future, est. 1 hr)

When mobile submodule exists:

```bash
cd mobile
pnpm add -D openapi-typescript
```

Add script:

```json
"codegen:types": "openapi-typescript ../backend/docs/swagger.json -o ./src/types/generated.ts"
```

Mobile only needs `generated.ts` plus mobile-specific UI types. Zero manual API type work.

### Step 6 — CI integration (est. 1 hr)

```yaml
- name: Regenerate types from Go models
  run: |
    cd backend && swag init -g cmd/server/main.go -o docs/
    cd ../frontend && pnpm codegen:types
    cd ../mobile && pnpm codegen:types  # when mobile exists
```

Commit generated files. PRs show type diffs when Go models change.

## Rollback safety

- `generated.ts` is deterministic. Revert to previous commit if broken.
- Manual types in `index.ts` stay untouched until Step 4 — only delete after verifying generated output matches expected shape.
- `swagger.json` already version-controlled.

## Effort summary

| Step | What | Est. time |
|------|------|-----------|
| 0 | Fix Swagger type annotations | 30 min |
| 1 | Install openapi-typescript + first run | 1 hr |
| 2 | Audit types: keep vs delete | 2 hr |
| 3 | Selective re-export | 30 min |
| 4 | Delete duplicated types | 1 hr |
| 5 | Mobile app (future) | 1 hr |
| 6 | CI integration | 1 hr |

**Total: ~7 hr frontend+backend. Mobile +1 hr.**
