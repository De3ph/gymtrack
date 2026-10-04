# Frontend ↔ Backend API Contract Audit

**Date**: 2026-09-12
**Scope**: All HTTP contracts between `frontend/src/lib/api/*` (Next.js clients) and `backend/internal/api/routes/*` (Go/Gin handlers). Route paths and methods verified against actual backend route registration code (not the stale Swagger annotations). Response shapes verified against handlers/models where disputed.

**Verdict legend**:
- ✅ Compatible — paths, methods, and shapes line up
- ⚠️ Works, but fragile / partially incompatible
- ❌ Incompatible — will break at runtime

---

## Summary

| # | Feature | Verdict |
|---|---------|---------|
| 1 | Auth | ✅ |
| 2 | Users / Session | ✅ (one ⚠️ note) |
| 3 | Admin | ✅ (one ⚠️ type note) |
| 4 | Workouts | ✅ |
| 5 | Meals | ✅ |
| 6 | Body Measurements | ✅ |
| 7 | Relationships | ⚠️ |
| 8 | Comments | ✅ |
| 9 | Trainer Catalog / Profile | ❌ |
| 10 | Availability | ✅ (Swagger drift only) |
| 11 | Reviews | ✅ |
| 12 | Coaching Requests | ⚠️ |
| 13 | Exercises / Equipment / Muscle Groups | ❌ |
| 14 | Workout Plans | ✅ (one ⚠️ type note) |

**Blockers: 2 (Exercises envelope, Trainer catalog `trainerProfile` field).**

---

## 1. Auth — ✅ Compatible

| Endpoint | Frontend | Backend | Verdict |
|---|---|---|---|
| POST `/auth/register` | email, password, username, role | same + optional `profile` | ✅ |
| POST `/auth/login` | identifier, password | same | ✅ |
| POST `/auth/refresh` | `{ refreshToken }` | same | ✅ |
| POST `/auth/logout` | `{}` | none | ✅ |
| POST `/auth/restore` | identifier, password | same | ✅ |
| POST `/auth/password-reset/request` | `{ email }` | same | ✅ |

Notes:
- Backend `/auth/refresh` returns only `accessToken`; frontend's `refreshToken?` is optional — no break.
- Backend also has `/auth/password-reset/confirm` — no frontend caller found (unused, not a break).
- `LoginResponse.user` uses backend `UserResponse` DTO (camelCase, no `passwordHash`) — matches frontend `User` type usage.

## 2. Users / Session — ✅ Compatible

| Endpoint | Verdict |
|---|---|
| GET `/users/me` | ✅ |
| PUT `/users/me` (`{ profile }`) | ✅ |
| DELETE `/users/me` (`{ password }`) | ✅ |
| GET/POST/DELETE `/api/auth/session` (Next.js internal route) | ✅ |

⚠️ Notes:
- The Next.js session route (`src/app/api/auth/session/route.ts:64`) calls backend `GET /users/me` directly and reads `user.userId` (number) and `user.role`. It stores `userId` as **string** in the session cookie (`SessionPayload.userId: string`). Backend returns number. Works via JS coercion, but is a latent type drift — same known issue as admin `userId: string`.
- Backend `UserProfile` fields all `omitempty` → frontend optional fields align.

## 3. Admin — ✅ Compatible

| Endpoint | Verdict |
|---|---|
| GET `/admin/stats` | ✅ (field names match `DashboardStats`) |
| GET `/admin/users` (limit/offset/role/search) | ✅ envelope `{ users, total, limit, offset }` |
| GET `/admin/users/:id` | ✅ |
| PUT `/admin/users/:id/role` | ✅ |
| PUT `/admin/users/:id/status` | ✅ |
| GET `/admin/comments` | ✅ envelope `{ comments, total, limit, offset }` |
| DELETE `/admin/comments/:id` | ✅ |
| PUT `/admin/profile/password` | ✅ |

⚠️ Note:
- Frontend manual type `AdminUserListItem.userId: string` (types/index.ts:146) vs backend int. Same latent coercion issue as session. Frontend also has optional `status` field — backend `AdminUserListItem` does include status, so OK.
- Backend admin endpoints `PUT /admin/exercises/:id/verify`, `DELETE /admin/exercises/:id` have **no frontend callers** (admin exercise management UI gap — unused, not a break).

## 4. Workouts — ✅ Compatible

| Endpoint | Verdict |
|---|---|
| POST `/workouts` (date, exercises[]) | ✅ |
| GET `/workouts` (limit/offset/startDate/endDate) → `{ workouts, count }` | ✅ |
| GET `/workouts/:id` | ✅ |
| GET `/clients/:username/workouts` (trainer view, + exerciseType filter) | ✅ |

