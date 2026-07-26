# Backend Cache Layer Plan (Adapter Pattern)

## TL;DR

> **Quick Summary**: Add a repository-level cache to the Go backend using the **adapter pattern** — a `Cache[T]` interface decouples cached repos from the concrete cache backend. Ships with an in-process `InMemoryCache` adapter; swap to Redis later by writing one new adapter, zero changes to cached repos.
>
> **Deliverables**:
> - `Cache[T]` interface (abstraction), `InMemoryCache` adapter, Prometheus metrics decorator
> - 6 cached repository decorators depending on `Cache[T]` (User, Exercise, MuscleGroup, Equipment, Relationship, TrainerProfile)
> - Auth middleware served from user cache — zero DB calls on warm cache, no JWT changes
> - Adapter factory + DI wiring via uber/fx — zero service/handler changes
>
> **Estimated Effort**: Medium (~1250 lines new, ~20 lines modified)
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Cache interface + adapter → User cache → DI wiring → verification

---

## Context

### Original Request
Inspect the backend and suggest a cache solution to reduce DB calls.

### Interview Summary
**Key Findings**:
- Backend is Go + Gin + PostgreSQL (pgx/v5) with uber/fx DI, 14 repositories, 15 services
- **Zero caching** exists — every request hits PostgreSQL directly
- Auth middleware calls `userRepo.GetUserByID()` on **every authenticated request** just to check account status
- Reference data (exercises, muscle groups, equipment) re-fetched on every page load
- Backend is monolithic single-instance — no need for Redis yet
- AGENTS.md claims Couchbase — stale doc; verified actual stack is pgx/v5 + PostgreSQL (gocb unused in go.mod)

**Hot DB Access Patterns** (ranked by impact):
1. `GetUserByID()` in auth middleware — called on every authenticated request
2. `GetAllExercises()` + `GetAllMuscleGroups()` + `GetAllEquipment()` — reference data, rarely changes
3. `GetByTrainerID()` — authorization check, called repeatedly per user view
4. `GetPublicTrainers()` + `GetRatingsForTrainers()` — multi-query aggregation per search

**Research Findings**:
- Clean layered architecture (Handler → Service → Repository) makes decorator pattern viable
- Repository interfaces are well-defined — cached repos implement same contracts
- uber/fx DI makes swapping implementations trivial (one-line changes)
- Existing tests use testify + testcontainers for PostgreSQL integration testing

### Metis Review
**Identified Gaps** (addressed):
            - **Deep copy safety**: Cached pointers are mutable — callers could corrupt cache. Solved: `Cache.Get()` implementations return deep copy via `encoding/gob`.
- **Memory bounds**: Unbounded cache growth under load. Solved: `maxEntries` with random-2 eviction.
- **Error caching policy**: DB errors should never be cached. Solved: transparent pass-through on error.
- **Metrics**: Cache hit/miss invisible without counters. Solved: Prometheus counters per cache instance.
- **Cache key convention**: Inconsistent keys across repos. Solved: documented `<domain>:<qualifier>[:<id>]` format.

### Plan Review Fixes (applied)
- **Task 10 type mismatch**: `GetPublicTrainers` returns `[]models.TrainerWithProfile`, `GetTrainerByID` returns `*models.TrainerWithProfile` — one `Cache[T]` field cannot hold both. Fixed: two cache instances, separate metrics prefixes.
- **JWT status claim rejected**: embedding `status` in JWT = stale-status hole. `RefreshToken()` (`auth_service.go:129-144`) re-mints access tokens without fetching the user, so refreshed tokens would carry stale/missing status; ban enforcement delayed up to 1h access TTL. Fixed: middleware unchanged, `GetUserByID` served from user cache — zero DB on warm cache, immediate enforcement.
- **Eviction test contradiction**: random-2 eviction is non-deterministic; test asserts size bound, not "oldest evicted".
- **CreateUser invalidation removed**: no negative caching means nothing to invalidate on create; signup bursts no longer flush the user cache.
- **Relationship `Update` invalidation added**: accept/terminate flows through `Update()` — must invalidate.
- **SearchExercises not cached**: user-controlled query strings = unbounded keyspace, cache pollution.
- **Stampede protection**: singleflight on cache-miss paths (golang.org/x/sync, already in module graph).
- **Goroutine lifecycle**: `InMemoryCache.Stop()` on the concrete type for tests; interface stays lifecycle-free.

