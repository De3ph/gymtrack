# GymTrack Frontend — Next.js 16

## Commands (all run from `frontend/`)

| Command | Action |
|---|---|
| `pnpm dev` | Dev server (`next dev --webpack`, **not** turbopack) |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint (extends `eslint-config-next` core-web-vitals + TypeScript) |
| `pnpm test` | Vitest watch mode |
| `pnpm test:run` | Vitest single run |
| `pnpm test:ui` | Vitest UI dashboard |
| `pnpm test:e2e` | Playwright (tests in `src/e2e/`) |
| `pnpm test:e2e:ui` | Playwright UI mode |
| `pnpm validate:i18n` | Run `scripts/validate-translations.ts` to check i18n coverage |
| `pnpm test -- src/test/some.test.ts` | Single Vitest file |

## Package manager

**pnpm 9.12.3** — do NOT use npm or yarn. Lockfile is `pnpm-lock.yaml`.

## Architecture

- **Framework**: Next.js 16 App Router with TypeScript (strict mode in tsconfig).
- **Path alias**: `@/` → `src/` (configured in tsconfig and vitest config).
- **i18n**: `next-intl` with `[locale]` route group. Locales: `en` (default), `tr`. `localePrefix: 'as-needed'` means root path `/` works without locale prefix.
  - Messages stored in `messages/{en,tr}.json`.
  - Routing wrappers in `src/i18n/routing.ts` (config) and `src/i18n/navigation.ts` (Link, redirect, etc.).
  - Test setup mocks next-intl — translations return the last key segment.
- **Auth**: JWT tokens live in-memory (`TokenService` singleton in `src/lib/token-service.ts`). HttpOnly session cookie persists across refreshes. Flow:
  1. Login → tokens stored in memory, session cookie set via `POST /api/auth/session`.
  2. Page refresh → `authStore.initializeAuth()` calls `GET /api/auth/session` to recover access token, then fetches user from Go backend.
  3. Logout → `DELETE /api/auth/session` + clear in-memory tokens.
  4. Token refresh → `authStore.refreshAccessToken()`.
- **Middleware**: `src/proxy.ts` combines next-intl i18n middleware + auth guard. It strips locale prefix before checking public routes. **Read this before adding auth-gated routes.**
- **State**: React Query v5 for server state (5 min staleTime, 10 min gcTime, retry: 1). Zustand for client-only state (`authStore`). TanStack Query client is stored on `window.__TANSTACK_QUERY_CLIENT__` for auth-error clearing.
- **API layer**: Centralized in `src/lib/api/`. Each domain has its own module (`authApi`, `workoutApi`, etc.). All use the shared `api-client.ts` which auto-attaches the Bearer token and targets `http://localhost:8080/api`. Error responses return `{ error: "..." }`.

## UI & styling

- **Tailwind CSS v4** with CSS-based configuration in `src/app/globals.css`. Use `@tailwindcss/postcss` (v4 PostCSS plugin).
- **shadcn/ui** with `base-vega` style, `lucide` icons. Config in `components.json` — aliases: `@/components/ui`, `@/lib/utils`, `@/hooks`.
- **Component structure**: `src/components/ui/` (38 shadcn primitives), `src/components/features/` (14 domain modules: athlete, trainer, workout, meal, comments, etc.).
- **Animation**: `tw-animate-css` + `motion` (framer-motion successor) via the `motion` npm package.

## Component conventions

- Components in `PascalCase.tsx`, hooks `camelCase.ts`.
- `cn()` utility from `@/lib/utils` (clsx + tailwind-merge).
- Form validation uses Zod schemas in `src/lib/validations/`.
- Route constants in `src/lib/routes.ts` (`ROUTES` for static, `DYNAMIC_ROUTES` for parameterized).

## Testing

- **Unit tests**: Vitest + React Testing Library + jsdom. Setup in `src/test/setup.ts`.
- **MSW**: API mocking via `src/test/mocks/server.ts` + `handlers.ts`. Server starts before all tests, resets after each.
- **E2E**: Playwright with config in `playwright.config.ts`. Tests in `src/e2e/`. Supports Chromium, Firefox, WebKit, Mobile Chrome. Auto-starts dev server via `webServer` config.
- When writing Playwright tests, use the `playwright-test-generator` subagent (defined in `frontend/opencode.json`).

## ESLint

Config at `eslint.config.mjs` — uses `eslint-config-next/core-web-vitals` + TypeScript. Ignores `.next/`, `out/`, `build/`, `next-env.d.ts`. Style rules are the standard Next.js defaults — turn off rules you disagree with rather than suppressing with comments.

## Routable pages

All under `src/app/[locale]/`:

```
(auth)/login, /register
(dashboard)/
  athlete/workouts, /meals, /measurements, /trainers, /my-trainer, /requests, /workout-plans
  trainer/clients, /profile, /requests, /workout-plans
  admin/
  profile/
```
