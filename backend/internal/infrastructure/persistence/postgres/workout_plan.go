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

// PostgresWorkoutPlanRepository implements WorkoutPlanRepository using PostgreSQL.
type PostgresWorkoutPlanRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresWorkoutPlanRepository creates a new PostgreSQL-backed workout plan repository.
func NewPostgresWorkoutPlanRepository(pool *pgxpool.Pool) *PostgresWorkoutPlanRepository {
	return &PostgresWorkoutPlanRepository{pool: pool}
}

func (r *PostgresWorkoutPlanRepository) Create(ctx context.Context, plan *models.WorkoutPlan) error {
	now := time.Now()
	plan.CreatedAt = now
	plan.UpdatedAt = now

	exJSON, err := MarshalToJSONB(plan.Exercises)
	if err != nil {
		return fmt.Errorf("failed to marshal plan exercises: %w", err)
	}

	query := `INSERT INTO workout_plans (creator_id, name, description, exercises, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`
	err = r.pool.QueryRow(ctx, query,
		plan.CreatorID, plan.Name, plan.Description, exJSON, plan.CreatedAt, plan.UpdatedAt,
	).Scan(&plan.PlanID)
	if err != nil {
		return fmt.Errorf("failed to create workout plan: %w", err)
	}
	plan.Type = "workout_plan"
	return nil
}

func (r *PostgresWorkoutPlanRepository) scanPlan(row pgx.Row) (*models.WorkoutPlan, error) {
	p := &models.WorkoutPlan{}
	var exRaw []byte
	err := row.Scan(&p.PlanID, &p.CreatorID, &p.Name, &p.Description, &exRaw, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to scan workout plan: %w", err)
	}
	if err := UnmarshalFromJSONB(exRaw, &p.Exercises); err != nil {
		return nil, fmt.Errorf("failed to unmarshal plan exercises: %w", err)
	}
	p.Type = "workout_plan"
	return p, nil
}

const planCols = `id, creator_id, name, description, exercises, created_at, updated_at`

func (r *PostgresWorkoutPlanRepository) GetByID(ctx context.Context, planID int) (*models.WorkoutPlan, error) {
	return r.scanPlan(r.pool.QueryRow(ctx, `SELECT `+planCols+` FROM workout_plans WHERE id = $1`, planID))
}

func (r *PostgresWorkoutPlanRepository) GetByCreatorID(ctx context.Context, creatorID int) ([]*models.WorkoutPlan, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+planCols+` FROM workout_plans WHERE creator_id = $1 ORDER BY created_at DESC`, creatorID)
	if err != nil {
		return nil, fmt.Errorf("failed to query workout plans: %w", err)
	}
	defer rows.Close()

	plans := make([]*models.WorkoutPlan, 0)
	for rows.Next() {
		p := &models.WorkoutPlan{}
		var exRaw []byte
		if err := rows.Scan(&p.PlanID, &p.CreatorID, &p.Name, &p.Description, &exRaw, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan plan row: %w", err)
		}
		if err := UnmarshalFromJSONB(exRaw, &p.Exercises); err != nil {
			return nil, fmt.Errorf("failed to unmarshal plan exercises: %w", err)
		}
		p.Type = "workout_plan"
		plans = append(plans, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return plans, nil
}

func (r *PostgresWorkoutPlanRepository) CountByCreatorID(ctx context.Context, creatorID int) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM workout_plans WHERE creator_id = $1`, creatorID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count workout plans: %w", err)
	}
	return count, nil
}

func (r *PostgresWorkoutPlanRepository) Update(ctx context.Context, plan *models.WorkoutPlan) error {
	plan.UpdatedAt = time.Now()
	exJSON, err := MarshalToJSONB(plan.Exercises)
	if err != nil {
		return fmt.Errorf("failed to marshal plan exercises: %w", err)
	}
	tag, err := r.pool.Exec(ctx,
		`UPDATE workout_plans SET creator_id=$1, name=$2, description=$3, exercises=$4, updated_at=$5 WHERE id=$6`,
		plan.CreatorID, plan.Name, plan.Description, exJSON, plan.UpdatedAt, plan.PlanID,
	)
	if err != nil {
		return fmt.Errorf("failed to update workout plan: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *PostgresWorkoutPlanRepository) Delete(ctx context.Context, planID int) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM workout_plans WHERE id = $1`, planID)
	if err != nil {
		return fmt.Errorf("failed to delete workout plan: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

// Compile-time interface compliance check.
var _ repositories.WorkoutPlanRepository = (*PostgresWorkoutPlanRepository)(nil)