---

## Architecture

### Approach: Repository Decorator + Cache Adapter Pattern

```
Handler → Service → CachedRepo (depends on Cache[T]) → RealRepo → PostgreSQL
                                                    ↓
                              ┌────────────────────────────┐
                              │     Cache[T] interface      │
                              │  Get / Set / SetWithTTL     │
                              │  Invalidate / InvalidatePrefix│
                              └────────────────────────────┘
                                      ↙               ↘
                          ┌──────────────┐     ┌──────────────┐
                          │InMemoryCache │     │  RedisCache  │
                          │ (ships now)  │     │ (future)     │
                          │ sync.RWMutex │     │ go-redis     │
                          │ + deep copy  │     │ + JSON serde │
                          │ + Prometheus │     │ + native TTL │
                          └──────────────┘     └──────────────┘
```

**Two patterns combined:**

1. **Repository Decorator** — cached repos (e.g., `CachedUserRepository`) wrap real repos and implement the same `UserRepository` interface. Services don't know caching exists.
2. **Cache Adapter** — cached repos depend on `Cache[T]` interface, not a concrete implementation. Swap backends by changing one line in `module.go`.
3. **Stampede protection** — cache-miss paths wrap inner repo calls in `singleflight.Group` (golang.org/x/sync, already in module graph). Cold cache + N concurrent requests = 1 DB query, not N.

### `Cache[T]` Interface

```go
package cache

type Cache[T any] interface {
    Get(key string) (T, bool)
    Set(key string, value T)
    SetWithTTL(key string, value T, ttl time.Duration)
    Invalidate(key string)
    InvalidatePrefix(prefix string)
}
```

### Why the adapter pattern matters

| Scenario | Without adapter | With adapter |
|---|---|---|
| "Add Redis" | Rewrite 6 cached repos | Write 1 `RedisCache` adapter |
| "Remove caching" | Remove 6 decorators | Change `backend` arg in factory |
| "Test with mock cache" | Implement 6 test wrappers | Use `InMemoryCache` in tests |
| "Add memcached" | Rewrite 6 cached repos | Write 1 `MemcachedCache` adapter |

### Why not service-level caching?
Repository decorator is cleaner: one cache per data access pattern, transparent to business
logic, trivial to add/remove via DI wiring.

---

## Work Objectives

### Core Objective
Reduce PostgreSQL load by adding transparent in-process caching at the repository layer, with auth middleware optimization to eliminate the most expensive repeated DB call.

### Concrete Deliverables
- `internal/infrastructure/cache/types.go` — `Cache[T]` interface definition
- `internal/infrastructure/cache/memory.go` — `InMemoryCache` adapter (sync.RWMutex + map)
- `internal/infrastructure/cache/metrics.go` — Prometheus cache metrics
- `internal/infrastructure/cache/cache_test.go` — unit tests with race detection
- 6 cached repository decorators in `internal/infrastructure/persistence/postgres/`
- `auth_middleware.go` UNCHANGED — user lookup now served by `CachedUserRepository` (zero DB on warm cache)
- Modified `module.go` — wire cached repos + cache backend into DI
- Modified `config.go` — add `CacheEnabled` kill switch
- New integration test — prove authed request makes 0 DB calls on warm cache

### Definition of Done
- [ ] `go test ./...` passes with 0 failures
- [ ] `go test -race ./internal/infrastructure/cache/...` passes with 0 warnings
- [ ] Auth middleware makes 0 DB calls for status checks (verified via log or metrics)
- [ ] Reference data loads once from DB, subsequent requests hit cache (verified via metrics)
- [ ] Cache invalidates correctly on writes (verified via integration test)
- [ ] Deep copy isolation verified (mutating returned pointer does not affect cache)
- [ ] `curl localhost:8080/metrics | grep cache_` returns counters

### Must Have
- `Cache[T]` interface must be the sole dependency of cached repos (not a concrete type)
- Auth middleware user lookup must be served from cache on warm cache — zero DB calls (no JWT claim changes)
- Reference data cache must auto-invalidate on create/update/delete
- All caching must be transparent — no service or handler changes
- Kill switch must exist (env var `CACHE_ENABLED=false`)
- Race-free concurrent access (`go test -race`)

