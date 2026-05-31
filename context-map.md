# GymTrack Project Context Map

> Generated: 2026-04-24
> Status: Phases 1-5 Complete ✅ | Phase 6 (Polish) In Progress

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

**GymTrack** is a two-sided fitness tracking platform connecting **personal trainers** with **athletes**. Athletes log workouts and meals; trainers monitor progress and provide feedback through comments.

### Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Framework** | Next.js (App Router) | 16.2.4 |
| **Frontend Language** | TypeScript + React | 5.9.3 + 19.2.3 |
| **Frontend Styling** | Tailwind CSS v4 | v4.2.4 |
| **Animation** | Motion + tw-animate-css | v12.38.0 + v1.4.0 |
| **Server State** | TanStack React Query | v5.99.2 |
| **Client State** | Zustand | v5.0.12 |
| **Forms** | TanStack React Form + Zod | v1.29.1 + v4.3.6 |
| **Charts** | Recharts | v3.8.0 |
| **Date Handling** | dayjs + date-fns | v1.11.20 + v4.1.0 |
| **Backend Language** | Go | 1.24.0 |
| **Backend Framework** | Gin | v1.11.0 |
| **Database** | Couchbase Server (gocb) | v2.11.2 |
| **Auth** | JWT (golang-jwt) + bcrypt | v5.3.1 |
| **UI Components** | Base UI + Radix UI | v1.4.1 + v1.4.3 |

### Phase Status

| Phase | Description | Status |
|-------|------------|--------|
| Phase 1 | Setup & Authentication | ✅ Complete |
| Phase 2 | Core Features - Athlete (workouts, meals) | ✅ Complete |
| Phase 3 | Trainer Features (dashboard, client views) | ✅ Complete |
| Phase 4 | Communication (comments) | ✅ Complete |
| Phase 5 | Trainer Improvements (catalog, reviews, coaching) | ✅ Complete |
| Phase 6 | Polish & Optimization | 🔄 In Progress |

---

## 2. Backend Architecture

### 2.1 Directory Structure

```
backend/
├── cmd/server/
│   ├── main.go              # Application entry point, DI wiring
├── internal/
│   ├── api/
│   │   ├── handlers/        # HTTP request handlers (11 handlers)
│   │   ├── middleware/      # JWT auth middleware
│   │   └── routes/          # Route definitions per domain
│   ├── config/
│   │   ├── config.go        # Env config loading (godotenv)
│   │   ├── db.go            # Couchbase connection management
│   │   └── collections.go   # Bucket/scope/collection setup
│   ├── domain/
│   │   ├── models/          # Data structures + factory methods (13 entities)
│   │   ├── repositories/  # Couchbase data access layer (12 repos)
│   │   ├── services/       # Business logic layer (12 services)
│   │   ├── errors/         # Custom error types
│   │   └── testutils/      # Test mocks
│   └── utils/              # Helper utilities
├── docs/
│   ├── docs.go            # Swagger auto-generated docs
│   ├── swagger.json
│   └── swagger.yaml
├── go.mod
├── go.sum
└── .env                   # Environment config (gitignored)
```

### 2.2 Architecture Pattern: Clean Architecture (Layered)

```
┌─────────────────────────────────────────────┐
│              cmd/server/main.go              │  ← Composition Root
│         (DI wiring, server startup)           │
├─────────────────────────────────────────────┤
│              internal/api/                   │
│  ┌──────────┬────────────┬──────────────┐      │
│  │  routes │  handlers  │  middleware  │      │  ← Presentation Layer
│  └────┬─────┴─────┬──────┴──────┬──────┘      │
│       │           │             │              │
├───────┼───────────┼─────────────┼────────────────┤
│       ▼           ▼             │              │
│         internal/domain/     │              │
│  ┌──────────────┬─────────────┐│              │  ← Business Layer
│  │  services   │   models   ││              │
│  └──────┬──────┴───────────┘│              │
│         │                   │              │
├─────────┼───────────────────┼─────────────────┤
│         ▼                   │              │
│    repositories            │              │  ← Data Access Layer
│                           │              │
├─────────────────────────────┼──────────────────┤
│         Couchbase          │              │  ← Infrastructure
│    (gocb/v2 SDK)        │              │
└─────────────────────────┴──────────────────┘
```

