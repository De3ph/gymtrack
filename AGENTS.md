<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `frontend/node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

# GymTrack — monorepo at a glance

Two independent projects, no native monorepo tooling. No root `package.json`.

| Part | Tech | Directory | Start |
|---|---|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript | `frontend/` | `cd frontend && pnpm dev` (port 3000) |
| Backend | Go 1.24 + Gin + Couchbase | `backend/` | `cd backend && go run cmd/server/main.go` (port 8080) |

## How they connect

- **Frontend API calls** → Go backend at `http://localhost:8080/api` (set via `NEXT_PUBLIC_API_URL` in `frontend/.env.local`)
- **Auth**: JWT tokens stored in-memory on the client, persisted via HttpOnly session cookie. Backend validates the JWT; frontend recovers tokens on refresh via `GET /api/auth/session` (Next.js route handler → Go backend).
- **CORS** is preconfigured on the backend for localhost:3000 and localhost:3001.
- **No shared types or code-gen** between frontend/backend — types are duplicated manually in `frontend/src/types/` and `backend/internal/domain/models/`.

## Key files

- `frontend/AGENTS.md` — frontend-specific commands, quirks, i18n, component patterns
- `backend/AGENTS.md` — backend-specific commands, Couchbase, layered architecture
- `frontend/src/proxy.ts` — auth guard + i18n middleware in one (read before touching auth/per-route protection)
- `frontend/src/lib/session.ts` — `server-only` session encryption helpers
