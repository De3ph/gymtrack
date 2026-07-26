# Backend Concurrency Review & Remediation Plan

**Status**: 🟡 Plan reviewed 2026-07-26 — all findings remain valid, none remediated yet.

## Context

Audited the Go backend (`D:\Dev\gymtrack\backend`, Gin + pgxpool/PostgreSQL, uber fx DI)
for concurrency correctness. Goal: find goroutine leaks, missing context propagation,
ownership violations, and unprotected shared state, then produce a remediation plan.

**Headline:** The backend is unusually concurrency-sane for a CRUD service. Every HTTP handler
passes `c.Request.Context()` straight through to services and repositories, which use
`pool.Query(ctx, ...)` / `pool.Exec(ctx, ...)` / `pool.Begin(ctx)`. The connection pool is
explicitly bounded. `defer cancel()` is used wherever a timeout context is created. The real
issues are narrow and concentrated in server lifecycle, one CLI tool, and middleware globals.

## Findings (ranked by severity)

| # | Severity | Finding | File (current) | Status |
|---|----------|---------|----------------|--------|
| 1 | **HIGH** | No graceful HTTP server shutdown — `OnStop` never calls `srv.Shutdown()` | `internal/app/module.go:245-260` | ❌ Open |
| 2 | LOW | CLI signal handler hard-exits via `os.Exit(0)`, skipping defers | `cmd/migrate/main.go:43-49` | ❌ Open |
| 3 | LOW | `context.Background()` for long CLI operations (uncancellable) | `cmd/migrate/main.go:124`, `cmd/ensure-schema/main.go:265` | ❌ Open |
| 4 | LOW | Package-level mutable globals in middleware (latent race / test isolation) | `auth_middleware.go:16-20`, `metrics_middleware.go:11-17` | ❌ Open |
| 5 | INFO | No race detector / `go vet` in CI; no backend Makefile | — | ❌ Open |
| 6 | INFO | `NewApp` dead code — never invoked, only `RepositoryModule` used | `module.go:223-238` | ❌ Open |

### 1. [HIGH] No graceful HTTP server shutdown — `internal/app/module.go:245-260`
`StartServer` runs the server in a fire-and-forget goroutine and the `OnStop` hook only
logs:

```go
go func() {
    if err := router.Run(":8080"); err != nil { log.Printf("Server error: %v", err) }
}()
// OnStop: log.Println("Shutting down server..."); return nil   <-- no Shutdown()
```

`router.Run` = `http.ListenAndServe`. `fx.Run()` handles SIGINT/SIGTERM and fires `OnStop`,
but `OnStop` never calls `srv.Shutdown`. When the signal arrives, `main` returns and the
process exits, abruptly killing the server goroutine:
- In-flight requests are cut mid-flight (no drain).
- Keep-alive connections are not closed cleanly.
- The `ListenAndServe` goroutine leaks until process death.

This is the highest-value fix.

### 2. [LOW] CLI signal handler hard-exits, bypassing defers — `cmd/migrate/main.go:43-49`
```go
sigCh := make(chan os.Signal, 1)
signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
go func() { <-sigCh; fmt.Println("Shutting down..."); os.Exit(0) }()
```
`os.Exit(0)` skips deferred `pool.Close()` / `cluster.Close(nil)` — DB/Couchbase connections
leak on Ctrl-C. Fire-and-forget goroutine also leaks on normal completion. Acceptable for a
short-lived migration CLI, but should let `main` return naturally so defers run.

### 3. [LOW] `context.Background()` for long CLI operations
- `cmd/migrate/main.go:124` — `RunMigration(ctx, ...)` with `context.Background()`; an
  in-progress migration cannot be cancelled on shutdown.
- `cmd/ensure-schema/main.go:265` — same pattern for schema setup.
Minor; these are batch tools. Noting for completeness.

### 4. [LOW] Package-level mutable globals in middleware (latent race / test-isolation)
- `internal/api/middleware/auth_middleware.go:16-20` — `appConfig`, `authService`, `userRepo` written by
  `InitAuthMiddleware` (line 22).
- `internal/api/middleware/metrics_middleware.go:11-17` — registry + metric vectors +
  `metricsInitialized` bool written by `InitMetricsMiddleware` (line 19).

Today these are written **once during fx startup, before the server accepts traffic**, so
there is no live data race. But they are unprotected mutable package state: a concurrent or
post-startup call to `Init*` would race, and they make unit tests non-isolated. (Prometheus
metric vectors themselves are concurrency-safe internally — only the *globals* are the smell.)