Notes:
- Date format: backend expects RFC3339 for `startDate`/`endDate`; frontend sends plain strings. If frontend sends `"2026-09-12"` (date-only), Go's `time.Parse(RFC3339)` **fails** → 400. Needs runtime verification of what format pages actually send. Flagging as ⚠️ risk but route/shape otherwise matches.
- Backend requires `startDate` and `endDate` **together or neither** — frontend sends both or neither via optional params (undefined filtered out in api-client). OK.
- `count` in list responses = returned-array length, NOT total. Frontend doesn't rely on it for totals in this feature — OK, but see cross-cutting note.

## 5. Meals — ✅ Compatible

| Endpoint | Verdict |
|---|---|
| POST `/meals` (date, mealType, items[]) | ✅ |
| GET `/meals` → `{ meals, count }` | ✅ |
| GET `/meals?date=` (getByDate) | ✅ (backend supports standalone `date` param) |
| GET `/meals/:id` | ✅ |
| GET `/clients/:username/meals` (+mealType filter) | ✅ |

## 6. Body Measurements — ✅ Compatible

| Endpoint | Verdict |
|---|---|
| POST `/measurements` | ✅ |
| GET `/measurements` → `{ measurements, count }` | ✅ |
| GET `/measurements/:id` | ✅ |
| GET `/measurements/latest` (athleteId for trainers) | ✅ |
| PUT `/measurements/:id` (24h window) | ✅ |
| DELETE `/measurements/:id` | ✅ |
| GET `/clients/:username/measurements` | ✅ |

Note: `/measurements/latest` can return **204**; api-client returns `{}` for 204 — frontend must handle empty object (typed as `BodyMeasurement`, fields optional). Works.

## 7. Relationships — ⚠️ Works with caveats

| Endpoint | Verdict |
|---|---|
| POST `/relationships/invite` (empty body) → `{ message, invitation: { code, expiresAt } }` | ✅ |
| POST `/relationships/accept` (`{ code }`) | ✅ |
| DELETE `/relationships/:id` → `{ message, relationship }` | ✅ |
| GET `/relationships/my-clients` → `{ clients: [{relationship, athlete}], count }` | ✅ shape |
| GET `/relationships/client/:username` → `{ relationship, athlete, stats }` | ✅ shape |
| GET `/relationships/my-trainer` | ⚠️ see below |
| GET `/relationships/client/:username/stats` | ✅ |

⚠️ Mismatch — `my-trainer`:
- Backend returns `pendingInvitations: Invitation[]` where each item has `code`, `expiresAt`, `status`, `trainerId`, etc.
- Frontend types it as `pendingInvitations: Relationship[]` (types/index.ts:438). `Invitation` ≠ `Relationship` (no `athleteId`, has `code`/`expiresAt`). Any component rendering invitation fields as relationship fields will show `undefined`.
- **Not a crash** (TS types are erased at runtime), but a real contract-type mismatch.

❗ Security (backend-side, for awareness): `my-trainer`, `my-clients`, `client/:username` return raw `*models.User` including `passwordHash` (json tag not omitted). Not a frontend contract break, but should be tracked separately.

## 8. Comments — ✅ Compatible

| Endpoint | Verdict |
|---|---|
| GET `/comments?targetType=&targetId=` → `{ comments }` (no count) | ✅ |
| POST `/comments` (targetId & parentCommentId as **strings**) | ✅ (frontend sends strings; backend parses to int) |
| PUT `/comments/:id` | ✅ |
| DELETE `/comments/:id` | ✅ |

## 9. Trainer Catalog / Profile — ❌ Incompatible

| Endpoint | Verdict |
|---|---|
| GET `/trainers` (search filters) | ❌ response field mismatch |
| GET `/trainers/:id` | ❌ same |
| GET `/trainers/me/profile` | ❌ same |
| PUT `/trainers/me/profile` | ✅ |

❌ Mismatch — `trainerProfile` vs `profile`:
- Backend `TrainerWithProfile` serializes trainer data under **`profile`** (the embedded `User.profile` is overwritten by the outer `TrainerProfile` field — both tagged `json:"profile"`). There is **no `trainerProfile` field**.
- Frontend `TrainerWithProfile` type (types/index.ts:42-52) expects a **`trainerProfile: TrainerProfile`** field alongside a `profile: UserProfile` field.
- Result: every trainer catalog/profile page reading `trainerProfile.bio`, `trainerProfile.hourlyRate`, `trainerProfile.isAvailableForNewClients`, etc. gets `undefined` at runtime.
- Also: backend `TrainerWithProfile` has `averageRating`/`reviewCount` (omitempty) — frontend has them optional, OK.
- ❗ This also leaks `passwordHash` (backend-side issue, see above).

