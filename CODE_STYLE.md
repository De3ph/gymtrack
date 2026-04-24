# CODE_STYLE.md

## Architectural Patterns

### Backend: Clean Architecture (Layered)

**Description**: The backend follows a layered architecture separating concerns into distinct layers: Presentation (handlers/routes), Business Logic (services), Data Access (repositories), and Infrastructure (Couchbase). This promotes testability, maintainability, and separation of concerns.

**Implementation Reference**: `backend/cmd/server/main.go` (composition root), `backend/internal/` directory structure

**Key Layers**:
- **Presentation Layer** (`internal/api/`): HTTP handlers, middleware, routes
- **Business Layer** (`internal/domain/services/`): Business logic, cross-entity operations
- **Data Access Layer** (`internal/domain/repositories/`): Couchbase operations abstraction
- **Domain Models** (`internal/domain/models/`): Entity definitions with behavior

### Repository Pattern

**Description**: Each domain entity has a dedicated repository interface that abstracts Couchbase operations. This allows swapping database implementations and enables easier testing.

**Implementation Reference**: `backend/internal/domain/repositories/user_repository.go`, `workout_repository.go`

**Pattern Structure**:
```go
type UserRepository interface {
    Create(user *User) error
    GetByID(id string) (*User, error)
    GetByEmail(email string) (*User, error)
    Update(user *User) error
    Delete(id string) error
}
```

### Service Layer Pattern

**Description**: Business logic is encapsulated in service classes that coordinate multiple repositories and enforce business rules. Handlers delegate to services, keeping handlers thin.

**Implementation Reference**: `backend/internal/domain/services/comment_service.go`, `relationship_service.go`

**Pattern Structure**:
- Constructor takes repository dependencies
- Methods implement business rules (e.g., trainer-athlete relationship verification)
- Cross-entity operations (e.g., comment creation with relationship checks)

### Factory Pattern

**Description**: Domain models use factory functions (`NewWorkout`, `NewUser`) to ensure proper initialization, ID generation, and timestamp setting.

**Implementation Reference**: `backend/internal/domain/models/workout.go`, `user.go`

**Pattern Structure**:
```go
func NewWorkout(athleteID string, date time.Time, exercises []Exercise) *Workout {
    return &Workout{
        WorkoutID: uuid.New().String(),
        AthleteID: athleteID,
        Date: date,
        Exercises: exercises,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }
}
```

### Domain Model Pattern

**Description**: Models contain both data and behavior. Business rules are implemented as methods on models (e.g., `CanEdit()`, `Accept()`, `Terminate()`).

**Implementation Reference**: `backend/internal/domain/models/workout.go` (CanEdit method), `relationship.go` (Accept, Terminate methods)

### Strategy Pattern

**Description**: Used for invitation methods. Different invitation strategies (email, code) implement a common interface.

**Implementation Reference**: `backend/internal/domain/services/invitation_service.go`

### Dependency Injection

**Description**: All dependencies are wired in `cmd/server/main.go` (composition root). No global state except Couchbase cluster/bucket connections.

**Implementation Reference**: `backend/cmd/server/main.go`

### Frontend: Route Groups Pattern

**Description**: Next.js route groups `(auth)` and `(dashboard)` enable shared layouts without affecting URL structure. Auth routes share login/register layout; dashboard routes share authenticated layout.

**Implementation Reference**: `frontend/src/app/(auth)/`, `frontend/src/app/(dashboard)/`

### API Client Pattern

**Description**: Centralized API client in `lib/api.ts` provides typed methods per domain. Auth headers automatically attached via TokenService.

**Implementation Reference**: `frontend/src/lib/api.ts`

**Pattern Structure**:
```typescript
export const workoutApi = {
  create: async (data: CreateWorkoutRequest) => api.post<Workout>("/workouts", data),
  getAll: async (params?: PaginationParams) => api.get<WorkoutListResponse>("/workouts", { params }),
}
```

### React Query Pattern

