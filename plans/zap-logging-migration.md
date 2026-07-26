# Plan: Zap Logging Migration

## TL;DR

> **Quick Summary**: Migrate all Go stdlib `log.*` calls across 4 backend files to structured `go.uber.org/zap` v1.27.1 logging, with a shared logger initialization package, uber-go/fx integration, and Gin log redirection.
>
> **Deliverables**:
> - `internal/infrastructure/log/logger.go` — new logger init/sync/wrapper package
> - 4 migrated files with `log.*` → `zap.L()` calls
> - `go.mod` — zap promoted from indirect to direct dependency
> - `cmd/server/main.go`, `cmd/ensure-schema/main.go`, `internal/app/module.go` — `"log"` import removed
> - `internal/config/config.go` — `"log"` import kept (excluded from migration)
>
> **Estimated Effort**: Quick (2-3 waves, ~1-2 hours)
> **Parallel Execution**: YES — 3 waves (2 → 3 → 4)
> **Critical Path**: Task 2 → Tasks 3-5 → Final verification

---

## Context

### Original Request
User request: "backend logging should be done via go.uber.org/zap package. create plan to migrate all manuel logs (log.Printf and log.Fatal) to zap"

### Interview Summary
**Key Decisions**:
- Use structured `zap.L()` API (not sugared `zap.S()`) for idiomatic zap usage
- `config.go`'s `log.Fatal` calls explicitly excluded from migration (run before logger init)
- `logger.Init()` called in `main()` BEFORE `fx.New()` to ensure zap global is available
- `config.go` keeps its `"log"` import; all other files remove it
- `zap.L().Error()` used for error conditions, `zap.L().Info()` for status/progress, `zap.L().Fatal()` for fatal
- Package name: `logger` (avoids collision with stdlib `"log"`)

**Research Findings**:
- 14 log call sites across 4 files: `cmd/server/main.go` (1), `cmd/ensure-schema/main.go` (9), `internal/config/config.go` (2), `internal/app/module.go` (2)
- zap v1.27.1 already in `go.mod` as indirect dependency — needs promotion to direct
- uber-go/fx v1.24.0 used — supports `fx.WithLogger(func() fxevent.Logger)` integration
- Gin framework uses `gin.Default()` which has its own logger middleware
- No existing `internal/infrastructure/log/` directory

### Metis Review
**Identified Gaps** (addressed):
- **Config timing**: `config.LoadConfig()` runs during `fx.New()` construction, before zap init. Resolved: config.go's `log.Fatal` calls excluded from migration, `"log"` import kept in config.go only. Logger init happens in `main()` first.
- **Severity mapping**: `log.Printf` for error messages maps to `zap.L().Error()`, not `Info()`.
- **Gin redirection**: Specified — `gin.DefaultWriter`/`gin.DefaultErrorWriter` assigned inside `logger.Init()`.
- **Sync() placement**: `zap.L().Sync()` deferred in `main()` after `fx.Run()`, not inside `OnStop` lifecycle hook.

---

## Work Objectives

### Core Objective
Migrate all Go stdlib `log.*` calls across 4 backend files to structured `go.uber.org/zap` logging, creating a shared logger initialization package, integrating with uber-go/fx and Gin, and removing the `"log"` import from all files except `config.go`.

### Concrete Deliverables
- File `internal/infrastructure/log/logger.go` — `Init()`, `Sync()`, `FxPrinter` adapter, `gin.DefaultWriter` wrapper
- File `cmd/server/main.go` — `logger.Init()` + `zap.L().Info()` + no `"log"` import
- File `internal/app/module.go` — `zap.L().Error()`/`Info()` + `fx.WithLogger` + no `"log"` import
- File `cmd/ensure-schema/main.go` — `logger.Init()` + 9 `zap.L()` calls + no `"log"` import
- File `internal/config/config.go` — unchanged (excluded), `"log"` import stays
- `go.mod` / `go.sum` — zap promoted from indirect to direct

