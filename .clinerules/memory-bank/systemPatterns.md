# System Patterns: GymTrack

## System Architecture

GymTrack is a two-project monorepo with no native monorepo tooling. The frontend (Next.js) and backend (Go) communicate via a REST API.

```
┌─────────────┐     HTTP/JSON     ┌─────────────┐     Couchbase     ┌──────────────┐
│  Frontend   │ ◄──────────────► │  Backend    │ ◄──────────────► │  Database    │
│  Next.js 16 │   localhost:8080  │  Go + Gin   │   gocb/v2 SDK   │  Couchbase   │
│  Port 3000  │                  │  Port 8080  │                  │  gymtrack    │
└─────────────┘                  └─────────────┘                  └──────────────┘
```

## Key Technical Decisions

### Architecture Decisions
1. **Two-project monorepo** — No shared types or code-gen between frontend/backend. Types are duplicated manually. This keeps each side independent and avoids coupling.
2. **Clean Architecture (Layered)** for backend — Separation into Presentation (handlers), Business Logic (services), Data Access (repositories), and Infrastructure (Couchbase). Promotes testability and maintainability.
3. **App Router** for frontend — File-based routing with route groups `(auth)` and `(dashboard)` for layout sharing without URL pollution.
4. **No GraphQL** — Pure REST API. Simpler to implement and debug for this scope.
5. **JWT-based auth** — Access + refresh token pattern. Tokens stored in localStorage client-side, HttpOnly session cookie for persistence across refreshes.

### Database Decisions
1. **Couchbase (document DB)** — Chosen over relational DB for flexible schema evolution. All documents in a single bucket with collections.
2. **Document ID pattern**: `{type}::{uuid}` (e.g., `workout::abc-123`). All documents include a `type` field matching the collection name.
3. **N1QL queries** — Used for filtered/list operations alongside key-value document ops.

### State Management Decisions
1. **TanStack React Query v5** — All server state. 5 min staleTime, 10 min gcTime, retry: 1.
2. **Zustand v5** — Client-only state (auth). Simple, performant, no boilerplate.
3. **TanStack React Form + Zod v4** — Form handling and validation. Zod schemas defined in `src/lib/validations/`.

### UI Decisions
1. **Tailwind CSS v4** — CSS-based configuration, no `tailwind.config.ts`.
2. **shadcn/ui** (Base UI + Radix UI) — Component primitives. Do NOT edit directly — regenerate with CLI.
3. **Motion** (framer-motion successor) — Animations and transitions.
4. **Recharts** — Charts for body measurement visualization.
5. **Lucide React** — Icon library.

### i18n Decisions
1. **next-intl v4** — Locale-aware routing with `[locale]` prefix. `localePrefix: 'as-needed'` means root path `/` works without locale prefix.
2. **Locales**: `en` (default), `tr`.
3. **Messages** stored in `messages/{en,tr}.json` — flat JSON keyed by translation namespace.
4. **Type-safe translations** — Zod schema (`translations-schema.ts`) validates translation key structure.

## Design Patterns in Use

| Pattern | Location | Purpose |
|---------|----------|---------|
| **Repository Pattern** | `backend/internal/domain/repositories/` | Abstracts Couchbase operations per entity |
| **Service Layer** | `backend/internal/domain/services/` | Isolates business logic from HTTP |
| **Factory Method** | `backend/internal/domain/models/` | `New*()` constructors generate UUIDs and timestamps |
| **Domain Methods** | Models (e.g., `CanEdit()`, `Accept()`) | Encapsulates behavior on domain objects |
| **Strategy Pattern** | `invitation_service.go` | Different invitation methods (email, code) |
| **Dependency Injection** | `backend/cmd/server/main.go` | All wiring in composition root |
| **Route Groups** | `frontend/src/app/(auth)/`, `(dashboard)/` | Shared layouts without URL segments |
| **API Client Pattern** | `frontend/src/lib/api/` | Centralized typed API modules per domain |
| **Dialog Pattern** | Feature components | Dialog-based CRUD operations |
| **Calendar + List** | Workout/Meal pages | Dual view for history browsing |
| **Charts + List** | Body measurements | Data visualization alongside tabular data |