### Must NOT Have (Guardrails)
- NO Redis or external infrastructure dependencies (that's the future adapter's job)
- NO leaking cache backend into cached repos — they only see `Cache[T]` interface
- NO changes to domain models (no `Clone()` methods on 15 models)
- NO changes to handler or service logic
- NO caching of DB errors
- NO caching of user-specific mutable data (workouts, meals, comments)
- NO risks of serving stale user data after profile update (targeted per-key invalidation)
- NO embedding user status in JWT claims — refreshed tokens re-mint without a user fetch, creating a stale-status security hole
- NO caching of SearchExercises — user-controlled query strings create an unbounded keyspace

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (testcontainers + PostgreSQL for integration tests, testify for assertions)
- **Automated tests**: YES (TDD for cache utility, tests-after for repo decorators)
- **Framework**: `go test` + testify

### QA Policy
Every task MUST include agent-executed verification.

- **Library/Module**: Use `go test -v -race` for cache unit tests
- **Integration**: Use `go test ./internal/infrastructure/persistence/postgres/...` for repo decorators
- **Manual**: Start server with `go run cmd/server/main.go`, curl endpoints, check metrics

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — start immediately):
├── Task 1: cache/types.go — Cache[T] interface             [~15 lines]
├── Task 2: cache/memory.go — InMemoryCache adapter         [~120 lines]
├── Task 3: cache/metrics.go — Prometheus counters          [~40 lines]
└── Task 4: cache/cache_test.go — unit tests                [~200 lines]

Wave 2 (Cached Repos — MAX PARALLEL, all depend on Wave 1):
├── Task 5: user_cached.go                                  [~140 lines]
├── Task 6: exercise_cached.go                              [~120 lines]
├── Task 7: muscle_group_cached.go                          [~70 lines]
├── Task 8: equipment_cached.go                             [~70 lines]
├── Task 9: relationship_cached.go                          [~90 lines]
└── Task 10: trainer_profile_cached.go                      [~110 lines]

Wave 3 (Integration — depend on Wave 2):
├── Task 11: Wire cached repos + adapter into module.go     [~15 lines changed]
├── Task 12: Auth cache-path integration test               [~80 lines new]
└── Task 13: `go test ./...` — verify all pass

