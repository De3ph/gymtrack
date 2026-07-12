package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"

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

	query := `INSERT INTO workout_plans (trainer_id, name, description, exercises, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`
	err = r.pool.QueryRow(ctx, query,
		plan.TrainerID, plan.Name, plan.Description, exJSON, plan.CreatedAt, plan.UpdatedAt,
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
	err := row.Scan(&p.PlanID, &p.TrainerID, &p.Name, &p.Description, &exRaw, &p.CreatedAt, &p.UpdatedAt)
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

const planCols = `id, trainer_id, name, description, exercises, created_at, updated_at`

func (r *PostgresWorkoutPlanRepository) GetByID(ctx context.Context, planID int) (*models.WorkoutPlan, error) {
	return r.scanPlan(r.pool.QueryRow(ctx, `SELECT `+planCols+` FROM workout_plans WHERE id = $1`, planID))
}

func (r *PostgresWorkoutPlanRepository) GetByTrainerID(ctx context.Context, trainerID int) ([]*models.WorkoutPlan, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+planCols+` FROM workout_plans WHERE trainer_id = $1 ORDER BY created_at DESC`, trainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to query workout plans: %w", err)
	}
	defer rows.Close()

	var plans []*models.WorkoutPlan
	for rows.Next() {
		p := &models.WorkoutPlan{}
		var exRaw []byte
		if err := rows.Scan(&p.PlanID, &p.TrainerID, &p.Name, &p.Description, &exRaw, &p.CreatedAt, &p.UpdatedAt); err != nil {
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

func (r *PostgresWorkoutPlanRepository) Update(ctx context.Context, plan *models.WorkoutPlan) error {
	plan.UpdatedAt = time.Now()
	exJSON, err := MarshalToJSONB(plan.Exercises)
	if err != nil {
		return fmt.Errorf("failed to marshal plan exercises: %w", err)
	}
	tag, err := r.pool.Exec(ctx,
		`UPDATE workout_plans SET trainer_id=$1, name=$2, description=$3, exercises=$4, updated_at=$5 WHERE id=$6`,
		plan.TrainerID, plan.Name, plan.Description, exJSON, plan.UpdatedAt, plan.PlanID,
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
var _ interface {
	Create(ctx context.Context, plan *models.WorkoutPlan) error
	GetByID(ctx context.Context, planID int) (*models.WorkoutPlan, error)
	GetByTrainerID(ctx context.Context, trainerID int) ([]*models.WorkoutPlan, error)
	Update(ctx context.Context, plan *models.WorkoutPlan) error
	Delete(ctx context.Context, planID int) error
} = (*PostgresWorkoutPlanRepository)(nil)