**Description**: Server state managed via TanStack React Query. Queries defined inline in components. Cache invalidated on mutations.

**Implementation Reference**: `frontend/src/app/providers.tsx` (QueryClient setup), component files

### Zustand Store Pattern

**Description**: Client state (auth) managed via Zustand. Simple, performant state management without boilerplate.

**Implementation Reference**: `frontend/src/stores/authStore.ts`

### Dialog Pattern

**Description**: CRUD operations use feature-specific dialogs for create/edit operations. Keeps main views clean and focused.

**Implementation Reference**: `frontend/src/components/features/workout/workout-dialog.tsx`


## Naming Conventions

### Files

| Type | Convention | Examples |
|---|---|---|
| **Go source** | `snake_case.go` | `auth_handler.go`, `user_repository.go` |
| **Go tests** | `*_test.go` alongside source | `auth_handler_test.go` |
| **TypeScript components** | `kebab-case.tsx` | `workout-form.tsx`, `meal-card.tsx` |
| **TypeScript utils/lib** | `kebab-case.ts` | `api.ts`, `utils.ts`, `token-service.ts` |
| **TypeScript types** | `index.ts` barrel or domain-named | `types/index.ts`, `api-types.ts` |
| **Zod validations** | `kebab-case.ts` in `validations/` | `auth.ts`, `workout.ts`, `meal.ts` |
| **Next.js route groups** | `(group-name)/` | `(auth)/`, `(dashboard)/` |
| **Next.js dynamic routes** | `[param]/` | `client/[id]/` |

### Identifiers

| Language | Functions/Methods | Variables | Constants | Types/Interfaces |
|---|---|---|---|---|
| **Go** | `PascalCase` (exported), `camelCase` (private) | `camelCase` | `PascalCase` | `PascalCase` |
| **TypeScript** | `camelCase` | `camelCase` | `UPPER_SNAKE_CASE` | `PascalCase` |

### Go Model Conventions

- Struct fields use `PascalCase` with JSON tags in `camelCase`: `UserID string \`json:"userId"\``
- Domain types as string aliases: `type UserRole string`
- Constants for enum values: `const RoleTrainer UserRole = "trainer"`
- Factory functions: `NewWorkout(...) *Workout`
- Receiver methods: `func (w *Workout) CanEdit() bool`

### TypeScript Type Conventions

- Domain interfaces: `Workout`, `Meal`, `User`, `Comment`
- Request interfaces: `CreateWorkoutRequest`, `UpdateMealRequest`
- Form data types (from Zod): `ExerciseFormData`, `WorkoutFormData`
- API response types: `WorkoutListResponse`, `LoginResponse`

## File Organization

### Go Backend

```
internal/
├── api/
│   ├── handlers/     # One file per domain: auth_handler.go, workout_handler.go
│   ├── middleware/   # auth_middleware.go
│   └── routes/       # One file per domain: auth_routes.go, workout_routes.go
├── config/           # config.go, db.go, collections.go
└── domain/
    ├── models/       # One file per entity: user.go, workout.go, meal.go
    ├── repositories/ # One file per entity: user_repository.go
    └── services/     # One file per domain: comment_service.go
```

- **Handlers** receive `*gin.Context`, validate input, call services, return JSON
- **Routes** files register handlers with the Gin router
- **Repositories** handle all Couchbase operations (N1QL queries, document CRUD)
- **Services** contain business logic, coordinate multiple repositories
- **Models** define structs, factory functions, and helper methods

### Frontend

```
src/
├── app/              # Next.js App Router (file-based routing)
│   ├── (auth)/       # Login, register (route group)
│   ├── (dashboard)/  # Role-based dashboards (route group)
│   ├── layout.tsx    # Root layout with Providers
│   └── providers.tsx # React Query setup
├── components/
│   ├── ui/           # ShadCN primitives (button, card, dialog, etc.)
│   └── features/     # Feature-specific components by domain
├── lib/
│   ├── api.ts        # API client with typed methods
│   ├── validations/  # Zod schemas per domain
│   └── utils.ts      # cn() helper
├── stores/           # Zustand stores (authStore.ts)
├── types/            # Shared TypeScript interfaces
└── test/             # Test setup, MSW handlers
```

