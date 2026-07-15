# Admin Features — Gap Analysis & Implementation Plan

## Context

GymTrack has a three-role system (`admin`, `trainer`, `athlete`) with an admin panel scaffolded but functionally thin. Current admin surface: a dashboard with 8 stat cards (2 broken), a user list, user detail view, and password change. This plan closes the gap between what exists and what a fitness platform needs for governance, safety, and operations.

## Current State Summary

| Area | Backend | Frontend | Gaps |
|---|---|---|---|
| Auth/RBAC | `AdminOnlyMiddleware`, JWT role claim | `proxy.ts` role gate, `verifyAdmin()` DAL | No role mutation API |
| User Management | `GET /admin/users` (no filtering/pagination), `GET /admin/users/:id` | Users table with search/filter UI (params ignored by backend), detail page | No create/update/delete/suspend |
| Dashboard Stats | `GET /admin/stats` — `totalWorkouts` & `totalMeals` hardcoded to 0 | 8 stat cards | Metrics broken |
| Profile | `PUT /admin/profile/password` | Password change form | ✅ |
| Moderation | Nothing | Nothing | No comment/review moderation |
| Exercise Catalog | Standard CRUD exists but not admin-guarded | Exercise search | No admin curation UI |
| Audit | Nothing | Nothing | No trail |

---

## P0 — Fix Broken Features

### P0-A: Wire real workout & meal aggregates into dashboard stats

**Files:**
- `backend/internal/domain/services/admin_service.go`
- `backend/internal/api/routes/admin_routes.go` (no change needed)
- `backend/internal/app/module.go` (inject new repos)

**Changes:**
```go
type AdminService struct {
    userRepo     repositories.UserRepository
    workoutRepo  repositories.WorkoutRepository  // NEW
    mealRepo     repositories.MealRepository     // NEW
}

func (s *AdminService) GetDashboardStats(ctx context.Context) (*DashboardStats, error) {
    // Keep existing user stats logic
    
    // Add real aggregate queries
    totalWorkouts, _ := s.workoutRepo.CountAll(ctx)
    totalMeals, _ := s.mealRepo.CountAll(ctx)
    
    stats.TotalWorkouts = totalWorkouts
    stats.TotalMeals = totalMeals
    return stats, nil
}
```

**Repository additions** (`internal/domain/repositories/` and `internal/repository/postgres/`):
- `WorkoutRepository.CountAll(ctx) int`
- `MealRepository.CountAll(ctx) int`

**DI wiring** (`module.go`): Pass `WorkoutRepository` and `MealRepository` to `NewAdminService`.

**Effort:** ~45 min. **Risk:** Low. **Dependency:** None.

---

### P0-B: Server-side pagination + search for `GET /admin/users`

**Files:**
- `backend/internal/api/handlers/admin_handler.go` — parse query params
- `backend/internal/domain/services/admin_service.go` — pass params to repo
- `backend/internal/domain/repositories/user_repository.go` — extend interface
- `backend/internal/repository/postgres/user.go` — implement SQL with `LIMIT/OFFSET/WHERE`

**Query parameter contract** (frontend already sends these):
```
GET /admin/users?limit=25&offset=0&role=athlete&search=jane
```

**SQL pattern:**
```sql
SELECT * FROM users
WHERE ($1 = '' OR role = $1)
  AND ($2 = '' OR username ILIKE '%' || $2 || '%' OR email ILIKE '%' || $2 || '%')
ORDER BY created_at DESC
LIMIT $3 OFFSET $4
```

**Effort:** ~1 hr. **Risk:** Low. **Dependency:** P0-A (different repos, no conflict).

---

## P1 — Core Platform Governance

### P1-A: User role management (promote/demote)

**Backend:**
- `PUT /admin/users/:id/role` — new route + handler + service method
- Request: `{ "role": "trainer" | "athlete" | "admin" }`
- Validation: cannot change own role, cannot demote last admin
- JWT is NOT invalidated — user must re-login for new role to take effect (document this)
- Swagger annotations on handler

