# GymTrack Project Context Map

> Generated: 2026-07-15
> Status: PostgreSQL Migration Complete ✅ | Core Features Complete ✅

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Backend Architecture](#backend-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Data Flow](#data-flow)
5. [Authentication Flow](#authentication-flow)
6. [Key Patterns & Conventions](#key-patterns--conventions)
7. [Development Workflow](#development-workflow)
8. [Testing Strategy](#testing-strategy)
9. [Dependency Matrix](#dependency-matrix)
10. [File Inventory](#file-inventory)

---

## 1. Project Overview

**GymTrack** is a two-sided fitness tracking platform connecting **personal trainers** with **athletes**. Athletes log workouts, meals, and body measurements; trainers monitor progress and provide feedback through comments.

### Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Framework** | Next.js (App Router) | 16.2.4 |
| **Frontend Language** | TypeScript + React | 5.9.3 + 19.2.3 |
| **Frontend Styling** | Tailwind CSS v4 | v4.2.4 |
| **Animation** | Motion + tw-animate-css | v12.38.0 + v1.4.0 |
| **Internationalization** | next-intl | v4.11.0 |
| **Server State** | TanStack React Query | v5.99.2 |
| **Client State** | Zustand | v5.0.12 |
| **Forms** | TanStack React Form + Zod | v1.29.1 + v4.3.6 |
| **Charts** | Recharts | v3.8.0 |
| **Date Handling** | dayjs | v1.11.20 |
| **Backend Language** | Go | 1.25.0 |
| **Backend Framework** | Gin | v1.11.0 |
| **Database** | PostgreSQL (pgx/v5) | v5.10.0 |
| **Auth** | JWT (golang-jwt v5) + bcrypt | v5.3.1 |
| **DI Framework** | uber-go/fx | v1.24.0 |
| **UI Components** | shadcn/ui (38 components) | base-vega style |
| **Error Monitoring** | Sentry | @sentry/nextjs v10.65.0 |
| **Tables** | TanStack React Table | v8.21.3 |

### Phase Status

| Phase | Description | Status |
|-------|------------|--------|
| Phase 1 | Setup & Authentication | ✅ Complete |
| Phase 2 | Core Features - Athlete (workouts, meals) | ✅ Complete |
| Phase 3 | Trainer Features (dashboard, client views) | ✅ Complete |
| Phase 4 | Communication (comments) | ✅ Complete |
| Phase 5 | Trainer Improvements (catalog, reviews, coaching) | ✅ Complete |
| Phase 6 | Polish & Optimization (i18n, theme) | ✅ Complete |
| Phase 7 | Body Measurement Feature | ✅ Complete |
| Phase 8 | PostgreSQL Migration | ✅ Complete |
| Phase 9 | Performance Optimization | ✅ Complete |
| Phase 10 | Admin Panel & Workout Plans | ✅ Complete |

---

## 2. Backend Architecture

### 2.1 Directory Structure

```
backend/
├── cmd/
│   ├── server/
│   │   └── main.go              # Application entry point (fx.New → fx.Run)
│   ├── migrate/
│   │   └── main.go              # DB migration runner
│   └── ensure-schema/
│       └── main.go               # Schema verification
├── internal/
│   ├── api/
│   │   ├── handlers/            # HTTP request handlers (14 handlers)
│   │   ├── middleware/          # JWT auth + admin middleware
│   │   └── routes/             # Route definitions per domain (12 files)
│   ├── app/
│   │   └── module.go           # uber-go/fx module: DI wiring, all providers/invokes
│   ├── config/
│   │   ├── config.go           # Env config loading (JWT_SECRET, POSTGRES_DSN)
│   │   ├── postgres.go         # PostgreSQL connection pool provider
│   │   ├── seed_data.go        # Seed data for exercises/equipment/muscle groups
│   │   ├── timeout.go          # Context timeout configuration
│   ├── domain/
│   │   ├── models/             # Data structures + factory methods (15 entities)
│   │   ├── repositories/       # Data access interfaces (14 interfaces)
│   │   ├── services/           # Business logic layer (15 services)
│   │   ├── errors/             # Sentinel error types
│   │   └── testutils/          # Test mocks + test utilities
│   ├── repository/
│   │   └── postgres/           # PostgreSQL implementations (17 files, tests)
│   └── utils/
│       └── clock.go            # Clock interface + RealClock for testable time
├── migrations/
│   └── 001_initial_schema.{up,down}.sql
├── go.mod
├── go.sum
└── .env
```

### 2.2 Architecture Pattern: Clean Architecture (Layered) with uber-go/fx DI

```
┌──────────────────────────────────────────────┐
│              cmd/server/main.go               │  ← Entry point: fx.New(app.RepositoryModule).Run()
├──────────────────────────────────────────────┤
│              internal/app/module.go            │  ← DI Composition Root
│   (fx.Provide: all repos, services, handlers)  │
│   (fx.Invoke: route registration, CORS, server)│
├──────────────────────────────────────────────┤
│              internal/api/                     │
│  ┌──────────┬────────────┬──────────────┐      │
│  │  routes  │  handlers  │  middleware   │      │  ← Presentation Layer
│  └────┬─────┴─────┬──────┴──────┬───────┘      │
│       │           │             │               │
├───────┼───────────┼─────────────┼────────────────┤
│       ▼           ▼             │               │
│         internal/domain/        │               │
│  ┌──────────────┬─────────────┐ │               │  ← Business Layer
│  │  services    │   models    │ │               │
│  └──────┬──────┴───────────┘ │               │
│         │                    │               │
├─────────┼────────────────────┼──────────────────┤
│         ▼                    │               │
│    repositories (interfaces) │               │  ← Data Access Contracts
│         │                    │               │
├─────────┼────────────────────┼──────────────────┤
│         ▼                    │               │
│  internal/repository/postgres │               │  ← Data Access Implementation
│    (pgx/v5 connection pool)   │               │
└──────────────────────────────┴───────────────┘
```

### 2.3 Domain Models (15 entities, integer IDs)

| Model | File | Key Fields | Business Rules |
|-------|------|-----------|----------------|
| **User** | `user.go` | id (int), email, password, role, profile | Roles: `trainer` \| `athlete` \| `admin`. Profile is JSONB |
| **Workout** | `workout.go` | id, athleteId, date, exercises (JSONB) | Editable within 24h of creation |
| **Meal** | `meal.go` | id, athleteId, date, mealType, items (JSONB) | Editable within 24h |
| **Comment** | `comment.go` | id, targetType, targetId, authorId, content | Threaded (parentCommentId). Max 2000 chars |
| **Relationship** | `relationship.go` | id, trainerId, athleteId, status | Status: pending\|active\|terminated |
| **Invitation** | `invitation.go` | id, trainerId, code, status, expiresAt | Code-based invitation system |
| **TrainerProfile** | `trainer_profile.go` | userId, bio, profilePhotoUrl, hourlyRate, isAvailableForNewClients | Stored in users table as JSONB |
| **TrainerAvailability** | `availability.go` | id, trainerId, dayOfWeek(0-6), startTime, endTime | Weekly recurring slots |
| **CoachingRequest** | `coaching_request.go` | id, athleteId, trainerId, message, status | Status: pending\|accepted\|rejected |
| **TrainerReview** | `review.go` | id, trainerId, athleteId, rating(1-5), comment | AthleteName enriched in response |
| **Exercise** | `exercise.go` | id, name, muscleGroup, equipment, description | Exercise catalog for workout logging |
| **EquipmentDefinition** | `equipment.go` | id, name, description | Equipment types (dumbbells, barbells, etc.) |
| **MuscleGroupDefinition** | `muscle_group.go` | id, name | Muscle groups (chest, back, legs, etc.) |
| **BodyMeasurement** | `body_measurement.go` | id, athleteId, date, weight, weightUnit, bodyFatPct, parts (JSONB), notes | Editable within 24h. Flexible parts map |
| **WorkoutPlan** | `workout_plan.go` | planId, trainerId, name, description, exercises (JSONB), createdAt, updatedAt | Trainer-created workout templates |

Additional types: `WorkoutPlanExercise`, `WorkoutPlanSet`, `WorkoutPlanAssignment`, `WorkoutExercise`, `ExerciseSet`, `FoodItem`, `Macros`, `UserProfile`, `BodyMeasurementPart`, `ReviewWithAthlete`, `CoachingRequestWithDetails`, `TrainerWithProfile`

### 2.4 API Endpoints (by domain)

#### Auth & User
```
POST   /api/auth/register              - Register (email, password, role, profile)
POST   /api/auth/login                 - Login (returns accessToken + refreshToken)
POST   /api/auth/logout                - Logout
POST   /api/auth/refresh               - Refresh access token
GET    /api/auth/session               - Recover session from HttpOnly cookie
DELETE /api/auth/session               - Clear session cookie
GET    /api/users/me                   - Get current user profile
PUT    /api/users/me                   - Update current user profile
```

#### Admin
```
GET    /api/admin/users                 - List all users (admin only)
PUT    /api/admin/users/:id             - Update user role (admin only)
GET    /api/admin/profile               - Get admin profile
PUT    /api/admin/profile               - Update admin profile
```

#### Workouts
```
POST   /api/workouts                    - Create workout (auth required)
GET    /api/workouts                    - Get own workout history (paginated, date filtered)
GET    /api/workouts/:id                - Get specific workout
PUT    /api/workouts/:id                - Update workout (24h window)
DELETE /api/workouts/:id                - Delete workout (24h window)
GET    /api/clients/:id/workouts        - Trainer view client workouts
```

#### Meals
```
POST   /api/meals                       - Create meal entry
GET    /api/meals                       - Get own meal history
GET    /api/meals/:id                   - Get specific meal
PUT    /api/meals/:id                   - Update meal
DELETE /api/meals/:id                   - Delete meal
GET    /api/clients/:id/meals           - Trainer view client meals
```

#### Body Measurements
```
POST   /api/measurements                - Create body measurement (athlete only)
GET    /api/measurements                - Get own measurements (paginated, date filtered)
GET    /api/measurements/latest         - Get latest measurement
GET    /api/measurements/:id            - Get specific measurement
PUT    /api/measurements/:id            - Update measurement (24h window)
DELETE /api/measurements/:id            - Delete measurement (24h window)
GET    /api/clients/:username/measurements - Trainer view client measurements
```

#### Relationships
```
POST   /api/relationships/invite        - Generate invitation code
POST   /api/relationships/accept        - Accept invitation with code
DELETE /api/relationships/:id           - Terminate relationship
GET    /api/relationships/my-clients    - Trainer's active clients
GET    /api/relationships/my-trainer    - Athlete's trainer info
GET    /api/relationships/client/:id    - Client details + stats
GET    /api/relationships/client/:id/stats - Client statistics
```

#### Comments
```
POST   /api/comments                    - Add comment to workout/meal
GET    /api/comments?targetId=&targetType= - Get comments for target
PUT    /api/comments/:id                - Edit comment
DELETE /api/comments/:id                - Delete comment
```

#### Trainer Catalog
```
GET    /api/trainers                    - Search/browse trainers (public)
GET    /api/trainers/:id                - Get trainer profile with reviews
PUT    /api/trainers/me/profile         - Update own trainer profile
GET    /api/trainers/me/availability    - Get own availability
PUT    /api/trainers/me/availability    - Set availability slots
DELETE /api/trainers/me/availability/:id - Delete availability slot
GET    /api/trainers/:id/availability   - Get trainer's availability (public)
POST   /api/trainers/:id/reviews       - Create review for trainer
GET    /api/trainers/:id/reviews       - Get trainer's reviews
PUT    /api/reviews/:id                - Update review
DELETE /api/reviews/:id                - Delete review
```

#### Coaching Requests
```
POST   /api/coaching-requests           - Athlete sends coaching request
GET    /api/coaching-requests/my        - Athlete's own requests
GET    /api/coaching-requests/pending   - Trainer's pending requests
PUT    /api/coaching-requests/:id/accept - Trainer accepts request
PUT    /api/coaching-requests/:id/reject - Trainer rejects request
```

#### Exercise Catalog
```
GET    /api/exercises                   - Get all exercises (with filters)
GET    /api/exercises/:id               - Get specific exercise
POST   /api/exercises                   - Create exercise (admin only)
PUT    /api/exercises/:id               - Update exercise (admin only)
DELETE /api/exercises/:id               - Delete exercise (admin only)
GET    /api/equipment                   - Get all equipment types
GET    /api/muscle-groups               - Get all muscle groups
```

#### Workout Plans
```
POST   /api/workout-plans               - Create workout plan (trainer only)
GET    /api/workout-plans               - List own plans (trainer) / assigned plans (athlete)
GET    /api/workout-plans/:id           - Get plan details
PUT    /api/workout-plans/:id           - Update plan (trainer only)
DELETE /api/workout-plans/:id           - Delete plan (trainer only)
POST   /api/workout-plans/:id/assign    - Assign plan to athlete
DELETE /api/workout-plans/:id/assign/:assignmentId - Unassign athlete
GET    /api/workout-plans/my-assignments - Get athlete's active assignments
```

#### Swagger
```
GET    /swagger/*any                    - Swagger UI
```

### 2.5 Middleware

| Middleware | File | Responsibility |
|-----------|------|---------------|
| **JWTAuthMiddleware** | `auth_middleware.go` | Validates Bearer token, checks expiration, verifies token type="access", sets userID/userRole in context |
| **AdminMiddleware** | `admin_middleware.go` | Guards admin-only routes, checks user role from JWT claims |
| **CORS** | `module.go` | Allows localhost:3000/3001, `[IP_ADDRESS]` variants, credentials, standard headers |

### 2.6 Database: PostgreSQL

```
PostgreSQL Database "gymtrack"
└── Schema: public
    ├── users                          → User, TrainerProfile
    ├── relationships                  → Relationship
    ├── workouts                       → Workout (exercises JSONB)
    ├── meals                          → Meal (items JSONB)
    ├── comments                       → Comment
    ├── invitations                    → Invitation
    ├── exercises                      → Exercise catalog
    ├── equipment                      → Equipment types
    ├── muscle_groups                  → Muscle groups
    ├── body_measurements              → BodyMeasurement (parts JSONB)
    ├── coaching_requests              → CoachingRequest
    ├── trainer_availabilities         → TrainerAvailability
    ├── trainer_reviews                → TrainerReview
    ├── workout_plans                  → WorkoutPlan (exercises JSONB)
    └── workout_plan_assignments       → Plan assignment
```

**Primary keys**: All tables use `id SERIAL PRIMARY KEY`. Foreign keys reference these integer IDs (migrated from UUID strings).

**JSONB columns**: `workouts.exercises`, `meals.items`, `body_measurements.parts`, `workout_plans.exercises` store arrays as JSONB (untyped `[]byte` in Go, no struct deserialization layer).

**Schema management**: `migrations/001_initial_schema.{up,down}.sql` — manual migration scripts. Run via `go run ./cmd/migrate`.

### 2.7 Dependency Injection (uber-go/fx)

All wiring in `internal/app/module.go` via `fx.Module`:

```
pgxpool.Pool → 14 PostgreSQL repository implementations
            → 15 service implementations
            → 14 handler implementations
            → *gin.Engine + route registration
            → fx.Invoke(StartServer)
```

### 2.8 Service Layer

| Service | File | Key Responsibilities |
|---------|------|---------------------|
| **AuthService** | `auth_service.go` | User registration, login, token generation/refresh, session management |
| **UserService** | `user_service.go` | User profile operations |
| **AdminService** | `admin_service.go` | User listing, role management, admin profile |
| **WorkoutService** | `workout_service.go` | Workout CRUD with 24h edit validation |
| **MealService** | `meal_service.go` | Meal CRUD with 24h edit validation |
| **BodyMeasurementService** | `body_measurement_service.go` | Body measurement CRUD with 24h edit validation, relationship checks |
| **CommentService** | `comment_service.go` | Comment creation with authorization checks |
| **InvitationService** | `invitation_service.go` | Code-based invitation flow (PostgreSQL implementation) |
| **TrainerCatalogService** | `trainer_catalog_service.go` | Trainer search, profile retrieval |
| **AvailabilityService** | `availability_service.go` | CRUD for trainer availability slots |
| **ReviewService** | `review_service.go` | Review creation with relationship validation |
| **CoachingRequestService** | `coaching_request_service.go` | Coaching request lifecycle |
| **ExerciseService** | `exercise_service.go` | Exercise catalog CRUD with filtering |
| **WorkoutPlanService** | `workout_plan_service.go` | Workout plan CRUD, assignment management |
| **RelationshipService** | (in relationship_repository.go) | Relationship CRUD operations |

---

## 3. Frontend Architecture

### 3.1 Directory Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout (Providers wrapper)
│   │   ├── page.tsx                   # Landing page (redirects based on auth)
│   │   ├── providers.tsx              # TanStack Query provider
│   │   ├── globals.css                # Global styles + Tailwind v4
│   │   ├── [locale]/                  # next-intl locale route group
│   │   │   ├── (auth)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx         # Dashboard layout + nav (auth guard)
│   │   │   │   ├── page.tsx
│   │   │   │   ├── admin/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── profile/page.tsx
│   │   │   │   │   └── users/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       └── [id]/page.tsx
│   │   │   │   ├── athlete/
│   │   │   │   │   ├── workouts/      # Workout logging + history
│   │   │   │   │   ├── meals/         # Meal logging + history
│   │   │   │   │   ├── measurements/  # Body measurement logging + list + charts
│   │   │   │   │   ├── trainers/      # Browse trainers catalog
│   │   │   │   │   ├── my-trainer/[id]/ # Current trainer view
│   │   │   │   │   ├── requests/      # Coaching request management
│   │   │   │   │   └── workout-plans/ # Assigned workout plans
│   │   │   │   ├── trainer/
│   │   │   │   │   ├── clients/       # Client list dashboard
│   │   │   │   │   ├── client/[username]/ # Individual client detail (tabs)
│   │   │   │   │   ├── profile/       # Trainer profile management
│   │   │   │   │   ├── requests/      # Incoming coaching requests
│   │   │   │   │   └── workout-plans/ # Workout plan management
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       └── [id]/page.tsx
│   │   │   │   ├── dashboard/         # Dashboard pages
│   │   │   │   └── profile/            # Profile editing (role-agnostic)
│   │   │   └── dashboard/             # Dashboard landing
│   │   └── (dashboard)/profile/       # Legacy profile route
│   ├── i18n/                          # next-intl configuration
│   │   ├── request.ts                 # getRequestConfig for server
│   │   ├── routing.ts                 # defineRouting (en, tr, default: en, prefix: as-needed)
│   │   ├── navigation.ts             # createNavigation wrappers
│   │   └── translations-schema.ts     # Zod schema for type-safe translations
│   ├── messages/                      # Translation JSON files
│   │   ├── en.json                    # English translations
│   │   └── tr.json                    # Turkish translations
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components (38 components)
│   │   │   ├── button, input, label, card, badge, dialog, tabs, textarea
│   │   │   ├── alert-dialog, alert, calendar, chart, checkbox, combobox, command
│   │   │   ├── detail-section, drawer, dropdown-menu, empty, field, form-field
│   │   │   ├── info-row, input-group, item, nav-link, pagination, popover
│   │   │   ├── scroll-area, select, separator, sheet, sidebar, skeleton
│   │   │   ├── spinner, table, toggle, tooltip, carousel
│   │   ├── layout/                    # Layout components (8)
│   │   │   ├── admin-nav, athlete-nav, dashboard-nav, trainer-nav
│   │   │   ├── dashboard-styles, locale-toggle, theme-toggle, MobileNav
│   │   └── features/                  # Feature-specific components (14 domains)
│   │       ├── admin/                 # Admin components
│   │       ├── athlete/               # Athlete components (2)
│   │       ├── body-measurement/      # Body measurement components (7)
│   │       ├── coaching/              # Coaching components (2)
│   │       ├── comments/              # Comment components (4)
│   │       ├── common/                # Shared components (LanguageSwitcher)
│   │       ├── dashboard/             # Dashboard components (9)
│   │       ├── exercise/              # Exercise components (5)
│   │       ├── landing/               # Landing page components (8)
│   │       ├── meal/                  # Meal components (9)
│   │       ├── reviews/               # Review components (2)
│   │       ├── trainer/               # Trainer components (22, incl. client-tabs/, progress-charts/, public-profile/ subdirs)
│   │       ├── workout/               # Workout components (9)
│   │       └── workout-plan/          # Workout plan components (8)
│   ├── lib/
│   │   ├── api/                       # API client modules (18 files)
│   │   │   ├── index.ts              # Legacy entry point
│   │   │   ├── api-client.ts         # Centralized request wrapper (current)
│   │   │   ├── api-types.ts          # API response types
│   │   │   ├── authApi.ts, userApi.ts, adminApi.ts
│   │   │   ├── workoutApi.ts, mealApi.ts, bodyMeasurementApi.ts
│   │   │   ├── commentApi.ts, relationshipApi.ts, trainerClientApi.ts
│   │   │   ├── trainerCatalogApi.ts, availabilityApi.ts
│   │   │   ├── reviewApi.ts, coachingRequestApi.ts
│   │   │   ├── exerciseApi.ts, workoutPlanApi.ts
│   │   ├── token-service.ts          # JWT token storage/management (in-memory)
│   │   ├── session.ts                # Server-only session encryption (HttpOnly cookies)
│   │   ├── error-handler.ts          # Error handling utilities
│   │   ├── animations.ts             # Animation utilities (Motion)
│   │   ├── constants.ts              # App constants (incl. BODY_PARTS)
│   │   ├── routes.ts                 # Route constants + dynamic builders
│   │   ├── dal.ts                    # Data access layer utilities
│   │   ├── memo.ts                   # Memoization utilities
│   │   ├── performance.ts            # Performance utilities
│   │   ├── utils.ts                  # General utilities (cn, etc.)
│   │   ├── utils/                    # Utility sub-modules
│   │   ├── hooks/                    # Custom React hooks (use-debounce, use-deferred-filter)
│   │   └── validations/             # Zod validation schemas (6)
│   ├── hooks/                        # Top-level hooks (use-mobile.ts)
│   ├── stores/
│   │   └── authStore.ts             # Zustand auth state
│   ├── types/
│   │   └── index.ts                  # All TypeScript types
│   ├── e2e/                          # Playwright E2E tests (empty directories)
│   └── test/                         # Vitest setup + MSW + component tests
├── scripts/
│   └── validate-translations.ts       # i18n coverage checker
├── package.json
├── next.config.ts
├── tsconfig.json
├── components.json                   # shadcn/ui config (base-vega style)
├── vitest.config.ts
├── playwright.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
└── pnpm-lock.yaml
```

### 3.2 App Router Structure

```
/                                    → Landing page (redirects if authenticated)
/[locale]/login                      → Login form
/[locale]/register                   → Registration form (role selection)
/[locale]/                           → Dashboard home (auth-guarded)
/[locale]/auth                       → (route group)
/[locale]/athlete/workouts           → Workout logging + calendar + list
/[locale]/athlete/meals              → Meal logging + calendar + list
/[locale]/athlete/measurements       → Body measurement logging (page not yet created)
/[locale]/athlete/trainers           → Browse trainer catalog
/[locale]/athlete/my-trainer/:id     → View current trainer
/[locale]/athlete/requests           → Coaching request management
/[locale]/athlete/workout-plans      → Assigned workout plans
/[locale]/trainer/clients            → Client list dashboard
/[locale]/trainer/client/:username   → Individual client detail (tabs: overview, workouts, meals, measurements, progress, plans)
/[locale]/trainer/profile            → Trainer profile management
/[locale]/trainer/requests           → Incoming coaching requests
/[locale]/trainer/workout-plans      → Workout plan management
/[locale]/trainer/workout-plans/:id  → Individual workout plan detail
/[locale]/admin                      → Admin dashboard
/[locale]/admin/users                → User management
/[locale]/admin/users/:id            → User detail
/[locale]/admin/profile              → Admin profile
/[locale]/profile                    → Profile editing (role-agnostic)
/[locale]/dashboard                  → Dashboard landing
```

### 3.3 Internationalization (i18n)

**Library**: next-intl v4

**Configuration** (`src/i18n/`):
- `routing.ts` — defines locales `['en', 'tr']`, default `'en'`, `localePrefix: 'as-needed'`
- `request.ts` — `getRequestConfig` loads messages from `messages/{locale}.json`
- `navigation.ts` — `createNavigation` wrappers (Link, redirect, usePathname, useRouter, getPathname)
- `translations-schema.ts` — Zod schema for type-safe translation keys (deprecated in favor of direct usage)

**Route structure**: `[locale]` route group wraps all routes. Middleware (next-intl) handles locale detection and prefixing.

**Translation validation**: `scripts/validate-translations.ts` checks coverage between locale files.

### 3.4 State Management Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Zustand Store                        │
│  ┌──────────────────────────────────────────────┐     │
│  │  authStore.ts                                │     │
│  │  - user: User | null                        │     │
│  │  - token: string | null                     │     │
│  │  - isAuthenticated: boolean                 │     │
│  │  - isLoading, isInitialized                │     │
│  │  Actions: login, logout, setUser,           │     │
│  │           initializeAuth, refreshAccessToken │     │
│  └──────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│              TanStack React Query                       │
│  ┌────────────────────────────────────────────────┐   │
│  │  QueryClient (providers.tsx)                   │   │
│  │  - staleTime: 5 minutes                        │   │
│  │  - gcTime: 10 minutes                          │   │
│  │  - retry: 1                                    │   │
│  │  - window.__TANSTACK_QUERY_CLIENT__ cross-ref   │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### 3.5 API Client Architecture

```
lib/api/api-client.ts            →  Centralized request wrapper
  api.get/post/put/delete<T>() →  HTTP method helpers, auto-attaches Bearer token

Domain API modules (18 files):
  - authApi                  →  Authentication (login, register, session)
  - userApi                  →  User operations
  - adminApi                 →  Admin operations (users, roles)
  - workoutApi               →  Workout CRUD
  - mealApi                  →  Meal CRUD
  - bodyMeasurementApi       →  Body measurement CRUD
  - commentApi               →  Comment CRUD
  - relationshipApi          →  Trainer-athlete relationships
  - trainerClientApi         →  Trainer client data (measurements, workouts, meals)
  - trainerCatalogApi        →  Public trainer catalog
  - availabilityApi          →  Availability CRUD
  - reviewApi                →  Review CRUD
  - coachingRequestApi       →  Coaching requests
  - exerciseApi              →  Exercise catalog CRUD
  - workoutPlanApi           →  Workout plan CRUD + assignment
```

### 3.6 Validation Schemas (Zod v4)

| Schema | File | Covers |
|--------|------|--------|
| **auth** | `validations/auth.ts` | Login, Register |
| **workout** | `validations/workout.ts` | Exercise, Workout |
| **meal** | `validations/meal.ts` | FoodItem, Meal |
| **comment** | `validations/comment.ts` | Comment content (1-2000 chars) |
| **bodyMeasurement** | `validations/bodyMeasurement.ts` | BodyMeasurementFormData |
| **workoutPlan** | `validations/workoutPlan.ts` | WorkoutPlan form data |

### 3.7 UI Component Library

**shadcn/ui** (base-vega style, 38 components):

| Component | Source | Purpose |
|-----------|--------|---------|
| Button | shadcn/ui | Primary interactive element |
| Input | shadcn/ui | Text/number inputs |
| Label | shadcn/ui | Form field labels |
| Card | shadcn/ui | Content containers |
| Dialog | shadcn/ui | Modal dialogs |
| Sheet | shadcn/ui | Slide-over panels |
| Drawer | vaul (via shadcn) | Mobile-friendly drawers |
| Tabs | shadcn/ui | Tabbed interfaces |
| Badge | shadcn/ui | Status indicators |
| Calendar | shadcn/ui | Date selection |
| Textarea | shadcn/ui | Multi-line text |
| AlertDialog | shadcn/ui | Confirmation dialogs |
| Alert | shadcn/ui | Notification banners |
| Chart | Recharts (via shadcn) | Data visualization |
| Combobox | shadcn/ui | Searchable dropdowns |
| Command | cmdk (via shadcn) | Command palette |
| Carousel | embla-carousel-react | Image carousels |
| Checkbox | shadcn/ui | Boolean inputs |
| DetailSection | custom | Section with details |
| DropdownMenu | shadcn/ui | Context menus |
| Empty | custom | Empty state |
| Field | shadcn/ui | Form field wrapper |
| FormField | shadcn/ui | Form field with validation |
| InfoRow | custom | Label-value row |
| InputGroup | custom | Input with addons |
| Item | custom | List item |
| NavLink | custom | Navigation link |
| Pagination | shadcn/ui | Page navigation |
| Popover | shadcn/ui | Floating panels |
| ScrollArea | shadcn/ui | Scrollable containers |
| Select | shadcn/ui | Native select replacement |
| Separator | shadcn/ui | Visual dividers |
| Sidebar | shadcn/ui | Side navigation |
| Skeleton | shadcn/ui | Loading placeholders |
| Spinner | custom | Loading indicator |
| Table | shadcn/ui | Data tables |
| Toggle | shadcn/ui | Toggle buttons |
| Tooltip | shadcn/ui | Hover tooltips |

**Theme**: next-themes (dark/light mode) + Tailwind CSS v4 dark variant.

**Toast/Sonner**: sonner for toast notifications.

---

## 4. Data Flow

### 4.1 Workout Logging Flow (Athlete)

```
Athlete fills WorkoutForm
       ↓
  TanStack React Form + Zod validation
       ↓
  workoutApi.create(CreateWorkoutRequest)
       ↓
  api-client.ts adds Bearer token
       ↓
  POST /api/workouts (Go backend)
       ↓
  JWTAuthMiddleware validates token
       ↓
  WorkoutHandler validates input
       ↓
  WorkoutRepository (PostgreSQL) saves to workouts table
       ↓
  React Query invalidates workout queries
       ↓
  WorkoutList/WorkoutCalendar re-renders
```

### 4.2 Body Measurement Logging Flow (Athlete)

```
Athlete fills BodyMeasurementForm (weight + body parts + body fat)
       ↓
  TanStack Form + Zod validation (bodyMeasurementSchema)
       ↓
  bodyMeasurementApi.create(CreateBodyMeasurementRequest)
       ↓
  POST /api/measurements (Go backend)
       ↓
  JWTAuthMiddleware validates token
       ↓
  BodyMeasurementHandler validates input (athlete role required)
       ↓
  BodyMeasurementService.CreateBodyMeasurement → NewBodyMeasurement factory
       ↓
  BodyMeasurementRepository.Create → PostgreSQL INSERT
       ↓
  React Query invalidates ["body-measurements"], ["latest-body-measurement"]
       ↓
  BodyMeasurementList/BodyMeasurementCharts re-render
```

### 4.3 Trainer Viewing Client Measurements

```
Trainer opens client detail page → ClientTabs with "measurements" tab
       ↓
  trainerClientApi.getClientMeasurements(username, dateRange?)
       ↓
  GET /api/clients/:username/measurements
       ↓
  BodyMeasurementHandler.GetClientBodyMeasurements
       ↓
  BodyMeasurementService verifies active relationship
       ↓
  BodyMeasurementRepository.GetByAthleteID or GetByAthleteDateRange
       ↓
  MeasurementsTab renders BodyMeasurementList (readOnly) + BodyMeasurementCharts
```

### 4.4 Trainer Comment Flow

```
Trainer views client workout
       ↓
  commentApi.getByTarget("workout", workoutId)
       ↓
  GET /api/comments?targetType=workout&targetId=xxx
       ↓
  CommentHandler → CommentService validates relationship
       ↓
  CommentRepository queries PostgreSQL
       ↓
  CommentThread renders
       ↓
  Trainer submits comment via CommentForm
       ↓
  POST /api/comments
       ↓
  Comment saved → React Query invalidates
       ↓
  CommentThread updates
```

### 4.5 Coaching Request Flow

```
Athlete browses /athlete/trainers
       ↓
  trainerCatalogApi.searchTrainers()
       ↓
  GET /api/trainers (public)
       ↓
  Athlete clicks "Request Coaching"
       ↓
  CoachingRequestDialog → coachingRequestApi.create()
       ↓
  POST /api/coaching-requests
       ↓
  CoachingRequestService creates request
       ↓
  Trainer sees request in /trainer/requests
       ↓
  Trainer accepts → CoachingRequestService creates relationship
```

### 4.6 Session Recovery Flow (Page Refresh)

```
Page refresh
       ↓
  authStore.initializeAuth()
       ↓
  GET /api/auth/session (checks HttpOnly cookie)
       ↓
  Session cookie → decrypt → recover access token
       ↓
  GET /api/users/me (fetch user with recovered token)
       ↓
  authStore.setUser() → app ready
```

---

## 5. Authentication Flow

### 5.1 Token Architecture

```
Login Flow:
1. User submits email/password
2. POST /api/auth/login
3. Backend validates, returns: accessToken + refreshToken + user
4. TokenService stores both in memory (singleton)
5. Session cookie set via POST /api/auth/session (HttpOnly, encrypted)
6. Zustand authStore sets user + token
7. Redirect to role-specific dashboard
```

```
Request Flow:
1. api-client.ts request() called
2. TokenService.getAuthHeader() → "Bearer <token>"
3. Header attached to fetch
4. Backend JWTAuthMiddleware validates
5. If 401 → authStore.handleAuthError()
   → clears tokens → redirects to login
```

```
Token Refresh:
1. accessToken expires
2. authStore.refreshAccessToken()
3. POST /api/auth/refresh with refreshToken
4. New accessToken returned
5. Both tokens re-stored in memory
```

```
Session Recovery (page refresh):
1. authStore.initializeAuth() called
2. GET /api/auth/session (Next.js route handler)
3. HttpOnly cookie decrypted using jose
4. Access token recovered from session payload
5. TokenService.setTokens() called with recovered tokens
6. User data fetched from Go backend
```

### 5.2 Auth Guard Pattern

```typescript
// Dashboard layout
useEffect(() => {
  if (!isInitialized) initializeAuth();
  if (!isLoading && !isAuthenticated) router.push("/login");
}, [isAuthenticated, isLoading, router]);

// Landing page
useEffect(() => {
  if (!isLoading && isAuthenticated && user) {
    router.push(user.role === 'trainer' ? '/trainer/clients' : '/athlete/workouts');
  }
}, [isAuthenticated, isLoading, router, user]);
```

---

## 6. Key Patterns & Conventions

### 6.1 Backend Patterns

| Pattern | Implementation |
|---------|---------------|
| **Repository Pattern** | Each entity has its own repository interface + PostgreSQL implementation |
| **Service Layer** | Business logic isolated in services, handlers are thin |
| **Factory Methods** | Models have `New*()` constructors that generate timestamps |
| **Domain Methods** | Models have behavior methods: `CanEdit()`, `Accept()`, `Terminate()` |
| **Strategy Pattern** | InvitationService uses `CodeBasedInvitationMethod` interface |
| **Dependency Injection** | All dependencies wired via uber-go/fx in `module.go` |
| **Testable Time** | `Clock` interface (`utils/clock.go`) injected everywhere instead of `time.Now()` |
| **Error Response** | Consistent `{"error": "message"}` JSON format |
| **Sentinel Errors** | Domain errors in `internal/domain/errors/` as `var` declarations |

### 6.2 Frontend Patterns

| Pattern | Implementation |
|---------|---------------|
| **Route Groups** | `[locale]`, `(auth)`, and `(dashboard)` for layout separation |
| **Client Components** | All interactive pages use `'use client'` directive |
| **API Client Pattern** | Centralized `lib/api/api-client.ts` with typed domain modules |
| **Inline React Query** | useQuery/useMutation defined in page components |
| **TanStack Form** | TanStack React Form with Zod validation |
| **Dialog Pattern** | Feature dialogs for CRUD operations |
| **Calendar + List** | Dual view pattern for workouts and meals |
| **Charts + List** | Dual view pattern for body measurements |
| **Token Service** | In-memory `TokenService` singleton |
| **Session Recovery** | HttpOnly cookie decrypted via jose on page refresh |
| **Error Handling** | `handleAuthError()` clears state and redirects on 401/403 |
| **Animations** | Motion library for transitions + tw-animate-css |
| **i18n** | next-intl with `useTranslations()` hook, locale prefix as-needed |
| **Theme** | next-themes for dark/light mode toggle |
| **Toast** | sonner for toast notifications |
| **Query Client Ref** | Stored on `window.__TANSTACK_QUERY_CLIENT__` for cross-module access |
| **shadcn/ui** | Component library via shadcn CLI + manual customizations |
| **Sentry** | Error monitoring via @sentry/nextjs |

### 6.3 Naming Conventions

| Aspect | Convention | Example |
|--------|-----------|---------|
| **Go files** | snake_case | `auth_handler.go` |
| **Go types** | PascalCase | `Workout`, `MealType` |
| **TS files** | kebab-case | `workout-form.tsx`, `api-client.ts` |
| **TS types** | PascalCase | `Workout`, `CreateWorkoutRequest` |
| **API endpoints** | kebab-case | `/api/auth/login`, `/api/measurements` |
| **DB columns** | camelCase in JSON | `workoutId`, `measurementId` |
| **DB tables** | snake_case | `body_measurements`, `workout_plans` |
| **Translation keys** | dot notation | `athlete.measurements.date.label` |

---

## 7. Development Workflow

### 7.1 Running the Project

```bash
# Backend
cd backend
go run cmd/server/main.go          # Starts on :8080 (fx lifecycle)

# Frontend
cd frontend
pnpm dev                           # Starts on :3000 (next dev --webpack)
```

### 7.2 Testing Commands

```bash
# Backend tests
cd backend && go test ./...

# Backend PostgreSQL repository tests (requires POSTGRES_TEST_DSN)
cd backend && go test ./internal/repository/postgres/...

# Frontend unit tests (Vitest)
cd frontend && pnpm test           # Watch mode
cd frontend && pnpm test:run       # Run once
cd frontend && pnpm test:ui        # UI dashboard

# Frontend E2E tests (Playwright)
cd frontend && pnpm test:e2e       # Headless
cd frontend && pnpm test:e2e:ui    # UI mode
```

### 7.3 Database Management

```bash
# Run migrations
cd backend && go run cmd/migrate/main.go

# Schema verification
cd backend && go run cmd/ensure-schema/main.go
```

### 7.4 i18n Validation

```bash
cd frontend && pnpm validate:i18n
```

### 7.5 Swagger Generation

```bash
cd backend
swag init -g cmd/server/main.go -o docs/
```

### 7.6 CORS Configuration

Backend allows:
- `http://localhost:3000`
- `http://[IP_ADDRESS]:3000`
- `http://localhost:3001`
- `http://[IP_ADDRESS]:3001`

---

## 8. Testing Strategy

### 8.1 Backend Tests

| Layer | Coverage | Approach |
|-------|----------|----------|
| **Repository** | PostgreSQL implementation tests | Real PostgreSQL via testcontainers, `POSTGRES_TEST_DSN` env var |
| **Service/Handler** | Business logic tests | Mock repositories via `testutils/mocks.go` |

Covered domains: Auth, User, Workout, Meal, Body Measurement, Comment, Relationship, Trainer Catalog, Availability, Review, Coaching Request, Exercise, Workout Plan, Invitation

### 8.2 Frontend Tests

| Framework | Purpose | Config |
|-----------|---------|--------|
| **Vitest** | Unit tests + component tests | `vitest.config.ts` + jsdom |
| **Playwright** | E2E tests (test structure present, tests need writing) | `playwright.config.ts` with multi-browser |
| **MSW** | API mocking | `src/test/mocks/server.ts` + `handlers.ts` |
| **Testing Library** | Component testing | `@testing-library/react` + `user-event` |

---

## 9. Dependency Matrix

### 9.1 Backend Dependencies (direct)

| Package | Purpose |
|---------|---------|
| `github.com/gin-gonic/gin` | HTTP framework |
| `github.com/gin-contrib/cors` | CORS middleware |
| `github.com/jackc/pgx/v5` | PostgreSQL database driver |
| `github.com/go-playground/validator/v10` | Request validation |
| `github.com/google/uuid` | UUID generation (legacy, unused) |
| `github.com/joho/godotenv` | .env file loading |
| `github.com/golang-jwt/jwt/v5` | JWT token handling |
| `github.com/stretchr/testify` | Testing assertions |
| `github.com/stretchr/objx` | Object manipulation for tests |
| `github.com/swaggo/swag` | Swagger documentation generation |
| `github.com/swaggo/gin-swagger` | Gin Swagger middleware |
| `github.com/swaggo/files` | Swagger UI file server |
| `golang.org/x/crypto` | Password hashing (bcrypt) |
| `go.uber.org/fx` | Dependency injection framework |
| `github.com/testcontainers/testcontainers-go` | Integration test containers |
| `github.com/testcontainers/testcontainers-go/modules/postgres` | PostgreSQL test containers |
| `github.com/couchbase/gocb/v2` | Legacy Couchbase driver (unused, retained for rollback) |

### 9.2 Frontend Dependencies (key)

| Package | Purpose |
|---------|---------|
| `next` | React framework (App Router) |
| `react` / `react-dom` | UI library |
| `next-intl` | Internationalization (i18n) |
| `@tanstack/react-query` | Server state management |
| `@tanstack/react-form` | Form management |
| `@tanstack/react-table` | Table/data grid |
| `zustand` | Client state management |
| `zod` | Schema validation |
| `@sentry/nextjs` | Error monitoring |
| `shadcn` (dev) | UI component CLI |
| `cmdk` | Command menu |
| `embla-carousel-react` | Carousel component |
| `input-otp` | OTP input |
| `jose` | JWT verification (session cookie) |
| `class-variance-authority` | Component variant system |
| `tailwind-merge` | Tailwind class merging |
| `clsx` | Conditional class names |
| `motion` | Animation library |
| `tw-animate-css` | Tailwind CSS animations |
| `recharts` | Charting library |
| `dayjs` | Date manipulation |
| `react-day-picker` | Calendar component |
| `lucide-react` | Icon library |
| `next-themes` | Dark/light mode |
| `sonner` | Toast notifications |
| `vaul` | Drawer component |
| `react-resizable-panels` | Resizable panel layouts |
| `server-only` | Server-side code guards |
| `@playwright/test` | E2E testing |
| `vitest` | Unit testing |
| `msw` | API mocking |
| `@testing-library/react` | Component testing |

---

## 10. File Inventory

### 10.1 Backend Files (130+ Go files)

```
cmd/
  server/main.go
  migrate/main.go
  ensure-schema/main.go
internal/
  app/module.go
  api/
    middleware/
      auth_middleware.go
      admin_middleware.go
    handlers/ (14 handlers)
      auth_handler.go, user_handler.go, admin_handler.go
      workout_handler.go, meal_handler.go, body_measurement_handler.go
      comment_handler.go, relationship_handler.go
      trainer_catalog_handler.go, availability_handler.go
      review_handler.go, coaching_request_handler.go
      exercise_handler.go, workout_plan_handler.go
    routes/ (12 route files)
      auth_routes.go, user_routes.go, admin_routes.go
      workout_routes.go, meal_routes.go, measurement_routes.go
      comment_routes.go, relationship_routes.go
      trainer_routes.go, coaching_request_routes.go
      exercise_routes.go, workout_plan_routes.go
  config/
    config.go, postgres.go, seed_data.go, timeout.go
    couchbase.go, collections.go.bak, db.go.bak
  domain/
    models/ (15 entity models + supporting types)
      user.go, workout.go, meal.go, body_measurement.go, comment.go
      relationship.go, invitation.go, trainer_profile.go
      availability.go, coaching_request.go, review.go
      exercise.go, equipment.go, muscle_group.go
      workout_plan.go
    repositories/ (14 interfaces)
      user_repository.go, workout_repository.go, meal_repository.go
      body_measurement_repository.go, comment_repository.go
      relationship_repository.go, trainer_profile_repository.go
      availability_repository.go, review_repository.go
      coaching_request_repository.go, exercise_repository.go
      equipment_repository.go, muscle_group_repository.go
      workout_plan_repository.go (includes WorkoutPlanAssignmentRepository)
    services/ (15 services)
      auth_service.go, auth_types.go, user_service.go, admin_service.go
      workout_service.go, meal_service.go, body_measurement_service.go
      comment_service.go, invitation_service.go, trainer_catalog_service.go
      availability_service.go, review_service.go
      coaching_request_service.go, exercise_service.go
      workout_plan_service.go
    errors/errors.go
    testutils/mocks.go, testutils.go, postgres.go
  repository/
    postgres/ (17 implementation files + test files)
      user.go, workout.go, meal.go, body_measurement.go
      comment.go, relationship.go, invitation.go
      trainer_profile.go, availability.go, trainer_review.go
      coaching_request.go, exercise.go, equipment.go
      muscle_group.go, workout_plan.go, workout_plan_assignment.go
      seed.go, helpers.go, doc.go
  utils/clock.go
migrations/001_initial_schema.up.sql, 001_initial_schema.down.sql
go.mod, go.sum, .env
```

### 10.2 Frontend Files (200+ files)

```
src/
  i18n/
    request.ts, routing.ts, navigation.ts, translations-schema.ts
  messages/
    en.json, tr.json
  app/
    layout.tsx, page.tsx, providers.tsx, globals.css
    [locale]/(auth)/layout.tsx, login/page.tsx, register/page.tsx
    [locale]/(dashboard)/layout.tsx, page.tsx
    [locale]/(dashboard)/athlete/workouts/page.tsx
    [locale]/(dashboard)/athlete/meals/page.tsx
    [locale]/(dashboard)/athlete/measurements/page.tsx
    app/api/auth/session/route.ts
    [locale]/(dashboard)/athlete/trainers/page.tsx
    [locale]/(dashboard)/athlete/my-trainer/[id]/page.tsx
    [locale]/(dashboard)/athlete/requests/page.tsx
    [locale]/(dashboard)/athlete/workout-plans/page.tsx
    [locale]/(dashboard)/trainer/clients/page.tsx
    [locale]/(dashboard)/trainer/client/[username]/page.tsx
    [locale]/(dashboard)/trainer/profile/page.tsx
    [locale]/(dashboard)/trainer/requests/page.tsx
    [locale]/(dashboard)/trainer/workout-plans/page.tsx
    [locale]/(dashboard)/trainer/workout-plans/[id]/page.tsx
    [locale]/(dashboard)/admin/page.tsx
    [locale]/(dashboard)/admin/users/page.tsx
    [locale]/(dashboard)/admin/users/[id]/page.tsx
    [locale]/(dashboard)/admin/profile/page.tsx
    [locale]/(dashboard)/profile/page.tsx
    [locale]/dashboard/
  components/
    ui/ (38 shadcn/ui components)
      button.tsx, input.tsx, label.tsx, card.tsx, badge.tsx
      dialog.tsx, sheet.tsx, drawer.tsx, tabs.tsx, textarea.tsx
      alert-dialog.tsx, alert.tsx, calendar.tsx, chart.tsx
      checkbox.tsx, combobox.tsx, command.tsx, carousel.tsx
      detail-section.tsx, dropdown-menu.tsx, empty.tsx
      field.tsx, form-field.tsx, info-row.tsx, input-group.tsx
      item.tsx, nav-link.tsx, pagination.tsx, popover.tsx
      scroll-area.tsx, select.tsx, separator.tsx, sidebar.tsx
      skeleton.tsx, spinner.tsx, table.tsx, toggle.tsx, tooltip.tsx
    layout/ (8 layout components)
      admin-nav.tsx, athlete-nav.tsx, dashboard-nav.tsx, trainer-nav.tsx
      dashboard-styles.ts, locale-toggle.tsx, theme-toggle.tsx, MobileNav.tsx
    features/ (14 domains)
      admin/
      athlete/ (2 components)
      body-measurement/ (7 components)
        BodyMeasurementForm.tsx
        BodyMeasurementList.tsx
        BodyMeasurementCharts.tsx
        BodyMeasurementTrends.tsx
        BodyMeasurementComparison.tsx
        EditBodyMeasurementDialog.tsx
        DeleteBodyMeasurementDialog.tsx
      coaching/ (2 components)
      comments/ (4 components)
      common/ (LanguageSwitcher.tsx)
      dashboard/ (9 components)
        AthleteDashboardContent.tsx, TrainerDashboardContent.tsx
        CalendarGrid.tsx, CombinedTrainingCalendar.tsx
        DashboardActionButton.tsx, DashboardEventList.tsx
        DashboardShell.tsx, QuickActionsPanel.tsx, TodayClientList.tsx
      exercise/ (4 components)
      landing/ (7 components)
        landing-variants.ts, LandingConsole.tsx, LandingFeatureGrid.tsx
        LandingHeader.tsx, LandingHero.tsx, LandingMetrics.tsx
        LandingProof.tsx, LandingRolePaths.tsx
      meal/ (9 components)
      reviews/ (2 components)
      trainer/ (10 components)
      workout/ (9 components)
      workout-plan/ (8 components)
  lib/
    api/ (18 API modules)
      index.ts, api-client.ts, api-types.ts
      authApi.ts, userApi.ts, adminApi.ts
      workoutApi.ts, mealApi.ts, bodyMeasurementApi.ts
      commentApi.ts, relationshipApi.ts, trainerClientApi.ts
      trainerCatalogApi.ts, availabilityApi.ts, reviewApi.ts
      coachingRequestApi.ts, exerciseApi.ts, workoutPlanApi.ts
    token-service.ts, session.ts
    error-handler.ts, animations.ts, constants.ts
    routes.ts, dal.ts, memo.ts, performance.ts, utils.ts
    utils/
    hooks/ (use-debounce.ts, use-deferred-filter.ts)
    validations/ (6 Zod schemas: auth, workout, meal, comment, bodyMeasurement, workoutPlan)
  stores/authStore.ts
  types/index.ts
  e2e/ (Playwright E2E test structure - directories exist, tests pending)
  test/
    setup.ts
    components/ (athlete, auth, comments, meal, workout)
    mocks/handlers.ts, server.ts
    stores/authStore.test.ts
scripts/validate-translations.ts
package.json, next.config.ts, tsconfig.json
components.json, vitest.config.ts, playwright.config.ts
postcss.config.mjs, eslint.config.mjs
```

---

## 11. Cross-Cutting Concerns

### 11.1 Security

| Concern | Implementation |
|---------|---------------|
| **Password Hashing** | bcrypt (Go `golang.org/x/crypto`) |
| **JWT** | HS256 signing, access + refresh token pattern (golang-jwt/v5) |
| **Authorization** | Role-based checks in middleware (`JWTAuthMiddleware`, `AdminMiddleware`) + service layer |
| **CORS** | Restricted to localhost origins only |
| **Input Validation** | Frontend: Zod. Backend: go-playground/validator |
| **24h Edit Window** | Workout/Meal/BodyMeasurement `CanEdit()` method enforces 24h limit |
| **Session Encryption** | jose on frontend for HttpOnly session cookie encryption/decryption |
| **Error Monitoring** | @sentry/nextjs on frontend |

### 11.2 Error Handling

| Layer | Strategy |
|-------|----------|
| **Backend** | Consistent `{"error": "message"}` JSON responses, sentinel errors with `errors.Is()` |
| **Frontend API** | `api-client.ts` parses error responses, throws `Error` |
| **Frontend Forms** | Zod validation errors via TanStack Form |
| **Auth Errors** | `handleAuthError()` clears state, redirects to login |

### 11.3 Date Handling

| Context | Library |
|---------|---------|
| **Frontend** | `dayjs` for manipulation and display |
| **Backend** | Go `time.Time` with JSON marshaling |
| **API** | ISO 8601 / RFC3339 string format for date fields |

---

## 12. Known Gaps & Opportunities

1. **Loading states** — Basic "Loading..." text used everywhere, no skeleton loaders (Skeleton component exists but unused)
2. **Error boundaries** — No React error boundaries implemented
3. **Query caching** — TanStack Query staleTime set to 5min but no prefetching
4. **Error handling** — Inconsistent error UI across pages
5. **Real-time updates** — No WebSocket/polling for live updates
6. **Optimistic updates** — No optimistic mutations in React Query
7. **Mobile responsiveness** — Tailwind classes present but mobile UX untested
8. **Notification system** — No push/in-app notifications for new comments
9. **Body measurement i18n keys** — Translation schema needs `body_measurement` and `athlete.measurements` namespaces
10. **E2E tests** — Missing for most features; test directories exist but no actual tests
11. **Backend tests** — PostgreSQL repo tests comprehensive, but service/handler tests need updating
12. **JSONB deserialization** — JSONB columns (`workouts.exercises`, `meals.items`, `body_measurements.parts`, `workout_plans.exercises`) are untyped `[]byte` — no struct deserialization layer
13. **Notification system** — Athletes not notified when trainer comments on their workout/meal
14. **Backend error visibility** — No Sentry/error monitoring on backend side
15. **Admin panel** — Basic structure exists, needs feature completion

---

*End of Context Map*
