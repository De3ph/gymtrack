# Active Context: GymTrack

## Current Work Focus

The project is in **Phase 6: Polish & Optimization** with the **Body Measurement feature currently in progress**. The body measurement system has backend CRUD complete (handler, service, repository, model) and frontend components created (BodyMeasurementForm, BodyMeasurementList, BodyMeasurementCharts, Edit/Delete dialogs), and the measurements page is fully wired with tabs (log/list/charts), latest measurement card, and filter support.

## Recent Changes
- Complete implementation of body measurement backend (handler, service, repository, model, routes) with 24h edit window and trainer access via relationship validation
- Frontend body measurement components created in `src/components/features/body-measurement/` (5 components)
- Trainer client detail page now includes measurements tab alongside workouts, meals, progress, and plans
- Dual view pattern (charts + list) implemented for body measurements
- i18n keys for `athlete.measurements` namespace added to translation files

## Current Active Decisions

### Body Measurement Feature Status
- **Backend**: ✅ Complete — all CRUD endpoints working with 24h edit window, relationship checks for trainer access
- **Frontend Components**: ✅ Complete — BodyMeasurementForm, BodyMeasurementList, BodyMeasurementCharts, Edit/Delete dialogs
- **Frontend Page (measurements/page.tsx)**: ✅ Complete — fully wired with tabs (log/list/charts), latest measurement card, and filter support
- **i18n Keys**: ✅ Complete — `athlete.measurements` namespace with all required keys in both en.json and tr.json

### Known Gaps (from context-map.md)
1. **Loading states** — Basic "Loading..." text used everywhere, no skeleton loaders
2. **Error boundaries** — No React error boundaries implemented
3. **Query caching** — TanStack Query staleTime set to 5min but no prefetching
4. **Error handling** — Inconsistent error UI across pages
5. **Real-time updates** — No WebSocket/polling for live updates
6. **Optimistic updates** — No optimistic mutations in React Query
7. **Mobile responsiveness** — Tailwind classes present but mobile UX untested
8. **Notification system** — No push/in-app notifications for new comments
9. **Backend tests** — Service/handler tests broken or outdated, need rewrite
10. **E2E tests** — Missing for body measurement and other newer features

### Open TODOs (from TODOs.md)
- Login/register form error display
- Auto-scroll to bottom when adding sets/exercises in forms
- Improved athlete main page with common calendar and trainer info
- Daily nutrition totals
- DataDog integration
- Communication method for trainer-athlete

## Next Steps

1. **Fix backend tests** — Rewrite broken/outdated service and handler tests
2. **Add E2E tests** — Cover body measurement and other newer features
3. **Loading states** — Replace "Loading..." text with skeleton loaders
4. **Error boundaries** — Add React error boundaries
5. **Address open TODOs** — Login/register error display, auto-scroll, athlete main page improvements

## Important Patterns and Preferences

### Code Style
- Go backend follows Clean Architecture with layered separation
- TypeScript frontend uses App Router with route groups
- All forms use TanStack React Form + Zod validation
- All server state via TanStack React Query; client state via Zustand (auth only)
- API calls centralized in `src/lib/api/` with typed domain modules
- i18n via next-intl with flat JSON files in `messages/{en,tr}.json`

### Testing Preferences
- Vitest for unit/component tests with React Testing Library
- MSW for API mocking
- Playwright for E2E tests
- Backend tests use testify + testutils mocks (currently broken/outdated)

### Key Constraints
- Couchbase is the only database (no SQL)
- JWT-based auth only (no sessions)
- 24-hour edit window for workouts, meals, body measurements
- Athletes limited to one active trainer
- pnpm is the only package manager (no npm/yarn)
- Tailwind CSS v4 only (no CSS modules, styled-components)

## Learnings and Project Insights
- The project started as a monorepo with no monorepo tooling — two independent projects
- Types are duplicated between frontend/backend intentionally (no shared code-gen)
- Backend uses N1QL queries for filtered/list operations, document KV ops for single-document CRUD
- Document ID pattern `{type}::{uuid}` is consistent across all collections
- Couchbase collections are auto-provisioned on startup via `InitializeCollections()`
- Backend has no hot-reload — requires manual restart after edits
- Frontend dev server uses `next dev --webpack` (not turbopack)