- **Route groups** `(auth)` and `(dashboard)` share layouts without URL segments
- **Feature components** organized by domain: `workout/`, `meal/`, `comments/`, etc.
- **UI primitives** in `components/ui/` are ShadCN-generated, do not edit manually
- **API client** (`lib/api.ts`) exports domain-scoped API objects: `authApi`, `workoutApi`, etc.

## Import Style

### Go

```go
package handler

import (
    "net/http"           // Standard library first
    "time"

    "github.com/gin-gonic/gin"  // Third-party second
    "github.com/golang-jwt/jwt/v5"

    "gymtrack-backend/internal/domain/models"    // Internal last
    "gymtrack-backend/internal/domain/services"
)
```

### TypeScript

```typescript
import { z } from "zod"                    // Third-party first
import { Workout } from "@/types"          // @/ aliases second
import { workoutApi } from "@/lib/api"     // Internal modules
import { Button } from "@/components/ui/button"  // UI components
import { cn } from "@/lib/utils"           // Utilities
```

- Use `@/` path alias for all internal imports (configured in `tsconfig.json`)
- Group imports: external → internal aliases → relative
- React Query hooks co-located with API calls or in custom hooks

## Code Patterns

### Go Handler Pattern

```go
func (h *WorkoutHandler) CreateWorkout(c *gin.Context) {
    athleteID, exists := c.Get("userID")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }

    userRole, exists := c.Get("userRole")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found"})
        return
    }

    var req CreateWorkoutRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
        return
    }

    workout, err := h.workoutService.CreateWorkout(c.Request.Context(), services.CreateWorkoutInput{
        AthleteID: athleteID.(string),
        Date:      req.Date,
        Exercises: req.Exercises,
        UserRole:  userRole.(models.UserRole),
    })
    if err != nil {
        if svcErr, ok := err.(*services.ServiceError); ok {
            if svcErr.Code == "FORBIDDEN" {
                c.JSON(http.StatusForbidden, gin.H{"error": svcErr.Message})
                return
            }
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workout", "details": err.Error()})
        return
    }

    c.JSON(http.StatusCreated, workout)
}
```

### Go Repository Pattern

- Constructor: `NewWorkoutRepository(collection *gocb.Collection) *WorkoutRepository`
- Methods: `Create`, `GetByID`, `GetAll`, `Update`, `Delete`
- Use Couchbase document operations (`Insert`, `Get`, `Replace`, `Remove`)
- Use N1QL queries for filtered/list operations

### Go Service Pattern

- Constructor takes repository dependencies: `NewCommentService(commentRepo, relRepo, ...)`
- Business logic: validation, authorization checks, cross-entity operations
- Example: `CommentService` verifies trainer-athlete relationship before allowing comments

### Frontend API Client Pattern

```typescript
export const workoutApi = {
  create: async (data: CreateWorkoutRequest) => {
    return api.post<Workout>("/workouts", data)
  },
  getAll: async (params?: PaginationParams) => {
    return api.get<WorkoutListResponse>("/workouts", { params })
  },
}
```

- Generic `api.get<T>()`, `api.post<T>()`, `api.put<T>()`, `api.delete<T>()` methods
- Auth header automatically attached via `TokenService.getAuthHeader()`
- Timeout support via `AbortController`

### Frontend React Query Pattern

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["workouts", { date }],
  queryFn: () => workoutApi.getAll({ date }),
})