### 2.3 Domain Models (13 entities)

| Model | File | Key Fields | Business Rules |
|-------|------|-----------|----------------|
| **User** | `user.go` | userId, email, role, profile | Roles: `trainer` \| `athlete`. Profile is role-agnostic |
| **Workout** | `workout.go` | workoutId, athleteId, date, exercises[] | Editable within 24h of creation |
| **Meal** | `meal.go` | mealId, athleteId, date, mealType, items[] | Editable within 24h |
| **Comment** | `comment.go` | commentId, targetType, targetId, authorId, content | Threaded (parentCommentId). Max 2000 chars |
| **Relationship** | `relationship.go` | relationshipId, trainerId, athleteId, status | Status: pending\|active\|terminated |
| **Invitation** | `invitation.go` | invitationId, trainerId, code, status, expiresAt | Code-based invitation system |
| **TrainerProfile** | `trainer_profile.go` | bio, profilePhotoUrl, hourlyRate, isAvailableForNewClients | Stored in User document |
| **TrainerAvailability** | `availability.go` | availabilityId, trainerId, dayOfWeek(0-6), startTime, endTime | Weekly recurring slots |
| **CoachingRequest** | `coaching_request.go` | requestId, athleteId, trainerId, message, status | Status: pending\|accepted\|rejected |
| **TrainerReview** | `review.go` | reviewId, trainerId, athleteId, rating(1-5), comment | AthleteName enriched in response |
| **Exercise** | `exercise.go` | exerciseId, name, muscleGroup, equipment, description | Exercise catalog for workout logging |
| **Equipment** | `equipment.go` | equipmentId, name, description | Equipment types (dumbbells, barbells, machines, etc.) |
| **MuscleGroup** | `muscle_group.go` | muscleGroupId, name | Muscle groups (chest, back, legs, etc.) |

### 2.4 API Endpoints (by domain)

#### Auth & User
```
POST   /api/auth/register          - Register (email, password, role, profile)
POST   /api/auth/login             - Login (returns accessToken + refreshToken)
POST   /api/auth/logout            - Logout
POST   /api/auth/refresh         - Refresh access token
GET    /api/users/me             - Get current user profile
PUT    /api/users/me             - Update current user profile
```

#### Workouts
```
POST   /api/workouts             - Create workout (auth required)
GET    /api/workouts            - Get own workout history (paginated, date filtered)
GET    /api/workouts/:id        - Get specific workout
PUT    /api/workouts/:id        - Update workout (24h window)
DELETE /api/workouts/:id        - Delete workout (24h window)
GET    /api/clients/:id/workouts  - Trainer view client workouts
```

#### Meals
```
POST   /api/meals                - Create meal entry
GET    /api/meals               - Get own meal history
GET    /api/meals/:id          - Get specific meal
PUT    /api/meals/:id          - Update meal
DELETE /api/meals/:id          - Delete meal
GET    /api/clients/:id/meals   - Trainer view client meals
```

#### Relationships
```
POST   /api/relationships/invite         - Generate invitation code
POST   /api/relationships/accept      - Accept invitation with code
DELETE /api/relationships/:id       - Terminate relationship
GET    /api/relationships/my-clients  - Trainer's active clients
GET    /api/relationships/my-trainer - Athlete's trainer info
GET    /api/relationships/client/:id     - Client details + stats
GET    /api/relationships/client/:id/stats - Client statistics
```

#### Comments
```
POST   /api/comments                - Add comment to workout/meal
GET    /api/comments?targetId=&targetType= - Get comments for target
PUT    /api/comments/:id         - Edit comment
DELETE /api/comments/:id         - Delete comment
```

#### Trainer Catalog (Phase 5)
```
GET    /api/trainers              - Search/browse trainers (public)
GET    /api/trainers/:id          - Get trainer profile with reviews
PUT    /api/trainers/me/profile   - Update own trainer profile
GET    /api/trainers/me/availability - Get own availability
PUT    /api/trainers/me/availability - Set availability slots
DELETE /api/trainers/me/availability/:id - Delete availability slot
GET    /api/trainers/:id/availability  - Get trainer's availability (public)
POST   /api/trainers/:id/reviews         - Create review for trainer
GET    /api/trainers/:id/reviews       - Get trainer's reviews
PUT    /api/reviews/:id                - Update review
DELETE /api/reviews/:id                - Delete review
```