Wave FINAL (Verification — depend on Wave 3):
├── F1: Verify cache hit/miss metrics via curl /metrics
├── F2: Verify deep copy isolation
├── F3: Verify invalidation correctness
├── F4: Verify zero auth-DB-calls on warm cache
└── F5: Verify new adapter follows Cache[T] interface (future-proofing)
```

### Critical Path
Task 1 → Task 2 → Task 5 → Task 11 → Task 13 → F1-F5 → user okay

---

## TODOs

- [ ] 1. Create `internal/infrastructure/cache/types.go` — `Cache[T]` interface

  **What to do**:
  - Define the `Cache[T any]` interface that all cache backends must implement:
  ```go
  package cache

  // Cache is the abstraction for all cache backends.
  // Cached repositories depend on this interface, never on a concrete implementation.
  type Cache[T any] interface {
      // Get returns a deep copy of the value for key.
      // Returns zero value + false if key is missing or expired.
      Get(key string) (T, bool)

      // Set stores a deep copy of value under key with the default TTL.
      Set(key string, value T)

      // SetWithTTL stores a value with a specific TTL.
      SetWithTTL(key string, value T, ttl time.Duration)

      // Invalidate removes a single key from the cache.
      Invalidate(key string)

      // InvalidatePrefix removes all keys with the given prefix.
      InvalidatePrefix(prefix string)
  }
  ```

  **Must NOT do**:
  - Do NOT add methods that are backend-specific (e.g., `Ping()` for Redis — that's the adapter constructor's job)
  - Do NOT add `Close()` or lifecycle methods — those belong on the adapter struct, not the interface

  **Recommended Agent Profile**:
  - **Category**: `quick` — small, self-contained interface file

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundation — all other cache code depends on this)
  - **Blocks**: 2, 3, 4, 5, 6, 7, 8, 9, 10
  - **Blocked By**: None

  **References**:
  - Standard library patterns: `io.Reader`, `http.Handler` — small, focused interfaces

  **Acceptance Criteria**:
  - [ ] `go build ./internal/infrastructure/cache/...` passes
  - [ ] `go vet ./internal/infrastructure/cache/...` passes

- [ ] 2. Create `internal/infrastructure/cache/memory.go` — `InMemoryCache` adapter

  **What to do**:
  - `InMemoryCache[T any]` struct implements `Cache[T]` interface
  - Internal: `sync.RWMutex` + `map[string]*cacheEntry[T]`
  - `cacheEntry[T]`: `value T`, `expiresAt time.Time`, `insertedAt time.Time`
  - Constructor: `NewInMemory[T](defaultTTL, cleanupInterval time.Duration, maxEntries int, metrics *CacheMetrics) *InMemoryCache[T]`
    - Returns concrete pointer. When wired into DI, it's assigned to `Cache[T]` interface variable.
  - `Get`: deep copy `value` via `encoding/gob` before returning
  - `Set`: deep copy `value` before storing, enforce `maxEntries` via random-2 eviction
  - `Get`/`Set`/`Invalidate` all increment `metrics` counters
  - Background cleanup goroutine: every `cleanupInterval`, scan and delete expired entries
  - `Stop()` method on the concrete struct (NOT on `Cache[T]` interface) — signals cleanup goroutine to exit. Tests must call it; the 6 server instances live for process lifetime
  - `deepCopy[T]` helper: `encoding/gob` encode → decode into new T
  - Document gob constraints in package doc comment: all cached model fields must stay exported; interface-typed fields require `gob.Register`

  **Must NOT do**:
  - Do NOT use `encoding/json` for deep copy (gob is ~2x faster)
  - Do NOT add `Clone()` interface — keep it generic
  - Do NOT import third-party cache libs

  **Recommended Agent Profile**:
  - **Category**: `deep` — careful lock design + deep copy semantics + eviction logic
  - **Skills**: `golang-concurrency`, `golang-safety`, `golang-code-style`

  **Parallelization**:
  - **Can Run In Parallel**: NO (blocks all cached repos)
  - **Blocks**: 5, 6, 7, 8, 9, 10
  - **Blocked By**: 1

  **Acceptance Criteria**:
  - [ ] `go build ./internal/infrastructure/cache/...` passes
  - [ ] `go vet ./internal/infrastructure/cache/...` passes

  **QA Scenarios**:

  ```
  Scenario: Basic Get/Set round-trip
    Tool: interactive_bash
    Steps:
      1. cd backend
      2. go test -v -run TestInMemoryCache_GetSet ./internal/infrastructure/cache/
    Expected Result: Test passes — set value is retrievable via Get
    Evidence: .omo/evidence/task-2-getset.txt

  Scenario: TTL expiration
    Tool: interactive_bash
    Steps:
      1. cd backend
      2. go test -v -run TestInMemoryCache_TTL ./internal/infrastructure/cache/
    Expected Result: Test passes — expired key returns (zero, false)
    Evidence: .omo/evidence/task-2-ttl.txt

  Scenario: Deep copy isolation
    Tool: interactive_bash
    Steps:
      1. cd backend
      2. go test -v -run TestInMemoryCache_DeepCopy ./internal/infrastructure/cache/
    Expected Result: Test passes — mutating returned pointer does not affect cache
    Evidence: .omo/evidence/task-2-deepcopy.txt

  Scenario: Concurrent access race-free
    Tool: interactive_bash
    Steps:
      1. cd backend
      2. go test -race -run TestInMemoryCache_Concurrent ./internal/infrastructure/cache/
    Expected Result: Test passes with 0 race warnings
    Evidence: .omo/evidence/task-2-race.txt

  Scenario: Prefix invalidation
    Tool: interactive_bash
    Steps:
      1. cd backend
      2. go test -v -run TestInMemoryCache_InvalidatePrefix ./internal/infrastructure/cache/
    Expected Result: Test passes — all keys with matching prefix deleted
    Evidence: .omo/evidence/task-2-prefix.txt

  Scenario: Max entries eviction
    Tool: interactive_bash
    Steps:
      1. cd backend
      2. go test -v -run TestInMemoryCache_Eviction ./internal/infrastructure/cache/
    Expected Result: Test passes — cache size stays ≤ maxEntries after inserts (random-2 eviction is non-deterministic; assert the bound, not which entry was evicted)
    Evidence: .omo/evidence/task-2-eviction.txt
  ```

- [ ] 3. Create `internal/infrastructure/cache/metrics.go` — Prometheus counters

  **What to do**:
  - Define `CacheMetrics` struct with:
    - `Hits prometheus.Counter` — incremented on cache hit
    - `Misses prometheus.Counter` — incremented on cache miss
    - `Evictions prometheus.Counter` — incremented on eviction
    - `Size prometheus.Gauge` — set to `len(items)` after each mutation
    - `HitRatio prometheus.GaugeFunc` — auto-calculated ratio
  - Constructor: `NewCacheMetrics(reg *prometheus.Registry, prefix string) *CacheMetrics`
    - `prefix` is used to name metrics: `{prefix}_hits_total`, `{prefix}_misses_total`, etc.
    - Use `promauto.With(reg).NewCounter(...)` to auto-register
  - Expose `RecordHit()`, `RecordMiss()`, `RecordEviction()`, `SetSize(n int)` methods
  - `HitRatio` GaugeFunc must guard division-by-zero (0 hits + 0 misses at startup → report 0)
  - Thread-safe (prometheus counters are atomic internally)

  **Must NOT do**:
  - Do NOT use global registry — accept `*prometheus.Registry` parameter
  - Do NOT use `prometheus.MustRegister` — use `promauto.With(reg)`
  - Do NOT add labels to counters at this stage (keep it flat)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4)
  - **Blocks**: 5, 6, 7, 8, 9, 10
  - **Blocked By**: Task 1

  **References**:
  - `backend/internal/app/module.go:141-149` — existing Prometheus registry creation
  - `prometheus/client_golang` — already a dependency

  **Acceptance Criteria**:
  - [ ] `go build ./internal/infrastructure/cache/...` passes

  **QA Scenarios**:
  ```
  Scenario: Metrics register and increment
    Tool: interactive_bash
    Steps:
      1. cd backend
      2. go test -v -run TestCacheMetrics ./internal/infrastructure/cache/
    Expected Result: Test passes — Hits/Misses/Evictions counters increment correctly
    Evidence: .omo/evidence/task-3-metrics.txt
  ```

- [ ] 4. Create `internal/infrastructure/cache/cache_test.go` — Unit tests for InMemoryCache

  **What to do**:
  - Test all behaviors via the `Cache[T]` interface:
    - `TestInMemoryCache_GetSet`: Basic write-then-read works
    - `TestInMemoryCache_Get_MissingKey`: Returns zero value, false
    - `TestInMemoryCache_TTL`: Key expires after TTL elapses
    - `TestInMemoryCache_DeepCopy`: Mutating returned pointer does not affect cache
    - `TestInMemoryCache_Invalidate`: Single key deletion
    - `TestInMemoryCache_InvalidatePrefix`: Deletes matching prefix only
    - `TestInMemoryCache_Eviction`: maxEntries enforced — size never exceeds bound (random-2 = non-deterministic victim)
    - `TestInMemoryCache_Cleanup`: Background goroutine clears expired entries
    - `TestInMemoryCache_Concurrent` (`-race`): 10 goroutines read/write simultaneously
  - Use `testing/synctest` (Go 1.25) for time-dependent tests, or manual `time.Now()` mocking
  - Each test creates a fresh cache with short TTL and small maxEntries for predictable behavior
  - Each test defers `cache.Stop()` to avoid leaking cleanup goroutines

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 3)
  - **Blocks**: 5, 6, 7, 8, 9, 10
  - **Blocked By**: Task 2

  **References**:
  - `backend/internal/infrastructure/persistence/postgres/helpers_test.go` — existing test patterns
  - `backend/internal/testutils/testutils.go` — mock patterns used in project

  **Acceptance Criteria**:
  - [ ] `go test -v -race ./internal/infrastructure/cache/...` — all tests pass, 0 race warnings

- [ ] 5. Create `internal/infrastructure/persistence/postgres/user_cached.go`

  **What to do**:
  - `CachedUserRepository` struct implements `repositories.UserRepository`
  - **Field**: `inner repositories.UserRepository`, **`cache cache.Cache[*models.User]`** (interface, not concrete)
  - Constructor: `NewCachedUserRepository(inner repositories.UserRepository, cache cache.Cache[*models.User]) *CachedUserRepository`
  - Cache key format (interface methods: `GetUserByID`, `GetUserByEmail`, `GetUserByUsername`):
    - `GetUserByID(id)`: key `"user:id:42"`
    - `GetUserByEmail(email)`: key `"user:email:foo@bar.com"` — lowercase email before keying (case-variant duplicates cause stale reads after update)
    - `GetUserByUsername(name)`: key `"user:username:john"` — lowercase username
  - On hit: return deep copy of cached user (handled by cache.Get)
  - On miss: singleflight per key (suppress concurrent duplicate DB calls), call inner, if success → cache.Set(key, user) → return user
  - `UpdateUser`: call inner, then targeted invalidation — `user:id:{id}`, `user:email:{email}`, `user:username:{name}`. Do NOT `InvalidatePrefix("user:")` — blanket flushes kill the auth cache under write load
  - `CreateUser`: call inner, NO invalidation — no negative caching means a new user has zero cached entries; invalidating on create only flushes warm entries during signup bursts
  - All other methods delegate to inner with no caching
  - Compile-time interface check: `var _ repositories.UserRepository = (*CachedUserRepository)(nil)`

  **Must NOT do**:
  - Do NOT cache GetAllUsers or CountUsers — admin queries, data changes too frequently
  - Do NOT cache negative results (not found)
  - Do NOT reference `InMemoryCache` or any concrete type — only `cache.Cache[*models.User]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 6, 7, 8, 9, 10)
  - **Blocks**: 11
  - **Blocked By**: 1, 2, 3

  **References**:
  - `backend/internal/infrastructure/persistence/postgres/user.go` — implements UserRepository
  - `backend/internal/domain/repositories/user_repository.go` — interface definition

