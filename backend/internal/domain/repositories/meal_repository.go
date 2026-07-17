package repositories

import (
	"context"
	"time"

	"gymtrack-backend/internal/domain/models"
)

// MealRepository defines data access for meals.
type MealRepository interface {
	Create(ctx context.Context, meal *models.Meal) error
	GetByID(ctx context.Context, mealID int) (*models.Meal, error)
	GetByAthleteID(ctx context.Context, athleteID int, limit, offset int) ([]*models.Meal, error)
	GetByAthleteDateRange(ctx context.Context, athleteID int, startDate, endDate time.Time) ([]*models.Meal, error)
	Update(ctx context.Context, meal *models.Meal) error
	Delete(ctx context.Context, mealID int) error
}
