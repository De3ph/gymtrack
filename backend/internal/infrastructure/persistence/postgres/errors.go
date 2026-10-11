package postgres

import (
	"errors"
	"fmt"

	domainerrors "gymtrack-backend/internal/domain/errors"

	"github.com/jackc/pgx/v5/pgconn"
)

// PostgreSQL SQLSTATE codes we translate into domain sentinels. Without this
// mapping a constraint violation leaves the repository as an opaque wrapped
// error, and every caller reports it as an internal fault (HTTP 500) even
// though the client sent a duplicate key or an out-of-range value.
//
// See https://www.postgresql.org/docs/current/errcodes-appendix.html
const (
	sqlStateUniqueViolation     = "23505" // unique index/constraint violated
	sqlStateForeignKeyViolation = "23503" // referenced row missing, or still referenced
	sqlStateCheckViolation      = "23514" // CHECK constraint failed
	sqlStateNotNullViolation    = "23502" // NOT NULL violated
	sqlStateRestrictViolation   = "23001" // DELETE blocked by RESTRICT
	sqlStateInvalidTextRep      = "22P02" // e.g. casting a non-boolean JSONB value
)

// mapWriteError converts a driver-level failure from a write statement into a
// domain sentinel, so services and handlers can distinguish "the client sent
// something unacceptable" from "the database is broken".
//
// op describes the attempted operation and is retained for logs. The sentinel
// and the original *pgconn.PgError are both wrapped, so errors.Is still matches
// the sentinel while zap.Error(err) keeps the constraint name and SQLSTATE for
// diagnosis.
//
// Response safety: handleBusinessError replies with the matched sentinel's own
// text and never err.Error(), so the constraint name recorded here is visible
// in logs without reaching the client.
func mapWriteError(err error, op string) error {
	if err == nil {
		return nil
	}

	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		// Not a PostgreSQL error (context cancellation, driver issue, ...).
		// Wrap for context but leave the classification alone.
		return fmt.Errorf("%s: %w", op, err)
	}

	switch pgErr.Code {
	case sqlStateUniqueViolation, sqlStateRestrictViolation:
		return fmt.Errorf("%s: %w [constraint %s]: %w", op, domainerrors.ErrConflict, pgErr.ConstraintName, err)

	case sqlStateForeignKeyViolation:
		// A referenced row is missing (or still referenced). Either way the
		// request referenced something that cannot exist.
		return fmt.Errorf("%s: %w [constraint %s]: %w", op, domainerrors.ErrInvalidInput, pgErr.ConstraintName, err)

	case sqlStateCheckViolation, sqlStateNotNullViolation, sqlStateInvalidTextRep:
		// Value rejected by the schema: out-of-range rating, over-long comment,
		// malformed boolean, etc.
		return fmt.Errorf("%s: %w [constraint %s]: %w", op, domainerrors.ErrInvalidInput, pgErr.ConstraintName, err)

	default:
		return fmt.Errorf("%s: %w", op, err)
	}
}
