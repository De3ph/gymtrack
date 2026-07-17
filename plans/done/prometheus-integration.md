# Prometheus Metrics Integration (Backend)

## TL;DR

> **Quick Summary**: Integrate Prometheus instrumentation into the Go/Gin backend using `prometheus/client_golang`. Export basic HTTP metrics (request count, duration histogram, in-flight gauge) plus Go runtime metrics via a `/metrics` endpoint.

> **Deliverables**:
> - Metrics middleware at `internal/api/middleware/metrics_middleware.go`
> - Metrics route at `internal/api/routes/metrics_routes.go`
> - Wiring updates in `internal/app/module.go`
> - `prometheus/client_golang` dependency added to `go.mod`

> **Estimated Effort**: Short (4 implementation tasks)
> **Parallel Execution**: YES — 2 waves + 1 final verification wave
> **Critical Path**: Task 1 → Tasks 2+3 (parallel) → Task 4 → F1-F4

---

## Context

### Original Request
Integrate Prometheus into the backend using `prometheus/client_golang`. Export basic common metrics via a `/metrics` endpoint.

### Interview Summary
**Key Discussions**:
- **Namespace**: `gymtrack` prefix for all custom metrics (e.g. `gymtrack_http_requests_total`)
- **Test Strategy**: No unit tests — only agent-executed QA scenarios
- **Metrics Scope**: HTTP request counter (method, path, status), request duration histogram (method, path), in-flight gauge, Go runtime + process + build info collectors
- **No auth on `/metrics` endpoint**: Public endpoint for Prometheus scraping

**Research Findings**:
- **Backend**: Go 1.25, module `gymtrack-backend`, Gin v1.11.0, uber/fx v1.24.0 for DI
- **Server setup**: `internal/app/module.go` — active `fx.Invoke` block does CORS + Swagger + route registration. `NewApp()` function (lines 198-212) is **dead code** (never wired).
- **Middleware pattern**: Follow `auth_middleware.go` — package-level globals + `InitMetricsMiddleware(registry)` + panic guard + exported `MetricsMiddleware() gin.HandlerFunc`
- **Route registration**: Exercise routes use root engine directly (`RegisterExerciseRoutes(router *gin.Engine, ...)`) — precedent for `/metrics` route
- **No existing Prometheus/metrics** — clean slate
- **Prometheus API**: `promhttp.HandlerFor(registry, opts)` for custom registry; `collectors.NewGoCollector()`, `NewProcessCollector()`, `NewBuildInfoCollector()` for runtime metrics

### Metis Review
**Identified Gaps** (addressed):
- **⚠️ `c.FullPath()` not `c.Request.URL.Path`**: Raw paths cause cardinality explosion (user IDs in URLs). Plan uses `c.FullPath()` with `"unknown"` sentinel for 404s.
- **⚠️ Exclude `/metrics` from self-tracking**: Prevent infinite scrape noise. Plan adds early-skip in middleware.
- **⚠️ Skip OPTIONS preflight**: CORS preflight doubles metric volume. Plan adds OPTIONS skip.
- **⚠️ `defer` for in-flight gauge**: Without defer, handler panics leak in-flight count. Plan mandates defer pattern.
- **⚠️ Status code AFTER `c.Next()`**: Must read `c.Writer.Status()` after handler completes. Plan enforces ordering.
- **⚠️ Pin dependency version**: Don't leave to `go get` default. Plan pins `v1.20.5`.
- **⚠️ `NewApp()` dead code**: Not touched. All changes go in active `fx.Invoke` block only.

---

## Work Objectives

### Core Objective
Integrate Prometheus metrics instrumentation into the gymtrack Go backend, exposing standard HTTP and runtime metrics via a `/metrics` scrape endpoint.

### Concrete Deliverables
- `internal/api/middleware/metrics_middleware.go` — Metrics definitions + Gin middleware
- `internal/api/routes/metrics_routes.go` — `/metrics` endpoint registration
- `internal/app/module.go` — Wiring updates (fx.Provide + fx.Invoke)
- `go.mod` + `go.sum` — Updated with `prometheus/client_golang@v1.20.5`

