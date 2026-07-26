<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `frontend/node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

# GymTrack — AI Agent Guide

## Project Overview

Two-sided fitness tracking platform connecting **personal trainers** with **athletes**. Athletes log workouts, meals, and body measurements; trainers monitor progress and provide feedback through comments.

**Status**: All 10 phases complete ✅ | PostgreSQL migration complete ✅

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js 16 (App Router) + TypeScript | 16.2.4 / 5.9.3 |
| **UI** | React 19 + shadcn/ui (base-vega) + Tailwind CSS v4 | 19.2.3 |
| **State** | TanStack React Query v5 (server) + Zustand v5 (client) | 5.99.2 / 5.0.12 |
| **Forms** | TanStack React Form + Zod v4 | 1.29.1 / 4.3.6 |
| **i18n** | next-intl (en, tr) | 4.11.0 |
| **Backend** | Go 1.25 + Gin v1.11 + uber-go/fx v1.24 | — |
| **Database** | PostgreSQL 16+ (pgx/v5) | 5.10.0 |
| **Auth** | JWT (golang-jwt v5) + bcrypt + HttpOnly cookies | — |
| **Monitoring** | Sentry (@sentry/nextjs) | 10.65.0 |

## Directory Structure

```
gymtrack/
├── backend/                    # Go REST API
│   ├── cmd/server/main.go      # Entry point (fx.New → fx.Run)
│   ├── cmd/migrate/main.go     # DB migration runner
│   ├── internal/
│   │   ├── api/handlers/       # HTTP handlers (14 files)
│   │   ├── api/middleware/     # JWT auth + admin middleware
│   │   ├── api/routes/         # Route definitions (12 files)
│   │   ├── app/module.go       # DI composition root (uber-go/fx)
│   │   ├── config/             # Env loading, PostgreSQL, seed data
│   │   ├── domain/
│   │   │   ├── models/         # Data structures (15 entities)
│   │   │   ├── repositories/   # Data access interfaces (14)
│   │   │   ├── services/       # Business logic (15 services)
│   │   │   └── errors/         # Sentinel error types
│   │   └── repository/postgres/ # PostgreSQL implementations (17 files)
│   └── migrations/             # SQL migration scripts
│
├── frontend/                   # Next.js App Router
│   ├── src/
│   │   ├── app/[locale]/       # Locale-based routes
│   │   │   ├── (auth)/         # Login, register
│   │   │   └── (dashboard)/    # Role-based dashboards
│   │   │       ├── athlete/    # Workouts, meals, measurements, trainers
│   │   │       ├── trainer/    # Clients, profile, requests, workout-plans
│   │   │       └── admin/      # User management
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui primitives (38 components)
│   │   │   ├── layout/         # Nav, theme toggle, locale switcher
│   │   │   └── features/       # Feature-specific (14 domains)
│   │   ├── lib/
│   │   │   ├── api/            # API client modules (18 files)
│   │   │   ├── token-service.ts # JWT token management (in-memory)
│   │   │   ├── session.ts      # Server-only session encryption
│   │   │   └── validations/    # Zod schemas (6 files)
│   │   ├── stores/authStore.ts # Zustand auth state
│   │   └── types/index.ts      # TypeScript types
│   └── messages/               # en.json, tr.json
│
├── CONTEXT.md                  # Detailed project context
├── ARCHITECTURE.md             # Architecture documentation
└── AGENTS.md                   # This file
```

## Architecture Patterns

### Backend: Clean Architecture with DI

```
cmd/server/main.go → fx.New(app.Module).Run()
                      ↓
            internal/app/module.go (Composition Root)
                      ↓
    ┌─────────────────┼─────────────────┐
    ↓                 ↓                 ↓
  Repositories    Services         Handlers
  (PostgreSQL)    (Business)       (HTTP)
```

**Key patterns**:
- **Repository Pattern**: Each entity has interface + PostgreSQL implementation
- **Service Layer**: Business logic isolated, handlers are thin
- **Factory Methods**: Models have `New*()` constructors
- **Domain Methods**: `CanEdit()`, `Accept()`, `Terminate()`
- **Testable Time**: `Clock` interface injected everywhere
- **Sentinel Errors**: Domain errors in `internal/domain/errors/`

### Frontend: App Router + React Query

```
Route Group ([locale]/(dashboard))
    ↓
Page Component ('use client')
    ↓
TanStack React Query (useQuery/useMutation)
    ↓