#### Coaching Requests (Phase 5)
```
POST   /api/coaching-requests            - Athlete sends coaching request
GET    /api/coaching-requests/my      - Athlete's own requests
GET    /api/coaching-requests/pending - Trainer's pending requests
PUT    /api/coaching-requests/:id/accept - Trainer accepts request
PUT    /api/coaching-requests/:id/reject - Trainer rejects request
```

#### Exercise Catalog (New)
```
GET    /api/exercises           - Get all exercises (with filters)
GET    /api/exercises/:id       - Get specific exercise
POST   /api/exercises           - Create exercise (admin only)
PUT    /api/exercises/:id       - Update exercise (admin only)
DELETE /api/exercises/:id       - Delete exercise (admin only)
GET    /api/equipment           - Get all equipment types
GET    /api/muscle-groups       - Get all muscle groups
```

#### Swagger
```
GET    /swagger/*any              - Swagger UI
```

### 2.5 Middleware

| Middleware | File | Responsibility |
|-----------|------|---------------|
| **JWTAuthMiddleware** | `auth_middleware.go` | Validates Bearer token, checks expiration, verifies token type="access", sets userID/userRole in context |
| **CORS** | `main.go` | Allows localhost:3000/3001, credentials, standard headers |

### 2.6 Database: Couchbase Architecture

```
Couchbase Cluster
└── Bucket: "gymtrack"
    ├── Scope: "_default"
    │   ├── Collection: "users"         → User docs, TrainerProfiles, Reviews, Availability
    │   ├── Collection: "workouts"      → Workout docs
    │   ├── Collection: "meals"       → Meal docs
    │   ├── Collection: "relationships" → Relationship docs
    │   ├── Collection: "comments"     → Comment docs
    │   ├── Collection: "invitations"   → Invitation docs
    │   ├── Collection: "exercises"    → Exercise catalog docs
    │   ├── Collection: "equipment"    → Equipment type docs
    │   └── Collection: "muscle_groups" → Muscle group docs
    └── Scope: "coaching_requests"     → Coaching request docs (separate scope)
```

### 2.7 Dependency Injection Pattern

All wiring happens in `main.go`:
```
Config → Couchbase → Collections → Repositories → Services → Handlers → Routes
```

### 2.8 Service Layer

| Service | File | Key Responsibilities |
|---------|------|---------------------|
| **AuthService** | `auth_service.go` | User registration, login, token generation |
| **UserService** | `user_service.go` | User profile operations |
| **WorkoutService** | `workout_service.go` | Workout CRUD with 24h edit validation |
| **MealService** | `meal_service.go` | Meal CRUD with 24h edit validation |
| **CommentService** | `comment_service.go` | Comment creation with authorization checks |
| **InvitationService** | `invitation_service.go` | Code-based invitation flow. Validates athlete has no active trainer |
| **TrainerCatalogService** | `trainer_catalog_service.go` | Trainer search, profile retrieval |
| **AvailabilityService** | `availability_service.go` | CRUD for trainer availability slots |
| **ReviewService** | `review_service.go` | Review creation with relationship validation |
| **CoachingRequestService** | `coaching_request_service.go` | Coaching request lifecycle |
| **ExerciseService** | `exercise_service.go` | Exercise catalog CRUD with filtering |
| **RelationshipService** | (in relationship_repository.go) | Relationship CRUD operations |

---

## 3. Frontend Architecture

