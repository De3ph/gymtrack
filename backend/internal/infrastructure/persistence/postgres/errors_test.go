package postgres

import (
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/repositories"

	"github.com/jackc/pgx/v5/pgconn"
)

// A constraint violation is caused by the client's request, not by the
// database, so it must surface as a domain sentinel. Left unmapped, a duplicate
// key reached the client as an opaque 500.
func TestMapWriteError_SQLStatetoSentinel(t *testing.T) {
	tests := []struct {
		name       string
		code       string
		constraint string
		want       error
	}{
		{"unique violation is a conflict", "23505", "users_email_key", domainerrors.ErrConflict},
		{"restrict violation is a conflict", "23001", "relationships_trainer_athlete_key", domainerrors.ErrConflict},
		{"foreign key violation is invalid input", "23503", "workouts_athlete_id_fkey", domainerrors.ErrInvalidInput},
		{"check violation is invalid input", "23514", "trainer_reviews_rating_check", domainerrors.ErrInvalidInput},
		{"not-null violation is invalid input", "23502", "comments_content_not_null", domainerrors.ErrInvalidInput},
		{"invalid text representation is invalid input", "22P02", "", domainerrors.ErrInvalidInput},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			pgErr := &pgconn.PgError{Code: tc.code, ConstraintName: tc.constraint}

			got := mapWriteError(pgErr, "failed to create thing")

			if !errors.Is(got, tc.want) {
				t.Fatalf("want errors.Is(err, %v) to hold; got %v", tc.want, got)
			}
		})
	}
}

// The original driver error must survive the wrap so logs keep the SQLSTATE
// and constraint name for diagnosis.
func TestMapWriteError_RetainsUnderlyingError(t *testing.T) {
	pgErr := &pgconn.PgError{Code: "23505", ConstraintName: "users_email_key"}

	got := mapWriteError(pgErr, "failed to create user")

	if !errors.Is(got, pgErr) {
		t.Fatalf("underlying pgconn error was lost: %v", got)
	}
	var recovered *pgconn.PgError
	if !errors.As(got, &recovered) {
		t.Fatalf("errors.As could not recover the pgconn error: %v", got)
	}
	if recovered.ConstraintName != "users_email_key" {
		t.Fatalf("constraint name lost: %q", recovered.ConstraintName)
	}
}

// Unknown SQLSTATEs are genuine faults and must not be dressed up as client
// errors, or a real database problem would be reported as a 4xx.
func TestMapWriteError_UnknownCodeStaysInternal(t *testing.T) {
	pgErr := &pgconn.PgError{Code: "08006", Message: "connection failure"}

	got := mapWriteError(pgErr, "failed to create user")

	if errors.Is(got, domainerrors.ErrConflict) || errors.Is(got, domainerrors.ErrInvalidInput) {
		t.Fatalf("infrastructure failure misclassified as client error: %v", got)
	}
	if !errors.Is(got, pgErr) {
		t.Fatalf("underlying error was lost: %v", got)
	}
}

// Non-driver errors (context cancellation, pool exhaustion) pass through
// unchanged apart from added context.
func TestMapWriteError_NonDriverErrorPassesThrough(t *testing.T) {
	sentinel := errors.New("some other failure")

	got := mapWriteError(sentinel, "failed to create user")

	if !errors.Is(got, sentinel) {
		t.Fatalf("sentinel lost: %v", got)
	}
	if errors.Is(got, domainerrors.ErrConflict) || errors.Is(got, domainerrors.ErrInvalidInput) {
		t.Fatalf("non-driver error misclassified: %v", got)
	}
}

// A pgconn error nested inside a wrap (how repositories actually return it)
// must still be recognised.
func TestMapWriteError_SeesWrappedDriverError(t *testing.T) {
	pgErr := &pgconn.PgError{Code: "23505", ConstraintName: "trainer_reviews_trainer_athlete_key"}
	wrapped := fmt.Errorf("query failed: %w", pgErr)

	got := mapWriteError(wrapped, "failed to create review")

	if !errors.Is(got, domainerrors.ErrConflict) {
		t.Fatalf("wrapped unique violation not mapped to ErrConflict: %v", got)
	}
}

func TestMapWriteError_NilIsNil(t *testing.T) {
	if got := mapWriteError(nil, "failed to create user"); got != nil {
		t.Fatalf("nil error must map to nil, got %v", got)
	}
}