const mutation = useMutation({
  mutationFn: (data: CreateWorkoutRequest) => workoutApi.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["workouts"] })
  },
})
```

- Query keys are arrays: `["entity", params]`
- Invalidate related queries on mutation success
- Default stale time: 5 minutes (configured in `providers.tsx`)

### Frontend Zustand Store Pattern

```typescript
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  login: async (email, password) => {
    const response = await authApi.login({ email, password })
    TokenService.setTokens(response.accessToken, response.refreshToken)
    set({ user: response.user, isAuthenticated: true })
  },
}))
```

### Zod Validation Pattern

```typescript
export const workoutSchema = z.object({
  date: z.date(),
  exercises: z.array(exerciseSchema).min(1, "At least one exercise is required"),
})

export type WorkoutFormData = z.infer<typeof workoutSchema>
```

- Define schema → export inferred type → use with React Hook Form
- Use `z.preprocess()` for form input coercion (string → number)
- Custom validators via `.refine()`

### ShadCN Component Pattern

```typescript
import { cn } from "@/lib/utils"

export function Button({ className, ...props }: ButtonProps) {
  return (
    <button className={cn("base-classes", className)} {...props} />
  )
}
```

- Use `cn()` utility for conditional class merging
- Components use `class-variance-authority` for variants

## Error Handling

### Backend (Go)

- Return HTTP status codes with JSON error: `c.JSON(http.StatusBadRequest, gin.H{"error": "message"})`
- Use `go-playground/validator` tags on structs for automatic validation
- Factory functions (`NewWorkout`) handle ID generation and timestamps
- Helper methods on models: `CanEdit()` for time-based edit windows
- Log errors with `log.Printf` for debugging

### Frontend (TypeScript)

- API client throws `Error` with message from response body
- `authStore.handleAuthError()` handles 401/403 by clearing tokens and redirecting
- React Query `onError` callbacks for user-facing error messages
- Zod validation errors displayed inline on form fields
- Timeout handling via `AbortController` in API client

## Logging

### Backend

- Standard `log` package for startup, connection, and error logging
- Format: `log.Printf("Successfully connected to Couchbase...")`
- Errors during index creation logged but non-fatal (may already exist)

### Frontend

- `console.log` for debug (e.g., API request URL logging)
- `console.error` for auth failures and initialization errors
- Remove debug logs before production

## Testing

### Frontend Unit Tests (Vitest)

- Config: `vitest.config.ts` with `jsdom` environment
- Setup: `src/test/setup.ts` with `@testing-library/jest-dom`
- Mocking: MSW (`src/test/mocks/handlers.ts`, `server.ts`)
- Run: `pnpm test:run`
- Store tests: `src/test/stores/authStore.test.ts`

### Frontend E2E Tests (Playwright)

- Config: `playwright.config.ts`
- Test directory: `src/e2e/`
- Browsers: Chromium, Firefox, WebKit, Mobile Chrome
- Auto-starts dev server via `webServer` config
- Run: `pnpm test:e2e`

### Backend Tests (Go)

- Test files: `*_test.go` alongside source
- Integration tests: `backend/tests/`
- Run: `go test ./...`
- Use `testify` for assertions

## Project Conventions

### Documentation Format

**Backend (Go)**:
- Package-level comments at top of each file describing purpose
- Exported functions have GoDoc comments: `// CreateUser creates a new user with the given details`
- Complex business logic explained in comments within service methods
- Swagger annotations for API documentation: `@Summary`, `@Description`, `@Tags`

**Frontend (TypeScript)**:
- JSDoc comments for complex utility functions
- Component prop interfaces documented with comments
- API types documented in `lib/api-types.ts`
- Feature components have header comments describing purpose

### Code Organization Principles

**Backend**:
- One file per entity in each layer (handler, repository, service, model)
- Route files organized by domain (e.g., `auth_routes.go`, `workout_routes.go`)
- Middleware in dedicated `middleware/` directory
- Configuration in `config/` directory

**Frontend**:
- Feature components organized by domain in `components/features/`
- UI primitives in `components/ui/` (ShadCN-generated, do not edit)
- API modules in `lib/api/` organized by domain
- Validation schemas in `lib/validations/` organized by domain
- Types in `types/index.ts` (shared across app)