API Client (lib/api/*.ts)
    ↓
api-client.ts (auto-attaches Bearer token)
    ↓
Go Backend (http://localhost:8080/api)
```

**Key patterns**:
- **Route Groups**: `[locale]`, `(auth)`, `(dashboard)` for layout separation
- **Inline React Query**: Queries defined in page components
- **TanStack Form**: Form management with Zod validation
- **Dialog Pattern**: Feature dialogs for CRUD operations
- **Token Service**: In-memory singleton, HttpOnly cookie for persistence
- **Session Recovery**: Decrypt cookie on page refresh → recover tokens

## Domain Models (15 entities)

| Model | Key Fields | Business Rules |
|-------|-----------|----------------|
| **User** | id, email, password, role, profile (JSONB) | Roles: trainer \| athlete \| admin |
| **Workout** | id, athleteId, date, exercises (JSONB) | Editable within 24h |
| **Meal** | id, athleteId, date, mealType, items (JSONB) | Editable within 24h |
| **BodyMeasurement** | id, athleteId, date, weight, bodyFatPct, parts (JSONB) | Editable within 24h |
| **Comment** | id, targetType, targetId, authorId, content | Threaded, max 2000 chars |
| **Relationship** | id, trainerId, athleteId, status | pending \| active \| terminated |
| **Invitation** | id, trainerId, code, status, expiresAt | Code-based system |
| **TrainerProfile** | userId, bio, hourlyRate, isAvailable | Stored in users JSONB |
| **TrainerAvailability** | id, trainerId, dayOfWeek, startTime, endTime | Weekly recurring |
| **CoachingRequest** | id, athleteId, trainerId, message, status | pending \| accepted \| rejected |
| **TrainerReview** | id, trainerId, athleteId, rating(1-5), comment | — |
| **Exercise** | id, name, muscleGroup, equipment | Catalog for logging |
| **EquipmentDefinition** | id, name | Equipment types |
| **MuscleGroupDefinition** | id, name | Muscle groups |
| **WorkoutPlan** | planId, trainerId, name, exercises (JSONB) | Trainer-created templates |

## API Endpoints

### Auth & User
```
POST   /api/auth/register, /login, /logout, /refresh
GET    /api/auth/session              # Recover from HttpOnly cookie
DELETE /api/auth/session              # Clear cookie
GET    /api/users/me                  # Current user
PUT    /api/users/me                  # Update profile
```

### Admin
```
GET    /api/admin/users               # List all users
PUT    /api/admin/users/:id           # Update role
GET    /api/admin/profile             # Admin profile
PUT    /api/admin/profile
```

### Workouts
```
POST   /api/workouts                  # Create (auth required)
GET    /api/workouts                  # Own history (paginated, date filtered)
GET    /api/workouts/:id
PUT    /api/workouts/:id              # 24h window
DELETE /api/workouts/:id              # 24h window
GET    /api/clients/:id/workouts      # Trainer view
```

### Meals
```
POST   /api/meals
GET    /api/meals                     # Own history
GET/PUT/DELETE /api/meals/:id         # 24h window
GET    /api/clients/:id/meals         # Trainer view
```

### Body Measurements
```
POST   /api/measurements              # Athlete only
GET    /api/measurements              # Own (paginated)
GET    /api/measurements/latest
GET/PUT/DELETE /api/measurements/:id  # 24h window
GET    /api/clients/:username/measurements
```

### Relationships
```
POST   /api/relationships/invite      # Generate code
POST   /api/relationships/accept      # Accept with code
DELETE /api/relationships/:id         # Terminate
GET    /api/relationships/my-clients, /my-trainer, /client/:id, /client/:id/stats
```

### Comments
```
POST   /api/comments
GET    /api/comments?targetId=&targetType=
PUT/DELETE /api/comments/:id
```

### Trainer Catalog
```
GET    /api/trainers                  # Search/browse (public)
GET    /api/trainers/:id              # Profile + reviews
PUT    /api/trainers/me/profile
GET/PUT/DELETE /api/trainers/me/availability
GET    /api/trainers/:id/availability # Public
POST/GET /api/trainers/:id/reviews
PUT/DELETE /api/reviews/:id
```

### Coaching Requests
```
POST   /api/coaching-requests
GET    /api/coaching-requests/my, /pending
PUT    /api/coaching-requests/:id/accept, /reject
```

### Exercise Catalog
```
GET    /api/exercises                 # With filters
GET    /api/exercises/:id
POST/PUT/DELETE /api/exercises/:id    # Admin only
GET    /api/equipment, /api/muscle-groups
```

### Workout Plans
```
POST   /api/workout-plans             # Trainer only
GET    /api/workout-plans             # Own plans (trainer) / assigned (athlete)
GET/PUT/DELETE /api/workout-plans/:id
POST   /api/workout-plans/:id/assign
DELETE /api/workout-plans/:id/assign/:assignmentId
GET    /api/workout-plans/my-assignments
```

### Swagger
```
GET    /swagger/*any                  # Swagger UI
```

## Database Schema

```
PostgreSQL "gymtrack" → public schema:
├── users (id SERIAL PK, email, password, role, profile JSONB)
├── relationships (id, trainer_id, athlete_id, status)
├── workouts (id, athlete_id, date, exercises JSONB)
├── meals (id, athlete_id, date, meal_type, items JSONB)
├── body_measurements (id, athlete_id, date, weight, body_fat_pct, parts JSONB, notes)
├── comments (id, target_type, target_id, author_id, content, parent_comment_id)
├── invitations (id, trainer_id, code, status, expires_at)
├── exercises (id, name, muscle_group_id, equipment_id, description)
├── equipment (id, name, description)
├── muscle_groups (id, name)
├── coaching_requests (id, athlete_id, trainer_id, message, status)
├── trainer_availabilities (id, trainer_id, day_of_week, start_time, end_time)
├── trainer_reviews (id, trainer_id, athlete_id, rating, comment)
├── workout_plans (id, trainer_id, name, description, exercises JSONB)
└── workout_plan_assignments (id, plan_id, athlete_id, start_date, end_date)
```

**JSONB columns**: `workouts.exercises`, `meals.items`, `body_measurements.parts`, `workout_plans.exercises` — stored as untyped `[]byte` in Go.

**Schema management**: `migrations/001_initial_schema.{up,down}.sql` — run via `go run ./cmd/migrate`

## Configuration

### Backend (`backend/.env`)
```
POSTGRES_DSN=postgres://postgres:password@localhost:5432/gymtrack?sslmode=disable
JWT_SECRET=<≥32 characters>
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

### CORS
Backend allows: `localhost:3000`, `127.0.0.1:3000`, `localhost:3001`, `127.0.0.1:3001` with credentials.

## Development Commands

```bash
# Backend
cd backend && go run cmd/server/main.go          # Start on :8080
cd backend && go test ./...                        # Run tests
cd backend && go test ./internal/repository/postgres/...  # PostgreSQL tests (needs POSTGRES_TEST_DSN)

# Frontend
cd frontend && pnpm dev                           # Start on :3000
cd frontend && pnpm test                          # Vitest watch
cd frontend && pnpm test:run                      # Vitest single run
cd frontend && pnpm test:e2e                      # Playwright E2E

# Database
cd backend && go run cmd/migrate/main.go          # Run migrations
cd backend && go run cmd/ensure-schema/main.go    # Verify schema

# i18n
cd frontend && pnpm validate:i18n                 # Check translation coverage

# Swagger
cd backend && swag init -g cmd/server/main.go -o docs/
```

## Naming Conventions

| Aspect | Convention | Example |
|--------|-----------|---------|
| Go files | snake_case | `auth_handler.go` |
| Go types | PascalCase | `Workout`, `MealType` |
| TS files | kebab-case | `workout-form.tsx` |
| TS types | PascalCase | `Workout`, `CreateWorkoutRequest` |
| API endpoints | kebab-case | `/api/auth/login` |
| DB tables | snake_case | `body_measurements` |
| DB columns | camelCase in JSON | `workoutId` |
| Translation keys | dot notation | `athlete.measurements.date.label` |

## Key Files Reference

- `backend/internal/app/module.go` — DI composition root (all providers/invokes)
- `backend/internal/domain/errors/errors.go` — Sentinel error types
- `backend/internal/utils/clock.go` — Clock interface for testable time
- `frontend/src/proxy.ts` — Auth guard + i18n middleware (read before touching auth)
- `frontend/src/lib/session.ts` — Server-only session encryption helpers
- `frontend/src/lib/token-service.ts` — JWT token management (in-memory)
- `frontend/src/stores/authStore.ts` — Zustand auth state
- `frontend/src/lib/api/api-client.ts` — Centralized API request wrapper