### 3.1 Directory Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout (Providers wrapper)
│   │   ├── page.tsx              # Landing page (redirects based on auth)
│   │   ├── providers.tsx         # TanStack Query provider
│   │   ├── globals.css           # Global styles + Tailwind v4
│   │   ├── (auth)/
│   │   │   ├── layout.tsx       # Auth layout
│   │   │   ├── login/page.tsx   # Login page
│   │   │   └── register/page.tsx # Registration page
│   │   └── (dashboard)/
│   │       ├── layout.tsx        # Dashboard layout + nav (auth guard)
│   │       ├── page.tsx         # Dashboard home
│   │       ├── athlete/
│   │       │   ├── workouts/    # Workout logging + history
│   │       │   ├── meals/       # Meal logging + history
│   │       │   ├── trainers/    # Browse trainers catalog
│   │       │   ├── trainer/[id]/ # Current trainer view
│   │       │   └── requests/   # Coaching request management
│   │       ├── trainer/
│   │       │   ├── clients/      # Client list dashboard
│   │       │   ├── client/[id]/   # Individual client detail
│   │       │   ├── profile/      # Trainer profile management
│   │       │   └── requests/   # Incoming coaching requests
│   │       └── profile/          # Profile editing (role-agnostic)
│   ├── components/
│   │   ├── ui/                 # Base UI components (17 components)
│   │   │   ├── button.tsx, input.tsx, label.tsx
│   │   │   ├── card.tsx, dialog.tsx, tabs.tsx
│   │   │   ├── badge.tsx, calendar.tsx, textarea.tsx
│   │   │   ├── alert-dialog.tsx, chart.tsx, combobox.tsx
│   │   │   ├── empty.tsx, field.tsx, form-field.tsx
│   │   │   ├── input-group.tsx, separator.tsx
│   │   │   └── [Base UI components]
│   │   ├── layout/             # Layout components (4)
│   │   └── features/           # Feature-specific components (8 domains)
│   │       ├── workout/        # Workout components (6)
│   │       ├── meal/           # Meal components (7)
│   │       ├── comments/       # Comment components (4)
│   │       ├── athlete/        # Athlete components (2)
│   │       ├── trainer/        # Trainer components (21)
│   │       ├── coaching/       # Coaching components (2)
│   │       ├── reviews/        # Review components (2)
│   │       └── exercise/       # Exercise components (5)
│   ├── lib/
│   │   ├── api/                # API client modules (14 files)
│   │   │   ├── index.ts        # Centralized API client
│   │   │   ├── api-types.ts    # API response types
│   │   │   ├── authApi.ts
│   │   │   ├── userApi.ts
│   │   │   ├── workoutApi.ts
│   │   │   ├── mealApi.ts
│   │   │   ├── commentApi.ts
│   │   │   ├── relationshipApi.ts
│   │   │   ├── trainerClientApi.ts
│   │   │   ├── trainerCatalogApi.ts
│   │   │   ├── availabilityApi.ts
│   │   │   ├── reviewApi.ts
│   │   │   ├── coachingRequestApi.ts
│   │   │   └── exerciseApi.ts
│   │   ├── token-service.ts    # JWT token storage/management
│   │   ├── error-handler.ts   # Error handling utilities
│   │   ├── animations.ts     # Animation utilities (Motion)
│   │   ├── constants.ts       # App constants
│   │   ├── routes.ts          # Route helpers
│   │   ├── performance.ts     # Performance utilities
│   │   ├── utils.ts           # General utilities (cn, etc.)
│   │   ├── hooks/             # Custom React hooks
│   │   └── validations/        # Zod validation schemas (4)
│   ├── stores/
│   │   └── authStore.ts       # Zustand auth state
│   ├── types/
│   │   └── index.ts         # All TypeScript types
│   ├── e2e/               # Playwright E2E tests
│   └── test/               # Vitest setup + MSW + component tests (19 files)
├── package.json
├── next.config.ts
├── tsconfig.json
├── components.json          # ShadCN config
├── vitest.config.ts
├── playwright.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
└── pnpm-lock.yaml
```

### 3.2 App Router Structure

```
/                              → Landing page (redirects if authenticated)
/(auth)/login                  → Login form
/(auth)/register              → Registration form (role selection)
/(dashboard)/                  → Dashboard home (auth-guarded)
/(dashboard)/athlete/workouts  → Workout logging + calendar + list
/(dashboard)/athlete/meals     → Meal logging + calendar + list
/(dashboard)/athlete/trainers  → Browse trainer catalog
/(dashboard)/athlete/trainer/:id → View specific trainer
/(dashboard)/athlete/requests → Coaching request management
/(dashboard)/trainer/clients  → Client list dashboard
/(dashboard)/trainer/client/:id → Individual client detail
/(dashboard)/trainer/profile → Trainer profile management
/(dashboard)/trainer/requests -> Incoming coaching requests
/(dashboard)/profile          → Profile editing (role-agnostic)
```

### 3.3 State Management Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Zustand Store                       │
│  ┌─────────────────────────────────────────────┐      │
│  │  authStore.ts                               │      │
│  │  - user: User | null                       │      │
│  │  - token: string | null                    │      │
│  │  - isAuthenticated: boolean                │      │
│  │  - isLoading, isInitialized               │      │
│  │  Actions: login, logout, setUser,          │      │
│  │           initializeAuth, refreshAccessToken │    │
│  └─────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────��─��┘

┌──────────────────────────────────────────────────────┐
│              TanStack React Query                       │
│  ┌────────────────────────────────────────────────┐   │
│  │  QueryClient (providers.tsx)                  │   │
│  │  - staleTime: 5 minutes                        │   │
│  │  - gcTime: 10 minutes                          │   │
│  │  - retry: 1                                   │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### 3.4 API Client Architecture

```
lib/api/index.ts               →  Centralized request wrapper
api.get/post/put/delete<T>() →  HTTP method helpers
Domain API modules:
  - authApi                  →  Authentication
  - userApi                →  User operations
  - workoutApi            →  Workout CRUD
  - mealApi               →  Meal CRUD
  - commentApi            →  Comment CRUD
  - relationshipApi       →  Trainer-athlete relationships
  - trainerClientApi      →  Trainer client data
  - trainerCatalogApi    →  Public trainer catalog
  - availabilityApi     →  Availability CRUD
  - reviewApi            →  Review CRUD
  - coachingRequestApi   →  Coaching requests
  - exerciseApi          →  Exercise catalog CRUD
