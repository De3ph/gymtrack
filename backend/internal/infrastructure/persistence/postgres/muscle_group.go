package postgres

import (
	"context"
	"errors"
	"fmt"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresMuscleGroupRepository implements the MuscleGroupRepository interface using PostgreSQL.
type PostgresMuscleGroupRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresMuscleGroupRepository creates a new PostgreSQL-backed muscle group repository.
func NewPostgresMuscleGroupRepository(pool *pgxpool.Pool) *PostgresMuscleGroupRepository {
	return &PostgresMuscleGroupRepository{pool: pool}
}

func (r *PostgresMuscleGroupRepository) GetAllMuscleGroups(ctx context.Context) ([]models.MuscleGroupDefinition, error) {
	rows, err := r.pool.Query(ctx, "SELECT id, code, description FROM muscle_groups ORDER BY id")
	if err != nil {
		return nil, fmt.Errorf("failed to query muscle groups: %w", err)
	}
	defer rows.Close()

	var muscleGroups []models.MuscleGroupDefinition
	for rows.Next() {
		var mg models.MuscleGroupDefinition
		if err := rows.Scan(&mg.ID, &mg.Code, &mg.Description); err != nil {
			return nil, fmt.Errorf("failed to scan muscle group: %w", err)
		}
		muscleGroups = append(muscleGroups, mg)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return muscleGroups, nil
}

func (r *PostgresMuscleGroupRepository) GetMuscleGroupByID(ctx context.Context, id int) (*models.MuscleGroupDefinition, error) {
	var mg models.MuscleGroupDefinition
	err := r.pool.QueryRow(ctx, "SELECT id, code, description FROM muscle_groups WHERE id = $1", id).
		Scan(&mg.ID, &mg.Code, &mg.Description)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get muscle group: %w", err)
	}
	return &mg, nil
}