- [ ] 6. Create `internal/infrastructure/persistence/postgres/exercise_cached.go`

  **What to do**:
  - `CachedExerciseRepository` implements `repositories.ExerciseRepository`
  - **Field**: `cache cache.Cache[[]models.Exercise]` (interface)
  - Cache keys: `"exercise:all"`, `"exercise:muscle:{id}"`, `"exercise:equipment:{id}"`
  - Cached methods: `GetAllExercises`, `GetExercisesByMuscleGroup`, `GetExercisesByEquipment`
  - Do NOT cache `SearchExercises` — user-controlled query strings = unbounded keyspace; random queries evict useful entries and kill hit ratio
  - Singleflight on cache-miss paths (cold-start stampede protection)
  - On any write (`CreateExercise`, `UpdateExercise`, `DeleteExercise`): `cache.InvalidatePrefix("exercise:")`
  - Non-cached methods delegate to inner: `GetExerciseByID`, `SearchExercises`

  **Parallelization**: YES (with Tasks 5, 7, 8, 9, 10)
  **Blocked By**: 1, 2, 3

- [ ] 7. Create `internal/infrastructure/persistence/postgres/muscle_group_cached.go`

  **What to do**:
  - `CachedMuscleGroupRepository` implements `repositories.MuscleGroupRepository`
  - **Field**: `cache cache.Cache[[]models.MuscleGroupDefinition]`
  - Cache key: `"muscle_group:all"`, TTL 30 minutes
  - Only caches `GetAllMuscleGroups`; `GetMuscleGroupByID` delegates to inner
  - Interface is read-only (no write methods) — TTL expiry is the only staleness mechanism, no invalidation hooks
  - Singleflight on miss (all page loads stampede this key after expiry)

  **Parallelization**: YES (with Tasks 5, 6, 8, 9, 10)
  **Blocked By**: 1, 2, 3

