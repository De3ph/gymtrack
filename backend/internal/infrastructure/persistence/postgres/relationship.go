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

// PostgresRelationshipRepository implements RelationshipRepository using PostgreSQL.
type PostgresRelationshipRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresRelationshipRepository creates a new PostgreSQL-backed relationship repository.
func NewPostgresRelationshipRepository(pool *pgxpool.Pool) *PostgresRelationshipRepository {
	return &PostgresRelationshipRepository{pool: pool}
}

func (r *PostgresRelationshipRepository) Create(ctx context.Context, rel *models.Relationship) error {
	now := time.Now()
	rel.CreatedAt = now
	rel.UpdatedAt = now

	query := `
		INSERT INTO relationships (trainer_id, athlete_id, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`

	err := r.pool.QueryRow(ctx, query,
		rel.TrainerID, rel.AthleteID, string(rel.Status), rel.CreatedAt, rel.UpdatedAt,
	).Scan(&rel.RelationshipID)
	if err != nil {
		return fmt.Errorf("failed to create relationship: %w", err)
	}

	rel.Type = "relationship"
	return nil
}

func (r *PostgresRelationshipRepository) GetByID(ctx context.Context, relationshipID int) (*models.Relationship, error) {
	query := `SELECT id, trainer_id, athlete_id, status, created_at, updated_at FROM relationships WHERE id = $1`

	rel := &models.Relationship{}
	err := r.pool.QueryRow(ctx, query, relationshipID).Scan(
		&rel.RelationshipID, &rel.TrainerID, &rel.AthleteID, &rel.Status, &rel.CreatedAt, &rel.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get relationship: %w", err)
	}

	rel.Type = "relationship"
	return rel, nil
}

func (r *PostgresRelationshipRepository) GetByTrainerID(ctx context.Context, trainerID int) ([]*models.Relationship, error) {
	query := `SELECT id, trainer_id, athlete_id, status, created_at, updated_at FROM relationships WHERE trainer_id = $1 ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, trainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to query relationships by trainer: %w", err)
	}
	defer rows.Close()

	var rels []*models.Relationship
	for rows.Next() {
		rel := &models.Relationship{}
		if err := rows.Scan(&rel.RelationshipID, &rel.TrainerID, &rel.AthleteID, &rel.Status, &rel.CreatedAt, &rel.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan relationship row: %w", err)
		}
		rel.Type = "relationship"
		rels = append(rels, rel)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return rels, nil
}

func (r *PostgresRelationshipRepository) GetByAthleteID(ctx context.Context, athleteID int) (*models.Relationship, error) {
	query := `SELECT id, trainer_id, athlete_id, status, created_at, updated_at FROM relationships WHERE athlete_id = $1 ORDER BY created_at DESC LIMIT 1`

	rel := &models.Relationship{}
	err := r.pool.QueryRow(ctx, query, athleteID).Scan(
		&rel.RelationshipID, &rel.TrainerID, &rel.AthleteID, &rel.Status, &rel.CreatedAt, &rel.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get relationship by athlete: %w", err)
	}

	rel.Type = "relationship"
	return rel, nil
}

func (r *PostgresRelationshipRepository) GetPendingByAthleteID(ctx context.Context, athleteID int) ([]*models.Relationship, error) {
	query := `SELECT id, trainer_id, athlete_id, status, created_at, updated_at FROM relationships WHERE athlete_id = $1 AND status = 'pending' ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending relationships: %w", err)
	}
	defer rows.Close()

	var rels []*models.Relationship
	for rows.Next() {
		rel := &models.Relationship{}
		if err := rows.Scan(&rel.RelationshipID, &rel.TrainerID, &rel.AthleteID, &rel.Status, &rel.CreatedAt, &rel.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan relationship row: %w", err)
		}
		rel.Type = "relationship"
		rels = append(rels, rel)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return rels, nil
}

func (r *PostgresRelationshipRepository) HasActiveRelationship(ctx context.Context, trainerID int, athleteID int) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM relationships WHERE trainer_id = $1 AND athlete_id = $2 AND status = 'active')`

	var exists bool
	err := r.pool.QueryRow(ctx, query, trainerID, athleteID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check active relationship: %w", err)
	}
	return exists, nil
}

func (r *PostgresRelationshipRepository) Update(ctx context.Context, rel *models.Relationship) error {
	rel.UpdatedAt = time.Now()

	query := `UPDATE relationships SET trainer_id = $1, athlete_id = $2, status = $3, updated_at = $4 WHERE id = $5`

	tag, err := r.pool.Exec(ctx, query, rel.TrainerID, rel.AthleteID, string(rel.Status), rel.UpdatedAt, rel.RelationshipID)
	if err != nil {
		return fmt.Errorf("failed to update relationship: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *PostgresRelationshipRepository) Delete(ctx context.Context, relationshipID int) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM relationships WHERE id = $1`, relationshipID)
	if err != nil {
		return fmt.Errorf("failed to delete relationship: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

// Compile-time interface compliance check.
var _ repositories.RelationshipRepository = (*PostgresRelationshipRepository)(nil)
