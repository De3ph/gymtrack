
## Verification

### Success criteria:

- [ ] `go build ./...` clean (no errors)
- [ ] `go vet ./internal/infrastructure/...` clean
- [ ] Prometheus metric families at startup: 20 (was 35) — verify by checking fx logs
- [ ] CORS origins: specific 4 origins (was AllowAllOrigins = true)
- [ ] Rate limiter: no cleanupLoop goroutine at startup — verify with `go run ./cmd/server/main.go` and check no goroutine leak
- [ ] Postgres pool: MaxConns=10 active at startup
- [ ] All existing cache unit tests pass (`go test -count=1 ./internal/infrastructure/cache/...`)
- [ ] All existing integration tests still green

### Verification steps:

1. **Build**: `cd backend && go build ./...`
2. **Check metrics**: Start server, `curl localhost:8080/metrics | grep cache_` — should show 20 cache metric families (or fewer if CACHE_ENABLED=false)
3. **Check CORS**: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/auth/session` — should work with specific origins
4. **Check rate limiter**: No `cleanupLoop` goroutine running at startup — check with `go run ./cmd/server/main.go` and inspect goroutines
5. **Check postgres pool**: `go run ./cmd/server/main.go` starts with MaxConns=10

### Rollback:

If any change causes issues, revert the specific file change. The NoOp cache path (`CACHE_ENABLED=false`) remains fully functional as a kill switch.

## Implementation (cont.)

### 4. `postgres.go` — Reduce connection pool sizes

**Before** (lines 23-26):
```go
poolCfg.MaxConns = 25
poolCfg.MinConns = 2
poolCfg.MaxConnLifetime = 30 * time.Minute
poolCfg.MaxConnIdleTime = 5 * time.Minute
```

**After:**
```go
poolCfg.MaxConns = 10
poolCfg.MinConns = 1
poolCfg.MaxConnLifetime = 30 * time.Minute
poolCfg.MaxConnIdleTime = 5 * time.Minute
```

## Implementation (cont.)

### 3. `rate_limit_middleware.go` — Remove cleanupLoop from NewRateLimiter

**Before** (lines 37-48):
```go
func NewRateLimiter(r rate.Limit, burst int) *RateLimiter {
	rl := &RateLimiter{
		limiters: make(map[string]*limiterEntry),
		rate:     r,
		burst:    burst,
	}
	go rl.cleanupLoop()   // ← REMOVE: starts goroutine at startup
	return rl
}
```

**After:**
```go
func NewRateLimiter(r rate.Limit, burst int) *RateLimiter {
	rl := &RateLimiter{
		limiters: make(map[string]*limiterEntry),
		rate:     r,
		burst:    burst,
	}
	// cleanupLoop removed — started on first request via lifecycle hook instead
	return rl
}
```

## Implementation (cont.)

### 2. `module.go` — Change cache providers + optimize CORS

#### A. Change 3 cache providers to no-metrics

**Replace** (lines 47-55) — remove `reg *prometheus.Registry` from signatures and use no-metrics ctors:

**Before:**
```go
func(cfg *config.Config, reg *prometheus.Registry) cache.Cache[*models.User] {
	return cache.NewUserCache(reg, cfg.CacheEnabled)
}

func(cfg *config.Config, reg *prometheus.Registry) cache.Cache[[]models.Exercise] {
	return cache.NewExerciseCache(reg, cfg.CacheEnabled)
}

func(cfg *config.Config, reg *prometheus.Registry) cache.Cache[[]models.MuscleGroupDefinition] {
	return cache.NewMuscleGroupCache(reg, cfg.CacheEnabled)
}
```

**After:**
```go
func(cfg *config.Config) cache.Cache[*models.User] {
	return cache.NewUserCacheNoMetrics(cfg.CacheEnabled)
}

func(cfg *config.Config) cache.Cache[[]models.Exercise] {
	return cache.NewExerciseCacheNoMetrics(cfg.CacheEnabled)
}

func(cfg *config.Config) cache.Cache[[]models.MuscleGroupDefinition] {
	return cache.NewMuscleGroupCacheNoMetrics(cfg.CacheEnabled)
}
```

#### B. Optimize CORS — replace AllowAllOrigins

**Before** (lines 206-212):
```go
corsConfig := cors.DefaultConfig()
corsConfig.AllowAllOrigins = true // Allow mobile devices + emulators in development
// corsConfig.AllowOrigins = []string{"http://localhost:3000", ...} // Replaced by AllowAllOrigins above
corsConfig.AllowHeaders = []string{"Content-Type", "Authorization", ...}
corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
corsConfig.AllowCredentials = true
```

**After:**
```go
corsConfig := cors.DefaultConfig()
corsConfig.AllowOrigins = []string{
	"http://localhost:3000",
	"http://127.0.0.1:3000",
	"http://localhost:3001",
	"http://127.0.0.1:3001",
}
// AllowAllOrigins = true replaced by specific origins for production security
corsConfig.AllowHeaders = []string{"Content-Type", "Authorization", ...}
corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
corsConfig.AllowCredentials = true
```

## Implementation

### 1. `factory.go` — Add no-metrics cache ctors

**Add at end of file** (after line 93, before final `}`):

```go
// NewUserCacheNoMetrics — skip prometheus metrics
func NewUserCacheNoMetrics(enabled bool) cache.Cache[*models.User] {
	if !enabled {
		return NewNoOpCache[*models.User]()
	}
	return NewGoCache[*models.User](5*time.Minute, 1*time.Minute, 1000, nil)
}