// Availability times are SQL TIME values, which pgx materialises into a
// time.Time anchored to year 0. The API contract is HH:MM, not the driver's
// default "09:00:00.000000" text rendering.
func TestFormatClock_ProducesHHMM(t *testing.T) {
	base := time.Date(0, time.January, 1, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name string
		in   time.Time
		want string
	}{
		{"midnight", base, "00:00"},
		{"morning", base.Add(9 * time.Hour), "09:00"},
		{"afternoon", base.Add(17*time.Hour + 30*time.Minute), "17:30"},
		{"with seconds dropped", base.Add(9*time.Hour + 45*time.Second), "09:00"},
		{"sub-second precision dropped", base.Add(9*time.Hour + 123456*time.Microsecond), "09:00"},
		{"end of day", base.Add(23*time.Hour + 59*time.Minute), "23:59"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := formatClock(tc.in); got != tc.want {
				t.Fatalf("formatClock(%v) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

// The catalog cache key must be stable across equal-but-distinct filter
// values. Formatting the struct directly printed the *bool field's heap
// address, so every request produced a fresh key and the cache never hit.
func TestPublicTrainerCacheKey_IsStableAcrossEqualFilters(t *testing.T) {
	yes1 := true
	yes2 := true

	a := publicTrainerCacheKey(trainerFilterFixture("Yoga", "Berlin", 4.0, &yes1), 20, 0)
	b := publicTrainerCacheKey(trainerFilterFixture("Yoga", "Berlin", 4.0, &yes2), 20, 0)

	if a != b {
		t.Fatalf("equal filters produced different keys:\n  %s\n  %s", a, b)
	}
}

func TestPublicTrainerCacheKey_DistinguishesFilters(t *testing.T) {
	yes, no := true, false

	base := publicTrainerCacheKey(trainerFilterFixture("Yoga", "Berlin", 4.0, &yes), 20, 0)

	distinct := map[string]string{
		"specialization": publicTrainerCacheKey(trainerFilterFixture("HIIT", "Berlin", 4.0, &yes), 20, 0),
		"location":       publicTrainerCacheKey(trainerFilterFixture("Yoga", "Paris", 4.0, &yes), 20, 0),
		"min rating":     publicTrainerCacheKey(trainerFilterFixture("Yoga", "Berlin", 3.0, &yes), 20, 0),
		"availability":   publicTrainerCacheKey(trainerFilterFixture("Yoga", "Berlin", 4.0, &no), 20, 0),
		"nil filters":    publicTrainerCacheKey(nil, 20, 0),
		"limit":          publicTrainerCacheKey(trainerFilterFixture("Yoga", "Berlin", 4.0, &yes), 50, 0),
		"offset":         publicTrainerCacheKey(trainerFilterFixture("Yoga", "Berlin", 4.0, &yes), 20, 20),
	}

	for label, key := range distinct {
		if key == base {
			t.Errorf("%s produced the same key as the base filter: %s", label, key)
		}
	}
}

// A nil *bool (no filter) must not collide with an explicit false.
func TestPublicTrainerCacheKey_UnsetAvailabilityDiffersFromFalse(t *testing.T) {
	no := false

	unset := publicTrainerCacheKey(trainerFilterFixture("Yoga", "Berlin", 4.0, nil), 20, 0)
	explicitFalse := publicTrainerCacheKey(trainerFilterFixture("Yoga", "Berlin", 4.0, &no), 20, 0)

	if unset == explicitFalse {
		t.Fatalf("unset and explicit-false availability collapsed to one key: %s", unset)
	}
}

// Keys must stay within one namespace so InvalidatePrefix("trainer:") still
// clears every catalog entry.
func TestPublicTrainerCacheKey_StaysInTrainerNamespace(t *testing.T) {
	key := publicTrainerCacheKey(trainerFilterFixture("Yoga", "Berlin", 4.0, nil), 20, 0)
	if !strings.HasPrefix(key, "trainer:") {
		t.Fatalf("key %q is outside the trainer namespace", key)
	}
}

// Filter values are joined into one string, so a value containing the separator
// must not be able to impersonate a different set of fields. The old '|'
// separator let {Specialization:"a", Location:"b|c"} collide with
// {Specialization:"a|b", Location:"c"} and serve one query's results for the
// other.
func TestPublicTrainerCacheKey_SeparatorInValueCannotForgeAnotherKey(t *testing.T) {
	splitOne := publicTrainerCacheKey(trainerFilterFixture("a", "b\x1fc", 4.0, nil), 20, 0)
	splitTwo := publicTrainerCacheKey(trainerFilterFixture("a\x1fb", "c", 4.0, nil), 20, 0)

	if splitOne == splitTwo {
		t.Fatalf("separator embedded in a value forged a colliding key: %q", splitOne)
	}
}

// A separator embedded in a filter value must be neutralised, so the value can
// never be read back as extra fields. The key still carries exactly the seven
// separators that join the fixed fields, never more.
func TestPublicTrainerCacheKey_EmbeddedSeparatorIsNeutralised(t *testing.T) {
	plain := publicTrainerCacheKey(trainerFilterFixture("Yoga", "Berlin", 4.0, nil), 20, 0)
	embedded := publicTrainerCacheKey(trainerFilterFixture("yoga"+cacheKeyFieldSep+"user:id:1", "Berlin", 4.0, nil), 20, 0)

	if !strings.HasPrefix(embedded, "trainer:") {
		t.Fatalf("key %q escaped the trainer namespace", embedded)
	}
	if !strings.HasPrefix(plain, "trainer:") {
		t.Fatalf("key %q escaped the trainer namespace", plain)
	}

	// Same field count as the plain key: the value's separator was escaped
	// rather than acting as a field boundary.
	wantFields := strings.Count(plain, cacheKeyFieldSep)
	if got := strings.Count(embedded, cacheKeyFieldSep); got != wantFields {
		t.Fatalf("embedded separator changed the field count: got %d, want %d (key %q)", got, wantFields, embedded)
	}
}

// trainerFilterFixture builds a fresh filter value. Each call must return a new
// pointer: reusing one would mask the pointer-address cache-key bug.
func trainerFilterFixture(specialization, location string, minRating float64, available *bool) *repositories.TrainerFilters {
	return &repositories.TrainerFilters{
		Specialization:         specialization,
		Location:               location,
		MinRating:              minRating,
		AvailableForNewClients: available,
	}
}