**Frontend:**
- `adminApi.updateUserRole(userId, role)` — new API method
- User detail page: add role dropdown + confirmation dialog
- Users table: inline role badge becomes a dropdown with confirm

**Files (backend):**
- `backend/internal/api/handlers/admin_handler.go` — `UpdateUserRole` handler
- `backend/internal/domain/services/admin_service.go` — `UpdateUserRole` method
- `backend/internal/api/routes/admin_routes.go` — register `PUT /admin/users/:id/role`
- `backend/internal/repository/postgres/user.go` — already has `UpdateUser`

**Files (frontend):**
- `frontend/src/lib/api/adminApi.ts` — add `updateUserRole`
- `frontend/src/app/[locale]/(dashboard)/admin/users/[id]/_components/UserDetailClient.tsx` — role switcher
- `frontend/src/app/[locale]/(dashboard)/admin/users/_components/UsersTableClient.tsx` — inline role edit

**Effort:** ~2 hr. **Risk:** Low. **Dependency:** P0-B (users list paginated first).

---

### P1-B: User suspension/account status

**Backend:**

Add `status` field to user model:
```go
type UserStatus string
const (
    UserStatusActive    UserStatus = "active"
    UserStatusSuspended UserStatus = "suspended"
    UserStatusBanned    UserStatus = "banned"
)
```

- Migration: `ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'));`
- Auth middleware: check `status` after JWT validation — suspended/banned users get 403 with clear message
- `PUT /admin/users/:id/status` — new endpoint with `{ "status": "suspended", "reason": "..." }`
- Login response: include `status` field
- Frontend: suspended users' content is optionally hidden (phase 2)

**Frontend:**
- User detail page: status badge + suspend/ban button with reason dialog
- Users table: status column with colored badges
- Login page: specific error message for suspended/banned accounts

**Files:**
- `backend/internal/domain/models/user.go` — add `UserStatus` type + `Status` field
- `backend/internal/api/middleware/auth_middleware.go` — check status
- `backend/internal/api/handlers/admin_handler.go` — `UpdateUserStatus` handler
- `backend/internal/api/routes/admin_routes.go` — register route
- `backend/internal/domain/services/admin_service.go` — `UpdateUserStatus` business logic
- `backend/migrations/002_add_user_status.up.sql` — migration
- `frontend/src/types/index.ts` — add status to `User` type
- `frontend/src/app/[locale]/(dashboard)/admin/users/[id]/_components/UserDetailClient.tsx` — status controls
- `frontend/src/lib/api/adminApi.ts` — add `updateUserStatus`

**Effort:** ~3 hr. **Risk:** Medium (auth flow change). **Dependency:** P1-A (admin route pattern established).

---

## P2 — Content Quality & Moderation

### P2-A: Admin comment moderation

Comments exist on workouts, meals, and plans. Currently no platform-level moderation.

**Backend:**
- `GET /admin/comments` — list all comments with pagination, filter by target type, target ID, author
- `DELETE /admin/comments/:id` — force-delete any comment (skip ownership check)
- `GET /admin/reported-comments` — flagged comments (requires adding a `reports` table in future)

**Service logic:** Admin bypasses all relationship/ownership checks in `CommentService`. Either add `role == admin` short-circuit or create `AdminCommentService`.

**Frontend:**
- New page: `/admin/moderation` — comments table with content preview, author, date, delete action
- Add to admin nav: `admin.nav.moderation`

**Files:**
- `backend/internal/api/handlers/admin_handler.go` — `ListAllComments`, `DeleteComment`
- `backend/internal/api/routes/admin_routes.go` — register routes
- `backend/internal/domain/services/comment_service.go` — add admin bypass in `CanDeleteComment`
- `backend/internal/domain/repositories/comment_repository.go` — add `GetAllComments`
- `backend/internal/repository/postgres/comment.go` — implement
- `frontend/src/lib/api/adminApi.ts` — add comment endpoints
- `frontend/src/app/[locale]/(dashboard)/admin/moderation/page.tsx` — new page
- `frontend/src/components/layout/admin-nav.tsx` — add link
- `frontend/messages/en.json` + `tr.json` — add `admin.nav.moderation`