## 10. Availability — ✅ Compatible

| Endpoint | Verdict |
|---|---|
| GET `/trainers/me/availability` → `{ slots }` | ✅ |
| PUT `/trainers/me/availability` (raw array body) | ✅ (backend binds `[]TrainerAvailability`) |
| DELETE `/trainers/me/availability/:slotId` | ✅ (verified in trainer_routes.go:28) |
| GET `/trainers/:id/availability` → `{ slots }` | ✅ |

Note: Swagger/openapi-typescript output (`generated.ts`) shows old routes (`/trainers/availability/:slotId`, POST accept/reject, `/exercises/muscle-groups`). **The generated types file is stale — actual routes differ.** Recommend regenerating; do not treat generated.ts as source of truth for this audit.

## 11. Reviews — ✅ Compatible

| Endpoint | Verdict |
|---|---|
| POST `/trainers/:id/reviews` | ✅ |
| GET `/trainers/:id/reviews` → `{ reviews }` | ✅ |
| PUT `/reviews/:id` | ✅ |
| DELETE `/reviews/:id` | ✅ |

## 12. Coaching Requests — ⚠️ Compatible (Swagger drift only)

| Endpoint | Verdict |
|---|---|
| POST `/coaching-requests` (`{ trainerId, message? }`) | ✅ |
| GET `/coaching-requests/my` → `{ requests }` | ✅ |
| GET `/coaching-requests/pending` → `{ requests }` | ✅ |
| PUT `/coaching-requests/:id/accept` | ✅ (verified: backend uses PUT, coaching_request_routes.go:24) |
| PUT `/coaching-requests/:id/reject` | ✅ (PUT, route line 25) |

Notes:
- The "frontend PUT vs swagger POST" drift from generated.ts is **Swagger staleness only** — actual code matches (both PUT).
- `CoachingRequestWithDetails.athlete`/`trainer` are raw `*models.User` (backend `passwordHash` leak again).
- Backend has no DELETE endpoint for coaching requests; frontend doesn't call one. OK.

## 13. Exercises / Equipment / Muscle Groups — ❌ Incompatible

| Endpoint | Frontend | Backend (verified) | Verdict |
|---|---|---|---|
| GET `/muscle-groups` | `/muscle-groups` | `/api/muscle-groups` (exercise_routes.go:13) | ✅ (Swagger stale — actual route matches) |
| GET `/equipment` | `/equipment` | `/api/equipment` (line 14) | ✅ (same) |
| GET `/exercises` | expects `{ exercises, count }` envelope | returns **bare `Exercise[]` array** (exercise_handler.go:86) | ❌ |
| GET `/exercises/muscle-group/:id` | `/exercises/muscle-group/:id` | same path (line 17) | ✅ path, ❌ envelope (below) |
| GET `/exercises/equipment/:id` | same | same (line 18) | ✅ path, ❌ envelope |
| GET `/exercises/search` | expects plain array | returns bare array (line 200) | ✅ shape, but frontend `ExerciseListResponse` typing used elsewhere |
| GET `/exercises/:id` | `ExerciseLibrary` | `models.Exercise` | ⚠️ |
| POST `/exercises` | name, category, muscleGroupId, equipmentId | same | ✅ |
| PUT `/exercises/:id` | partial body | **no backend route** (only admin verify/delete exist) | ❌ unused-with-no-route |
| DELETE `/exercises/:id` | message | **no frontend-facing route** (admin only, different path) | ❌ unused-with-no-route |

❌ Primary break — `GET /exercises` envelope:
- Backend: `c.JSON(200, exercises)` → `[ {...}, {...} ]`
- Frontend `ExerciseListResponse`: `{ exercises: ExerciseLibrary[], count: number }`
- `response.exercises` on an array is `undefined` → exercise library page breaks if it consumes this client function.

⚠️ Secondary — enriched fields:
- Frontend `ExerciseLibrary` includes optional nested `muscleGroup?: MuscleGroup`, `equipment?: Equipment` objects (types/index.ts:251-252). Backend `models.Exercise` returns only `muscleGroupId`/`equipmentId` ints — nested objects never populate. UI must resolve names via the separate `/muscle-groups` and `/equipment` endpoints. Marked optional so not a crash, but a documented gap.

## 14. Workout Plans — ✅ Compatible

| Endpoint | Verdict |
|---|---|
| POST `/workout-plans` | ✅ |
| GET `/workout-plans` → `{ plans, count }` | ✅ |
| GET `/workout-plans/assigned` | ✅ |
| GET `/workout-plans/:id` | ✅ |
| PUT `/workout-plans/:id` | ✅ |
| DELETE `/workout-plans/:id` | ✅ |
| POST `/workout-plans/:id/assign` (`{ athleteIds }`) | ✅ (frontend sends number[]; backend binds `[]string` then parses — JSON numbers into `[]string` will **fail** Go JSON unmarshal. ⚠️ see below) |
| GET `/workout-plans/:id/assignments` | ✅ |
| POST `/workout-plans/:id/start` | ✅ |
| GET `/clients/:username/workout-plans` | ✅ |