### Definition of Done
- [ ] `go build ./...` passes with zero errors
- [ ] `curl http://localhost:8080/metrics` returns HTTP 200 in Prometheus text format
- [ ] Output contains `gymtrack_http_requests_total`, `gymtrack_http_request_duration_seconds`, `gymtrack_http_requests_in_flight`
- [ ] Output contains `go_goroutines`, `go_memstats_*` (Go runtime collectors)
- [ ] Hitting any API endpoint increments the counter for that path/method
- [ ] `/metrics` returns 200 without any `Authorization` header

### Must Have
- Custom Prometheus registry (non-global) to avoid polluting default registerer
- Metric namespace prefix: `gymtrack`
- Middleware tracking: request count (CounterVec by method, path, status), duration (HistogramVec by method, path), in-flight gauge
- Go runtime collector + process collector + build info collector
- `/metrics` endpoint accessible at root (not under `/api`)
- `c.FullPath()` for the `path` label (avoids cardinality explosion)
- Empty/missing route path mapped to `"unknown"` sentinel
- `/metrics` path excluded from self-tracking
- OPTIONS preflight requests excluded from tracking
- `defer` pattern for gauge decrement to prevent leaks on panic/abort
- Status code captured via `c.Writer.Status()` after `c.Next()`

### Must NOT Have (Guardrails)
- NO custom business-level metrics (DB query duration, cache hits, etc.)
- NO Grafana dashboards or Prometheus alerting rules
- NO authentication on `/metrics` endpoint
- NO import of domain packages (services, config, models) in metrics middleware
- NO modification of dead `NewApp()` function in module.go
- NO tracking of OPTIONS preflight requests (explicitly skipped)
- NO use of `c.Request.URL.Path` — MUST use `c.FullPath()`

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (no backend test infrastructure for middleware tests)
- **Automated tests**: None (user opted out)
- **Agent-Executed QA**: PRIMARY verification method — each task includes curl-based scenarios

### QA Policy
Every task MUST include agent-executed QA scenarios (see TODO template below).
Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend/API**: Use `bash` (curl) — start server, send requests, assert status + response body content
- **Build verification**: Use `bash` (go build) — compile check

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation, all parallel):
├── Task 1: Add prometheus/client_golang dependency [quick]
├── Task 2: Create metrics middleware [unspecified-high]
└── Task 3: Create metrics route [quick]

Wave 2 (After Wave 1 — wiring):
└── Task 4: Wire into module.go + build verification [deep]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── F1: Plan compliance audit (oracle)
├── F2: Build + compile check (unspecified-high)
├── F3: QA scenario execution (unspecified-high)
└── F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay

Critical Path: Task 1 → Tasks 2+3 (parallel) → Task 4 → F1-F4 → user okay
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 3 (Wave 1)
```

### Dependency Matrix

- **1**: - → 2, 3, 4
- **2**: 1 → 4
- **3**: 1 → 4
- **4**: 2, 3 → F1-F4
- **F1-F4**: 4 → user okay

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1 → `quick`, T2 → `unspecified-high`, T3 → `quick`
- **Wave 2**: 1 task — T4 → `deep`
- **Final**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. Add `prometheus/client_golang` dependency

  **What to do**:
  - Run `cd backend && go get github.com/prometheus/client_golang@v1.20.5` to add the dependency
  - Run `cd backend && go mod tidy` to clean up go.mod and go.sum
  - Verify with `cd backend && go build ./...` (should compile successfully — no source code imports yet, just dependency resolution)
  - **Verify the API surfaces exist**: check that `collectors.NewBuildInfoCollector()` is available in `github.com/prometheus/client_golang/prometheus/collectors` (it was added relatively recently — confirm the v1.20.5 API)

  **Must NOT do**:
  - Do NOT use `@latest` — pin to `v1.20.5` explicitly
  - Do NOT import global default registry — we use a custom registry

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single command execution, dependency management task
  - **Skills**: [`golang-dependency-management`]
    - `golang-dependency-management`: Needed for correct go get / go mod tidy workflow and pinning

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: [Tasks 2, 3, 4]
  - **Blocked By**: None (can start immediately)

  **References**:
  - `backend/go.mod` — Existing dependency list to add to
  - `backend/go.sum` — Will be auto-updated by `go mod tidy`

  **Acceptance Criteria**:
  - [ ] `cd backend && go build ./...` exits 0 (dependency resolves)
  - [ ] `grep "prometheus/client_golang" go.mod` shows `v1.20.5`

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Dependency resolves successfully
    Tool: Bash
    Preconditions: Inside backend/ directory
    Steps:
      1. Run `cd backend && go build ./...`
    Expected Result: Exit code 0, no errors. Compilation succeeds even without importing yet (dependency is present in go.mod).
    Failure Indicators: Compilation error, "missing go.sum entry", unresolved dependency
    Evidence: .omo/evidence/task-1-dependency-build.txt
  ```

  **Evidence to Capture:**
  - [ ] Output of `go build ./...` showing success

  **Commit**: NO (groups with Tasks 2-4)
  - Message: `feat(backend): add Prometheus metrics instrumentation`
  - Files: `backend/go.mod`, `backend/go.sum`
  - Pre-commit: `cd backend && go build ./...`