### Version Control Conventions

- Feature branches: `feature/workout-logging`, `feature/trainer-dashboard`
- Bugfix branches: `fix/comment-threading`, `fix/auth-refresh`
- Commit messages: Conventional Commits format (`feat:`, `fix:`, `refactor:`)
- Main branch: `main`
- Pull requests required for all changes

### Environment Configuration

**Backend (`.env`)**:
```bash
COUCHBASE_CONNECTION_STRING=couchbase://localhost
COUCHBASE_USERNAME=Administrator
COUCHBASE_PASSWORD=password
COUCHBASE_BUCKET=gymtrack
JWT_SECRET=<must-be-32-characters-or-more>
```

**Frontend (`.env.local`)**:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

## Validations

### Backend Validation (go-playground/validator)

**Location**: Request structs in handler files

**Pattern**:
```go
type CreateWorkoutRequest struct {
    Date      time.Time   `json:"date" binding:"required"`
    Exercises []Exercise  `json:"exercises" binding:"required,min=1"`
}

// Handler validation
if err := c.ShouldBindJSON(&req); err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
    return
}
```

**Common Tags**:
- `required`: Field must be present
- `min`, `max`: String/array length
- `email`: Email format validation
- `oneof`: Enum validation (e.g., `oneof=trainer athlete`)

### Frontend Validation (Zod)

**Location**: `frontend/src/lib/validations/`

**Pattern**:
```typescript
export const workoutSchema = z.object({
  date: z.date(),
  exercises: z.array(exerciseSchema).min(1, "At least one exercise is required"),
})

export type WorkoutFormData = z.infer<typeof workoutSchema>
```

**Usage with TanStack Form**:
```typescript
const form = useForm({
  defaultValues: initialData,
  onSubmit: async ({ value }) => {
    await workoutApi.create(value)
  },
  validators: {
    onChange: workoutSchema,
  },
})
```

**Validation Rules**:
- All forms validated on client-side before submission
- Server-side validation as backup
- Custom validators via `.refine()` for business rules
- Error messages displayed inline on form fields

### Business Rule Validation

**Location**: Service layer (`backend/internal/domain/services/`)

**Examples**:
- Workouts/Meals editable only within 24 hours of creation
- Athletes can have only one active trainer
- Comments only allowed between trainer and their athletes
- Reviews only allowed after active relationship

## Error Handling Patterns

### Backend Error Handling

**HTTP Response Format**:
```go
c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
```

**Error Types**:
- 400: Validation errors, invalid input
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Resource not found
- 500: Internal server error

**Logging**:
```go
log.Printf("Error creating workout: %v", err)
```

**Error Recovery**:
- Index creation errors logged but non-fatal (may already exist)
- Database connection errors fatal on startup
- Request errors return appropriate HTTP status

### Frontend Error Handling

**API Client Errors**:
```typescript
// lib/api/index.ts
if (!response.ok) {
  const error = await response.json()
  throw new Error(error.error || "Request failed")
}
```

**Auth Error Handling**:
```typescript
// stores/authStore.ts
handleAuthError: (error: Error) => {
  if (error.message.includes("401") || error.message.includes("403")) {
    TokenService.clearTokens()
    set({ user: null, isAuthenticated: false })
    router.push("/login")
  }
}
```

**React Query Error Handling**:
```typescript
const mutation = useMutation({
  mutationFn: workoutApi.create,
  onError: (error) => {
    toast.error(error.message)
  },
})
```

**Form Error Handling**:
```typescript
// Zod validation errors displayed inline
<form.Field name="email">
  {(field) => (
    <>
      <input {...field.props} />
      {field.state.meta.errors && (
        <span className="text-red-500">{field.state.meta.errors[0]}</span>
      )}
    </>
  )}
</form.Field>
```

**Timeout Handling**:
```typescript
// lib/api/index.ts uses AbortController
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 10000)
```

## File Organization and Folder Structure

### Backend Structure

