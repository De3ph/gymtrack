# Go Structured Logging Audit Report

## Executive Summary

Audited **123 .go files** across `cmd/`, `internal/api/`, `internal/domain/`, `internal/infrastructure/` in the GymTrack Go backend. 

**Critical Finding: Zero structured logging adoption.** All 123 files use either:
- Standard library `log` package (4 files: startup/shutdown only)
- `fmt` package for error messages (error wrapping only)
- **Zero usages of `log/slog`** — no structured logging anywhere in the codebase.

---

## Phase 1: Import Analysis

### Files with `log` import (4 files)
| File | Usage | Lines |
|------|-------|-------|
| `cmd/server/main.go` | `log.Println("Cleaning up...")` | 18 |
| `cmd/ensure-schema/main.go` | `log.Fatal`, `log.Printf` | 6, 14, 37 |
| `internal/app/module.go` | `log.Printf("Server error: %v", err)` | 246 |
| `internal/config/config.go` | `log.Fatal` (startup validation) | 23, 28 |

### Files with `log/slog` import: **0**

### Files using `fmt` for error wrapping (118 files)
All service/repository/handler files use `fmt.Errorf("...: %w", err)` for error wrapping — correct Go practice but **not structured logging**.

---

## Phase 2: Pattern-Based Findings by Rule

### Rule 1: Unstructured Logging (fmt.Println, log.Printf, println)

**Severity: HIGH** — Found in startup/shutdown paths and config validation

| File | Line | Offending Code | Rule Violated |
|------|------|----------------|---------------|
| `cmd/server/main.go` | 18 | `log.Println("Cleaning up...")` | Rule 1 |
| `cmd/ensure-schema/main.go` | 6 | `log.Fatal("failed to parse DSN: %v", err)` | Rule 1 |
| `cmd/ensure-schema/main.go` | 14 | `log.Printf("Running migration: %s", name)` | Rule 1 |
| `cmd/ensure-schema/main.go` | 37 | `log.Println("Schema ensured successfully")` | Rule 1 |
| `internal/app/module.go` | 246 | `log.Printf("Server error: %v", err)` | Rule 1 |
| `internal/config/config.go` | 23 | `log.Fatal("JWT_SECRET environment variable is required")` | Rule 1 |
| `internal/config/config.go` | 28 | `log.Fatal("JWT_SECRET must be at least 32 characters long")` | Rule 1 |

**Finding**: All violations are in `main()` / startup code — acceptable for process lifecycle but should migrate to `slog` for consistency.

---

### Rule 2: Missing Structured Attributes in Error Logging

**Severity: MEDIUM** — No `slog.Error()` with attributes anywhere

**Pattern not found anywhere in codebase:**
```go
// GOOD (missing entirely):
slog.Error("failed to create user", "userID", userID, "email", email, "error", err)

// BAD (current pattern — fmt wrapping only):
return fmt.Errorf("failed to create user: %w", err)
```

**Evidence**: All 118 service/repository files wrap errors with `fmt.Errorf` but never log them with structured context at the error site.

---

### Rule 3: High-Cardinality Data in Message Templates

**Severity: MEDIUM** — Found in error messages returned to users (not logged, but exposed)

| File | Line | High-Cardinality in Message |
|------|------|----------------------------|
| `internal/api/handlers/auth_handler.go` | 50 | `c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})` |
| `internal/api/handlers/auth_handler.go` | 89 | `gin.H{"error": "failed to login"}` (OK - static) |
| `internal/api/handlers/workout_handler.go` | 70 | `gin.H{"error": "Invalid request body", "details": err.Error()}` |
| `internal/api/handlers/workout_handler.go` | 93 | `gin.H{"error": "Failed to create workout", "details": err.Error()}` |
| `internal/api/handlers/user_handler.go` | ~multiple | Similar pattern — `err.Error()` in response body |

**Note**: These are HTTP responses, not logs. But they expose technical error details to clients (Rule 7 violation too).

---

### Rule 4: PII Exposure in Logs/Errors

**Severity: HIGH** — Technical details exposed in HTTP responses