### Definition of Done
- Build succeeds: `cd backend && go build ./...`
- go mod tidy succeeds
- Zero `"log"` imports in migrated files (grep returns no match for main.go, module.go, ensure-schema/main.go)
- Config.go still has `"log"` (2 `log.Fatal` calls intact)
- Server starts with valid config and produces JSON-formatted logs
- Server exits with non-zero code and clear error message when JWT_SECRET missing
- CLI tool (`ensure-schema`) produces console-formatted (non-JSON, human-readable) log output

### Must Have
- All 14 `log.*` call sites replaced with `zap.L()` equivalents EXCEPT config.go (2 calls excluded)
- `"log"` import removed from main.go, module.go, ensure-schema/main.go
- `"log"` import REMAINS in config.go (excluded)
- `logger.Init()` called before `fx.New()` in main.go
- `zap.L().Sync()` deferred in main.go after fx.Run()
- Gin logs redirected through zap via `gin.DefaultWriter` / `gin.DefaultErrorWriter`
- fx internal logs routed through zap via `fx.WithLogger`

### Must NOT Have (Guardrails)
- No new log statements beyond the 14 existing call sites (plus Init/Info calls for boot messages)
- No log message content changes
- No configurable log levels via env vars (hardcode InfoLevel)
- No refactoring of error control flow in ensure-schema (mechanical replacement only)
- No Sentry or error reporting integration
- No request-scoped context (no request IDs, trace IDs)
- No changing Gin's internal log format — only redirect output destination
- No refactoring `config.go` error handling to return errors — keep fatal behavior

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (Go tests in postgres/ and cache/)
- **Automated tests**: NONE — mechanical logging migration, no business logic change
- **Agent-Executed QA**: ALWAYS — all tasks include verification scenarios

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.
- **Build**: `go build ./...` — verify compilation
- **Grep**: Verify remaining `"log"` imports — zero in migrated files, exactly 1 in config.go
- **Run**: Start server with valid/missing config, check output format
- **CLI**: Run ensure-schema, verify console-formatted output

---

## Execution Strategy

```
Wave 1 (Foundation — 2 parallel):
├── Task 1: Promote zap to direct dependency [quick]
└── Task 2: Create logger package [quick]

Wave 2 (Migration — 3 parallel, depends on Wave 1):
├── Task 3: Migrate cmd/server/main.go [quick]
├── Task 4: Migrate internal/app/module.go + fx+Gin wiring [unspecified-low]
└── Task 5: Migrate cmd/ensure-schema/main.go [unspecified-low]

Wave FINAL (Verification — 4 parallel, depends on ALL):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay

Critical Path: Task 2 → Tasks 3-5 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 3 (Wave 2)
```

### Dependency Matrix
- **1**: — — 2
- **2**: — — 3, 4, 5
- **3**: 2 — F1-F4
- **4**: 2 — F1-F4
- **5**: 2 — F1-F4
- **F1-F4**: 1, 2, 3, 4, 5 — user okay

### Agent Dispatch Summary
- **1**: 2 — T1-T2 → `quick`
- **2**: 3 — T3 → `quick`, T4 → `unspecified-low`, T5 → `unspecified-low`
- **3**: 4 — F1-F4 (oracle, unspecified-high, unspecified-high, deep)

---

## TODOs

- [ ] 1. Promote zap to direct dependency

  **What to do**:
  - Run `cd backend && go get go.uber.org/zap@v1.27.1` to promote from indirect to direct
  - Run `cd backend && go mod tidy` to clean up

  **Must NOT do**:
  - Do NOT update any other dependencies
  - Do NOT change go version or other require blocks

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single command execution, no logic
  - **Skills**: none

  **References**:
  - `backend/go.mod:118` — current indirect zap reference
  - `backend/go.sum:258-259` — current zap checksums

  **Acceptance Criteria**:
  - [ ] `grep -c "go.uber.org/zap" backend/go.mod` returns line with `// indirect` removed
  - [ ] `cd backend && go build ./...` succeeds

  **QA Scenarios**:
  ```
  Scenario: Verify zap promoted to direct
    Tool: Bash
    Preconditions: git status clean (no uncommitted changes)
    Steps:
      1. cd backend
      2. go get go.uber.org/zap@v1.27.1 && go mod tidy
      3. go build ./...
    Expected Result: exit code 0, build succeeds
    Evidence: .omo/evidence/task-1-promote-zap.txt

  Scenario: Verify go.mod updated correctly
    Tool: Bash
    Preconditions: go get completed
    Steps:
      1. cd backend
      2. Select-String "go.uber.org/zap" go.mod | Select-String "indirect"
    Expected Result: no match (zap is now direct)
    Evidence: .omo/evidence/task-1-mod-check.txt
  ```

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3, 4, 5
  - **Blocked By**: None

  **Commit**: YES
  - Message: `build(go.mod): promote go.uber.org/zap to direct dependency`
  - Files: `backend/go.mod`, `backend/go.sum`