```
backend/
├── cmd/server/
│   └── main.go                    # Entry point, DI wiring
├── internal/
│   ├── api/
│   │   ├── handlers/              # HTTP handlers (one per domain)
│   │   ├── middleware/            # Auth middleware
│   │   └── routes/                # Route registration (one per domain)
│   ├── config/
│   │   ├── config.go              # Env loading
│   │   ├── db.go                  # Couchbase connection
│   │   └── collections.go         # Collection setup
│   ├── domain/
│   │   ├── models/                # Domain entities (one per entity)
│   │   ├── repositories/          # Data access (one per entity)
│   │   ├── services/              # Business logic (one per domain)
│   │   ├── errors/                # Custom error types
│   │   └── testutils/             # Test mocks
│   └── utils/                     # Helper utilities
├── docs/                          # Swagger-generated docs
├── tests/                         # Integration tests
├── go.mod
├── go.sum
└── .env                           # Environment config (gitignored)
```

### Frontend Structure

```
frontend/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/                # Auth route group
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/           # Dashboard route group
│   │   │   ├── layout.tsx         # Auth guard layout
│   │   │   ├── page.tsx
│   │   │   ├── athlete/           # Athlete routes
│   │   │   └── trainer/           # Trainer routes
│   │   ├── layout.tsx             # Root layout
│   │   ├── providers.tsx          # React Query provider
│   │   └── globals.css            # Global styles
│   ├── components/
│   │   ├── ui/                    # ShadCN primitives (do not edit)
│   │   ├── layout/                # Layout components
│   │   └── features/              # Feature components (by domain)
│   │       ├── workout/
│   │       ├── meal/
│   │       ├── comments/
│   │       ├── trainer/
│   │       └── coaching/
│   ├── lib/
│   │   ├── api/                  # API client modules
│   │   ├── validations/          # Zod schemas
│   │   ├── hooks/                # Custom React hooks
│   │   ├── token-service.ts      # JWT management
│   │   ├── error-handler.ts      # Error utilities
│   │   ├── constants.ts          # App constants
│   │   └── utils.ts              # General utilities
│   ├── stores/                    # Zustand stores
│   ├── types/                     # TypeScript types
│   ├── test/                      # Vitest setup, MSW mocks
│   └── e2e/                       # Playwright E2E tests
├── public/                        # Static assets
├── components.json                # ShadCN config
├── vitest.config.ts
├── playwright.config.ts
├── next.config.ts
├── tsconfig.json
└── package.json
```

## Constraints

### Backend Constraints

- **Go Version**: 1.24.0
- **Database**: Couchbase Server only (no SQL databases)
- **Auth**: JWT-based only (no session-based auth)
- **API**: REST only (no GraphQL)
- **CORS**: Restricted to localhost:3000/3001 in development
- **Token Expiration**: Access tokens expire, refresh tokens required
- **Edit Window**: Workouts/meals editable only within 24 hours
- **Relationships**: Athletes limited to one active trainer
- **Comments**: Max 2000 characters per comment
- **Reviews**: Rating must be 1-5, only after active relationship

### Frontend Constraints

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

### Development Constraints

- **Code Style**: Follow conventions in this document
- **Testing**: Vitest for unit, Playwright for E2E
- **API Documentation**: Swagger auto-generated, do not edit manually
- **Environment Variables**: Never commit `.env` files with real credentials
- **Git**: Main branch protected, PRs required
- **Documentation**: Update relevant docs when adding features

## Libraries and Packages

### Backend Libraries

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `github.com/gin-gonic/gin` | HTTP framework | All HTTP routing/handling |
| `github.com/couchbase/gocb/v2` | Couchbase driver | All database operations |
| `github.com/golang-jwt/jwt/v5` | JWT handling | Auth token generation/validation |
| `golang.org/x/crypto/bcrypt` | Password hashing | User registration/password changes |
| `github.com/go-playground/validator/v10` | Request validation | Input validation in handlers |
| `github.com/google/uuid` | UUID generation | ID generation in factories |
| `github.com/joho/godotenv` | Env loading | Loading `.env` files |
| `github.com/gin-contrib/cors` | CORS middleware | CORS configuration |
| `github.com/swaggo/swag` | Swagger generation | API documentation |
| `github.com/stretchr/testify` | Testing assertions | All Go tests |

