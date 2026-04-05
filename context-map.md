# GymTrack Project Context Map

> Generated: 2026-04-05
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
| **Frontend Framework** | Next.js (App Router) | 16.1.6 |
| **Frontend Language** | TypeScript + React | 19.2.3 |
| **Frontend Styling** | Tailwind CSS + ShadCN UI | v4 |
| **Server State** | TanStack React Query | v5.90.20 |
| **Client State** | Zustand | v5.0.11 |
| **Forms** | React Hook Form + Zod | v7.71.1 + v4.3.6 |
| **Charts** | Recharts | v3.7.0 |
| **Backend Language** | Go | 1.24.0 |
| **Backend Framework** | Gin | v1.11.0 |
| **Database** | Couchbase Server (gocb) | v2.11.2 |
| **Auth** | JWT (golang-jwt) | v5.3.1 |
| **API Docs** | Swagger (gin-swagger) | v1.6.1 |

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
│   ├── main.exe             # Compiled binary
│   └── server.exe           # Compiled binary
├── internal/
│   ├── api/
│   │   ├── handlers/        # HTTP request handlers
│   │   ├── middleware/      # JWT auth middleware
│   │   └── routes/          # Route definitions per domain
│   ├── config/
│   │   ├── config.go        # Env config loading (godotenv)
│   │   ├── db.go            # Couchbase connection management
│   │   └── collections.go   # Bucket/scope/collection setup
│   └── domain/
│       ├── models/          # Data structures + factory methods
│       ├── repositories/    # Couchbase data access layer
│       └── services/        # Business logic layer
├── docs/
│   ├── docs.go              # Swagger auto-generated docs
│   ├── swagger.json
│   └── swagger.yaml
├── tests/
│   └── comment_handler_test.go
├── go.mod
├── go.sum
├── .env                     # Environment config (gitignored)
├── test_register.json       # Test fixture
└── test-server              # Test binary
```

### 2.2 Architecture Pattern: Clean Architecture (Layered)

```
┌─────────────────────────────────────────────┐
│              cmd/server/main.go              │  ← Composition Root
│         (DI wiring, server startup)          │
├─────────────────────────────────────────────┤
│              internal/api/                   │
│  ┌──────────┬────────────┬──────────────┐   │
│  │  routes  │  handlers  │  middleware   │   │  ← Presentation Layer
│  └────┬─────┴─────┬──────┴──────┬───────┘   │
│       │           │             │            │
├───────┼───────────┼─────────────┼────────────┤
│       ▼           ▼             │            │
│         internal/domain/        │            │
│  ┌──────────────┬───────────────┐│            │  ← Business Layer
│  │  services    │   models      ││            │
│  └──────┬───────┴───────────────┘│            │
│         │                        │            │
├─────────┼────────────────────────┼────────────┤
│         ▼                        │            │
│    repositories                  │            │  ← Data Access Layer
│                                  │            │
├──────────────────────────────────┼────────────┤
│         Couchbase                │            │  ← Infrastructure
│    (gocb/v2 SDK)                 │            │
└──────────────────────────────────┴────────────┘
```

### 2.3 Domain Models (10 entities)

| Model | File | Key Fields | Business Rules |
|-------|------|-----------|----------------|
| **User** | `user.go` | userId, email, role, profile | Roles: `trainer` \| `athlete`. Profile is role-agnostic with optional trainer fields |
| **Workout** | `workout.go` | workoutId, athleteId, date, exercises[] | Editable within 24h of creation. Exercises have weight (kg/lbs), sets, reps[], restTime |
| **Meal** | `meal.go` | mealId, athleteId, date, mealType, items[] | Editable within 24h. MealType: breakfast\|lunch\|dinner\|snack. Items have calories + macros |
| **Comment** | `comment.go` | commentId, targetType, targetId, authorId, authorRole, content | Threaded (parentCommentId). Targets: workout\|meal. Content max 2000 chars |
| **Relationship** | `relationship.go` | relationshipId, trainerId, athleteId, status | Status: pending\|active\|terminated. Athlete has ONE active trainer at a time |
| **Invitation** | `invitation.go` | invitationId, trainerId, code, status, expiresAt | Code-based invitation system. Status: pending\|used\|expired |
| **TrainerProfile** | `trainer_profile.go` | bio, profilePhotoUrl, hourlyRate, yearsOfExperience, isAvailableForNewClients, location, languages | Embedded in User document. Separate TrainerWithProfile struct for catalog views |
| **TrainerAvailability** | `availability.go` | availabilityId, trainerId, dayOfWeek(0-6), startTime, endTime, isBooked | Weekly recurring slots. Stored in User collection |
| **CoachingRequest** | `coaching_request.go` | requestId, athleteId, trainerId, message, status | Status: pending\|accepted\|rejected. Athlete-initiated |
| **TrainerReview** | `review.go` | reviewId, trainerId, athleteId, rating(1-5), comment | Stored in User collection. AthleteName enriched in ReviewWithAthlete |

### 2.4 API Endpoints (by domain)

#### Auth & User
```
POST   /api/auth/register          - Register (email, password, role, profile)
POST   /api/auth/login             - Login (returns accessToken + refreshToken)
POST   /api/auth/logout            - Logout
POST   /api/auth/refresh           - Refresh access token
GET    /api/users/me               - Get current user profile
PUT    /api/users/me               - Update current user profile
```

#### Workouts
```
POST   /api/workouts               - Create workout (auth required)
GET    /api/workouts               - Get own workout history (paginated, date filtered)
GET    /api/workouts/:id           - Get specific workout
PUT    /api/workouts/:id           - Update workout (24h window)
DELETE /api/workouts/:id           - Delete workout (24h window)
GET    /api/clients/:id/workouts   - Trainer view client workouts
```

#### Meals
```
POST   /api/meals                  - Create meal entry
GET    /api/meals                  - Get own meal history
GET    /api/meals/:id              - Get specific meal
PUT    /api/meals/:id              - Update meal
DELETE /api/meals/:id              - Delete meal
GET    /api/clients/:id/meals      - Trainer view client meals
```

#### Relationships
```
POST   /api/relationships/invite         - Generate invitation code
POST   /api/relationships/accept         - Accept invitation with code
DELETE /api/relationships/:id            - Terminate relationship
GET    /api/relationships/my-clients     - Trainer's active clients
GET    /api/relationships/my-trainer     - Athlete's trainer info
GET    /api/relationships/client/:id     - Client details + stats
GET    /api/relationships/client/:id/stats - Client statistics
```

#### Comments
```
POST   /api/comments                     - Add comment to workout/meal
GET    /api/comments?targetId=&targetType= - Get comments for target
PUT    /api/comments/:id                 - Edit comment
DELETE /api/comments/:id                 - Delete comment
```

#### Trainer Catalog (Phase 5)
```
GET    /api/trainers                     - Search/browse trainers (public)
GET    /api/trainers/:id                 - Get trainer profile with reviews
PUT    /api/trainers/me/profile          - Update own trainer profile
GET    /api/trainers/me/availability     - Get own availability
PUT    /api/trainers/me/availability     - Set availability slots
DELETE /api/trainers/me/availability/:id - Delete availability slot
GET    /api/trainers/:id/availability    - Get trainer's availability (public)
POST   /api/trainers/:id/reviews         - Create review for trainer
GET    /api/trainers/:id/reviews         - Get trainer's reviews
PUT    /api/reviews/:id                  - Update review
DELETE /api/reviews/:id                  - Delete review
```

#### Coaching Requests (Phase 5)
```
POST   /api/coaching-requests            - Athlete sends coaching request
GET    /api/coaching-requests/my         - Athlete's own requests
GET    /api/coaching-requests/pending    - Trainer's pending requests
PUT    /api/coaching-requests/:id/accept - Trainer accepts request
PUT    /api/coaching-requests/:id/reject - Trainer rejects request
```

#### Swagger
```
GET    /swagger/*any                     - Swagger UI
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
    │   ├── Collection: "users"        → User docs, TrainerProfiles, Reviews, Availability
    │   ├── Collection: "workouts"     → Workout docs
    │   ├── Collection: "meals"        → Meal docs
    │   ├── Collection: "relationships" → Relationship docs
    │   ├── Collection: "comments"     → Comment docs
    │   └── Collection: "invitations"  → Invitation docs
    └── Scope: "coaching_requests"     → Coaching request docs (separate scope)
```

**Key insight:** Trainer profiles, reviews, and availability are stored in the `users` collection (not separate collections), likely as sub-documents or related documents keyed by trainerId.

### 2.7 Dependency Injection Pattern

All wiring happens in `main.go`:

```
Config → Couchbase → Collections → Repositories → Services → Handlers → Routes
```

Each handler receives its dependencies via constructor:
```go
NewAuthHandler(userRepo, jwtSecret)
NewWorkoutHandler(workoutRepo, relationshipRepo)
NewCommentHandler(commentRepo, commentService)
```

### 2.8 Service Layer

| Service | File | Key Responsibilities |
|---------|------|---------------------|
| **InvitationService** | `invitation_service.go` | Code-based invitation flow. Uses strategy pattern (CodeBasedInvitation) for invitation method. Validates athlete has no active trainer |
| **CommentService** | `comment_service.go` | Comment creation with authorization checks. Verifies trainer-athlete relationship before allowing comments |
| **TrainerCatalogService** | `trainer_catalog_service.go` | Trainer search, profile retrieval with ratings |
| **AvailabilityService** | `availability_service.go` | CRUD for trainer availability slots |
| **ReviewService** | `review_service.go` | Review creation with relationship validation |
| **CoachingRequestService** | `coaching_request_service.go` | Coaching request lifecycle (create, accept, reject) |

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
│   │   ├── globals.css                # Global styles
│   │   ├── favicon.ico
│   │   ├── (auth)/
│   │   │   ├── layout.tsx             # Auth layout
│   │   │   ├── login/page.tsx         # Login page
│   │   │   └── register/page.tsx      # Registration page
│   │   └── (dashboard)/
│   │       ├── layout.tsx             # Dashboard layout with nav + auth guard
│   │       ├── page.tsx               # Dashboard home
│   │       ├── athlete/
│   │       │   ├── workouts/          # Workout logging + history
│   │       │   ├── meals/             # Meal logging + history
│   │       │   ├── trainers/          # Browse trainers catalog
│   │       │   ├── trainer/           # Current trainer view
│   │       │   └── requests/          # Coaching requests
│   │       ├── trainer/
│   │       │   ├── clients/           # Client list dashboard
│   │       │   ├── client/[id]/       # Individual client detail view
│   │       │   ├── profile/           # Trainer profile management
│   │       │   └── requests/          # Incoming coaching requests
│   │       └── profile/               # Shared profile page
│   ├── components/
│   │   ├── ui/                        # ShadCN base components (9)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── textarea.tsx
│   │   │   └── popover.tsx (via radix)
│   │   └── features/                  # Feature-specific components (7 domains)
│   │       ├── workout/
│   │       │   ├── WorkoutForm.tsx
│   │       │   ├── WorkoutList.tsx
│   │       │   ├── WorkoutCalendar.tsx
│   │       │   └── EditWorkoutDialog.tsx
│   │       ├── meal/
│   │       │   ├── MealForm.tsx
│   │       │   ├── MealList.tsx
│   │       │   ├── MealCalendar.tsx
│   │       │   ├── EditMealDialog.tsx
│   │       │   └── DailyNutritionSummary.tsx
│   │       ├── comments/
│   │       │   ├── CommentForm.tsx
│   │       │   ├── CommentList.tsx
│   │       │   ├── CommentItem.tsx
│   │       │   └── CommentThread.tsx
│   │       ├── athlete/
│   │       │   ├── AcceptInvitationDialog.tsx
│   │       │   └── MyTrainerButton.tsx
│   │       ├── trainer/
│   │       │   ├── GenerateInvitationDialog.tsx
│   │       │   └── ClientProgressCharts.tsx
│   │       ├── coaching/
│   │       │   ├── CoachingRequestDialog.tsx
│   │       │   └── CoachingRequestsList.tsx
│   │       └── reviews/
│   │           ├── CreateReviewDialog.tsx
│   │           └── ReviewActions.tsx
│   ├── lib/
│   │   ├── api.ts                     # Centralized API client (435 lines)
│   │   ├── api-types.ts               # API response types
│   │   ├── token-service.ts           # JWT token storage/management
│   │   ├── error-handler.ts           # Error handling utilities
│   │   ├── performance.ts             # Performance utilities
│   │   ├── constants.ts               # App constants
│   │   ├── utils.ts                   # General utilities (cn, etc.)
│   │   └── validations/               # Zod validation schemas
│   │       ├── auth.ts
│   │       ├── workout.ts
│   │       ├── meal.ts
│   │       └── comment.ts
│   ├── stores/
│   │   └── authStore.ts               # Zustand auth state (180 lines)
│   ├── types/
│   │   └── index.ts                   # All TypeScript types (243 lines)
│   ├── e2e/                           # Playwright E2E tests
│   └── test/                          # Vitest test utilities + MSW
├── package.json
├── next.config.ts
├── tsconfig.json
├── components.json                    # ShadCN config
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
/(auth)/register               → Registration form (role selection)
/(dashboard)/                  → Dashboard home (auth-guarded)
/(dashboard)/athlete/workouts  → Workout logging + calendar + list
/(dashboard)/athlete/meals     → Meal logging + calendar + list
/(dashboard)/athlete/trainers  → Browse trainer catalog
/(dashboard)/athlete/trainer   → View current trainer
/(dashboard)/athlete/requests  → Coaching request management
/(dashboard)/trainer/clients   → Client list dashboard
/(dashboard)/trainer/client/[id] → Individual client detail
/(dashboard)/trainer/profile   → Trainer profile management
/(dashboard)/trainer/requests  → Incoming coaching requests
/(dashboard)/profile           → Profile editing (role-agnostic)
```

### 3.3 State Management Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Zustand Store                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  authStore.ts                               │    │
│  │  - user: User | null                        │    │
│  │  - token: string | null                     │    │
│  │  - isAuthenticated: boolean                 │    │
│  │  - isLoading, isInitialized                 │    │
│  │  Actions: login, logout, setUser,           │    │
│  │           initializeAuth, refreshAccessToken │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              TanStack React Query                    │
│  ┌─────────────────────────────────────────────┐    │
│  │  QueryClient (providers.tsx)                │    │
│  │  - staleTime: 5 minutes                     │    │
│  │  - gcTime: 10 minutes                       │    │
│  │  - retry: 1                                 │    │
│  │  Exposed via window.__TANSTACK_QUERY_CLIENT__│    │
│  └─────────────────────────────────────────────┘    │
│  Queries are defined inline in page components      │
│  using useQuery/useMutation hooks                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              TokenService (localStorage)             │
│  - accessToken  → localStorage                      │
│  - refreshToken → localStorage                      │
│  - Auto-attached to API requests via api.ts          │
└─────────────────────────────────────────────────────┘
```

### 3.4 API Client Architecture

```
┌──────────────────────────────────────────────┐
│                 api.ts                        │
│  ┌────────────────────────────────────────┐  │
│  │  request<T>(endpoint, options)         │  │  ← Core fetch wrapper
│  │  - Adds Authorization header           │  │
│  │  - Handles query params                │  │
│  │  - Timeout support                     │  │
│  │  - Error parsing                       │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  api.get/post/put/delete<T>()          │  │  ← HTTP method helpers
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  Domain API modules:                   │  │
│  │  - authApi                             │  │
│  │  - userApi                             │  │
│  │  - workoutApi                          │  │
│  │  - mealApi                             │  │
│  │  - commentApi                          │  │
│  │  - relationshipApi                     │  │
│  │  - trainerClientApi                    │  │
│  │  - trainerCatalogApi                   │  │
│  │  - availabilityApi                     │  │
│  │  - reviewApi                           │  │
│  │  - coachingRequestApi                  │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### 3.5 Validation Schemas (Zod v4)

| Schema | File | Covers |
|--------|------|--------|
| **auth** | `validations/auth.ts` | Login (email, password), Register (email, password, role, profile fields) |
| **workout** | `validations/workout.ts` | Exercise (name, weight ≥0, sets >0, reps[], restTime ≥0), Workout (date, exercises[]) |
| **meal** | `validations/meal.ts` | FoodItem (food, quantity, calories ≥0, macros), Meal (date, mealType, items[]) |
| **comment** | `validations/comment.ts` | Comment (content 1-2000 chars) |

### 3.6 UI Component Library

**ShadCN UI** with Radix UI primitives. Components are locally owned (not from npm):

| Component | Base | Purpose |
|-----------|------|---------|
| Button | Radix Slot | Primary interactive element with variants |
| Input | HTML input | Text/number inputs |
| Label | Radix Label | Form field labels |
| Card | Div composition | Content containers |
| Dialog | Radix Dialog | Modal dialogs |
| Tabs | Radix Tabs | Tabbed interfaces |
| Badge | Div + CVA | Status indicators |
| Calendar | react-day-picker | Date selection |
| Textarea | HTML textarea | Multi-line text |
| Popover | Radix Popover | Floating panels |
| Select | Radix Select | Dropdown selections |

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
  JWTAuthMiddleware validates token → sets userID, userRole
       ↓
  WorkoutHandler validates input (go-playground/validator)
       ↓
  WorkoutRepository saves to Couchbase "workouts" collection
       ↓
  React Query invalidates workout queries
       ↓
  WorkoutList/WorkoutCalendar re-render with new data
```

### 4.2 Trainer Comment Flow

```
Trainer views client workout detail
       ↓
  commentApi.getByTarget("workout", workoutId)
       ↓
  GET /api/comments?targetType=workout&targetId=xxx
       ↓
  CommentHandler → CommentService (validates relationship)
       ↓
  CommentRepository queries Couchbase "comments" collection
       ↓
  Comments returned → CommentThread renders
       ↓
  Trainer submits comment via CommentForm
       ↓
  POST /api/comments → CommentService validates trainer-athlete relationship
       ↓
  Comment saved → React Query invalidates comments query
       ↓
  CommentThread updates with new comment
```

### 4.3 Coaching Request Flow (Phase 5)

```
Athlete browses /athlete/trainers
       ↓
  trainerCatalogApi.searchTrainers()
       ↓
  GET /api/trainers (public, no auth needed for browse)
       ↓
  TrainerCatalogService searches users collection
       ↓
  Athlete clicks "Request Coaching" on trainer profile
       ↓
  CoachingRequestDialog → coachingRequestApi.createCoachingRequest()
       ↓
  POST /api/coaching-requests
       ↓
  CoachingRequestService creates request in coaching_requests scope
       ↓
  Trainer sees request in /trainer/requests
       ↓
  Trainer accepts → CoachingRequestService creates relationship
       ↓
  Both parties notified, relationship becomes active
```

---

## 5. Authentication Flow

### 5.1 Token Architecture

```
┌──────────────────────────────────────────┐
│          Login Flow                       │
│                                           │
│  1. User submits email/password           │
│  2. POST /api/auth/login                  │
│  3. Backend validates, returns:           │
│     - accessToken  (short-lived, JWT)     │
│     - refreshToken (long-lived, JWT)      │
│     - user object                         │
│  4. TokenService stores both in           │
│     localStorage                          │
│  5. Zustand authStore sets user + token   │
│  6. Redirect to role-specific dashboard   │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│          Request Flow                     │
│                                           │
│  1. api.ts request() called               │
│  2. TokenService.getAuthHeader()          │
│     → "Bearer <accessToken>"              │
│  3. Header attached to fetch              │
│  4. Backend JWTAuthMiddleware validates   │
│  5. If 401 → authStore.handleAuthError()  │
│     → clears tokens → redirects to login  │
│     → clears React Query cache            │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│          Token Refresh                    │
│                                           │
│  1. accessToken expires                   │
│  2. authStore.refreshAccessToken()        │
│  3. POST /api/auth/refresh with           │
│     refreshToken                          │
│  4. New accessToken returned               │
│  5. Both tokens re-stored                 │
└──────────────────────────────────────────┘
```

### 5.2 Auth Guard Pattern

```typescript
// Dashboard layout (dashboard)/layout.tsx
useEffect(() => {
  if (!isInitialized) initializeAuth();
  if (!isLoading && !isAuthenticated) router.push("/login");
}, [isAuthenticated, isLoading, router]);

// Landing page page.tsx
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
| **Service Layer** | Business logic isolated in services (invitation, comment, catalog, etc.) |
| **Factory Methods** | Models have `New*()` constructors that generate UUIDs and timestamps |
| **Domain Methods** | Models have behavior methods: `CanEdit()`, `Accept()`, `Terminate()`, `Edit()`, `IsReply()` |
| **Strategy Pattern** | InvitationService uses InvitationMethod interface (CodeBasedInvitation implementation) |
| **Dependency Injection** | All dependencies wired in main.go, passed via constructors |
| **Global State** | Couchbase cluster/bucket stored in package-level globals (`GlobalCluster`, `GlobalBucket`) |
| **Validation** | go-playground/validator struct tags on models |
| **Error Response** | Consistent `{"error": "message"}` JSON format |

### 6.2 Frontend Patterns

| Pattern | Implementation |
|---------|---------------|
| **Route Groups** | `(auth)` and `(dashboard)` for layout separation without URL segments |
| **Client Components** | All interactive pages use `'use client'` directive |
| **API Client Pattern** | Centralized `api.ts` with typed domain modules |
| **Inline React Query** | useQuery/useMutation defined in page components (not extracted to custom hooks) |
| **Zod + RHF** | React Hook Form with `@hookform/resolvers/zod` for form validation |
| **Dialog Pattern** | Feature dialogs (EditMealDialog, CoachingRequestDialog, etc.) for CRUD operations |
| **Calendar + List** | Dual view pattern for workouts and meals (WorkoutCalendar + WorkoutList) |
| **Token Service** | Dedicated `token-service.ts` for localStorage management |
| **Error Handling** | `handleAuthError()` in authStore clears state and redirects on 401/403 |

### 6.3 Naming Conventions

| Aspect | Convention | Example |
|--------|-----------|---------|
| **Go files** | snake_case | `auth_handler.go`, `workout_repository.go` |
| **Go packages** | single word, lowercase | `handlers`, `repositories`, `services` |
| **Go types** | PascalCase | `Workout`, `Exercise`, `MealType` |
| **Go functions** | PascalCase (exported) | `NewWorkout()`, `ConnectCouchbase()` |
| **TS files** | PascalCase (components), camelCase (utils) | `WorkoutForm.tsx`, `api.ts` |
| **TS types** | PascalCase | `Workout`, `CreateWorkoutRequest` |
| **TS functions** | camelCase | `createWorkout()`, `getMyClients()` |
| **API endpoints** | kebab-case | `/api/auth/login`, `/api/coaching-requests` |
| **DB fields** | camelCase in JSON | `workoutId`, `athleteId`, `createdAt` |

---

## 7. Development Workflow

### 7.1 Running the Project

```bash
# Backend
cd backend
go run cmd/server/main.go          # Starts on :8080

# Frontend
cd frontend
pnpm dev                           # Starts on :3000
```

### 7.2 Testing Commands

```bash
# Backend tests
cd backend && go test ./...

# Frontend unit tests
cd frontend && pnpm test           # Vitest watch mode
cd frontend && pnpm test:run       # Vitest run once

# Frontend E2E tests
cd frontend && pnpm test:e2e       # Playwright headless
cd frontend && pnpm test:e2e:ui    # Playwright UI mode
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

| Test File | Coverage |
|-----------|----------|
| `auth_handler_test.go` | Auth handler (login, register) |
| `user_handler_test.go` | User profile operations |
| `comment_handler_test.go` | Comment CRUD operations |
| `comment_service_test.go` | Comment business logic |

### 8.2 Frontend Tests

| Framework | Purpose | Config |
|-----------|---------|--------|
| **Vitest** | Unit tests for components, utils | `vitest.config.ts` + jsdom |
| **Playwright** | E2E tests for user flows | `playwright.config.ts` |
| **MSW** | API mocking for tests | `src/test/` directory |
| **Testing Library** | Component testing | `@testing-library/react` + `@testing-library/jest-dom` |

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
| `github.com/swaggo/swag` | Swagger doc generation |
| `github.com/swaggo/gin-swagger` | Swagger UI integration |

### 9.2 Frontend Dependencies (key)

| Package | Purpose |
|---------|---------|
| `next` | React framework (App Router) |
| `react` / `react-dom` | UI library |
| `@tanstack/react-query` | Server state management |
| `zustand` | Client state management (auth) |
| `react-hook-form` | Form management |
| `@hookform/resolvers` | Zod resolver for RHF |
| `zod` | Schema validation |
| `radix-ui` / `@radix-ui/*` | Accessible UI primitives |
| `class-variance-authority` | Component variant system |
| `tailwind-merge` | Tailwind class merging |
| `recharts` | Charting library |
| `dayjs` | Date manipulation |
| `react-day-picker` | Calendar component |
| `lucide-react` | Icon library |
| `@playwright/test` | E2E testing |
| `vitest` | Unit testing |
| `msw` | API mocking |

---

## 10. File Inventory

### 10.1 Backend Files (47 files)

```
cmd/server/main.go                        # Entry point (124 lines)
internal/config/config.go                 # Config loading (48 lines)
internal/config/db.go                     # Couchbase connection (45 lines)
internal/config/collections.go            # Collection initialization
internal/api/middleware/auth_middleware.go # JWT middleware (89 lines)
internal/api/handlers/auth_handler.go     # Auth endpoints
internal/api/handlers/auth_handler_test.go
internal/api/handlers/user_handler.go     # User endpoints
internal/api/handlers/user_handler_test.go
internal/api/handlers/workout_handler.go  # Workout CRUD
internal/api/handlers/meal_handler.go     # Meal CRUD
internal/api/handlers/comment_handler.go  # Comment CRUD
internal/api/handlers/comment_handler_test.go
internal/api/handlers/relationship_handler.go  # Relationship management
internal/api/handlers/trainer_catalog_handler.go  # Trainer browse
internal/api/handlers/availability_handler.go     # Availability CRUD
internal/api/handlers/review_handler.go           # Review CRUD
internal/api/handlers/coaching_request_handler.go # Coaching requests
internal/api/routes/auth_routes.go        # Auth route definitions
internal/api/routes/user_routes.go
internal/api/routes/workout_routes.go
internal/api/routes/meal_routes.go
internal/api/routes/comment_routes.go
internal/api/routes/relationship_routes.go
internal/api/routes/trainer_routes.go     # Trainer + coaching routes
internal/api/routes/coaching_request_routes.go
internal/domain/models/user.go            # User model (37 lines)
internal/domain/models/workout.go         # Workout model (62 lines)
internal/domain/models/meal.go            # Meal model (82 lines)
internal/domain/models/comment.go         # Comment model (62 lines)
internal/domain/models/relationship.go    # Relationship model (56 lines)
internal/domain/models/invitation.go      # Invitation model (16 lines)
internal/domain/models/trainer_profile.go # Trainer profile (18 lines)
internal/domain/models/availability.go    # Availability model (25 lines)
internal/domain/models/coaching_request.go # Coaching request (30 lines)
internal/domain/models/review.go          # Review model (19 lines)
internal/domain/repositories/user_repository.go
internal/domain/repositories/workout_repository.go
internal/domain/repositories/meal_repository.go
internal/domain/repositories/comment_repository.go
internal/domain/repositories/relationship_repository.go
internal/domain/repositories/trainer_profile_repository.go
internal/domain/repositories/availability_repository.go
internal/domain/repositories/review_repository.go
internal/domain/repositories/coaching_request_repository.go
internal/domain/services/invitation_service.go
internal/domain/services/comment_service.go
internal/domain/services/comment_service_test.go
internal/domain/services/trainer_catalog_service.go
internal/domain/services/availability_service.go
internal/domain/services/review_service.go
internal/domain/services/coaching_request_service.go
docs/docs.go                              # Swagger auto-generated
docs/swagger.json
docs/swagger.yaml
.env                                      # Environment config
go.mod                                    # Go module definition
go.sum
```

### 10.2 Frontend Files (60+ files)

```
src/app/layout.tsx                        # Root layout
src/app/page.tsx                          # Landing page (64 lines)
src/app/providers.tsx                     # QueryClient provider (36 lines)
src/app/globals.css                       # Global styles
src/app/(auth)/layout.tsx
src/app/(auth)/login/page.tsx
src/app/(auth)/register/page.tsx
src/app/(dashboard)/layout.tsx            # Dashboard layout + nav (114 lines)
src/app/(dashboard)/page.tsx
src/app/(dashboard)/athlete/workouts/page.tsx
src/app/(dashboard)/athlete/meals/page.tsx
src/app/(dashboard)/athlete/trainers/page.tsx
src/app/(dashboard)/athlete/trainer/page.tsx
src/app/(dashboard)/athlete/requests/page.tsx
src/app/(dashboard)/trainer/clients/page.tsx
src/app/(dashboard)/trainer/client/[id]/page.tsx
src/app/(dashboard)/trainer/profile/page.tsx
src/app/(dashboard)/trainer/requests/page.tsx
src/app/(dashboard)/profile/page.tsx
src/components/ui/button.tsx
src/components/ui/input.tsx
src/components/ui/label.tsx
src/components/ui/card.tsx
src/components/ui/dialog.tsx
src/components/ui/tabs.tsx
src/components/ui/badge.tsx
src/components/ui/calendar.tsx
src/components/ui/textarea.tsx
src/components/features/workout/WorkoutForm.tsx
src/components/features/workout/WorkoutList.tsx
src/components/features/workout/WorkoutCalendar.tsx
src/components/features/workout/EditWorkoutDialog.tsx
src/components/features/meal/MealForm.tsx
src/components/features/meal/MealList.tsx
src/components/features/meal/MealCalendar.tsx
src/components/features/meal/EditMealDialog.tsx
src/components/features/meal/DailyNutritionSummary.tsx
src/components/features/comments/CommentForm.tsx
src/components/features/comments/CommentList.tsx
src/components/features/comments/CommentItem.tsx
src/components/features/comments/CommentThread.tsx
src/components/features/athlete/AcceptInvitationDialog.tsx
src/components/features/athlete/MyTrainerButton.tsx
src/components/features/trainer/GenerateInvitationDialog.tsx
src/components/features/trainer/ClientProgressCharts.tsx
src/components/features/coaching/CoachingRequestDialog.tsx
src/components/features/coaching/CoachingRequestsList.tsx
src/components/features/reviews/CreateReviewDialog.tsx
src/components/features/reviews/ReviewActions.tsx
src/lib/api.ts                            # API client (435 lines)
src/lib/api-types.ts                      # API types (208 lines)
src/lib/token-service.ts                  # Token management
src/lib/error-handler.ts                  # Error utilities
src/lib/performance.ts                    # Performance utils
src/lib/constants.ts                      # App constants
src/lib/utils.ts                          # General utils
src/lib/validations/auth.ts
src/lib/validations/workout.ts
src/lib/validations/meal.ts
src/lib/validations/comment.ts
src/stores/authStore.ts                   # Auth state (180 lines)
src/types/index.ts                        # TypeScript types (243 lines)
src/e2e/                                  # Playwright E2E tests
src/test/                                 # Vitest setup + MSW
package.json
next.config.ts
tsconfig.json
components.json
vitest.config.ts
playwright.config.ts
```

---

## 11. Cross-Cutting Concerns

### 11.1 Security

| Concern | Implementation |
|---------|---------------|
| **Password Hashing** | bcrypt (Go `golang.org/x/crypto/bcrypt`) |
| **JWT** | HS256 signing, access + refresh token pattern |
| **JWT Secret** | Must be ≥32 characters, validated at startup |
| **Authorization** | Role-based checks in handlers + services |
| **CORS** | Restricted to localhost origins only |
| **Input Validation** | Frontend: Zod. Backend: go-playground/validator |
| **24h Edit Window** | Workout/Meal `CanEdit()` method enforces 24h limit |

### 11.2 Error Handling

| Layer | Strategy |
|-------|----------|
| **Backend** | Consistent `{"error": "message"}` JSON responses. HTTP status codes match error types |
| **Frontend API** | `api.ts` parses error responses, throws `Error` with message |
| **Frontend Forms** | Zod validation errors displayed inline via React Hook Form |
| **Auth Errors** | `handleAuthError()` clears state, redirects to login, clears query cache |

### 11.3 Date Handling

| Context | Library |
|---------|---------|
| **Frontend** | `dayjs` for manipulation, `react-day-picker` for calendar UI |
| **Backend** | Go `time.Time` with JSON marshaling |
| **API** | ISO 8601 string format for date fields |

---

## 12. Known Gaps & Phase 6 Opportunities

Based on the PHASES.md and codebase analysis:

1. **Loading states** - Basic "Loading..." text used everywhere, no skeleton loaders
2. **Error boundaries** - No React error boundaries implemented
3. **Query caching** - TanStack Query staleTime set to 5min but no prefetching
4. **Error handling** - Inconsistent error UI across pages
5. **Real-time updates** - Comments mention optional WebSockets but not implemented
6. **Optimistic updates** - No optimistic mutations in React Query
7. **Accessibility** - No explicit a11y testing beyond Radix primitives
8. **Performance** - `performance.ts` exists but content unknown
9. **Mobile responsiveness** - Tailwind classes present but mobile UX untested
10. **Notification system** - No push/in-app notifications for new comments

---

*End of Context Map*