- [ ] 8. Create `internal/infrastructure/persistence/postgres/equipment_cached.go`

  **What to do**:
  - `CachedEquipmentRepository` implements `repositories.EquipmentRepository`
  - **Field**: `cache cache.Cache[[]models.EquipmentDefinition]`
  - Cache key: `"equipment:all"`, TTL 30 minutes
  - Only caches `GetAllEquipment`; `GetEquipmentByID` delegates to inner
  - Interface is read-only (no write methods) — TTL expiry is the only staleness mechanism, no invalidation hooks
  - Singleflight on miss

  **Parallelization**: YES (with Tasks 5, 6, 7, 9, 10)
  **Blocked By**: 1, 2, 3

- [ ] 9. Create `internal/infrastructure/persistence/postgres/relationship_cached.go`

  **What to do**:
  - `CachedRelationshipRepository` implements `repositories.RelationshipRepository`
  - **Field**: `cache cache.Cache[[]*models.Relationship]`
  - Cache key: `"relationship:trainer:{id}"`, TTL 2 minutes
  - Caches `GetByTrainerID` — most frequently called relationship method
  - On `Create`, `Update`, AND `Delete`: `cache.InvalidatePrefix("relationship:trainer:")` — accept/terminate flows through `Update()`; missing it serves stale status for up to 2 minutes
  - Delegates other methods to inner

  **Parallelization**: YES (with Tasks 5, 6, 7, 8, 10)
  **Blocked By**: 1, 2, 3