- [ ] 2. Create logger initialization package

  **What to do**:
  - Create file `backend/internal/infrastructure/log/logger.go` with:
    - `package logger` (use `logger` name to avoid collision with stdlib `"log"`)
    - `func Init(env string)` — calls `zap.ReplaceGlobals()` with production config (JSON encoder, InfoLevel)
    - `func InitConsole()` — for CLI tools, uses development config (console encoder, colored, human-readable)
    - `type FxPrinter struct { logger *zap.SugaredLogger }` with `Logf(format string, args ...interface{})` method for `fx.WithLogger`
    - `func NewFxPrinter() *FxPrinter` constructor
    - `func Sync()` — calls `zap.L().Sync()` (no-op safe)
    - Production config: `zap.NewProductionConfig()` with `InfoLevel`
    - Console config: `zap.NewDevelopmentConfig()` with `InfoLevel`, console encoder
    - Set `gin.DefaultWriter` and `gin.DefaultErrorWriter` to `io.MultiWriter(os.Stdout, ...)` — point to a zap writer wrapper that writes gin's log output to zap's Info logger
  - Import `"go.uber.org/zap"`, `"go.uber.org/zap/zapcore"`, `"github.com/gin-gonic/gin"`, `"os"`, `"io"`

  **Must NOT do**:
  - Do NOT add configurable log levels (no env var parsing)
  - Do NOT add Sentry/error reporting bridge
  - Do NOT add file rotation or multi-sink configuration

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file creation, well-defined structure
  - **Skills**: none

  **References**:
  - `backend/internal/infrastructure/cache/` — existing infrastructure package pattern to follow
  - `backend/internal/app/module.go:135-137` — where `gin.Default()` is called (must run after Init())
  - `backend/go.mod:118` — zap indirect reference
  - zap docs: https://pkg.go.dev/go.uber.org/zap#hdr-Choosing_a_Logger

  **Acceptance Criteria**:
  - [ ] File exists: `backend/internal/infrastructure/log/logger.go`
  - [ ] `package logger` declared
  - [ ] `Init()`, `InitConsole()`, `Sync()`, `NewFxPrinter()` functions exported
  - [ ] `gin.DefaultWriter` and `gin.DefaultErrorWriter` assigned inside Init()

  **QA Scenarios**:
  ```
  Scenario: Verify logger package compiles
    Tool: Bash
    Preconditions: Task 1 completed (zap is direct dep)
    Steps:
      1. cd backend && go build ./internal/infrastructure/log/
    Expected Result: exit code 0
    Evidence: .omo/evidence/task-2-build-package.txt

  Scenario: Verify package exports correct API
    Tool: Bash
    Preconditions: package compiled
    Steps:
      1. cd backend
      2. go doc ./internal/infrastructure/log/
    Expected Result: exports Init, InitConsole, Sync, NewFxPrinter
    Evidence: .omo/evidence/task-2-doc.txt
  ```

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3, 4, 5
  - **Blocked By**: None

  **Commit**: YES
  - Message: `feat(log): create logger initialization package with fx and gin integration`
  - Files: `backend/internal/infrastructure/log/logger.go`