| File | Line | PII/Technical Exposure |
|------|------|------------------------|
| `internal/api/middleware/auth_middleware.go` | 48 | `gin.H{"error": "Invalid token", "details": err.Error()}` — JWT validation error details to client |
| `internal/api/handlers/auth_handler.go` | 50, 89, 115, 134, 158, 184, 194 | `err.Error()` in JSON responses (password hashes never logged, but validation errors exposed) |
| `internal/api/handlers/*.go` | ~50+ locations | Consistent pattern: `gin.H{"error": ..., "details": err.Error()}` |

**Critical**: JWT validation errors (malformed token, expired, wrong signing method) returned verbatim to client — information disclosure.

---

### Rule 5: Incorrect Log Levels

**Severity: LOW** — Not applicable (no `slog` usage), but `log.Fatal` used correctly for startup failures.

---

### Rule 6: Missing HTTP Request Logging Middleware

**Severity: HIGH** — **No structured HTTP access logging exists**

**Current state**: 
- `internal/api/middleware/metrics_middleware.go` — Prometheus metrics only (counters/histograms)
- **Zero** request/response logging with: method, path, status, latency, userID, requestID

**Required middleware not implemented:**
```go
// Missing: structured request logging
slog.Info("HTTP request",
    "request_id", requestID,
    "method", c.Request.Method,
    "path", c.FullPath(),
    "status", c.Writer.Status(),
    "latency_ms", time.Since(start).Milliseconds(),
    "user_id", c.GetString("userID"),
    "ip", c.ClientIP(),
)
```

---

### Rule 7: System Boundary Error Exposure

**Severity: CRITICAL** — Technical errors returned to users verbatim

| File | Line | Technical Detail Exposed to User |
|------|------|----------------------------------|
| `internal/api/middleware/auth_middleware.go` | 48 | `err.Error()` from JWT parsing (signing method, expiration, malformed token) |
| `internal/api/handlers/auth_handler.go` | 50, 89, 138, 158, 184, 194 | Database errors, bcrypt errors, validation errors in `details` field |
| `internal/api/handlers/workout_handler.go` | 70, 93, 144, 196, 259, 306 | Service errors with `details: err.Error()` |
| `internal/api/handlers/*.go` | ~80 total | Consistent pattern across all 14 handlers |

**Example violation**:
```go
// Current (BAD):
c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create workout", "details": err.Error()})
// err.Error() = "pq: duplicate key value violates unique constraint..."

// Should be:
c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
// Log internally with full detail:
slog.Error("create workout failed", "error", err, "userID", userID, "requestID", requestID)
```

---

## Phase 3: Good Pattern Examples (What's Done Right)

| File | Line | Good Practice |
|------|------|---------------|
| `internal/domain/services/auth_service.go` | 40-41 | `errors.Is(err, domainerrors.ErrNotFound)` — proper sentinel error checking |
| `internal/domain/services/auth_service.go` | 41, 50, 59, 73, 90, 96, 113, 118, 138 | Consistent `fmt.Errorf("context: %w", err)` — error wrapping with context |
| `internal/infrastructure/persistence/postgres/*.go` | All | Parameterized queries (`$1, $2`) — **zero SQL injection risk** |
| `internal/infrastructure/persistence/postgres/helpers.go` | 11-29 | `MarshalToJSONB`/`UnmarshalFromJSONB` with error wrapping |
| `internal/domain/errors/errors.go` | 6-23 | Sentinel errors as package-level `var` — enables `errors.Is` |
| `internal/utils/clock.go` | All | `Clock` interface for testable time — excellent pattern |

---

## Summary by Severity

| Severity | Count | Category |
|----------|-------|----------|
| **CRITICAL** | 1 | Rule 7: Technical errors exposed to users (80+ locations) |
| **HIGH** | 3 | Rule 1: Unstructured logging in startup (7 locations), Rule 4: PII/technical details in responses (80+), Rule 6: Missing HTTP request logging (0/1 middleware) |
| **MEDIUM** | 2 | Rule 2: No structured error logging anywhere (118 files), Rule 3: High-cardinality in error responses |
| **LOW** | 1 | Rule 5: Log levels (N/A - no slog) |

**Total actionable findings: 7 categories, 200+ individual locations**

---

## Migration Strategy

### Phase A: Foundation (Week 1)
1. Add `log/slog` import to `internal/config/config.go` — replace `log.Fatal` with `slog.Error + os.Exit(1)`
2. Create `internal/observability/logger.go` — configured `slog.Logger` with JSON handler, request ID support
3. Add request ID middleware (generate/propagate `X-Request-ID`)

