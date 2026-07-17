# Backend DB Review — `backend/` (golang-database skill)

## Summary

Reviewed PostgreSQL repository layer (`internal/repository/postgres/*`) against the
golang-database best practices. **4 parallel scan agents ran; most of their HIGH/CRITICAL
flags were false positives** — verified by reading the flagged code. The active DB layer
is **pgx/v5 (`pgxpool`)**, wired exclusively in `internal/app/module.go`. Connection pool,
context propagation, parameterization, and error wrapping are all solid.

**Only 2 genuine code-level findings** (both minor). Everything the agents flagged as
"missing `rows.Close()`" or "SQL injection" is **wrong** — see False Positives.

---

## Genuine Findings

### 1. Inconsistent not-found contract (LOW–MEDIUM)
Three "optional" getters return `(nil, nil)` on not-found:
- `internal/repository/postgres/trainer_profile.go:114` — `GetTrainerByID`
- `internal/repository/postgres/exercise.go:69` — `GetExerciseByID`
- `internal/repository/postgres/body_measurement.go:112` — `GetLatestByAthleteID`

Every other `GetByID`-style method returns `domainerrors.ErrNotFound`
(workout, comment, coaching_request, trainer_review, workout_plan, workout_plan_assignment).

Risk: callers doing `if err != nil` cannot distinguish "not found" from success.
`GetTrainerByID`/`GetExerciseByID` are named like *required* lookups but behave as optional.
Fix: standardize the contract — either rename these to `FindXxx` to signal optional, or
return `domainerrors.ErrNotFound` to match the other required getters.

### 2. Read-modify-write not wrapped in a transaction (LOW–MEDIUM)
`internal/repository/postgres/trainer_profile.go:131-169` — `UpdateTrainerProfile` does
`SELECT profile` → unmarshal/modify in app → `UPDATE profile` with no transaction and no
`SELECT ... FOR UPDATE`. Under concurrent edits this is a lost-update race.
Fix: wrap in `BeginTx` / `BeginTxx` and lock the row (`SELECT ... FOR UPDATE`) before the
app-side mutation.

---

## Verified Clean (agents incorrectly flagged)

| Area | Verdict | Evidence |
|------|---------|----------|
| `rows.Close()` | **CLEAN** | Every `pool.Query` call has `defer rows.Close()` immediately after (e.g. comment.go:75/99/123, trainer_review.go:77/188, coach_request.go:72/84/96, workout_plan.go:75, workout_plan_assignment.go:76/85/101, trainer_profile.go:94/187). Agents' "missing" claims were wrong. |
| SQL injection / un-parameterized | **CLEAN** | All *values* are bound parameters (`$1`, `$2`...). Dynamic SQL only builds **placeholder numbers** via `fmt.Sprintf` (e.g. trainer_profile.go:37-48, exercise.go:130-138); identifiers (`profile->>'specializations'`, column names) are hardcoded constants, never user input. No user-controlled `ORDER BY` / table / column. |
| Context propagation | **CLEAN** | All calls use `*Context` variants with the request `ctx` (verified across 9 repos + scan agents). |
| Connection pool | **CLEAN** | `internal/config/postgres.go:23-26` sets `MaxConns=25`, `MinConns=2`, `MaxConnLifetime=30m`, `MaxConnIdleTime=5m`, plus startup `Ping`. (Grep for `SetMaxOpenConns` missed these because pgxpool uses struct fields.) |
| Error wrapping | **CLEAN** | Near-universal `fmt.Errorf("...: %w", err)`; `pgx.ErrNoRows` translated to `domainerrors.ErrNotFound` in required getters. |
| Atomic update | **GOOD** | `availability.go:143 BookSlotAtomic` uses conditional `UPDATE ... WHERE id=$1 AND is_booked=false` — correct lock-free atomic pattern. |

---

## Notes

- **Dead Couchbase code (cleanup, no security risk).** N1QL implementations live in
  `internal/domain/repositories/*.go` and `internal/config/couchbase.go`; only the one-time
  `cmd/migrate` runner references Couchbase. The running app uses Postgres only. These
  concrete impls also sit in the `domain` package (structural smell). The `%s` placeholders
  there are config constants (`bucket.Name()`), not user input — no injection. Recommend
  deleting after migration is confirmed complete (`.bak` files already present).
- **Transactions** not deeply audited beyond the read-modify-write above; single-statement
  writes (`Create`/`Update`/`Delete`) are fine without explicit tx.

---

## Recommended Actions (optional)

1. Standardize not-found contract (Finding 1): align the 3 optional getters with the rest.
2. Wrap `UpdateTrainerProfile` read-modify-write in a transactional `SELECT ... FOR UPDATE`
   (Finding 2).
3. (Cleanup) Remove dead Couchbase impls + `config/couchbase.go` once migration is verified.

No schema changes proposed — out of scope per skill (requires human review of data volumes/indexes).
