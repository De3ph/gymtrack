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

// PostgresWorkoutPlanAssignmentRepository implements WorkoutPlanAssignmentRepository using PostgreSQL.
type PostgresWorkoutPlanAssignmentRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresWorkoutPlanAssignmentRepository creates a new PostgreSQL-backed assignment repository.
func NewPostgresWorkoutPlanAssignmentRepository(pool *pgxpool.Pool) *PostgresWorkoutPlanAssignmentRepository {
	return &PostgresWorkoutPlanAssignmentRepository{pool: pool}
}

func (r *PostgresWorkoutPlanAssignmentRepository) Create(ctx context.Context, a *models.WorkoutPlanAssignment) error {
	a.CreatedAt = time.Now()

	query := `INSERT INTO workout_plan_assignments (plan_id, athlete_id, trainer_id, status, created_at) VALUES ($1,$2,$3,$4,$5) RETURNING id`
	err := r.pool.QueryRow(ctx, query,
		a.PlanID, a.AthleteID, a.TrainerID, a.Status, a.CreatedAt,
	).Scan(&a.AssignmentID)
	if err != nil {
		return fmt.Errorf("failed to create assignment: %w", err)
	}
	a.Type = "workout_plan_assignment"
	return nil
}

const wpaCols = `id, plan_id, athlete_id, trainer_id, status, created_at`

func (r *PostgresWorkoutPlanAssignmentRepository) scanAssignment(row pgx.Row) (*models.WorkoutPlanAssignment, error) {
	a := &models.WorkoutPlanAssignment{}
	err := row.Scan(&a.AssignmentID, &a.PlanID, &a.AthleteID, &a.TrainerID, &a.Status, &a.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to scan assignment: %w", err)
	}
	a.Type = "workout_plan_assignment"
	return a, nil
}

func (r *PostgresWorkoutPlanAssignmentRepository) scanAssignments(rows pgx.Rows) ([]*models.WorkoutPlanAssignment, error) {
	var results []*models.WorkoutPlanAssignment
	for rows.Next() {
		a := &models.WorkoutPlanAssignment{}
		if err := rows.Scan(&a.AssignmentID, &a.PlanID, &a.AthleteID, &a.TrainerID, &a.Status, &a.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan assignment row: %w", err)
		}
		a.Type = "workout_plan_assignment"
		results = append(results, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return results, nil
}

func (r *PostgresWorkoutPlanAssignmentRepository) GetByPlanID(ctx context.Context, planID int) ([]*models.WorkoutPlanAssignment, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+wpaCols+` FROM workout_plan_assignments WHERE plan_id = $1`, planID)
	if err != nil {
		return nil, fmt.Errorf("failed to query assignments by plan: %w", err)
	}
	defer rows.Close()
	return r.scanAssignments(rows)
}

func (r *PostgresWorkoutPlanAssignmentRepository) GetByAthleteID(ctx context.Context, athleteID int) ([]*models.WorkoutPlanAssignment, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+wpaCols+` FROM workout_plan_assignments WHERE athlete_id = $1 AND status = 'active'`, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to query assignments by athlete: %w", err)
	}
	defer rows.Close()
	return r.scanAssignments(rows)
}

func (r *PostgresWorkoutPlanAssignmentRepository) GetByAthleteAndPlan(ctx context.Context, athleteID int, planID int) (*models.WorkoutPlanAssignment, error) {
	return r.scanAssignment(r.pool.QueryRow(ctx,
		`SELECT `+wpaCols+` FROM workout_plan_assignments WHERE athlete_id = $1 AND plan_id = $2`,
		athleteID, planID,
	))
}

func (r *PostgresWorkoutPlanAssignmentRepository) GetByTrainerID(ctx context.Context, trainerID int) ([]*models.WorkoutPlanAssignment, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+wpaCols+` FROM workout_plan_assignments WHERE trainer_id = $1`, trainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to query assignments by trainer: %w", err)
	}
	defer rows.Close()
	return r.scanAssignments(rows)
}

func (r *PostgresWorkoutPlanAssignmentRepository) DeleteByPlanID(ctx context.Context, planID int) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM workout_plan_assignments WHERE plan_id = $1`, planID)
	if err != nil {
		return fmt.Errorf("failed to delete assignments by plan: %w", err)
	}
	return nil
}

// Compile-time interface compliance check.
var _ repositories.WorkoutPlanAssignmentRepository = (*PostgresWorkoutPlanAssignmentRepository)(nil)
