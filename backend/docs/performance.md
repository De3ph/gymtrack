# PostgreSQL Repository Performance

> Generated: 2026-07-12
> Environment: Windows, 12th Gen Intel(R) Core(TM) i5-1235U
> Go version: 1.24
> PostgreSQL: 16 (local, POSTGRES_TEST_DSN)

## Benchmark Results

```
goos: windows
goarch: amd64
cpu: 12th Gen Intel(R) Core(TM) i5-1235U
```

| Benchmark | Time/op | B/op | allocs/op |
|---|---|---|---|
| UserRepository_GetByID | ~86 µs | 1,790 | 24 |
| WorkoutRepository_GetByAthleteID | ~361 µs | 23,514 | 353 |
| ExerciseRepository_GetByID | ~100 µs | 1,062 | 17 |
| JSONBMarshal_WorkoutExercises | ~2.3 µs | 664 | 2 |
| JSONBUnmarshal_WorkoutExercises | ~14.4 µs | 1,472 | 31 |

## Analysis

### UserRepository_GetByID (~86 µs)
- Simple single-row SELECT with a JSONB profile column
- No optimizations needed — well under all thresholds
- Profile JSONB deserialization adds marginal overhead

### WorkoutRepository_GetByAthleteID (~361 µs, 353 allocs/op)
- Returns 10 workout rows, each with a JSONB exercises array (3 exercises each)
- Higher allocation count is expected: each row scans into a `Workout` struct, then `UnmarshalFromJSONB` allocates the embedded `[]WorkoutExercise` + `[]ExerciseSet`
- Still well under the 100ms threshold per operation
- Could be reduced by limiting JSONB payload size or adding selective column queries, but not warranted

### ExerciseRepository_GetByID (~100 µs)
- Simple single-row SELECT with nullable columns (created_by, instructions)
- Returns a single `Exercise` struct — minimal allocations

### JSONB operations (sub-millisecond)
- **Marshal**: ~2.3 µs, 2 allocs — standard `json.Marshal` on `[]WorkoutExercise`
- **Unmarshal**: ~14.4 µs, 31 allocs — `json.Unmarshal` creates all nested structs; allocation count is proportional to the number of sets

## Connection Pool Configuration

Current settings (in `internal/config/postgres.go`):
| Parameter | Value |
|---|---|
| MaxConns | 25 |
| MinConns | 2 |
| MaxConnLifetime | 30 min |
| MaxConnIdleTime | 5 min |

These are conservative defaults. For the local dev setup with a single application instance, 25 concurrent connections is more than sufficient. The connection pool was never a bottleneck in benchmarks.

## Bottlenecks Identified

None. All operations complete well under the 100ms threshold. JSONB marshal/unmarshal adds ~16 µs total for a typical 3-exercise workout, which is negligible in the context of an HTTP request lifecycle.

## Recommendations

1. **No indexing changes needed** — all queries use primary keys or foreign key columns that are already indexed.
2. **No JSONB optimization needed** — overhead is in microseconds.
3. **If workout payloads grow to 20+ exercises**: consider paginating JSONB content via `jsonb_each` or moving exercises to a separate table.