- [ ] 10. Create `internal/infrastructure/persistence/postgres/trainer_profile_cached.go`

  **What to do**:
  - `CachedTrainerProfileRepository` implements `repositories.TrainerProfileRepository`
  - **TWO cache fields** — return types differ, one `Cache[T]` cannot hold both:
    - `byIDCache cache.Cache[*models.TrainerWithProfile]` — for `GetTrainerByID`
    - `listCache cache.Cache[[]models.TrainerWithProfile]` — for `GetPublicTrainers`
  - Cache `GetTrainerByID(id)`: key `"trainer:id:{id}"`, TTL 5 minutes
  - Cache `GetPublicTrainers(filters, limit, offset)`: key `"trainer:public:{hash-of-filter-params}:{limit}:{offset}"`, TTL 5 minutes
  - On `UpdateTrainerProfile`: `InvalidatePrefix("trainer:")` on BOTH caches
  - Delegates `CountTrainers` and `SearchTrainers` to inner

  **Parallelization**: YES (with Tasks 5, 6, 7, 8, 9)
  **Blocked By**: 1, 2, 3

- [ ] 11. Wire cached repos + adapter factory into `internal/app/module.go`

  **What to do**:
  - Create adapter factory functions that produce `Cache[T]` interface implementations:
  ```go
  // internal/infrastructure/cache/factory.go
  package cache

  func NewUserCache(reg *prometheus.Registry, enabled bool) Cache[*models.User] {
      if !enabled {
          return NewNoOpCache[*models.User]()
      }
      metrics := NewCacheMetrics(reg, "cache_user")
      return NewInMemory[*models.User](5*time.Minute, 1*time.Minute, 5000, metrics)
  }
  ```
  - **`NoOpCache[T]`** — implements `Cache[T]` where `Get` always returns miss, `Set`/`Invalidate` are no-ops. This is the kill switch (env var `CACHE_ENABLED=false`).
  - Wire into uber/fx DI:
  ```go
  // Provide cache adapter (swap this to RedisCache later)
  func(cfg *config.Config, reg *prometheus.Registry) cache.Cache[*models.User] {
      return cache.NewUserCache(reg, cfg.CacheEnabled)
  },

  // Provide cached repo (depends on Cache[T] interface, not concrete)
  func(factory *persistence.RepositoryFactory, userCache cache.Cache[*models.User]) repositories.UserRepository {
      return postgres.NewCachedUserRepository(factory.UserRepository(), userCache)
  },
  ```
  - Repeat for: Exercise, MuscleGroup, Equipment, Relationship, TrainerProfile
  - Each domain gets its own `Cache` instance with separate metrics prefix
  - TrainerProfile needs TWO instances (see Task 10): `cache_trainer_id` and `cache_trainer_public` metrics prefixes
  - Add `CacheEnabled bool` to `config.Config` (default true) loaded from env

  **Must NOT do**:
  - Do NOT change any service or handler DI wiring
  - Do NOT create a single shared cache instance — each domain needs independent TTL/maxEntries
  - Do NOT reference `InMemoryCache` from the cached repo layer — only from the factory

  **Parallelization**: NO (sequential — depends on all cached repos + adapters)
  **Blocked By**: 5, 6, 7, 8, 9, 10

  **References**:
  - `backend/internal/app/module.go` — full DI wiring file
  - `backend/internal/config/config.go` — config pattern

- [ ] 12. Integration test — auth middleware user lookup served from cache

  **Why not JWT status claims** (evaluated and rejected):
  - `RefreshToken()` (`auth_service.go:129-144`) re-mints access tokens from refresh-token claims without fetching the user — refreshed tokens would carry a stale (or missing) `status` claim, letting suspended users ride the 7-day refresh chain
  - Ban enforcement delayed up to the 1-hour access-token TTL
  - Tokens issued pre-deploy lack the claim — zero status enforcement until relogin
  - Middleware unchanged + cached repo achieves the same zero-DB goal with immediate enforcement

  **What to do**:
  - `auth_middleware.go` stays UNCHANGED — it keeps calling `userRepo.GetUserByID()`; DI now injects `CachedUserRepository`, so warm-cache requests cost zero DB queries
  - Write integration test (testcontainers, existing pattern): prime cache with one `GetUserByID` call, then issue N more calls through the cached repo — assert inner repo called exactly once (counting decorator around the real repo, or assert `cache_user_hits_total` / `cache_user_misses_total` metric deltas)
  - Assert a suspended user (cached with `Status=suspended`) still gets blocked — cache path preserves enforcement

  **Must NOT do**:
  - Do NOT modify `auth_middleware.go`, `auth_service.go`, or the `InitAuthMiddleware` signature
  - Do NOT add `status` to JWT claims
  - Do NOT add new env vars

  **Parallelization**: NO (depends on module.go wiring working)
  **Blocked By**: 11

  **References**:
  - `backend/internal/api/middleware/auth_middleware.go:62-75` — status check block, stays as-is
  - `backend/internal/infrastructure/persistence/postgres/user_test.go` — testcontainers pattern

