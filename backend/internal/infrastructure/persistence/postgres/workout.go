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

func (r *PostgresWorkoutRepository) Update(ctx context.Context, workout *models.Workout) error {
	workout.UpdatedAt = time.Now()
	exercisesJSON, err := MarshalWorkoutExercises(workout.Exercises)
	if err != nil {
		return fmt.Errorf("failed to marshal exercises: %w", err)
	}

	// Handle nullable plan_id: 0 means no plan
	var planID any
	if workout.PlanID != 0 {
		planID = workout.PlanID
	}

	query := "UPDATE workouts SET date = $1, plan_id = $2, exercises = $3, updated_at = $4 WHERE id = $5"
	tag, err := r.pool.Exec(ctx, query,
		workout.Date, planID, exercisesJSON, workout.UpdatedAt, workout.WorkoutID,
	)
	if err != nil {
		return mapWriteError(err, "failed to update workout")
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *PostgresWorkoutRepository) Delete(ctx context.Context, workoutID int) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM workouts WHERE id = $1", workoutID)
	if err != nil {
		return mapWriteError(err, "failed to delete workout")
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

// setVolumeExpr is the set-level volume expression shared by the aggregate
// queries: weight * reps exactly as the legacy Go aggregation computed it —
// units are not converted. NULL weights or reps degrade to 0.
const setVolumeExpr = `COALESCE((s.set ->> 'weight')::double precision, 0) * COALESCE((s.set ->> 'reps')::double precision, 0)`

// setsLateral is the lateral expansion of workouts.exercises into sets.
// Warm-up sets contribute no volume: they are preparation, not training work,
// so counting them would inflate every athlete's weekly volume. The COALESCE
// keeps rows written before setType existed behaving as working sets.
// Every workout produces at least one row (aggregate over an empty set list
// evaluates to one NULL volume row), so weekly counts stay per workout.
const setsLateral = `
		CROSS JOIN LATERAL (
			SELECT SUM(
				CASE
					WHEN COALESCE(s.set ->> 'setType', 'working') = 'warmup' THEN 0
					ELSE ` + setVolumeExpr + `
				END
			) AS volume
			FROM jsonb_array_elements(w.exercises) AS ex(exercise)
			CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ex.exercise -> 'sets', '[]'::jsonb)) AS s(set)
		) AS v`

// isoWeekExpr renders the ISO week key, e.g. 2026-W03, matching the format
// previously produced in Go by fmt.Sprintf("%d-W%02d", year, week).
const isoWeekExpr = `to_char(w.date, 'IYYY-"W"IW')`

// WeeklyVolume aggregates per-week training volume in SQL: the full workout
// history is never row-shipped to Go for aggregation.
func (r *PostgresWorkoutRepository) WeeklyVolume(ctx context.Context, athleteID int) ([]repositories.VolumeWeekRow, error) {
	query := `
		SELECT ` + isoWeekExpr + ` AS week,
		       COALESCE(SUM(v.volume), 0) AS volume,
		       COUNT(*)::int AS workouts
		FROM workouts w` + setsLateral + `
		WHERE w.athlete_id = $1
		GROUP BY 1
		ORDER BY 1 ASC`

	rows, err := r.pool.Query(ctx, query, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate workout volume: %w", err)
	}
	defer rows.Close()

	weeks := make([]repositories.VolumeWeekRow, 0)
	for rows.Next() {
		row := repositories.VolumeWeekRow{}
		if err := rows.Scan(&row.Week, &row.Volume, &row.Workouts); err != nil {
			return nil, fmt.Errorf("failed to scan workout volume row: %w", err)
		}
		weeks = append(weeks, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return weeks, nil
}

// ExerciseAggregates builds the per-exercise breakdown in SQL, ordered by name
// ascending so the response body is deterministic.
//
// Warm-up sets still count towards total_sets and total_reps — the athlete did
// perform them — but they are excluded from max_weight, which should describe
// the heaviest training set rather than a warm-up single.
func (r *PostgresWorkoutRepository) ExerciseAggregates(ctx context.Context, athleteID int) ([]repositories.ExerciseAggregateRow, error) {
	query := `
		SELECT ex.exercise ->> 'name' AS name,
		       COUNT(*)::int AS total_sets,
		       SUM(COALESCE((s.set ->> 'reps')::double precision, 0))::int AS total_reps,
		       COALESCE(MAX(
		         CASE
		           WHEN COALESCE(s.set ->> 'setType', 'working') = 'warmup' THEN NULL
		           ELSE (s.set ->> 'weight')::double precision
		         END
		       ), 0) AS max_weight
		FROM workouts w
		CROSS JOIN LATERAL jsonb_array_elements(w.exercises) AS ex(exercise)
		CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ex.exercise -> 'sets', '[]'::jsonb)) AS s(set)
		WHERE w.athlete_id = $1
		GROUP BY 1
		ORDER BY 1 ASC`

	rows, err := r.pool.Query(ctx, query, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate workout exercises: %w", err)
	}
	defer rows.Close()

	aggregates := make([]repositories.ExerciseAggregateRow, 0)
	for rows.Next() {
		row := repositories.ExerciseAggregateRow{}
		if err := rows.Scan(&row.Name, &row.TotalSets, &row.TotalReps, &row.MaxWeight); err != nil {
			return nil, fmt.Errorf("failed to scan exercise aggregate row: %w", err)
		}
		aggregates = append(aggregates, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return aggregates, nil
}

// CountByAthleteSince counts workouts strictly after "since", matching the
// legacy weekStart comparisons in Go (date.After(weekStart)).
func (r *PostgresWorkoutRepository) CountByAthleteSince(ctx context.Context, athleteID int, since time.Time) (int, error) {
	var count int
	if err := r.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM workouts WHERE athlete_id = $1 AND date > $2",
		athleteID, since,
	).Scan(&count); err != nil {
		return 0, fmt.Errorf("failed to count workouts since: %w", err)
	}
	return count, nil
}

// Compile-time interface compliance check.
var _ repositories.WorkoutRepository = (*PostgresWorkoutRepository)(nil)
