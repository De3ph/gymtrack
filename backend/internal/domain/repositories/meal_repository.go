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
	CountAll(ctx context.Context) (int, error)
	// Nutrition averages are computed in SQL over the full history. Averages
	// are per meal (item totals divided by the meal count) to match the
	// legacy Go aggregation.
	NutritionAverages(ctx context.Context, athleteID int) (*NutritionAveragesRow, error)
	// WeeklyNutrition returns one row per ISO week with meals, ordered by week
	// key ascending; each figure is that week's per-meal average.
	WeeklyNutrition(ctx context.Context, athleteID int) ([]WeeklyNutritionRow, error)
	// MealTypeCounts returns one row per meal type ordered by type ascending.
	MealTypeCounts(ctx context.Context, athleteID int) ([]MealTypeCountRow, error)
	// CountByAthleteSince counts meals whose date is strictly after since, for
	// weekly activity counters.
	CountByAthleteSince(ctx context.Context, athleteID int, since time.Time) (int, error)
}

// NutritionAveragesRow holds the athlete-wide nutrition averages.
type NutritionAveragesRow struct {
	Meals    int
	Calories float64
	Protein  float64
	Carbs    float64
	Fats     float64
}

// WeeklyNutritionRow is one ISO week of per-meal nutrition averages.
type WeeklyNutritionRow struct {
	Week     string
	Calories float64
	Protein  float64
	Carbs    float64
	Fats     float64
}

// MealTypeCountRow counts the meals logged for one meal type.
type MealTypeCountRow struct {
	MealType string
	Count    int
}