## Component Relationships

### Backend Dependency Chain (wired in main.go)
```
Config → Couchbase → Collections → Repositories → Services → Handlers → Routes → Gin Engine
```

### Frontend Component Hierarchy
```
Root Layout (html, body, providers)
  └─ Providers (React Query, Theme)
      └─ Auth Layout (use client, auth guard)
          ├─ Login Page
          ├─ Register Page
          └─ Dashboard Layout (nav + content)
              ├─ Athlete Pages (workouts, meals, measurements, trainers, etc.)
              └─ Trainer Pages (clients, profile, requests, etc.)
```

### Data Flow (Typical Request)
```
React Component → API Client (adds Bearer token) → Gin Router → JWT Middleware → Handler (validates input) → Service (business logic) → Repository (Couchbase ops) → Response chain back
```

### Auth Flow
```
Login → Backend validates → Returns accessToken + refreshToken → TokenService stores in localStorage → Zustand authStore sets state → HttpOnly session cookie set for persistence
Page Refresh → authStore.initializeAuth() → GET /api/auth/session recovers token → Fetches user → Restores state
Token Expiry → authStore.refreshAccessToken() → POST /api/auth/refresh → New tokens stored
Logout → DELETE /api/auth/session + clear in-memory tokens + redirect to /login
```

## Critical Implementation Paths

### 1. Authentication & Authorization
- Backend: `auth_handler.go` → `AuthService` (register, login, refresh, logout)
- Middleware: `auth_middleware.go` validates Bearer token, sets userID/userRole in Gin context
- Frontend: `authStore.ts` → `TokenService` → `POST /api/auth/login` flow
- Route protection: `middleware.ts` (proxy.ts) combines i18n + auth guard logic

### 2. Workout Logging
- Backend CRUD: `workout_handler.go` → `WorkoutService` → `WorkoutRepository`
- 24h edit window: `Workout.CanEdit()` checks CreatedAt against clock
- Frontend: `workoutApi.ts` → TanStack Form + Zod validation → Dual view (calendar + list)

### 3. Meal Logging
- Backend CRUD: `meal_handler.go` → `MealService` → `MealRepository`
- 24h edit window: `Meal.CanEdit()` 
- Frontend: `mealApi.ts` → TanStack Form + Zod validation → Dual view (calendar + list)

### 4. Body Measurements
- Backend CRUD: `body_measurement_handler.go` → `BodyMeasurementService` → `BodyMeasurementRepository`
- Trainer access: service validates active relationship before returning client data
- Frontend: `bodyMeasurementApi.ts` → Form + List + Charts (Recharts)

### 5. Comment System
- Backend: `comment_handler.go` → `CommentService` (validates trainer-athlete relationship)
- Threaded: `parentCommentId` field for nesting
- Frontend: `commentApi.ts` → `CommentThread.tsx` → `CommentForm.tsx`

### 6. Trainer-Athlete Relationships
- Invitation: Code-based system via `InvitationService`
- Coaching requests: `CoachingRequestService` lifecycle (pending → accepted/rejected)
- Relationship: `Relationship` model with status (pending/active/terminated)
- Constraint: Athlete can only have ONE active trainer at a time

### 7. Trainer Catalog & Reviews
- Public endpoints: `GET /api/trainers` (search), `GET /api/trainers/:id` (profile + reviews)
- Reviews: Athlete can review only after active relationship ends
- Availability: Weekly recurring slots (dayOfWeek, startTime, endTime)

### 8. Exercise Catalog (Admin)
- CRUD: `exercise_handler.go` → `ExerciseService` → `ExerciseRepository`
- Supporting data: Equipment and MuscleGroup repositories
- Filters: By muscle group, equipment