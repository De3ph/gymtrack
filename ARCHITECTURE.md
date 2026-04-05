# ARCHITECTURE.md

## Overview

GymTrack is a full-stack fitness tracking platform connecting personal trainers with athletes. Athletes log workouts and meals; trainers monitor progress, provide feedback via comments, and manage client relationships. The system also includes a trainer catalog where athletes can browse and request coaching.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | Next.js 16 (App Router) |
| **Frontend Language** | TypeScript 5.9, React 19 |
| **Styling** | Tailwind CSS v4, ShadCN UI (New York style) |
| **State Management** | TanStack React Query v5 (server), Zustand v5 (client) |
| **Forms/Validation** | React Hook Form + Zod v4 |
| **Date Handling** | dayjs, date-fns |
| **Charts** | Recharts v3 |
| **Testing** | Vitest (unit), Playwright (E2E), MSW (mocking) |
| **Package Manager** | pnpm |
| **Backend Language** | Go 1.24 |
| **Backend Framework** | Gin v1.11 |
| **Database** | Couchbase Server (gocb/v2) |
| **Auth** | JWT (golang-jwt/v5) |
| **Validation** | go-playground/validator/v10 |
| **API Docs** | Swagger (swaggo/gin-swagger) |
| **CORS** | gin-contrib/cors |

## Directory Structure

```
gymtrack/
├── backend/                    # Go REST API
│   ├── cmd/server/             # Entry point (main.go)
│   ├── internal/
│   │   ├── api/
│   │   │   ├── handlers/       # HTTP handlers (12 files)
│   │   │   ├── middleware/     # JWT auth middleware
│   │   │   └── routes/         # Route definitions (8 files)
│   │   ├── config/             # Env loading, Couchbase connection, collection setup
│   │   └── domain/
│   │       ├── models/         # Data structures (10 files)
│   │       ├── repositories/   # Couchbase data access (9 files)
│   │       └── services/       # Business logic (7 files)
│   ├── docs/                   # Swagger-generated docs
│   ├── tests/                  # Integration tests
│   ├── go.mod
│   └── .env                    # Couchbase + JWT config
│
├── frontend/                   # Next.js App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/         # Login, register routes
│   │   │   ├── (dashboard)/    # Role-based dashboards
│   │   │   │   ├── athlete/    # Workouts, meals, trainer views
│   │   │   │   └── trainer/    # Clients, profile, requests
│   │   │   ├── layout.tsx      # Root layout
│   │   │   └── providers.tsx   # React Query provider
│   │   ├── components/
│   │   │   ├── ui/             # ShadCN primitives (9 components)
│   │   │   └── features/       # Feature-specific components
│   │   │       ├── athlete/    # Athlete-specific UI
│   │   │       ├── coaching/   # Coaching request UI
│   │   │       ├── comments/   # Comment/thread UI
│   │   │       ├── meal/       # Meal logging UI
│   │   │       ├── reviews/    # Review UI
│   │   │       ├── trainer/    # Trainer catalog UI
│   │   │       └── workout/    # Workout logging UI
│   │   ├── lib/
│   │   │   ├── api.ts          # API client (fetch wrapper)
│   │   │   ├── api-types.ts    # API response types
│   │   │   ├── token-service.ts# JWT token management
│   │   │   ├── error-handler.ts# Error handling utilities
│   │   │   ├── constants.ts    # App constants
│   │   │   ├── performance.ts  # Performance utilities
│   │   │   ├── utils.ts        # cn() helper (clsx + tailwind-merge)
│   │   │   └── validations/    # Zod schemas (auth, workout, meal, comment)
│   │   ├── stores/             # Zustand stores (authStore)
│   │   ├── types/              # Shared TypeScript types
│   │   ├── test/               # Test setup, mocks (MSW)
│   │   └── e2e/                # Playwright E2E tests
│   ├── components.json         # ShadCN config
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   └── eslint.config.mjs
│
├── PHASES.md                   # Development phase tracker
├── AGENTS.md                   # AI agent instructions
└── .gitignore
```

## Core Components

### Backend (Go)

| Component | Responsibility | Key Files |
|---|---|---|
| **Config** | Env loading, Couchbase connection, collection/index creation | `internal/config/` |
| **Models** | Domain structs with JSON tags and validator annotations | `internal/domain/models/` |
| **Repositories** | Couchbase CRUD operations per entity | `internal/domain/repositories/` |
| **Services** | Business logic, cross-entity operations | `internal/domain/services/` |
| **Handlers** | HTTP request/response, validation, service delegation | `internal/api/handlers/` |
| **Middleware** | JWT parsing, role extraction, request context | `internal/api/middleware/` |
| **Routes** | Route registration, handler wiring | `internal/api/routes/` |