### 5. [INFO] No race detector / vet in CI; no backend Makefile
No `-race`, `go vet`, or `goleak` anywhere in repo config; no backend CI workflow or Makefile.
Backend tests are run ad hoc. Process gap, not a code bug.

### 6. [INFO] Dead code: `NewApp` — `internal/app/module.go:223-238`
`NewApp` is never invoked (`cmd/server/main.go:19-21` uses only `RepositoryModule` with its
`fx.Invoke` blocks). `NewApp` duplicates route setup and `InitAuthMiddleware` call — confirmed
unused. Safe to delete. No double-init actually occurs today.

### Positives (no action)
- Context propagation: every handler in `internal/api/handlers/*` uses `c.Request.Context()`
  (and `auth_handler.go:59,124,188` adds a 5s request timeout with `defer cancel()`).
- Pool: `internal/config/postgres.go:23-26` sets `MaxConns=25`, `MinConns=2`, lifetime/idle
  bounds. Pool exhaustion is not a risk.
- `internal/repository/postgres/invitation.go:134` checks `ctx.Done()` before work — good.
- No `sync.Mutex`/`errgroup`/`WaitGroup`/channel misuse found in app code.

## Remediation Plan (recommended approach)

### Step 1 — Graceful shutdown  [HIGH]  — `internal/app/module.go`
Rewrite `StartServer` to use an explicit `http.Server` and shut it down in `OnStop`. `fx`
already installs the SIGINT/SIGTERM handler, so no extra `signal.Notify` is needed.

```go
import "net/http" // add to imports

func StartServer(lc fx.Lifecycle, router *gin.Engine) {
	var srv *http.Server
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			srv = &http.Server{Addr: ":8080", Handler: router}
			go func() {
				if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
					log.Printf("Server error: %v", err)
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			log.Println("Shutting down server...")
			shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			return srv.Shutdown(shutdownCtx) // drains in-flight requests, closes conns
		},
	})
}
```
Keep the `srv` variable captured in the closure so `OnStop` can reference it.

### Step 2 — CLI cleanup  [LOW]  — `cmd/migrate/main.go`
Replace the `os.Exit` goroutine so defers run. Simplest: drop the goroutine entirely and let
the signal abort the blocking `RunMigration`; or capture a cancellable context and cancel it in
the signal handler, returning from `main` normally so `defer pool.Close()` / `defer cluster.Close()`
execute. (Migrate CLI only — low priority.)

### Step 3 — Middleware dependency injection  [LOW]  — `internal/api/middleware/*`
Replace package globals with fx-injected dependencies:
- `auth_middleware.go`: make `JWTAuthMiddleware(cfg *config.Config, svc *services.AuthService) gin.HandlerFunc`
  a constructor; delete `InitAuthMiddleware` and the globals.
- `metrics_middleware.go`: make `MetricsMiddleware(reg *prometheus.Registry) gin.HandlerFunc`
  register its vectors once (guard with a local `sync.Once` or register at provider construction)
  and delete the `metricsInitialized` global.
Wire both via `fx.Provide` in `module.go`. Preserves current behavior, removes latent race and
test-isolation hazard. (Optional but recommended.)

### Step 4 — CI / tooling hardening  [INFO]
Add a backend CI workflow (or `backend/Makefile`) running:
- `go vet ./...`
- `go test -race ./...`  (repo tests need `POSTGRES_TEST_DSN` — see `AGENTS.md`)
Optionally add `go.uber.org/goleak` to any long-running/background-goroutine tests.

### Step 5 — Remove dead code  [INFO]
Delete `NewApp` (`module.go:223-238`) and the `AppProvider` struct (`module.go:213-221`).
No replacement needed — `RepositoryModule`'s `fx.Invoke` already wires InitAuthMiddleware
and all routes. `cmd/server/main.go` is unchanged.

## Verification

1. `cd backend && go build ./...` — compiles.
2. `go vet ./...` — clean.
3. `go test -race ./internal/...` — pass (requires `POSTGRES_TEST_DSN`; per `AGENTS.md`).
4. Manual graceful-shutdown check:
   - `go run ./cmd/server` (or built binary), send a request, then `Ctrl-C`.
   - Expect log `Shutting down server...` with **no panic**, and an in-flight request should
     complete rather than be reset.
5. Confirm pool bounds unchanged (`internal/config/postgres.go:23-26`, `MaxConns=25`).
