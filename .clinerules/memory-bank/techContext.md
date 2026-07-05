# Tech Context: GymTrack

## Technologies Used

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js (App Router) | 16.2.4 | React framework with file-based routing |
| TypeScript | 5.9.3 | Type-safe JavaScript |
| React | 19.2.3 | UI library |
| Tailwind CSS | v4.2.4 | Utility-first CSS (CSS-based config, no tailwind.config.ts) |
| TanStack React Query | v5.99.2 | Server state management (5min staleTime, 10min gcTime, retry:1) |
| Zustand | v5.0.12 | Client state (auth only) |
| TanStack React Form | v1.29.1 | Form management |
| Zod | v4.3.6 | Schema validation |
| next-intl | v4.x | Internationalization (en, tr) |
| Base UI | v1.4.1 | UI component primitives |
| Radix UI | v1.4.3 | Accessible UI primitives |
| Motion | v12.38.0 | Animations (framer-motion successor) |
| Recharts | v3.8.0 | Charts for body measurements |
| Lucide React | — | Icon library |
| dayjs | v1.11.20 | Date manipulation |
| date-fns | v4.1.0 | Date utilities |
| react-day-picker | — | Calendar component |
| Vitest | — | Unit testing |
| Playwright | — | E2E testing |
| MSW | — | API mocking for tests |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Go | 1.24.0 | Backend language |
| Gin | v1.11.0 | HTTP framework |
| gocb/v2 | v2.11.2 | Couchbase driver |
| golang-jwt/jwt/v5 | v5.3.1 | JWT token handling |
| golang.org/x/crypto | — | bcrypt password hashing |
| go-playground/validator | v10 | Request validation |
| google/uuid | — | UUID generation |
| joho/godotenv | — | .env file loading |
| gin-contrib/cors | — | CORS middleware |
| swaggo/swag | — | Swagger doc generation |
| swaggo/gin-swagger | — | Swagger UI middleware |
| stretchr/testify | — | Testing assertions |

### Database
| Technology | Version | Purpose |
|------------|---------|---------|
| Couchbase Server | — | Document database |
| gocb/v2 | v2.11.2 | Go SDK |

## Development Setup

### Prerequisites
- Go 1.24+
- Node.js (for pnpm)
- pnpm 9.12.3
- Couchbase Server running locally
- Docker (optional, for Couchbase via docker-compose.yml)

### Environment Variables

**Backend (`backend/.env`):**
```
COUCHBASE_CONNECTION_STRING=couchbase://localhost
COUCHBASE_USERNAME=Administrator
COUCHBASE_PASSWORD=password
COUCHBASE_BUCKET=gymtrack
JWT_SECRET=<must-be-32-characters-or-more>
```

**Frontend (`frontend/.env.local`):**
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

### Running Locally
```bash
# Backend (port 8080)
cd backend && go run cmd/server/main.go

# Frontend (port 3000)
cd frontend && pnpm dev
```

### Testing
```bash
# Backend
cd backend && go test ./...

# Frontend unit tests
cd frontend && pnpm test:run

# Frontend E2E
cd frontend && pnpm test:e2e
```

## Technical Constraints

### Backend
- **Go Version**: 1.24.0
- **Database**: Couchbase Server only (no SQL databases)
- **Auth**: JWT-based only (no session-based auth)
- **API**: REST only (no GraphQL)
- **CORS**: Restricted to localhost:3000/3001 in development
- **Token Expiration**: Access tokens expire, refresh tokens required
- **Edit Window**: Workouts/meals/measurements editable only within 24 hours
- **Relationships**: Athletes limited to one active trainer
- **Comments**: Max 2000 characters per comment
- **Reviews**: Rating must be 1-5, only after active relationship

### Frontend
- **Framework**: Next.js 16 (App Router only, no Pages Router)
- **Language**: TypeScript only (no JavaScript)
- **Styling**: Tailwind CSS v4 only (no CSS modules, no styled-components)
- **UI Components**: Base UI + Radix UI only (no other UI libraries)
- **State Management**: React Query (server) + Zustand (client) only
- **Forms**: TanStack React Form + Zod only
- **Icons**: Lucide React only
- **Charts**: Recharts only
- **Date Handling**: dayjs + date-fns only
- **Package Manager**: pnpm only
- **Browser Support**: Modern browsers (ES2020+)

## Dependencies

### Backend (direct)
```
github.com/couchbase/gocb/v2          — Couchbase driver
github.com/gin-gonic/gin              — HTTP framework
github.com/gin-contrib/cors           — CORS middleware
github.com/go-playground/validator/v10 — Validation
github.com/google/uuid                — UUID generation
github.com/joho/godotenv              — Env loading
github.com/golang-jwt/jwt/v5          — JWT handling
github.com/stretchr/testify           — Testing
github.com/swaggo/swag                — Swagger generation
github.com/swaggo/gin-swagger         — Swagger middleware
github.com/swaggo/files               — Swagger file server
golang.org/x/crypto/bcrypt            — Password hashing
```

### Frontend (key)
```
next                                  — React framework
react / react-dom                     — UI library
next-intl                             — i18n
@tanstack/react-query                 — Server state
@tanstack/react-form                  — Forms
zustand                               — Client state
zod                                   — Validation
@base-ui/react                        — UI primitives
radix-ui/*                            — Accessible primitives
motion                                — Animations
recharts                              — Charts
lucide-react                          — Icons
dayjs / date-fns                      — Dates
react-day-picker                      — Calendar
@playwright/test                      — E2E testing
vitest                                — Unit testing
msw                                   — API mocking
@testing-library/react                — Component testing
```

## Tool Usage Patterns

### Backend Patterns
- **Handler → Service → Repository**: Handlers parse requests, services contain business logic, repositories do data access
- **Constructor injection**: All dependencies wired explicitly in `main.go`
- **Testable time**: `utils.Clock` interface with `RealClock` implementation, passed via constructor
- **Error handling**: Sentinel errors in `internal/domain/errors/`, checked with `errors.Is()`
- **Document IDs**: `{type}::{uuid}` pattern (e.g., `workout::abc-123`)
- **N1QL queries**: Used for filtered/list operations alongside key-value document ops

### Frontend Patterns
- **API client**: Centralized `lib/api/index.ts` with typed domain modules
- **React Query**: Inline queries in page components, cache invalidation on mutations
- **Zustand**: Auth state only, initialized on page refresh via `initializeAuth()`
- **TanStack Form + Zod**: All forms use this combination
- **Route groups**: `(auth)` and `(dashboard)` for layout separation
- **i18n**: `useTranslations()` hook, flat JSON files, `[locale]` route prefix
- **Theme**: Dark/light toggle via CSS variables in Tailwind