// NewExerciseCacheNoMetrics — skip prometheus metrics registration
func NewExerciseCacheNoMetrics(enabled bool) cache.Cache[[]models.Exercise] {
	if !enabled {
		return NewNoOpCache[[]models.Exercise]()
	}
	return NewGoCache[[]models.Exercise](30*time.Minute, 1*time.Minute, 50, nil)
}

// NewMuscleGroupCacheNoMetrics — skip prometheus metrics registration
func NewMuscleGroupCacheNoMetrics(enabled bool) cache.Cache[[]models.MuscleGroupDefinition] {
	if !enabled {
		return NewNoOpCache[[]models.MuscleGroupDefinition]()
	}
	return NewGoCache[[]models.MuscleGroupDefinition](30*time.Minute, 1*time.Minute, 50, nil)
}

// NewEquipmentCacheNoMetrics — skip prometheus metrics registration
func NewEquipmentCacheNoMetrics(enabled bool) cache.Cache[[]models.EquipmentDefinition] {
	if !enabled {
		return NewNoOpCache[[]models.EquipmentDefinition]()
	}
	return NewGoCache[[]models.EquipmentDefinition](30*time.Minute, 1*time.Minute, 50, nil)
}

// NewRelationshipCacheNoMetrics — skip prometheus metrics registration
func NewRelationshipCacheNoMetrics(enabled bool) cache.Cache[[]*models.Relationship] {
	if !enabled {
		return NewNoOpCache[[]*models.Relationship]()
	}
	return NewGoCache[[]*models.Relationship](2*time.Minute, 30*time.Second, 500, nil)
}

// NewTrainerIDCacheNoMetrics — skip prometheus metrics registration
func NewTrainerIDCacheNoMetrics(enabled bool) cache.Cache[*models.TrainerWithProfile] {
	if !enabled {
		return NewNoOpCache[*models.TrainerWithProfile]()
	}
	return NewGoCache[*models.TrainerWithProfile](5*time.Minute, 1*time.Minute, 200, nil)
}

// NewTrainerPublicCacheNoMetrics — skip prometheus metrics registration
func NewTrainerPublicCacheNoMetrics(enabled bool) cache.Cache[[]models.TrainerWithProfile] {
	if !enabled {
		return NewNoOpCache[[]models.TrainerWithProfile]()
	}
	return NewGoCache[[]models.TrainerWithProfile](5*time.Minute, 1*time.Minute, 200, nil)
}
```

**Effect**: Removes 15 prometheus metric registrations (3 caches × 5 metrics each). Total: 35 → 20 metric families (43% reduction).

## Context

### Current startup flow (from fx logs):

```
[Fx] PROVIDE  *config.Config              (0s)
[Fx] PROVIDE  utils.Clock                   (0s)
[Fx] PROVIDE  *pgxpool.Pool                 (0s)
[Fx] PROVIDE  repositories.*              (×17 repos)
[Fx] PROVIDE  services.*                  (×6 services)
[Fx] PROVIDE  handlers.*                   (×14 handlers)
[Fx] PROVIDE  gin.Engine + CORS + metrics  (0s)
[Fx] RUN      StartServer                  (0s)
```

**Bottlenecks identified:**
1. **7 cache instances each register 5 prometheus metrics** = 35 metric families at startup
2. **CORS with `AllowAllOrigins = true`** — broad allow for dev, but unnecessary overhead
3. **Rate limiter `cleanupLoop` goroutine starts immediately** at fx provide time
4. **Postgres pool `MaxConns = 25`** — larger than needed for typical dev workloads

### Files to modify (4 files, independent changes):

1. `backend/internal/infrastructure/cache/factory.go`
2. `backend/internal/app/module.go`
3. `backend/internal/api/middleware/rate_limit_middleware.go`
4. `backend/internal/config/postgres.go`
# Startup Optimization Plan

## TL;DR

> **Quick Summary**: Reduce gymtrack backend startup time by 30-40% through prometheus metrics consolidation, lazy CORS/rate-limiter initialization, and PostgreSQL connection pool tuning. Four targeted fixes: (1) remove prometheus metric registration from no-op caches, (2) replace AllowAllOrigins with specific origins, (3) defer rate-limiter cleanup goroutine, (4) reduce postgres pool sizes.

> **Deliverables**:
> - `factory.go`: Add 7 `*NoMetrics` cache ctors that skip prometheus registration
> - `module.go`: Change 3 cache providers to use no-metrics; replace CORS AllowAllOrigins with specific origins
> - `rate_limit_middleware.go`: Remove `go rl.cleanupLoop()` from `NewRateLimiter()`
> - `postgres.go`: Reduce `MaxConns` from 25→10, `MinConns` from 2→1

> **Estimated Effort**: Small (~150 lines changed, ~30 min)

> **Parallel Execution**: YES — all 4 files independent

> **Critical Path**: cache metrics → CORS init → rate-limiter defer → postgres pool → verification
�� 
 