```

### 3.5 Validation Schemas (Zod v4)

| Schema | File | Covers |
|--------|------|--------|
| **auth** | `validations/auth.ts` | Login, Register |
| **workout** | `validations/workout.ts` | Exercise, Workout |
| **meal** | `validations/meal.ts` | FoodItem, Meal |
| **comment** | `validations/comment.ts` | Comment content (1-2000 chars) |

### 3.6 UI Component Library

**Base UI** + Radix UI primitives:

| Component | Base | Purpose |
|-----------|------|---------|
| Button | Base UI Button | Primary interactive element |
| Input | Base UI Input | Text/number inputs |
| Label | Radix Label | Form field labels |
| Card | Div composition | Content containers |
| Dialog | Radix Dialog | Modal dialogs |
| Tabs | Radix Tabs | Tabbed interfaces |
| Badge | Div + CVA | Status indicators |
| Calendar | react-day-picker | Date selection |
| Textarea | HTML textarea | Multi-line text |
| AlertDialog | Radix AlertDialog | Confirmation dialogs |
| Chart | Recharts | Data visualization |
| Combobox | Base UI Combobox | Searchable dropdowns |
| Empty | Custom component | Empty state UI |
| Field | Base UI Field | Form field wrapper |
| InputGroup | Custom component | Input with addons |
| Separator | Radix Separator | Visual dividers |

---

## 4. Data Flow

### 4.1 Workout Logging Flow (Athlete)

```
Athlete fills WorkoutForm
       ↓
  React Hook Form + Zod validation
       ↓
  workoutApi.create(CreateWorkoutRequest)
       ↓
  TokenService adds Bearer token
       ↓
  POST /api/workouts (Go backend)
       ↓
  JWTAuthMiddleware validates token
       ↓
  WorkoutHandler validates input
       ↓
  WorkoutRepository saves to Couchbase
       ↓
  React Query invalidates workout queries
       ↓
  WorkoutList/WorkoutCalendar re-renders
```

### 4.2 Trainer Comment Flow

```
Trainer views client workout
       ↓
  commentApi.getByTarget("workout", workoutId)
       ↓
  GET /api/comments?targetType=workout&targetId=xxx
       ↓
  CommentHandler → CommentService validates relationship
       ↓
  CommentRepository queries Couchbase
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

