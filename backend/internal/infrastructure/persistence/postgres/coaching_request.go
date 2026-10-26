package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresCoachingRequestRepository implements CoachingRequestRepository using PostgreSQL.
type PostgresCoachingRequestRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresCoachingRequestRepository creates a new PostgreSQL-backed coaching request repository.
func NewPostgresCoachingRequestRepository(pool *pgxpool.Pool) *PostgresCoachingRequestRepository {
	return &PostgresCoachingRequestRepository{pool: pool}
}

func (r *PostgresCoachingRequestRepository) Create(ctx context.Context, req *models.CoachingRequest) error {
	now := time.Now()
	req.CreatedAt = now
	req.UpdatedAt = now

	query := `
		INSERT INTO coaching_requests (athlete_id, trainer_id, message, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`

	err := querierFor(ctx, r.pool).QueryRow(ctx, query,
		req.AthleteID, req.TrainerID, req.Message, string(req.Status), req.CreatedAt, req.UpdatedAt,
	).Scan(&req.RequestID)
	if err != nil {
		return mapWriteError(err, "failed to create coaching request")
	}

	req.Type = "coaching_request"
	return nil
}

func (r *PostgresCoachingRequestRepository) GetByID(ctx context.Context, requestID int) (*models.CoachingRequest, error) {
	query := `SELECT id, athlete_id, trainer_id, message, status, created_at, updated_at FROM coaching_requests WHERE id = $1`

	req := &models.CoachingRequest{}
	err := querierFor(ctx, r.pool).QueryRow(ctx, query, requestID).Scan(
		&req.RequestID, &req.AthleteID, &req.TrainerID, &req.Message, &req.Status, &req.CreatedAt, &req.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get coaching request: %w", err)
	}

	req.Type = "coaching_request"
	return req, nil
}

func (r *PostgresCoachingRequestRepository) GetByAthleteID(ctx context.Context, athleteID int, limit, offset int) ([]*models.CoachingRequest, error) {
	query := `SELECT id, athlete_id, trainer_id, message, status, created_at, updated_at FROM coaching_requests WHERE athlete_id = $1 ORDER BY created_at DESC` + limitClause(limit, offset)

	rows, err := querierFor(ctx, r.pool).Query(ctx, query, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to query coaching requests by athlete: %w", err)
	}
	defer rows.Close()

	return r.scanRequests(rows)
}

func (r *PostgresCoachingRequestRepository) CountByAthleteID(ctx context.Context, athleteID int) (int, error) {
	return r.count(ctx, `WHERE athlete_id = $1`, athleteID)
}

func (r *PostgresCoachingRequestRepository) GetByTrainerID(ctx context.Context, trainerID int, limit, offset int) ([]*models.CoachingRequest, error) {
	query := `SELECT id, athlete_id, trainer_id, message, status, created_at, updated_at FROM coaching_requests WHERE trainer_id = $1 ORDER BY created_at DESC` + limitClause(limit, offset)

	rows, err := querierFor(ctx, r.pool).Query(ctx, query, trainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to query coaching requests by trainer: %w", err)
	}
	defer rows.Close()

	return r.scanRequests(rows)
}

func (r *PostgresCoachingRequestRepository) CountByTrainerID(ctx context.Context, trainerID int) (int, error) {
	return r.count(ctx, `WHERE trainer_id = $1`, trainerID)
}

func (r *PostgresCoachingRequestRepository) GetPendingByTrainerID(ctx context.Context, trainerID int, limit, offset int) ([]*models.CoachingRequest, error) {
	query := `SELECT id, athlete_id, trainer_id, message, status, created_at, updated_at FROM coaching_requests WHERE trainer_id = $1 AND status = 'pending' ORDER BY created_at DESC` + limitClause(limit, offset)

	rows, err := querierFor(ctx, r.pool).Query(ctx, query, trainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending coaching requests: %w", err)
	}
	defer rows.Close()

	return r.scanRequests(rows)
}

func (r *PostgresCoachingRequestRepository) CountPendingByTrainerID(ctx context.Context, trainerID int) (int, error) {
	return r.count(ctx, `WHERE trainer_id = $1 AND status = 'pending'`, trainerID)
}

