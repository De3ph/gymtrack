# CODE_STYLE.md

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
    var req CreateWorkoutRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    userID := c.GetString("userID")
    workout := models.NewWorkout(userID, req.Date, req.Exercises)

    if err := h.repo.Create(workout); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workout"})
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

### Don't

- Don't edit ShadCN UI components in `components/ui/` directly (regenerate with CLI)
- Don't bypass the API client — always use typed methods from `lib/api.ts`
- Don't store sensitive data in localStorage (tokens are OK, passwords are not)
- Don't mix business logic in handlers — delegate to services
- Don't use raw SQL/N1QL strings in handlers — keep in repositories
- Don't skip validation on either frontend or backend
- Don't hardcode API URLs — use `NEXT_PUBLIC_API_URL` env var
- Don't commit `.env` files with real credentials
