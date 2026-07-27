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

// PostgresWorkoutRepository implements the WorkoutRepository interface using PostgreSQL.
type PostgresWorkoutRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresWorkoutRepository creates a new PostgreSQL-backed workout repository.
func NewPostgresWorkoutRepository(pool *pgxpool.Pool) *PostgresWorkoutRepository {
	return &PostgresWorkoutRepository{pool: pool}
}

const workoutCols = "id, athlete_id, date, plan_id, exercises, created_at, updated_at"

func scanWorkout(row interface{ Scan(dest ...any) error }, w *models.Workout) error {
	var planID *int
	var exercisesRaw []byte
	err := row.Scan(
		&w.WorkoutID, &w.AthleteID, &w.Date, &planID, &exercisesRaw, &w.CreatedAt, &w.UpdatedAt,
	)
	if err != nil {
		return err
	}
	if planID != nil {
		w.PlanID = *planID
	}
	if err := UnmarshalFromJSONB(exercisesRaw, &w.Exercises); err != nil {
		return fmt.Errorf("failed to unmarshal exercises: %w", err)
	}
	return nil
}

func (r *PostgresWorkoutRepository) Create(ctx context.Context, workout *models.Workout) error {
	now := time.Now()
	workout.CreatedAt = now
	workout.UpdatedAt = now

	exercisesJSON, err := MarshalToJSONB(workout.Exercises)
	if err != nil {
		return fmt.Errorf("failed to marshal exercises: %w", err)
	}

	// Handle nullable plan_id: 0 means no plan
	var planID any
	if workout.PlanID != 0 {
		planID = workout.PlanID
	}

	query := "INSERT INTO workouts (athlete_id, date, plan_id, exercises, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"

	err = r.pool.QueryRow(ctx, query,
		workout.AthleteID, workout.Date, planID, exercisesJSON, workout.CreatedAt, workout.UpdatedAt,
	).Scan(&workout.WorkoutID)
	if err != nil {
		return fmt.Errorf("failed to create workout: %w", err)
	}

	workout.Type = "workout"
	return nil
}

func (r *PostgresWorkoutRepository) GetByID(ctx context.Context, workoutID int) (*models.Workout, error) {
	query := "SELECT " + workoutCols + " FROM workouts WHERE id = $1"

	w := &models.Workout{}
	if err := scanWorkout(r.pool.QueryRow(ctx, query, workoutID), w); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get workout by ID: %w", err)
	}

	w.Type = "workout"
	return w, nil
}

func (r *PostgresWorkoutRepository) GetByAthleteID(ctx context.Context, athleteID int, limit, offset int) ([]*models.Workout, error) {
	query := "SELECT " + workoutCols + " FROM workouts WHERE athlete_id = $1 ORDER BY date DESC LIMIT $2 OFFSET $3"

	rows, err := r.pool.Query(ctx, query, athleteID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query workouts by athlete: %w", err)
	}
	defer rows.Close()

	workouts := make([]*models.Workout, 0)
	for rows.Next() {
		w := &models.Workout{}
		if err := scanWorkout(rows, w); err != nil {
			return nil, fmt.Errorf("failed to scan workout row: %w", err)
		}
		w.Type = "workout"
		workouts = append(workouts, w)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return workouts, nil
}

func (r *PostgresWorkoutRepository) GetByAthleteDateRange(ctx context.Context, athleteID int, startDate, endDate time.Time) ([]*models.Workout, error) {
	query := "SELECT " + workoutCols + " FROM workouts WHERE athlete_id = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC"

	rows, err := r.pool.Query(ctx, query, athleteID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query workouts by date range: %w", err)
	}
	defer rows.Close()

	workouts := make([]*models.Workout, 0)
	for rows.Next() {
		w := &models.Workout{}
		if err := scanWorkout(rows, w); err != nil {
			return nil, fmt.Errorf("failed to scan workout row: %w", err)
		}
		w.Type = "workout"
		workouts = append(workouts, w)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return workouts, nil
}

func (r *PostgresWorkoutRepository) Update(ctx context.Context, workout *models.Workout) error {
	workout.UpdatedAt = time.Now()

	exercisesJSON, err := MarshalToJSONB(workout.Exercises)
	if err != nil {
		return fmt.Errorf("failed to marshal exercises: %w", err)
	}

	var planID any
	if workout.PlanID != 0 {
		planID = workout.PlanID
	}

	query := "UPDATE workouts SET athlete_id = $1, date = $2, plan_id = $3, exercises = $4, updated_at = $5 WHERE id = $6"

	tag, err := r.pool.Exec(ctx, query,
		workout.AthleteID, workout.Date, planID, exercisesJSON, workout.UpdatedAt, workout.WorkoutID,
	)
	if err != nil {
		return fmt.Errorf("failed to update workout: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *PostgresWorkoutRepository) Delete(ctx context.Context, workoutID int) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM workouts WHERE id = $1", workoutID)
	if err != nil {
		return fmt.Errorf("failed to delete workout: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}


func (r *PostgresWorkoutRepository) CountAll(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM workouts").Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count workouts: %w", err)
	}
	return count, nil
}

// Compile-time interface compliance check.
var _ repositories.WorkoutRepository = (*PostgresWorkoutRepository)(nil)
