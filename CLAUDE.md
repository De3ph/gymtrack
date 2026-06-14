# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Previous resources
Use AGENTS.md, ARCHITECTURE.md, CODE_STYLE.md, PHASES.MD and context-map.md to understand the project structure, coding standards, and development phases.

**Note**: For comprehensive project documentation including technology stack, architecture, database schema, API endpoints, and development workflow, please refer to **[context-map.md](context-map.md)**.

## Common Commands
- **Development**: `pnpm dev` – start Next.js dev server.
- **Build**: `pnpm build` – compile production build.
- **Start**: `pnpm start` – run compiled app.
- **Lint**: `pnpm lint` – run ESLint.
- **Unit Tests**: `pnpm test` – run Vitest suite.
- **Watch Tests**: `pnpm test:run` – watch mode.
- **UI Test Runner**: `pnpm test:ui` – Vitest UI.
- **E2E Tests**: `pnpm test:e2e` – Playwright suite.
- **Single Test**: `pnpm test -- <path/to/test.file>`

## Architecture Overview
- **Framework**: Next.js 16 (app router) with TypeScript.
- **State Management**: Zustand store + React Context for providers.
- **Data Fetching**: @tanstack/react-query v5 handles server state, caching, invalidation.
- **UI**: Base UI + Radix UI primitives (button, dialog, card, input, textarea, badge, calendar, tabs, alert-dialog, chart, combobox, empty, field, input-group, separator) built with Tailwind CSS v4.
- **Feature Modules**: Components under `src/components/features/*` grouped by domain (athlete, trainer, workout, meal, comments, reviews, coaching, exercise).
- **Pages**: Routes defined in `src/app` using nested folders; auth routes under `(auth)`, dashboard under `(dashboard)` with route groups for athlete/trainer.
- **Testing**: Unit tests in `src/test/*` using Vitest + React Testing Library. E2E tests via Playwright.
- **Styling**: Tailwind CSS v4 with `tw-animate-css` for animations.
- **Form handling**: TanStack React Form + Zod for validation.
- **API Layer**: Centralized API client in `src/lib/api/` with typed domain modules (authApi, userApi, workoutApi, mealApi, commentApi, relationshipApi, trainerClientApi, trainerCatalogApi, availabilityApi, reviewApi, coachingRequestApi, exerciseApi).

## Important Configurations
- **Tailwind**: Configured for v4 with CSS-based configuration in `src/app/globals.css`.
- **ESLint**: Extends `eslint-config-next` and React plugin; runs with `pnpm lint`.
- **Playwright**: Config in `playwright.config.ts` for E2E tests.
- **Vitest**: Config in `vitest.config.ts` includes `test` field.
- **Backend**: Go 1.24+ with Gin framework, Couchbase database, Swagger documentation at `/swagger/*`.

## Cursor / Copilot Rules
- No specific `.cursor` or `.github/copilot-instructions.md` files detected.

## README Highlights
- See `context-map.md` for comprehensive project documentation including architecture, API endpoints, and data flow.
- Backend runs on port 8080, frontend on port 3000.
- Backend uses Couchbase with collections: users, workouts, meals, relationships, comments, invitations, exercises, equipment, muscle_groups, coaching_requests.
