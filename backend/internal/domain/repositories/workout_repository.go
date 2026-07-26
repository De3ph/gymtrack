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
	GetByAthleteDateRange(ctx context.Context, athleteID int, startDate, endDate time.Time) ([]*models.Workout, error)
	Update(ctx context.Context, workout *models.Workout) error
	Delete(ctx context.Context, workoutID int) error
	CountAll(ctx context.Context) (int, error)
}
