package repositories

import (
	"context"
	"time"

	"gymtrack-backend/internal/domain/models"
)

// WorkoutRepository defines data access for workouts.
type WorkoutRepository interface {
	Create(ctx context.Context, workout *models.Workout) error
	GetByID(ctx context.Context, workoutID int) (*models.Workout, error)
	GetByAthleteID(ctx context.Context, athleteID int, limit, offset int) ([]*models.Workout, error)
	GetByAthleteDateRange(ctx context.Context, athleteID int, startDate, endDate *time.Time, limit, offset int) ([]*models.Workout, error)
	CountByAthlete(ctx context.Context, athleteID int, startDate, endDate *time.Time) (int, error)
	CountAll(ctx context.Context) (int, error)
	Update(ctx context.Context, workout *models.Workout) error
	Delete(ctx context.Context, workoutID int) error
	// Aggregated statistics are computed in SQL so the full history never has
	// to be row-shipped and aggregated in Go.
	//
	// WeeklyVolume returns one row per ISO week with workouts, ordered by week
	// key ascending. Volume is the summed weight * reps over all sets,
	// matching the legacy Go aggregation, including the weight-unit
	// convention (units are not converted).
	WeeklyVolume(ctx context.Context, athleteID int) ([]VolumeWeekRow, error)
	// ExerciseAggregates returns one row per exercise name (as logged in the
	// JSONB), ordered by name ascending, for the same symmetric totals as the
	// Spring-era Go breakdown.
	ExerciseAggregates(ctx context.Context, athleteID int) ([]ExerciseAggregateRow, error)
	// CountByAthleteSince counts workouts whose date is strictly after since,
	// for weekly activity counters.
	CountByAthleteSince(ctx context.Context, athleteID int, since time.Time) (int, error)
}

// VolumeWeekRow is one ISO week of aggregated training volume.
type VolumeWeekRow struct {
	Week     string
	Volume   float64
	Workouts int
}

// ExerciseAggregateRow is one exercise's totals across all of an athlete's workouts.
type ExerciseAggregateRow struct {
	Name      string
	TotalSets int
	TotalReps int
	MaxWeight float64
}