- [ ] 13. Verify all tests pass

  **What to do**:
  - Run `go test ./...` from `backend/`
  - Fix any test failures (unlikely — cached repos are transparent, but existing tests may mock `userRepo` and expect exact call counts)
  - Run `go test -race ./internal/infrastructure/cache/...` — verify zero race conditions
  - Manually test: start server, hit auth endpoint 10 times, verify metrics show cache hits
  - Verify `NoOpCache` kill switch: set `CACHE_ENABLED=false`, confirm all requests fall through to DB

  **Parallelization**: NO (sequential — depends on all code changes)
  **Blocked By**: 11, 12

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read plan end-to-end. For each Must Have: verify implementation. For each Must NOT Have: verify no violations.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT`

- [ ] F2. **Cache Hit/Miss Verification** — `unspecified-high`
  Start server, curl authenticated endpoint 10 times (same user). Check `/metrics` — after warm-up, `cache_user_hits_total` ≈ 9 and `cache_user_misses_total` = 1; middleware served status checks from cache with zero JWT changes.
  Output: `Hits [N] | Misses [N] | Auth DB calls [0 expected on warm cache] | VERDICT`

- [ ] F3. **Deep Copy Isolation Test** — `unspecified-high`
  Write a quick integration test: fetch user from cache, mutate returned object, fetch again — verify second fetch returns original data.
  Output: `Deep copy [PASS/FAIL] | VERDICT`

- [ ] F4. **Race Condition Check** — `speculative-analyst`
  Run `go test -race ./internal/infrastructure/...` under load. Verify 0 race warnings.
  Output: `Race check [PASS/FAIL] | VERDICT`

- [ ] F5. **Adapter Pattern Compliance** — `oracle`
  Verify all cached repos depend on `cache.Cache[T]` interface, not concrete `InMemoryCache`. Confirm swap route: "If someone writes `RedisCache`, which files change?" Answer should be: factory.go + module.go only.
  Output: `Interface-only [PASS/FAIL] | Swap route [1-2 files] | VERDICT`

---

## Commit Strategy

- **1-2**: `feat(cache): Add Cache[T] interface and InMemoryCache adapter` — cache/types.go, cache/memory.go
- **3-4**: `feat(cache): Add cache metrics and unit tests` — cache/metrics.go, cache/cache_test.go
- **5-10**: `feat(cache): Add cached repository decorators for 6 repos` — internal/infrastructure/persistence/postgres/*cached*.go
- **11**: `feat(cache): Wire cache adapters + NoOp kill switch into DI` — module.go, cache/factory.go
- **12**: `test(cache): Auth middleware cache-path integration test` — proves 0 DB calls on warm cache
- **13**: `test(cache): Integration tests for cache layer` — verify tests pass

---


## Success Criteria

### Verification Commands
```bash
cd backend
go test -v -race ./internal/infrastructure/cache/...
go test ./internal/infrastructure/persistence/postgres/...
go test ./...
go run cmd/server/main.go &
curl -s http://localhost:8080/metrics | grep cache_
kill %1
```

### Final Checklist
- [ ] All cache unit tests pass with -race
- [ ] All existing tests pass unchanged
- [ ] Auth middleware status check served from cache on warm cache (0 DB calls, enforcement intact)
- [ ] Cache hit ratio >90% for reference data after warm-up
- [ ] Zero memory leaks under sustained load (verify via `pprof`)
- [ ] Kill switch works: `CACHE_ENABLED=false` → no caching, all requests pass through
- [ ] No cached repo imports `InMemoryCache` or any concrete type — only `cache.Cache[T]`