⚠️ Mismatch — `athleteIds` typing:
- Backend `AssignPlanRequest.AthleteIDs []string` (workout_plan_handler.go:39) — expects JSON **strings** (`["1","2"]`).
- Frontend `AssignPlanRequest.athleteIds: number[]` — sends JSON **numbers** (`[1,2]`).
- Go's `encoding/json` will error unmarshaling a JSON number into a string slice → **400 Bad Request on plan assignment**. Flagging as likely runtime break; verify one live assignment call.

Notes:
- Route comments in workout_plan_routes.go say "trainer only" for PUT/DELETE but handler code allows trainer OR athlete — comment drift, not contract break.

---

## Cross-Cutting Findings

1. **Stale Swagger / generated types** — `frontend/src/types/generated.ts` (and backend Swagger annotations) disagree with actual routes in at least 5 places (coaching PUT vs POST, muscle-groups path, equipment path, availability delete path, exercises envelope). Regenerate `generated.ts` after fixing backend annotations; until then it is unreliable for contract work.

2. **Error contract** — Backend consistently returns `{ "error": "..." }`; api-client checks `error` then `message` then falls back. ✅ Compatible.

3. **Pagination envelope inconsistency** (works, but inconsistent):
   - `{ <entity>s, count }` — workouts, meals, measurements, plans (`count` = page length, not total)
   - `{ users, total, limit, offset }` — admin users
   - `{ trainers, total, limit, offset }` — trainer catalog
   - `{ comments }` — user comments (no count)
   - Default limits differ: 20 (trainers), 25 (admin), 50 (workouts/meals/measurements)

4. **`userId` number→string coercion** — Session payload and `AdminUserListItem.userId` are typed `string` on frontend, number on backend. Works via JS coercion today; a strict-mode or serialization change could break it.

5. **Backend `passwordHash` leak** (security, not frontend contract break) — raw `*models.User` returned by: `/relationships/my-trainer`, `/relationships/my-clients`, `/relationships/client/:username`, `/coaching-requests/my`, `/coaching-requests/pending`, `/trainers`, `/trainers/:id`, `/trainers/me/profile` (`TrainerWithProfile` embeds User).

6. **RFC3339 date params** — Backend `startDate`/`endDate` parse as RFC3339. If any frontend page sends date-only strings (`"2026-09-12"`), those list/filter calls 400. Audit each page's date formatting (not done in this pass — static audit only).

---

## Action Items (not executed — audit only)

Priority-ordered, for a future fixing session:

1. ❌ **P0 — Exercises envelope**: align `GET /exercises` response (`{ exercises, count }` backend-side, or handle bare array frontend-side). Also reconcile `GET /exercises/muscle-group/:id` and `/exercises/equipment/:id` envelopes.
2. ❌ **P0 — Trainer catalog `trainerProfile`**: backend should emit trainer data in a distinct field (or frontend type should read `profile` as `TrainerProfile`). Pick one; fix type or handler.
3. ❌ **P1 — Assign `athleteIds`**: change frontend to send `string[]` or backend to bind `[]int`.
4. ⚠️ **P1 — `pendingInvitations` type**: frontend should use `Invitation`, not `Relationship`.
5. ❗ **P1 — passwordHash leak**: add a DTO or `json:"-"` on `User.PasswordHash`; audit every raw-User response.
6. ⚠️ **P2 — Regenerate Swagger + `generated.ts`** after fixing annotations.
7. ⚠️ **P2 — Unify `userId` typing** (string vs number) across session payload and admin types.
8. ⚠️ **P2 — Verify live date-param formats** for workouts/meals/measurements list filtering.
9. ⚠️ **P3 — Decide on `count` vs `total` semantics** for paginated lists.

## Method & Sources

- Backend: `backend/internal/api/routes/*.go` (all 12 route files), handlers (`exercise_handler.go`, `workout_plan_handler.go`, `relationship_handler.go`, `coaching_request_handler.go`), models in `backend/internal/domain/models/`.
- Frontend: `frontend/src/lib/api/*.ts` (18 files), `frontend/src/types/index.ts`, `frontend/src/types/generated.ts`, `frontend/src/app/api/auth/session/route.ts`.
- Disputed points (route paths, HTTP verbs, response envelopes) were verified by direct read of backend route/handler source, not Swagger, because the Swagger annotations were found to be stale.
