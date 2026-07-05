# Progress: GymTrack

## What Works

### Phase 1: Setup & Authentication ✅ Complete
- [x] Next.js 16 App Router + TypeScript project setup
- [x] Go 1.24 + Gin backend project setup
- [x] Couchbase connection with auto-provisioning (12 collections + indexes)
- [x] JWT authentication (access + refresh token pattern)
- [x] User registration with role selection (athlete/trainer)
- [x] Login/logout with HttpOnly session cookie persistence
- [x] Auth middleware (Bearer token validation, role extraction)
- [x] CORS configuration (localhost:3000/3001)
- [x] Swagger UI documentation at `/swagger/*`
- [x] Frontend auth store (Zustand) + token service
- [x] i18n middleware + auth guard in proxy.ts

### Phase 2: Core Athlete Features ✅ Complete
- [x] Workout CRUD (handler, service, repository, model)
- [x] Workout 24-hour edit window enforcement
- [x] Workout logging with predefined exercises, sets, reps, weights, rest times
- [x] Workout history with calendar + list dual view
- [x] Meal CRUD (handler, service, repository, model)
- [x] Meal 24-hour edit window enforcement
- [x] Meal logging with food items, portion sizes, nutritional info
- [x] Meal history with calendar + list dual view
- [x] Exercise catalog CRUD (admin only)
- [x] Equipment and muscle group reference data

### Phase 3: Trainer Features ✅ Complete
- [x] Trainer-atlete relationship system
- [x] Code-based invitation system (generate + accept)
- [x] Athlete limited to one active trainer constraint
- [x] Trainer dashboard with client list
- [x] Client detail view with tabs (overview, workouts, meals, progress, plans)
- [x] Client statistics endpoint
- [x] Pagination in client's workouts and meals sections

### Phase 4: Communication ✅ Complete
- [x] Threaded comment system on workouts and meals
- [x] Comment CRUD (handler, service, repository, model)
- [x] Trainer-atlete relationship validation for comments
- [x] 2000 character max length enforcement
- [x] CommentThread + CommentForm frontend components

### Phase 5: Trainer Improvements ✅ Complete
- [x] Trainer catalog (search/browse with filters)
- [x] Trainer profile management (bio, photo, hourly rate, availability)
- [x] Weekly recurring availability slots (dayOfWeek, startTime, endTime)
- [x] Coaching request lifecycle (send, accept, reject)
- [x] Review and rating system (1-5, after active relationship ends)
- [x] Public trainer profile pages with reviews

### Phase 6: Polish & Optimization ✅ Complete
- [x] i18n support (English + Turkish) via next-intl
- [x] Dark/light theme toggle
- [x] Language toggle
- [x] UI migration to Base UI + Radix UI (shadcn/ui)
- [x] Consistent color scheme and design
- [x] Loading states and spinners
- [x] Type-safe translations with Zod schema validation
- [x] `pnpm validate:i18n` script for translation coverage checks

### Body Measurement Feature 🔄 In Progress
- [x] Backend model (`body_measurement.go`) with flexible parts map
- [x] Backend repository (`body_measurement_repository.go`)
- [x] Backend service (`body_measurement_service.go`) with 24h edit window + relationship checks
- [x] Backend handler (`body_measurement_handler.go`) with all CRUD endpoints
- [x] Backend routes (`measurement_routes.go`)
- [x] Frontend API module (`bodyMeasurementApi.ts`)
- [x] Frontend Zod validation schema (`bodyMeasurement.ts`)
- [x] Frontend components: BodyMeasurementForm, BodyMeasurementList, BodyMeasurementCharts, Edit/Delete dialogs
- [x] Frontend page (`measurements/page.tsx`) with tabs (log/list/charts), latest card, filter support
- [x] i18n keys for `athlete.measurements` namespace
- [x] Trainer client detail page includes measurements tab

## What's Left to Build

### High Priority
- [ ] Backend service/handler tests — most are broken or outdated, need rewrite
- [ ] E2E tests for body measurement and other newer features
- [ ] Login/register form error display

### Medium Priority
- [ ] Loading states — Replace "Loading..." text with skeleton loaders
- [ ] Error boundaries — Add React error boundaries
- [ ] Auto-scroll to bottom when adding sets/exercises in forms
- [ ] Query caching — Add prefetching patterns

### Lower Priority
- [ ] Improved athlete main page with common calendar and trainer info
- [ ] Daily nutrition totals
- [ ] Real-time updates (WebSocket/polling)
- [ ] Optimistic updates in React Query mutations
- [ ] Notification system for new comments
- [ ] Mobile responsiveness testing and polish
- [ ] DataDog integration
- [ ] Communication method for trainer-athlete
- [ ] Inconsistent error UI across pages

## Current Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Setup & Auth | ✅ Complete | Foundation complete |
| Phase 2: Core Athlete | ✅ Complete | Workout + meal logging |
| Phase 3: Trainer Features | ✅ Complete | Relationships, dashboard, client views |
| Phase 4: Communication | ✅ Complete | Threaded comments |
| Phase 5: Trainer Improvements | ✅ Complete | Catalog, reviews, coaching |
| Phase 6: Polish & Optimization | ✅ Complete | i18n, theme, UI polish |
| Body Measurement (interleaved) | ✅ Complete | All backend + frontend done |
| Testing & Quality | 🔄 In Progress | Backend tests need rewrite, E2E missing |

## Known Issues

1. **Backend tests broken** — Service and handler tests were written against older code and no longer compile/pass
2. **No frontend E2E tests** — Playwright tests missing for body measurement and Phase 5 features
3. **No skeleton loaders** — All loading states use basic "Loading..." text
4. **No error boundaries** — Unhandled React errors crash the page
5. **Form error display** — Login/register forms don't show server-side errors to the user
6. **No auto-scroll** — Adding new sets/exercises doesn't scroll the form to the bottom
7. **Athlete main page sparse** — No calendar overview or trainer info on the landing page

## Evolution of Project Decisions

- **Start (Phase 1)**: Separate frontend/backend projects with no monorepo tooling — intentionally loose coupling
- **DB choice**: Couchbase over PostgreSQL for flexible schema (later a PostgreSQL migration plan was created in `plans/couchbase_to_postgresql_migration_blueprint.md`)
- **Auth**: JWT access + refresh tokens with HttpOnly session cookie for persistence (initially considered full localStorage)
- **UI**: Migrated from Radix UI to Base UI + Radix UI hybrid (shadcn/ui) in Phase 5
- **i18n**: Adopted next-intl with flat JSON files in Phase 6 (late addition to the project)
- **Forms**: Migrated from React Hook Form to TanStack React Form in later phase
- **Body measurement**: Added as an interleaved feature after Phase 6, reusing the same patterns as workout/meal CRUD