### 4.3 Coaching Request Flow (Phase 5)

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

---

## 5. Authentication Flow

### 5.1 Token Architecture

```
Login Flow:
1. User submits email/password
2. POST /api/auth/login
3. Backend validates, returns: accessToken + refreshToken + user
4. TokenService stores both in localStorage
5. Zustand authStore sets user + token
6. Redirect to role-specific dashboard
```

```
Request Flow:
1. api.ts request() called
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
5. Both tokens re-stored
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
| **Repository Pattern** | Each entity has its own repository interface + Couchbase implementation |
| **Service Layer** | Business logic isolated in services |
| **Factory Methods** | Models have `New*()` constructors that generate UUIDs and timestamps |
| **Domain Methods** | Models have behavior methods: `CanEdit()`, `Accept()`, `Terminate()` |
| **Strategy Pattern** | InvitationService uses InvitationMethod interface |
| **Dependency Injection** | All dependencies wired in main.go |
| **Global State** | Couchbase cluster/bucket stored in package-level globals |
| **Error Response** | Consistent `{"error": "message"}` JSON format |

### 6.2 Frontend Patterns

| Pattern | Implementation |
|---------|---------------|
| **Route Groups** | `(auth)` and `(dashboard)` for layout separation |
| **Client Components** | All interactive pages use `'use client'` directive |
| **API Client Pattern** | Centralized `lib/api/index.ts` with typed domain modules |
| **Inline React Query** | useQuery/useMutation defined in page components |
| **TanStack Form** | TanStack React Form with Zod validation |
| **Dialog Pattern** | Feature dialogs for CRUD operations |
| **Calendar + List** | Dual view pattern for workouts and meals |
| **Token Service** | Dedicated `token-service.ts` for localStorage |
| **Error Handling** | `handleAuthError()` clears state and redirects on 401/403 |
| **Animations** | Motion library for transitions |
| **Performance** | Performance utilities for optimization |

### 6.3 Naming Conventions

| Aspect | Convention | Example |
|--------|-----------|---------|
| **Go files** | snake_case | `auth_handler.go` |
| **Go types** | PascalCase | `Workout`, `MealType` |
| **TS files** | PascalCase (components), camelCase (utils) | `WorkoutForm.tsx`, `api.ts` |
| **TS types** | PascalCase | `Workout`, `CreateWorkoutRequest` |
| **API endpoints** | kebab-case | `/api/auth/login` |
| **DB fields** | camelCase in JSON | `workoutId`, `athleteId` |

---

## 7. Development Workflow

### 7.1 Running the Project

```bash
# Backend
cd backend
go run cmd/server/main.go          # Starts on :8080

# Frontend
cd frontend
pnpm dev                        # Starts on :3000
```

### 7.2 Testing Commands

```bash
# Backend tests
cd backend && go test ./...

# Frontend unit tests (Vitest)
cd frontend && pnpm test         # Watch mode
cd frontend && pnpm test:run    # Run once

# Frontend E2E tests (Playwright)
cd frontend && pnpm test:e2e    # Headless
cd frontend && pnpm test:e2e:ui # UI mode
```

### 7.3 Swagger Generation

```bash
cd backend
swag init -g cmd/server/main.go -o docs/
```

### 7.4 CORS Configuration

Backend allows:
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://localhost:3001`
- `http://127.0.0.1:3001`

---

## 8. Testing Strategy

### 8.1 Backend Tests

| Test Coverage | Handler/Service Tests |
|--------------|-------------------|
| Auth | login, register, logout operations |
| User | Profile operations |
| Workout | CRUD + authorization |
| Meal | CRUD + authorization |
| Comment | CRUD + threading |
| Relationship | Invite, accept, terminate |
| Trainer Catalog | Search, profiles |
| Availability | CRUD operations |
| Review | CRUD + relationship validation |
| Coaching Request | Lifecycle operations |

### 8.2 Frontend Tests

| Framework | Purpose | Config |
|-----------|---------|--------|
| **Vitest** | Unit tests + component tests | `vitest.config.ts` + jsdom |
| **Playwright** | E2E tests | `playwright.config.ts` |
| **MSW** | API mocking | `src/test/mocks/` |
| **Testing Library** | Component testing | `@testing-library/react` |