- [ ] 3. Migrate cmd/server/main.go to zap

  **What to do**:
  - Add import: `"gymtrack-backend/internal/infrastructure/log"`
  - Add at top of `main()`: `logger.Init()` — BEFORE `fx.New()`
  - Add defer: `defer logger.Sync()` — AFTER logger.Init(), before fx.New()
  - Replace `log.Println("Cleaning up...")` with `zap.L().Info("Cleaning up...")`
  - Remove `"log"` from import block

  **Final main.go structure**:
  ```go
  func main() {
      logger.Init()
      defer logger.Sync()
      fx.New(
          app.RepositoryModule,
          fx.WithLogger(logger.NewFxPrinter),
      ).Run()
      zap.L().Info("Cleaning up...")
  }
  ```

  **Must NOT do**:
  - Do NOT change any other part of main.go
  - Do NOT add new log statements

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, 1 call replacement, well-defined edits
  - **Skills**: none

  **References**:
  - `backend/cmd/server/main.go:23` — the one `log.Println` call to replace
  - `backend/cmd/server/main.go:1-9` — import block to edit
  - `backend/internal/infrastructure/log/logger.go` — new logger package (created in Task 2)

  **Acceptance Criteria**:
  - [ ] `grep "log\." cmd/server/main.go` returns no matches
  - [ ] `grep '"log"' cmd/server/main.go` returns no match
  - [ ] `grep 'logger\.Init()' cmd/server/main.go` returns match
  - [ ] `grep 'zap\.L\(\)' cmd/server/main.go` returns match
  - [ ] `go build ./cmd/server/` succeeds

  **QA Scenarios**:
  ```
  Scenario: Verify no "log" import in main.go
    Tool: Bash
    Preconditions: migration complete
    Steps:
      1. Select-String '"log"' backend/cmd/server/main.go
    Expected Result: no match (exit code 1)
    Evidence: .omo/evidence/task-3-no-log-import.txt

  Scenario: Verify server starts with zap logging
    Tool: Bash
    Preconditions: Task 1 and 2 complete
    Steps:
      1. cd backend
      2. $env:JWT_SECRET = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      3. Start-Process -NoNewWindow -RedirectStandardOutput "$env:TEMP\server-out.txt" -RedirectStandardError "$env:TEMP\server-err.txt" "go" "run", "cmd/server/main.go"
      4. Start-Sleep -Seconds 3
      5. Get-Content "$env:TEMP\server-err.txt" -Head 3
    Expected Result: first line is valid JSON (zap production format)
    Evidence: .omo/evidence/task-3-server-output.txt

  Scenario: Verify config validation still crashes on missing JWT_SECRET
    Tool: Bash
    Preconditions: none
    Steps:
      1. cd backend
      2. $env:JWT_SECRET = ""
      3. go run cmd/server/main.go 2>&1; $LASTEXITCODE
    Expected Result: non-zero exit code, "JWT_SECRET environment variable is required" on stderr
    Evidence: .omo/evidence/task-3-config-validation.txt
  ```

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1, Task 2

  **Commit**: YES
  - Message: `refactor(server): migrate main.go stdlib log to zap`
  - Files: `backend/cmd/server/main.go`
  - Pre-commit: `cd backend && go build ./cmd/server/`