**Effort:** ~2.5 hr. **Risk:** Low. **Dependency:** None (independent).

---

### P2-B: Exercise library admin management

The exercise library already has CRUD endpoints but no admin guard — any authenticated user can create/edit exercises.

**Backend:**
- Add `AdminOnlyMiddleware` to exercise creation/update/deletion routes (or add admin checks in handler)
- `PUT /admin/exercises/:id/verify` — mark exercise as "verified" canonical entry
- `DELETE /admin/exercises/:id` — remove exercises (soft-delete preferred)

**Frontend:**
- Admin exercise management page: `/admin/exercises` — search, edit, delete, verify exercises
- Verified badge on exercise cards

**Files:**
- `backend/internal/api/routes/admin_routes.go` — register
- `backend/internal/api/handlers/admin_handler.go` — exercise handlers
- `backend/internal/domain/services/admin_service.go` — exercise logic
- `frontend/src/lib/api/adminApi.ts` — exercise endpoints
- `frontend/src/app/[locale]/(dashboard)/admin/exercises/page.tsx` — new page

**Effort:** ~2 hr. **Risk:** Low. **Dependency:** None.

---

## P3 — Operations & Insights

### P3-A: Admin audit log

Track all admin mutations in a dedicated table.

**Schema:**
```sql
CREATE TABLE admin_audit_log (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,       -- e.g. 'update_role', 'suspend_user', 'delete_comment'
    target_type VARCHAR(50) NOT NULL,  -- e.g. 'user', 'comment', 'exercise'
    target_id INTEGER NOT NULL,
    details JSONB,                      -- arbitrary context (old value, new value, reason)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Service:** `AdminAuditService` with `LogAction(ctx, adminID, action, targetType, targetID, details)` — called from every admin mutation handler.

**Frontend:** `/admin/audit-log` — table with filters (action type, admin, date range).

**Files:** Multiple. New service, new repository, new handler, new frontend page.

**Effort:** ~3 hr. **Risk:** Low. **Dependency:** None.

---

### P3-B: Platform analytics page

Beyond the dashboard stats, add a dedicated analytics page.

**Backend:**
- `GET /admin/analytics/engagement` — workouts/meals per user per time bucket
- `GET /admin/analytics/retention` — users active in last 7d/30d/90d
- `GET /admin/analytics/trainer-metrics` — avg clients/trainer, avg rating, top trainers

**Frontend:**
- `/admin/analytics` — chart page with date range picker
- Use Recharts (already in deps) for bar/line charts

**Effort:** ~4 hr. **Risk:** Medium. **Dependency:** P0-A (workout/meal aggregates).

---

## Execution Order

```
Phase 1 — Fix what's broken
  P0-A: Wire workout/meal stats          [~45 min]
  P0-B: Server-side pagination           [~1 hr]

Phase 2 — Governance
  P1-A: Role management                   [~2 hr]
  P1-B: User suspension                   [~3 hr]

Phase 3 — Content
  P2-A: Comment moderation                [~2.5 hr]
  P2-B: Exercise library admin            [~2 hr]

Phase 4 — Insights
  P3-A: Audit log                         [~3 hr]
  P3-B: Analytics page                    [~4 hr]
```

**Total:** ~18 hours across 8 work units. Phases 1–2 (~6.75 hr) cover the critical path. Phase 3–4 are additive.

## Design Constraints

1. **No new frontend framework.** Keep using shadcn/ui + Tailwind + React Query. All new pages follow the RSC shell + Suspense + Client Component pattern (`admin/page.tsx` is the template).
2. **Backend pattern** follows existing layered architecture: Handler → Service → Repository. All admin routes mount under `/api/admin` and use `JWTAuthMiddleware` + `AdminOnlyMiddleware`.
3. **Audit is not optional** for Phase 2+ mutations. Every role change, status change, and content deletion must be logged.
4. **i18n**: All new UI text needs `en.json` + `tr.json` entries.
5. **No breaking changes** to existing endpoints or types. New fields are additive.