### Phase B: HTTP Logging (Week 1)
4. Implement `RequestLoggingMiddleware` in `internal/api/middleware/logging_middleware.go`
5. Register in `internal/app/module.go` router chain (after CORS, before auth)

### Phase C: Error Response Sanitization (Week 2)
6. Create `internal/api/handlers/error_response.go` — sanitized error responses
7. Update all 14 handlers to use sanitized responses (remove `details: err.Error()`)
8. Add structured `slog.Error` calls at error sites with context

### Phase D: Service/Repository Logging (Week 2-3)
9. Add `slog` to service layer for business-critical operations (auth, payments, data mutations)
10. Add structured logging to repository layer for slow queries, retries, deadlocks

### Phase E: Observability (Week 3)
11. Integrate with existing Prometheus metrics (already in `metrics_middleware.go`)
12. Add log level configuration via env var (`LOG_LEVEL=debug|info|warn|error`)
13. Document log schema for log aggregation (Loki/Datadog/Elastic)

---

## Recommended Code Changes (Samples

### `internal/observability/logger.go` (new file)
```go
package observability

import (
	"context"
	"log/slog"
	"os"
)

var (
	defaultLogger *slog.Logger
	requestIDKey  = "request_id"
)

func InitLogger(level string) {
	var logLevel slog.Level
	switch level {
	case "debug":
		logLevel = slog.LevelDebug
	case "warn":
		logLevel = slog.LevelWarn
	case "error":
		logLevel = slog.LevelError
	default:
		logLevel = slog.LevelInfo
	}

	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
		ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
			if a.Key == slog.TimeKey {
				return slog.Attr{Key: "timestamp", Value: a.Value}
			}
			return a
		},
	})
	defaultLogger = slog.New(handler)
	slog.SetDefault(defaultLogger)
}

func Logger() *slog.Logger {
	if defaultLogger == nil {
		InitLogger("info")
	}
	return defaultLogger
}

func WithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, requestIDKey, requestID)
}

func RequestID(ctx context.Context) string {
	if v := ctx.Value(requestIDKey); v != nil {
		return v.(string)
	}
	return ""
}

func LogError(ctx context.Context, msg string, err error, attrs ...slog.Attr) {
	args := make([]any, 0, len(attrs)+2)
	args = append(args, "error", err.Error())
	if rid := RequestID(ctx); rid != "" {
		args = append(args, "request_id", rid)
	}
	for _, a := range attrs {
		args = append(args, a.Key, a.Value.Any())
	}
	Logger().ErrorContext(ctx, msg, args...)
}
```

### `internal/api/middleware/logging_middleware.go` (new file)
```go
package middleware

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"gymtrack-backend/internal/observability"
)

func RequestLoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}
		c.Header("X-Request-ID", requestID)

		ctx := observability.WithRequestID(c.Request.Context(), requestID)
		c.Request = c.Request.WithContext(ctx)

		c.Next()

		observability.Logger().InfoContext(ctx, "HTTP request",
			"request_id", requestID,
			"method", c.Request.Method,
			"path", c.FullPath(),
			"status", c.Writer.Status(),
			"latency_ms", time.Since(start).Milliseconds(),
			"user_id", c.GetString("userID"),
			"ip", c.ClientIP(),
			"user_agent", c.Request.UserAgent(),
		)
	}
}

func generateRequestID() string {
	return "req-" + time.Now().Format("20060102-150405.000") + "-" + randomString(8)
}
```

---

## Verification Checklist

After migration, verify:
- [ ] `grep -r "log/slog" backend/internal/...` returns 50+ files
- [ ] `grep -r "log\.(Print|Fatal)" backend/internal/` returns only `cmd/` files
- [ ] `grep -r "details.*err.Error()" backend/internal/api/handlers/` returns **0 results**
- [ ] `curl -v http://localhost:8080/api/health 2>&1 | grep "X-Request-ID"` returns header
- [ ] JSON logs appear in stdout with `request_id`, `method`, `path`, `status`, `latency_ms`
- [ ] `slog.Level` configurable via `LOG_LEVEL` env var

---

*Audit completed: 2026-07-18*  
*Auditor: Sisyphus (AI Agent)*  
*Scope: 123 Go files in backend/*