- [ ] 4. Migrate internal/app/module.go to zap with fx+Gin wiring

  **What to do**:
  - Replace `log.Printf("Server error: %v", err)` with `zap.L().Error("Server error", zap.Error(err))`
  - Replace `log.Println("Shutting down server...")` with `zap.L().Info("Shutting down server...")`
  - Remove `"log"` from import block
  - Add imports: `"go.uber.org/zap"` and `"gymtrack-backend/internal/infrastructure/log"` (if needed — logger init happens in main.go)
  - Wire `fx.WithLogger` into `fx.New()` in main.go (handled in Task 3, but ensure it's present)

  **Note**: The `fx.WithLogger` wiring happens in main.go (Task 3), not in module.go. Module.go only needs the 2 zap.L() replacements and import cleanup.

  **Must NOT do**:
  - Do NOT change the `StartServer` function signature
  - Do NOT add gin.Logger middleware replacement (only redirect output via gin.DefaultWriter)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Small scope (2 replacement + import cleanup) but involves understanding the fx module pattern
  - **Skills**: none

  **References**:
  - `backend/internal/app/module.go:250` — `log.Printf("Server error: %v", err)` to replace
  - `backend/internal/app/module.go:256` — `log.Println("Shutting down server...")` to replace
  - `backend/internal/app/module.go:3-5` — import block to edit
  - `backend/internal/app/module.go:135-137` — `gin.Default()` call location (guaranteed after Init())

  **Acceptance Criteria**:
  - [ ] `grep '"log"' backend/internal/app/module.go` returns no match
  - [ ] `grep 'zap\.L\(\)\.Error' backend/internal/app/module.go` returns 1 match (Server error)
  - [ ] `grep 'zap\.L\(\)\.Info' backend/internal/app/module.go` returns 1 match (Shutting down)
  - [ ] `cd backend && go build ./...` succeeds

  **QA Scenarios**:
  ```
  Scenario: Verify log imports removed and zap calls present
    Tool: Bash
    Preconditions: migration complete
    Steps:
      1. Select-String '"log"' backend/internal/app/module.go
      2. Select-String 'zap\.L\(\)\.Error\(' backend/internal/app/module.go
      3. Select-String 'zap\.L\(\)\.Info\(' backend/internal/app/module.go
    Expected Result: step 1: no match; step 2: 1 match; step 3: 1 match
    Evidence: .omo/evidence/task-4-module-check.txt

  Scenario: Verify build succeeds
    Tool: Bash
    Preconditions: all edits done
    Steps:
      1. cd backend && go build ./...
    Expected Result: exit code 0
    Evidence: .omo/evidence/task-4-build.txt
  ```

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1, Task 2

  **Commit**: YES
  - Message: `refactor(module): migrate module.go stdlib log to zap with fx.WithLogger`
  - Files: `backend/internal/app/module.go`
  - Pre-commit: `cd backend && go build ./...`

- [ ] 5. Migrate cmd/ensure-schema/main.go to zap

  **What to do**:
  - Add import: `"gymtrack-backend/internal/infrastructure/log"`
  - Add at top of `main()`: `logger.InitConsole()` (console output for CLI tool)
  - Replace all 9 log calls:

    | Line | Current | Replacement |
    |---|---|---|
    | 269 | `log.Fatalf("connect: %v", err)` | `zap.L().Fatal("Failed to connect", zap.Error(err))` |
    | 274 | `log.Println("Dropping public schema...")` | `zap.L().Info("Dropping public schema...")` |
    | 276 | `log.Fatalf("drop schema: %v", err)` | `zap.L().Fatal("Failed to drop schema", zap.Error(err))` |
    | 280 | `log.Println("Applying migration DDL...")` | `zap.L().Info("Applying migration DDL...")` |
    | 282 | `log.Fatalf("apply migration: %v", err)` | `zap.L().Fatal("Failed to apply migration", zap.Error(err))` |
    | 284 | `log.Println("Migration applied successfully")` | `zap.L().Info("Migration applied successfully")` |
    | 287 | `log.Println("Seeding lookup tables...")` | `zap.L().Info("Seeding lookup tables...")` |
    | 289 | `log.Fatalf("seed lookup tables: %v", err)` | `zap.L().Fatal("Failed to seed lookup tables", zap.Error(err))` |
    | 291 | `log.Println("Lookup tables seeded")` | `zap.L().Info("Lookup tables seeded")` |

  - Remove `"log"` from import block
  - Add import: `"go.uber.org/zap"`
  - Leave `fmt.Println` calls (lines 293-296) unchanged — they're user-facing success output, not logs

  **Must NOT do**:
  - Do NOT change `fmt.Println` output (user-facing banner)
  - Do NOT change error messages (only the logging mechanism)
  - Do NOT refactor the Fatal-chain into error returns

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: More call sites (9), but purely mechanical replacements
  - **Skills**: none

  **References**:
  - `backend/cmd/ensure-schema/main.go:259-297` — entire main() function
  - `backend/internal/infrastructure/log/logger.go` — `InitConsole()` (console output for CLI)

  **Acceptance Criteria**:
  - [ ] `grep '"log"' backend/cmd/ensure-schema/main.go` returns no match
  - [ ] `grep -c 'zap\.L\(\)' backend/cmd/ensure-schema/main.go` returns 9 (all calls migrated)
  - [ ] `grep 'fmt\.Println' backend/cmd/ensure-schema/main.go` still returns 4 matches (unchanged)
  - [ ] `cd backend && go build ./cmd/ensure-schema/` succeeds

  **QA Scenarios**:
  ```
  Scenario: Verify all 9 log calls migrated and fmt.Println preserved
    Tool: Bash
    Preconditions: migration complete
    Steps:
      1. Select-String '"log"' backend/cmd/ensure-schema/main.go
    Expected Result: no match (exit code 1)
    Evidence: .omo/evidence/task-5-no-log-import.txt

  Scenario: Verify zap calls exist with correct count
    Tool: Bash
    Preconditions: migration complete
    Steps:
      1. Select-String 'zap\.L\(\)' backend/cmd/ensure-schema/main.go
    Expected Result: 9 matches (all migrated)
    Evidence: .omo/evidence/task-5-zap-count.txt

  Scenario: Verify console output format (non-JSON)
    Tool: Bash
    Preconditions: Task 2 complete
    Steps:
      1. cd backend
      2. go run cmd/ensure-schema/main.go 2>&1 | head -3
    Expected Result: plain text log lines with timestamps (console format), not JSON
    Evidence: .omo/evidence/task-5-console-output.txt
  ```

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1, Task 2

  **Commit**: YES
  - Message: `refactor(cli): migrate ensure-schema stdlib log to zap`
  - Files: `backend/cmd/ensure-schema/main.go`
  - Pre-commit: `cd backend && go build ./cmd/ensure-schema/`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run commands). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.omo/evidence/`.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `go build ./...` + `go vet ./...`. Check migrated files for: `as any`/`@ts-ignore` patterns (Go equivalent), empty catches, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction.
  Output: `Build [PASS/FAIL] | Vet [PASS/FAIL] | Files [N clean] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (migrated server + CLI work together). Test edge cases: empty config, invalid JWT_SECRET, server start/stop.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/issues] | VERDICT`

---

## Commit Strategy

- **1**: `build(go.mod): promote go.uber.org/zap to direct dependency`
- **2**: `feat(log): create logger initialization package with fx and gin integration`
- **3**: `refactor(server): migrate main.go stdlib log to zap`
- **4**: `refactor(module): migrate module.go stdlib log to zap with fx.WithLogger`
- **5**: `refactor(cli): migrate ensure-schema stdlib log to zap`

---

## Success Criteria

### Verification Commands
```bash
cd backend && go build ./...        # Expected: success
cd backend && go mod tidy            # Expected: success, no changes
grep -rn '"log"' cmd/ internal/ --include="*.go" | grep -v "_test.go"
# Expected: only internal/config/config.go has "log" import

JWT_SECRET="" go run cmd/server/main.go 2>&1; echo "Exit: $?"
# Expected: log.Fatal("JWT_SECRET environment variable is required") on stderr, exit 1

JWT_SECRET="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" go run cmd/server/main.go > server.json 2>&1 &
sleep 2; kill %1
Get-Content server.json | head -1 | Select-String -Pattern '^{.*}$'
# Expected: first log line is valid JSON (zap production format)

cd backend && go run cmd/ensure-schema/main.go 2>&1 | head -3
# Expected: plain text log messages with timestamps (not JSON)
```

### Final Checklist
- [ ] All 14 `log.*` call sites migrated (config.go's 2 excluded = 12 migrated)
- [ ] Zero `"log"` imports in main.go, module.go, ensure-schema/main.go
- [ ] `"log"` import still present in config.go
- [ ] `logger.Init()` called before `fx.New()` in main.go
- [ ] `zap.L().Sync()` deferred in main.go
- [ ] `gin.DefaultWriter` / `gin.DefaultErrorWriter` redirected in logger.Init()
- [ ] `fx.WithLogger` wired into fx.New()
- [ ] Server produces JSON-formatted logs
- [ ] CLI produces console-formatted logs
- [ ] `go build ./...` and `go mod tidy` pass