---

- [ ] 2. Create metrics middleware (`internal/api/middleware/metrics_middleware.go`)

  **What to do**:
  Create a new file at `backend/internal/api/middleware/metrics_middleware.go` with:

  1. **Package-level globals** (following auth_middleware.go pattern):
     - `var metricsRegistry *prometheus.Registry`
     - `var httpRequestsTotal *prometheus.CounterVec` — labels: `method`, `path`, `status`
     - `var httpRequestDuration *prometheus.HistogramVec` — labels: `method`, `path`
     - `var httpRequestsInFlight prometheus.Gauge`
     - `var metricsInitialized bool` — guard flag

  2. **`InitMetricsMiddleware(registry *prometheus.Registry)` function**:
     - Panic-guard: if already initialized, return silently
     - Store `registry` in package global
     - Create counter: `gymtrack_http_requests_total` with labels `method`, `path`, `status`
     - Create histogram: `gymtrack_http_request_duration_seconds` with labels `method`, `path`, using `prometheus.DefBuckets`
     - Create gauge: `gymtrack_http_requests_in_flight` (no labels)
     - Register all three on the provided registry
     - Set `metricsInitialized = true`

  3. **`MetricsMiddleware() gin.HandlerFunc` function**:
     - Panic guard: if `!metricsInitialized { panic("Metrics middleware not initialized...") }`
     - Return gin handler that:
       a. Skip if path == `/metrics` (prevent self-tracking)
       b. Skip if method == `OPTIONS` (prevent CORS preflight noise)
       c. `httpRequestsInFlight.Inc()` then `defer httpRequestsInFlight.Dec()`
       d. Record `start := time.Now()`
       e. Call `c.Next()`
       f. After `c.Next()`: get path from `c.FullPath()`, defaulting to `"unknown"` if empty
       g. Record duration: `httpRequestDuration.WithLabelValues(method, path).Observe(time.Since(start).Seconds())`
       h. Increment counter: `httpRequestsTotal.WithLabelValues(method, path, strconv.Itoa(c.Writer.Status())).Inc()`

  **Must NOT do**:
  - Do NOT import any domain packages (services, config, models)
  - Do NOT use `c.Request.URL.Path` — MUST use `c.FullPath()`
  - Do NOT use the global `prometheus.DefaultRegisterer` — use the custom registry passed via Init
  - Do NOT forget the `defer` for gauge decrement
  - Do NOT add OPTIONS tracking

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires careful implementation of concurrency-safe middleware, defer pattern, and Gin's request lifecycle
  - **Skills**: [`golang-patterns`, `golang-safety`]
    - `golang-patterns`: For idiomatic Go middleware pattern matching auth_middleware.go
    - `golang-safety`: For correct defer usage, nil-safety, and panic handling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: [Task 4]
  - **Blocked By**: Task 1 (dependency must exist to compile)

  **References**:

  **Pattern References**:
  - `internal/api/middleware/auth_middleware.go:1-57` — Full pattern: package-level globals, InitXxxMiddleware() with panic guard, exported XxxMiddleware() returning gin.HandlerFunc. Copy this structure exactly.
  - `internal/app/module.go:155` — How InitAuthMiddleware is called (in fx.Invoke block)

  **External References**:
  - `prometheus/client_golang` docs: CounterVec, HistogramVec, Gauge types
  - `github.com/prometheus/client_golang/prometheus` — package for registry, counter, histogram, gauge
  - `github.com/prometheus/client_golang/prometheus/promhttp` — for InstrumentHandlerCounter/Duration (reference only; we write custom middleware)

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] File exists at `internal/api/middleware/metrics_middleware.go`
  - [ ] `InitMetricsMiddleware` function exists and accepts `*prometheus.Registry`
  - [ ] `MetricsMiddleware` function exists and returns `gin.HandlerFunc`
  - [ ] File compiles: `cd backend && go build ./...` (may fail until Task 4 wires it — test after Task 4)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Middleware file compiles correctly (syntax check)
    Tool: Bash
    Preconditions: Task 1 completed (dependency present)
    Steps:
      1. Run `cd backend && go vet ./internal/api/middleware/metrics_middleware.go`
    Expected Result: No errors or warnings
    Failure Indicators: Syntax errors, undefined prometheus types, wrong import paths
    Evidence: .omo/evidence/task-2-middlware-vet.txt

  Scenario: InitMetricsMiddleware panics if called twice (idempotency check via code review)
    Tool: Bash (grep)
    Preconditions: File exists
    Steps:
      1. Run `grep -c "metricsInitialized" backend/internal/api/middleware/metrics_middleware.go`
    Expected Result: > 0 (guard flag exists, preventing double init)
    Failure Indicators: Guard flag missing — metrics could be double-registered
    Evidence: .omo/evidence/task-2-middlware-guard.txt

  Scenario: FullPath used instead of URL.Path
    Tool: Bash (grep)
    Preconditions: File exists
    Steps:
      1. Run `grep "Request.URL.Path" backend/internal/api/middleware/metrics_middleware.go`
    Expected Result: grep returns no matches (must not use raw URL path)
    Failure Indicators: Uses `c.Request.URL.Path` instead of `c.FullPath()` — cardinality explosion risk
    Evidence: .omo/evidence/task-2-middlware-norawpath.txt
  ```

  **Evidence to Capture:**
  - [ ] `go vet` output for middleware file
  - [ ] grep confirmation of guard flag presence
  - [ ] grep confirmation of no raw URL path usage

  **Commit**: NO (groups with Tasks 3-4)

---

- [ ] 3. Create metrics route (`internal/api/routes/metrics_routes.go`)

  **What to do**:
  Create a new file at `backend/internal/api/routes/metrics_routes.go` with:

  1. **`RegisterMetricsRoutes(router *gin.Engine, registry *prometheus.Registry)` function**:
     - Register `GET /metrics` on the root gin.Engine (not under `/api` group)
     - Use `promhttp.HandlerFor(registry, promhttp.HandlerOpts{})` to create the handler
     - Wrap the handler with `gin.WrapH(httpHandler)` to convert from `http.Handler` to `gin.HandlerFunc`
     - Use `router.GET("/metrics", gin.WrapH(promhttp.HandlerFor(registry, promhttp.HandlerOpts{})))`

  **Files to create**:
  - `backend/internal/api/routes/metrics_routes.go`

  **Must NOT do**:
  - Do NOT register under `/api` group — register on the root engine
  - Do NOT add any auth middleware to this route
  - Do NOT use global `promhttp.Handler()` — use `promhttp.HandlerFor()` with custom registry

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single function, straightforward registration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: [Task 4]
  - **Blocked By**: Task 1 (dependency)

  **References**:

  **Pattern References**:
  - `internal/api/routes/exercise_routes.go` — Follow this pattern for registering routes directly on `*gin.Engine` at root level

  **External References**:
  - `github.com/prometheus/client_golang/prometheus/promhttp` — `HandlerFor()` function
  - `github.com/gin-gonic/gin` — `gin.WrapH()` to wrap net/http handlers

  **Acceptance Criteria**:

  - [ ] File exists at `internal/api/routes/metrics_routes.go`
  - [ ] `RegisterMetricsRoutes` function exists with signature `func(*gin.Engine, *prometheus.Registry)`
  - [ ] Uses `promhttp.HandlerFor` with custom registry (not global `promhttp.Handler()`)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Route file uses correct promhttp API
    Tool: Bash (grep)
    Preconditions: File exists
    Steps:
      1. Run `grep "promhttp.HandlerFor" backend/internal/api/routes/metrics_routes.go`
    Expected Result: Match found (uses custom registry handler)
    Failure Indicators: Uses `promhttp.Handler()` (global default) instead of `promhttp.HandlerFor()`
    Evidence: .omo/evidence/task-3-route-handlerfor.txt

  Scenario: Route file uses gin.WrapH
    Tool: Bash (grep)
    Preconditions: File exists
    Steps:
      1. Run `grep "gin.WrapH" backend/internal/api/routes/metrics_routes.go`
    Expected Result: Match found (wraps http.Handler for Gin)
    Failure Indicators: Missing gin.WrapH — handler won't work in Gin
    Evidence: .omo/evidence/task-3-route-wrap.txt
  ```

  **Evidence to Capture:**
  - [ ] grep output showing `HandlerFor` usage
  - [ ] grep output showing `gin.WrapH` usage

  **Commit**: NO (groups with Tasks 2, 4)