### Frontend Libraries

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `@tanstack/react-query` | Server state | API data fetching/caching |
| `@tanstack/react-form` | Form management | All form handling |
| `zustand` | Client state | Auth state, local UI state |
| `zod` | Schema validation | Form validation, type inference |
| `class-variance-authority` | Component variants | UI component variants |
| `tailwind-merge` | Class merging | Merging Tailwind classes |
| `clsx` | Conditional classes | Conditional class names |
| `motion` | Animations | Page transitions, micro-interactions |
| `tw-animate-css` | Tailwind animations | CSS animations |
| `dayjs` / `date-fns` | Date handling | Date manipulation/formatting |
| `lucide-react` | Icons | All icons in UI |
| `@playwright/test` | E2E testing | End-to-end tests |
| `vitest` | Unit testing | Unit/component tests |
| `msw` | API mocking | Mocking API in tests |
| `@testing-library/react` | Component testing | Testing React components |

### Library Usage Guidelines

**Backend**:
- Use `gin.Context` for all HTTP handlers
- Use `gocb` SDK for all Couchbase operations
- Use `validator` tags for struct validation
- Use `bcrypt` for all password hashing
- Use `uuid` for all ID generation
- Use `swaggo` annotations for API docs

**Frontend**:
- Use `@/` path alias for all internal imports
- Use `cn()` utility for conditional Tailwind classes
- Use React Query for all API data fetching
- Use Zustand for auth state only
- Use TanStack Form + Zod for all forms
- Use Base UI/Radix UI for all UI components
- Use Lucide React for all icons
- Use Motion for all animations
- Use Recharts for all charts

### Adding New Libraries

**Before adding a library**:
1. Check if existing libraries can solve the problem
2. Verify library is actively maintained
3. Check library size and performance impact
4. Ensure TypeScript support
5. Review documentation and community adoption

**Process**:
1. Add to `package.json` (frontend) or `go.mod` (backend)
2. Update this CODE_STYLE.md with library info
3. Update ARCHITECTURE.md if architectural change
4. Update context-map.md if significant dependency
5. Document usage pattern in relevant section

## Do's and Don'ts

### Do

- Use factory functions (`NewWorkout`) to create entities with proper defaults
- Validate input at both frontend (Zod) and backend (validator) levels
- Use route groups `(auth)`, `(dashboard)` for shared layouts
- Keep API client methods typed with generics: `api.get<ResponseType>()`
- Use `cn()` for all conditional Tailwind classes
- Invalidate React Query cache after mutations
- Follow the repository pattern for data access abstraction
- Use `@/` path alias for all internal imports
- Name Go files and TS files in `kebab-case`
- Organize feature components by domain in `components/features/`
- Document complex business logic with comments
- Write tests for new features
- Update documentation when adding features
- Follow architectural patterns defined in this document

### Don't

- Don't edit ShadCN UI components in `components/ui/` directly (regenerate with CLI)
- Don't bypass the API client — always use typed methods from `lib/api.ts`
- Don't store sensitive data in localStorage (tokens are OK, passwords are not)
- Don't mix business logic in handlers — delegate to services
- Don't use raw SQL/N1QL strings in handlers — keep in repositories
- Don't skip validation on either frontend or backend
- Don't hardcode API URLs — use `NEXT_PUBLIC_API_URL` env var
- Don't commit `.env` files with real credentials
- Don't add new libraries without reviewing existing options
- Don't use JavaScript files — use TypeScript only
- Don't use CSS modules or styled-components — use Tailwind only
- Don't mix state management approaches — stick to React Query + Zustand
- Don't bypass architectural patterns for quick fixes