---

## 9. Dependency Matrix

### 9.1 Backend Dependencies (direct)

| Package | Purpose |
|---------|---------|
| `github.com/couchbase/gocb/v2` | Couchbase database driver |
| `github.com/gin-gonic/gin` | HTTP framework |
| `github.com/gin-contrib/cors` | CORS middleware |
| `github.com/go-playground/validator/v10` | Request validation |
| `github.com/google/uuid` | UUID generation |
| `github.com/joho/godotenv` | .env file loading |
| `github.com/golang-jwt/jwt/v5` | JWT token handling |
| `github.com/stretchr/testify` | Testing assertions |
| `github.com/swaggo/swag` | Swagger documentation generation |
| `github.com/swaggo/gin-swagger` | Gin Swagger middleware |
| `github.com/swaggo/files` | Swagger UI file server |
| `golang.org/x/crypto/bcrypt` | Password hashing |

### 9.2 Frontend Dependencies (key)

| Package | Purpose |
|---------|---------|
| `next` | React framework (App Router) |
| `react` / `react-dom` | UI library |
| `@tanstack/react-query` | Server state management |
| `@tanstack/react-form` | Form management |
| `zustand` | Client state management |
| `zod` | Schema validation |
| `@base-ui/react` | Base UI component library |
| `radix-ui/*` | Accessible UI primitives |
| `class-variance-authority` | Component variant system |
| `tailwind-merge` | Tailwind class merging |
| `clsx` | Conditional class names |
| `motion` | Animation library |
| `tw-animate-css` | Tailwind animations |
| `recharts` | Charting library |
| `dayjs` + `date-fns` | Date manipulation |
| `react-day-picker` | Calendar component |
| `lucide-react` | Icon library |
| `@playwright/test` | E2E testing |
| `vitest` | Unit testing |
| `msw` | API mocking |
| `@testing-library/react` | Component testing |
| `@testing-library/user-event` | User interaction testing |

---

## 10. File Inventory

### 10.1 Backend Files (80+ Go files)

```
cmd/server/main.go
internal/config/config.go, db.go, collections.go
internal/api/middleware/auth_middleware.go
internal/api/handlers/ (11 handlers)
  - auth_handler.go
  - user_handler.go
  - workout_handler.go
  - meal_handler.go
  - comment_handler.go
  - relationship_handler.go
  - trainer_catalog_handler.go
  - availability_handler.go
  - review_handler.go
  - coaching_request_handler.go
  - exercise_handler.go
internal/api/routes/ (9 route files)
  - auth_routes.go, user_routes.go
  - workout_routes.go, meal_routes.go
  - comment_routes.go, relationship_routes.go
  - trainer_routes.go, coaching_request_routes.go
  - exercise_routes.go
internal/domain/
  - models/ (13 entity models)
    * user.go, workout.go, meal.go, comment.go
    * relationship.go, invitation.go, trainer_profile.go
    * availability.go, coaching_request.go, review.go
    * exercise.go, equipment.go, muscle_group.go
  - repositories/ (12 repositories)
    * user_repository.go, workout_repository.go, meal_repository.go
    * comment_repository.go, relationship_repository.go
    * trainer_profile_repository.go, availability_repository.go
    * review_repository.go, coaching_request_repository.go
    * exercise_repository.go, equipment_repository.go, muscle_group_repository.go
  - services/ (12 services)
    * auth_service.go, auth_types.go, user_service.go
    * workout_service.go, meal_service.go, comment_service.go
    * invitation_service.go, trainer_catalog_service.go
    * availability_service.go, review_service.go
    * coaching_request_service.go, exercise_service.go
  - errors/errors.go
  - testutils/mocks.go
internal/utils/ (helper utilities)
internal/docs/{docs.go, swagger.json, swagger.yaml}
go.mod, go.sum, .env
```

### 10.2 Frontend Files (140+ files)