---

- [ ] 4. Wire into module.go + build verification

  **What to do**:
  Modify `backend/internal/app/module.go` to wire the Prometheus metrics infrastructure:

  1. **Add import** for `prometheus/client_golang/prometheus` and `prometheus/client_golang/prometheus/collectors`

  2. **Add `fx.Provide` entry** for the custom registry:
     ```go
     func() *prometheus.Registry {
         reg := prometheus.NewRegistry()
         reg.MustRegister(
             collectors.NewGoCollector(),
             collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
             collectors.NewBuildInfoCollector(),
         )
         return reg
     },
     ```

  3. **In the `fx.Invoke` function** (the active one, lines 136-185):
     - Add `registry *prometheus.Registry` to the parameter list
     - After `middleware.InitAuthMiddleware(cfg, authService)` and before or after CORS, add:
       ```go
       routes.RegisterMetricsRoutes(router, registry)
       ```
     - After `router.Use(cors.New(corsConfig))`, add:
       ```go
       middleware.InitMetricsMiddleware(registry)
       router.Use(middleware.MetricsMiddleware())
       ```

  **Important ordering**: The middleware must be added AFTER CORS (so CORS preflight OPTIONS requests hit our middleware check), but BEFORE route handlers. The order in `router.Use()` determines execution order: first added = first executed.
  - Correct order: `CORS → MetricsMiddleware → (route handlers)`
  - Register `/metrics` route BEFORE the middleware is applied (or rely on the middleware's `/metrics` path skip). Since `RegisterMetricsRoutes` uses `router.GET()` directly (not `router.Use()`), it registers a route, not middleware — so the middleware will wrap it. Our skip logic in Task 2 handles this.

  **So the correct approach:**
  1. `router.Use(cors.New(corsConfig))` — existing
  2. `middleware.InitMetricsMiddleware(registry)` — new (initializes metrics)
  3. `router.Use(middleware.MetricsMiddleware())` — new (applies metrics middleware)
  4. `routes.RegisterMetricsRoutes(router, registry)` — new (registers /metrics endpoint BEFORE route handlers so it can be skipped by middleware)
  5. Swagger + API routes — existing

  Wait — if we register `/metrics` AFTER the middleware is added via `router.Use()`, the middleware will wrap the `/metrics` handler too. That's why we have the path skip in Task 2. So order doesn't matter for correctness. But for clarity, register `/metrics` after the middleware to make it obvious.

  Actually, re-reading the Gin middleware order: `router.Use()` adds middleware to the global chain. `router.GET()` registers a route. All middleware applies to all routes. So the order of `router.GET()` vs `router.Use()` doesn't matter for route registration — the middleware chain is built on the router, not on the order of route registration.

  So the final order in fx.Invoke:
  ```go
  middleware.InitAuthMiddleware(cfg, authService)

  // CORS
  router.Use(cors.New(corsConfig))

  // Prometheus
  middleware.InitMetricsMiddleware(registry)
  router.Use(middleware.MetricsMiddleware())
  routes.RegisterMetricsRoutes(router, registry)

  // Swagger
  router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

  // API routes (unchanged) ...
  ```

  **Must NOT do**:
  - Do NOT modify the dead `NewApp()` function (lines 198-212)
  - Do NOT change the existing auth or CORS setup
  - Do NOT add auth to the `/metrics` route

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires understanding of Gin middleware ordering, uber/fx DI wiring, and careful diffing to avoid breaking existing routes
  - **Skills**: [`golang-patterns`]
    - `golang-patterns`: For correct DI wiring and middleware ordering

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Wave 1)
  - **Blocks**: [F1-F4]
  - **Blocked By**: [Tasks 2, 3] (middleware and route files must exist)

  **References**:

  **Pattern References**:
  - `internal/app/module.go:1-187` — Full file to modify. Active fx.Invoke block at lines 136-185. Dead NewApp() at lines 198-212.
  - `internal/app/module.go:155` — How auth middleware is initialized (call Init function, then router.Use)

  **Acceptance Criteria**:

  - [ ] `cd backend && go build ./...` exits 0
  - [ ] `/metrics` endpoint returns HTTP 200
  - [ ] All 5 metric groups visible: gymtrack_* (custom), go_* (runtime), process_* (process), promhttp_* (handler metrics)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Server starts and /metrics returns 200
    Tool: Bash
    Preconditions: All tasks 1-3 completed. No server running on port 8080.
    Steps:
      1. Start server in background: `cd backend && go run cmd/server/main.go &`
      2. Wait 3 seconds for server to start
      3. Run `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/metrics`
      4. Kill server: `kill %1 2>/dev/null || true`
    Expected Result: HTTP status code 200
    Failure Indicators: Connection refused, 404, 500, timeout
    Evidence: .omo/evidence/task-4-metrics-endpoint.txt

  Scenario: Custom gymtrack_ metrics present
    Tool: Bash
    Preconditions: Server running
    Steps:
      1. Run `curl -s http://localhost:8080/metrics | grep "^gymtrack_"`
    Expected Result: At least 3 lines: gymtrack_http_requests_total, gymtrack_http_request_duration_seconds, gymtrack_http_requests_in_flight
    Failure Indicators: No gymtrack_ metrics — middleware not registered or metrics not initialized
    Evidence: .omo/evidence/task-4-custom-metrics.txt

  Scenario: Go runtime metrics present
    Tool: Bash
    Preconditions: Server running
    Steps:
      1. Run `curl -s http://localhost:8080/metrics | grep "^go_"`
    Expected Result: Multiple go_* metrics (go_goroutines, go_memstats_alloc_bytes, etc.)
    Failure Indicators: No go_ metrics — Go collector not registered
    Evidence: .omo/evidence/task-4-go-metrics.txt

  Scenario: Prometheus exposition format (starts with # HELP)
    Tool: Bash
    Preconditions: Server running
    Steps:
      1. Run `curl -s http://localhost:8080/metrics | head -1`
    Expected Result: First line starts with "# HELP" (Prometheus text format)
    Failure Indicators: Empty output, HTML output, JSON output
    Evidence: .omo/evidence/task-4-format-check.txt

  Scenario: Request increments counter
    Tool: Bash
    Preconditions: Server running
    Steps:
      1. Run `curl -s http://localhost:8080/metrics > /dev/null`  (warm-up)
      2. Run `BEFORE=$(curl -s http://localhost:8080/metrics | grep 'gymtrack_http_requests_total{' | grep 'path="/api/exercises"' || echo "0")`
      3. Run `curl -s http://localhost:8080/api/exercises > /dev/null 2>&1 || true`
      4. Run `AFTER=$(curl -s http://localhost:8080/metrics | grep 'gymtrack_http_requests_total{' | grep 'path="/api/exercises"' || echo "0")`
      5. Check that AFTER != BEFORE
    Expected Result: Counter for path="/api/exercises" increased by 1
    Failure Indicators: Counter didn't increment, path label uses raw URL (/api/exercises without wildcards is correct here since the route matches exactly)
    Evidence: .omo/evidence/task-4-counter-increment.txt

  Scenario: In-flight gauge returns to 0
    Tool: Bash
    Preconditions: Server running
    Steps:
      1. Run `curl -s http://localhost:8080/metrics | grep 'gymtrack_http_requests_in_flight'`
      2. Check the value after the label (format: `gymtrack_http_requests_in_flight <value>`)
    Expected Result: Value is 0 (no pending requests at scrape time)
    Failure Indicators: Gauge stuck at non-zero value — missing defer on gauge decrement
    Evidence: .omo/evidence/task-4-inflight.txt

  Scenario: OPTIONS requests not tracked (skip preflight)
    Tool: Bash
    Preconditions: Server running
    Steps:
      1. Run `OPTIONS_COUNT_BEFORE=$(curl -s http://localhost:8080/metrics | grep 'method="OPTIONS"' | wc -l)`
      2. Run `curl -X OPTIONS -s -o /dev/null http://localhost:8080/api/users`
      3. Run `OPTIONS_COUNT_AFTER=$(curl -s http://localhost:8080/metrics | grep 'method="OPTIONS"' | wc -l)`
      4. Check that OPTIONS_COUNT_AFTER == OPTIONS_COUNT_BEFORE
    Expected Result: No new OPTIONS metric entries
    Failure Indicators: OPTIONS requests being tracked — add method check in middleware
    Evidence: .omo/evidence/task-4-options-skip.txt

  Scenario: /metrics endpoint excluded from self-tracking
    Tool: Bash
    Preconditions: Server running
    Steps:
      1. Run `curl -s http://localhost:8080/metrics | grep 'path="/metrics"' || echo "NOT_FOUND"`
    Expected Result: "NOT_FOUND" — no path="/metrics" entries in tracked metrics
    Failure Indicators: Self-scraping creating metric entries — add path skip in middleware
    Evidence: .omo/evidence/task-4-self-skip.txt

  Scenario: Unknown route returns path="unknown" label
    Tool: Bash
    Preconditions: Server running
    Steps:
      1. Run `curl -s http://localhost:8080/nonexistent > /dev/null 2>&1 || true`
      2. Run `curl -s http://localhost:8080/metrics | grep 'path="unknown"'`
    Expected Result: Metric entry with path="unknown" and status="404"
    Failure Indicators: No unknown path entries — FullPath() returns "" and not mapped to sentinel
    Evidence: .omo/evidence/task-4-unknown-path.txt

  Scenario: No auth required on /metrics
    Tool: Bash
    Preconditions: Server running
    Steps:
      1. Run `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/metrics`
    Expected Result: HTTP 200 (no 401/403)
    Failure Indicators: 401 — auth middleware applied to /metrics
    Evidence: .omo/evidence/task-4-no-auth.txt
  ```

  **Evidence to Capture:**
  - [ ] Each QA scenario evidence file
  - [ ] go build output
  - [ ] curl output for metrics endpoint
  - [ ] Grep results for metrics presence

  **Commit**: YES (groups with Tasks 1-3)
  - Message: `feat(backend): add Prometheus metrics instrumentation`
  - Files: `internal/app/module.go`, `internal/api/middleware/metrics_middleware.go`, `internal/api/routes/metrics_routes.go`, `go.mod`, `go.sum`
  - Pre-commit: `cd backend && go build ./...`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Build + Static Analysis** — `unspecified-high`
  Run `cd backend && go build ./...` (exit 0). Run `go vet ./...` (clean). Review changed files for: unused imports, potential nil dereferences, defer misuse. Check no domain package leaks into middleware.
  Output: `Build [PASS/FAIL] | Vet [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state (stop any running server). Start server via `go run cmd/server/main.go &`. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (metrics from real API endpoints + Go runtime metrics). Save to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Tasks 1-4** grouped into 1 commit: `feat(backend): add Prometheus metrics instrumentation`

---

## Success Criteria

### Verification Commands
```bash
cd backend && go build ./...  # Expected: exit 0
curl -s http://localhost:8080/metrics  # Expected: HTTP 200, Prometheus text format
curl -s http://localhost:8080/metrics | grep "^gymtrack_"  # Expected: custom metrics present
curl -s http://localhost:8080/metrics | grep "^go_"  # Expected: Go runtime metrics present
```

### Final Checklist
- [ ] `go build ./...` passes
- [ ] `/metrics` returns 200 without auth
- [ ] Custom metrics present (gymtrack_*)
- [ ] Go runtime metrics present (go_*)
- [ ] Process metrics present (process_*)
- [ ] Hitting an endpoint increments counter
- [ ] In-flight gauge returns to 0 after requests
- [ ] OPTIONS requests not tracked
- [ ] Self-scraping /metrics not tracked
- [ ] Unknown routes produce `path="unknown"` metric