// HasPendingRequestBetween is an indexed EXISTS, so the duplicate-request check
// in CreateCoachingRequest no longer scans the athlete's entire history.
func (r *PostgresCoachingRequestRepository) HasPendingRequestBetween(ctx context.Context, athleteID, trainerID int) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM coaching_requests WHERE athlete_id = $1 AND trainer_id = $2 AND status = 'pending')`

	var exists bool
	err := querierFor(ctx, r.pool).QueryRow(ctx, query, athleteID, trainerID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check pending coaching request: %w", err)
	}
	return exists, nil
}

// ClosePendingForAthlete supersedes every pending request the athlete has. The
// conditional UPDATE is the authoritative check: no row is read, mutated in
// Go, or written back. The request being answered is never affected — on the
// coaching-request path it is already 'accepted' before establish runs.
func (r *PostgresCoachingRequestRepository) ClosePendingForAthlete(ctx context.Context, athleteID int) (int, error) {
	query := `
		UPDATE coaching_requests
		SET status = $1, updated_at = now()
		WHERE athlete_id = $2 AND status = $3`

	tag, err := querierFor(ctx, r.pool).Exec(ctx, query,
		string(models.CoachingRequestStatusSuperseded), athleteID, string(models.CoachingRequestStatusPending),
	)
	if err != nil {
		return 0, mapWriteError(err, "failed to close pending coaching requests")
	}
	return int(tag.RowsAffected()), nil
}

// count is a helper for the Count* methods; clause must begin with WHERE.
func (r *PostgresCoachingRequestRepository) count(ctx context.Context, clause string, arg int) (int, error) {
	var total int
	err := querierFor(ctx, r.pool).QueryRow(ctx, `SELECT COUNT(*) FROM coaching_requests `+clause, arg).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("failed to count coaching requests: %w", err)
	}
	return total, nil
}

func (r *PostgresCoachingRequestRepository) Update(ctx context.Context, req *models.CoachingRequest) error {
	req.UpdatedAt = time.Now()

	query := `UPDATE coaching_requests SET athlete_id = $1, trainer_id = $2, message = $3, status = $4, updated_at = $5 WHERE id = $6`

	tag, err := querierFor(ctx, r.pool).Exec(ctx, query,
		req.AthleteID, req.TrainerID, req.Message, string(req.Status), req.UpdatedAt, req.RequestID,
	)
	if err != nil {
		return mapWriteError(err, "failed to update coaching request")
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *PostgresCoachingRequestRepository) UpdateStatus(ctx context.Context, requestID int, from models.CoachingRequestStatus, to models.CoachingRequestStatus, updatedAt time.Time) (bool, error) {
	query := `UPDATE coaching_requests SET status = $1, updated_at = $2 WHERE id = $3 AND status = $4`

	tag, err := querierFor(ctx, r.pool).Exec(ctx, query, string(to), updatedAt, requestID, string(from))
	if err != nil {
		return false, mapWriteError(err, "failed to update coaching request status")
	}
	return tag.RowsAffected() > 0, nil
}

func (r *PostgresCoachingRequestRepository) Delete(ctx context.Context, requestID int) error {
	tag, err := querierFor(ctx, r.pool).Exec(ctx, `DELETE FROM coaching_requests WHERE id = $1`, requestID)
	if err != nil {
		return mapWriteError(err, "failed to delete coaching request")
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

// scanRequests is a helper to scan multiple coaching request rows.
func (r *PostgresCoachingRequestRepository) scanRequests(rows pgx.Rows) ([]*models.CoachingRequest, error) {
	requests := make([]*models.CoachingRequest, 0)
	for rows.Next() {
		req := &models.CoachingRequest{}
		if err := rows.Scan(&req.RequestID, &req.AthleteID, &req.TrainerID, &req.Message, &req.Status, &req.CreatedAt, &req.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan coaching request row: %w", err)
		}
		req.Type = "coaching_request"
		requests = append(requests, req)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return requests, nil
}

// Compile-time interface compliance check.
var _ repositories.CoachingRequestRepository = (*PostgresCoachingRequestRepository)(nil)