```
src/app/
  - layout.tsx, page.tsx, providers.tsx, globals.css
  - (auth)/layout.tsx, login/page.tsx, register/page.tsx
  - (dashboard)/layout.tsx, page.tsx
  - (dashboard)/athlete/workouts/page.tsx, meals/page.tsx, trainers/page.tsx
  - (dashboard)/athlete/trainer/[id]/page.tsx, requests/page.tsx
  - (dashboard)/trainer/clients/page.tsx
  - (dashboard)/trainer/client/[id]/page.tsx, profile/page.tsx, requests/page.tsx
  - (dashboard)/profile/page.tsx
src/components/
  - ui/ (17 Base UI + Radix components)
    * button.tsx, input.tsx, label.tsx, card.tsx
    * dialog.tsx, tabs.tsx, badge.tsx, calendar.tsx
    * textarea.tsx, alert-dialog.tsx, chart.tsx
    * combobox.tsx, empty.tsx, field.tsx, form-field.tsx
    * input-group.tsx, separator.tsx
  - layout/ (4 layout components)
  - features/ (8 feature domains, 49 components)
    * workout/ (6 components)
    * meal/ (7 components)
    * comments/ (4 components)
    * athlete/ (2 components)
    * trainer/ (21 components)
    * coaching/ (2 components)
    * reviews/ (2 components)
    * exercise/ (5 components)
src/lib/
  - api/ (14 API modules)
    * index.ts, api-types.ts, authApi.ts, userApi.ts
    * workoutApi.ts, mealApi.ts, commentApi.ts
    * relationshipApi.ts, trainerClientApi.ts, trainerCatalogApi.ts
    * availabilityApi.ts, reviewApi.ts, coachingRequestApi.ts, exerciseApi.ts
  - token-service.ts, error-handler.ts, animations.ts
  - constants.ts, routes.ts, performance.ts, utils.ts
  - hooks/ (custom React hooks)
  - validations/ (4 Zod schemas)
src/stores/authStore.ts
src/types/index.ts
src/e2e/ (Playwright E2E tests)
src/test/ (19 test files - Vitest + MSW + component tests)
package.json, next.config.ts, tsconfig.json
components.json, vitest.config.ts, playwright.config.ts
postcss.config.mjs, eslint.config.mjs
```

---

## 11. Cross-Cutting Concerns

### 11.1 Security

| Concern | Implementation |
|---------|---------------|
| **Password Hashing** | bcrypt (Go `golang.org/x/crypto/bcrypt`) |
| **JWT** | HS256 signing, access + refresh token pattern |
| **Authorization** | Role-based checks in handlers + services |
| **CORS** | Restricted to localhost origins only |
| **Input Validation** | Frontend: Zod. Backend: go-playground/validator |
| **24h Edit Window** | Workout/Meal `CanEdit()` method enforces 24h limit |

### 11.2 Error Handling

| Layer | Strategy |
|-------|----------|
| **Backend** | Consistent `{"error": "message"}` JSON responses |
| **Frontend API** | `api.ts` parses error responses, throws `Error` |
| **Frontend Forms** | Zod validation errors via React Hook Form |
| **Auth Errors** | `handleAuthError()` clears state, redirects to login |

### 11.3 Date Handling

| Context | Library |
|---------|---------|
| **Frontend** | `dayjs` + `date-fns` for manipulation |
| **Backend** | Go `time.Time` with JSON marshaling |
| **API** | ISO 8601 string format for date fields |

---

## 12. Known Gaps & Phase 6 Opportunities

Based on the codebase:

1. **Loading states** - Basic "Loading..." text used everywhere, no skeleton loaders
2. **Error boundaries** - No React error boundaries implemented
3. **Query caching** - TanStack Query staleTime set to 5min but no prefetching
4. **Error handling** - Inconsistent error UI across pages
5. **Real-time updates** - Comments mention optional WebSockets but not implemented
6. **Optimistic updates** - No optimistic mutations in React Query
7. **Mobile responsiveness** - Tailwind classes present but mobile UX untested
8. **Notification system** - No push/in-app notifications for new comments
9. **Exercise catalog** - New feature added (Exercise, Equipment, MuscleGroup models) - needs frontend integration
10. **Form migration** - Migration from React Hook Form to TanStack React Form in progress

---

*End of Context Map*