### Frontend (Next.js)

| Component | Responsibility | Key Files |
|---|---|---|
| **App Router** | File-based routing with route groups `(auth)`, `(dashboard)` | `src/app/` |
| **API Client** | Typed fetch wrapper with auth headers, timeout support | `src/lib/api.ts` |
| **Auth Store** | Zustand store for login/logout/token refresh/init | `src/stores/authStore.ts` |
| **Providers** | React Query client with 5min stale time | `src/app/providers.tsx` |
| **Validations** | Zod schemas for form validation | `src/lib/validations/` |
| **Types** | Shared TypeScript interfaces | `src/types/index.ts` |
| **UI Components** | ShadCN primitives + feature components | `src/components/` |

## Data Flow

### Request Flow (Frontend → Backend → Database)

```
User Action
  → React Component (uses React Query mutation)
    → API Client (src/lib/api.ts) adds JWT from TokenService
      → Gin Router (backend, :8080/api/...)
        → JWT Middleware validates token, sets userID/userRole in context
          → Handler validates input with go-playground/validator
            → Service executes business logic
              → Repository performs Couchbase N1QL/doc operations
                → Response flows back up the chain
```

### Authentication Flow

1. User submits login form → `authApi.login()` → `POST /api/auth/login`
2. Backend validates credentials, returns `{ accessToken, refreshToken, user }`
3. Frontend stores both tokens via `TokenService.setTokens()` (localStorage)
4. Zustand `authStore` sets `isAuthenticated = true`
5. Subsequent API calls include `Authorization: Bearer <accessToken>` header
6. On 401, `authStore.handleAuthError()` clears tokens and redirects to `/login`

### Couchbase Data Model

Documents are organized into collections within the `_default` scope of the `gymtrack` bucket:

| Collection | Purpose | Key Indexes |
|---|---|---|
| `users` | User accounts + trainer profiles | email, role |
| `relationships` | Trainer-athlete links | trainerId, athleteId, status |
| `workouts` | Workout entries | athleteId, date, composite |
| `meals` | Meal entries | athleteId, date, mealType |
| `comments` | Threaded comments | targetId+targetType, authorId, parentCommentId |
| `invitations` | Trainer invite codes | code, trainerId, status |

## External Integrations

| Integration | Purpose | Config |
|---|---|---|
| **Couchbase Server** | Primary data store (document database) | `COUCHBASE_CONNECTION_STRING`, `COUCHBASE_USERNAME`, `COUCHBASE_PASSWORD` |
| **Swagger UI** | API documentation at `/swagger/*any` | Auto-generated via swaggo |

## Configuration

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `COUCHBASE_CONNECTION_STRING` | No | `couchbase://localhost` | Couchbase cluster address |
| `COUCHBASE_USERNAME` | No | `Administrator` | DB username |
| `COUCHBASE_PASSWORD` | No | `password` | DB password |
| `COUCHBASE_BUCKET` | No | `gymtrack` | Bucket name |
| `JWT_SECRET` | **Yes** | — | Must be ≥32 characters |

### Frontend

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080/api` | Backend API base URL |

## Build & Deploy

### Development

```bash
# Backend
cd backend && go run cmd/server/main.go    # Starts on :8080

# Frontend
cd frontend && pnpm dev                     # Starts on :3000
```

### Testing

```bash
cd frontend
pnpm test:run       # Vitest unit tests
pnpm test:e2e       # Playwright E2E tests

cd backend
go test ./...       # Go unit/integration tests
```

### Build

```bash
cd frontend && pnpm build    # Next.js production build
cd backend && go build ./cmd/server  # Go binary
```

### CORS

Backend restricts origins to `localhost:3000`, `127.0.0.1:3000`, `localhost:3001`, `127.0.0.1:3001`.

## Development Phases

| Phase | Status | Features |
|---|---|---|
| 1: Setup & Auth | ✅ Complete | Next.js + Go init, Couchbase, JWT auth |
| 2: Core Athlete | ✅ Complete | Workout logging, meal logging, history views |
| 3: Trainer Features | ✅ Complete | Relationship system, dashboard, client views |
| 4: Communication | ✅ Complete | Comment system, threaded UI |
| 5: Trainer Improvements | ✅ Complete | Catalog, profiles, availability, reviews |
| 6: Polish & Optimization | In Progress | UI/UX, loading states, caching, error handling |
