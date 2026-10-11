package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"
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
	if err := UnmarshalWorkoutExercises(exercisesRaw, &w.Exercises); err != nil {
		return fmt.Errorf("failed to unmarshal exercises: %w", err)
	}
	return nil
}

func (r *PostgresWorkoutRepository) Create(ctx context.Context, workout *models.Workout) error {
	now := time.Now()
	workout.CreatedAt = now
	workout.UpdatedAt = now

	exercisesJSON, err := MarshalWorkoutExercises(workout.Exercises)
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
		return mapWriteError(err, "failed to create workout")
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

// dateRangeWhere builds the WHERE clause for athlete-scoped date-window
// queries. Nil bounds are omitted, so callers can filter on the start or
// end independently. It returns the clause, its positional arguments, and
// the index of the next free parameter.
func (r *PostgresWorkoutRepository) dateRangeWhere(athleteID int, startDate, endDate *time.Time) (string, []any, int) {
	clauses := []string{"athlete_id = $1"}
	args := []any{athleteID}
	n := 2
	if startDate != nil {
		clauses = append(clauses, fmt.Sprintf("date >= $%d", n))
		args = append(args, *startDate)
		n++
	}
	if endDate != nil {
		clauses = append(clauses, fmt.Sprintf("date <= $%d", n))
		args = append(args, *endDate)
		n++
	}
	return strings.Join(clauses, " AND "), args, n
}

func (r *PostgresWorkoutRepository) GetByAthleteDateRange(ctx context.Context, athleteID int, startDate, endDate *time.Time, limit, offset int) ([]*models.Workout, error) {
	where, args, n := r.dateRangeWhere(athleteID, startDate, endDate)
	query := fmt.Sprintf("SELECT %s FROM workouts WHERE %s ORDER BY date DESC LIMIT $%d OFFSET $%d", workoutCols, where, n, n+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
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

// CountByAthlete counts an athlete's workouts, optionally bounded by a
// date window (nil bounds are unbounded).
func (r *PostgresWorkoutRepository) CountByAthlete(ctx context.Context, athleteID int, startDate, endDate *time.Time) (int, error) {
	where, args, _ := r.dateRangeWhere(athleteID, startDate, endDate)
	var count int
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM workouts WHERE "+where, args...).Scan(&count); err != nil {
		return 0, fmt.Errorf("failed to count workouts for athlete: %w", err)
	}
	return count, nil
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
