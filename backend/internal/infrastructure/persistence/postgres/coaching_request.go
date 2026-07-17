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

	err := r.pool.QueryRow(ctx, query,
		req.AthleteID, req.TrainerID, req.Message, string(req.Status), req.CreatedAt, req.UpdatedAt,
	).Scan(&req.RequestID)
	if err != nil {
		return fmt.Errorf("failed to create coaching request: %w", err)
	}

	req.Type = "coaching_request"
	return nil
}

func (r *PostgresCoachingRequestRepository) GetByID(ctx context.Context, requestID int) (*models.CoachingRequest, error) {
	query := `SELECT id, athlete_id, trainer_id, message, status, created_at, updated_at FROM coaching_requests WHERE id = $1`

	req := &models.CoachingRequest{}
	err := r.pool.QueryRow(ctx, query, requestID).Scan(
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

func (r *PostgresCoachingRequestRepository) GetByAthleteID(ctx context.Context, athleteID int) ([]*models.CoachingRequest, error) {
	query := `SELECT id, athlete_id, trainer_id, message, status, created_at, updated_at FROM coaching_requests WHERE athlete_id = $1 ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to query coaching requests by athlete: %w", err)
	}
	defer rows.Close()

	return r.scanRequests(rows)
}

func (r *PostgresCoachingRequestRepository) GetByTrainerID(ctx context.Context, trainerID int) ([]*models.CoachingRequest, error) {
	query := `SELECT id, athlete_id, trainer_id, message, status, created_at, updated_at FROM coaching_requests WHERE trainer_id = $1 ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, trainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to query coaching requests by trainer: %w", err)
	}
	defer rows.Close()

	return r.scanRequests(rows)
}

func (r *PostgresCoachingRequestRepository) GetPendingByTrainerID(ctx context.Context, trainerID int) ([]*models.CoachingRequest, error) {
	query := `SELECT id, athlete_id, trainer_id, message, status, created_at, updated_at FROM coaching_requests WHERE trainer_id = $1 AND status = 'pending' ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, trainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending coaching requests: %w", err)
	}
	defer rows.Close()

	return r.scanRequests(rows)
}

func (r *PostgresCoachingRequestRepository) Update(ctx context.Context, req *models.CoachingRequest) error {
	req.UpdatedAt = time.Now()

	query := `UPDATE coaching_requests SET athlete_id = $1, trainer_id = $2, message = $3, status = $4, updated_at = $5 WHERE id = $6`

	tag, err := r.pool.Exec(ctx, query,
		req.AthleteID, req.TrainerID, req.Message, string(req.Status), req.UpdatedAt, req.RequestID,
	)
	if err != nil {
		return fmt.Errorf("failed to update coaching request: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *PostgresCoachingRequestRepository) Delete(ctx context.Context, requestID int) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM coaching_requests WHERE id = $1`, requestID)
	if err != nil {
		return fmt.Errorf("failed to delete coaching request: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

// scanRequests is a helper to scan multiple coaching request rows.
func (r *PostgresCoachingRequestRepository) scanRequests(rows pgx.Rows) ([]*models.CoachingRequest, error) {
	var requests []*models.CoachingRequest
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
