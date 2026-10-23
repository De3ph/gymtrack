package postgres

import (
	"context"
	"testing"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/testutils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPostgresMealRepository(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	repo := NewPostgresMealRepository(pool)
	ctx := context.Background()

	createMealUser := func(t *testing.T, username string, role ...models.UserRole) *models.User {
		t.Helper()
		userRole := models.RoleAthlete
		if len(role) > 0 {
			userRole = role[0]
		}
		var userID int
		err := pool.QueryRow(ctx,
			`INSERT INTO users (username, email, password_hash, role, profile) VALUES ($1,$2,$3,$4,$5) RETURNING user_id`,
			username, username+"@test.com", "hash", string(userRole), `{"name":"`+username+`"}`,
		).Scan(&userID)
		require.NoError(t, err)
		return &models.User{UserID: userID, Username: username, Role: userRole}
	}

	athlete := createMealUser(t, "meal_athlete")

	makeItems := func() []models.FoodItem {
		return []models.FoodItem{
			{Food: "Chicken breast", Quantity: "200g", Calories: 330, Macros: models.Macros{Protein: 62, Carbs: 0, Fats: 7.2}},
			{Food: "Rice", Quantity: "150g", Calories: 195, Macros: models.Macros{Protein: 4.3, Carbs: 42, Fats: 0.4}},
		}
	}

	t.Run("Create", func(t *testing.T) {
		meal := &models.Meal{
			AthleteID: athlete.UserID, Date: time.Now(), MealType: models.MealTypeLunch, Items: makeItems(),
		}
		err := repo.Create(ctx, meal)
		require.NoError(t, err)
		assert.NotZero(t, meal.MealID)
		assert.Equal(t, "meal", meal.Type)
	})

	t.Run("GetByID", func(t *testing.T) {
		meal := &models.Meal{
			AthleteID: athlete.UserID, Date: time.Now(), MealType: models.MealTypeDinner,
			Items: []models.FoodItem{{Food: "Salmon", Quantity: "150g", Calories: 280, Macros: models.Macros{Protein: 40, Carbs: 0, Fats: 12}}},
		}
		require.NoError(t, repo.Create(ctx, meal))

		fetched, err := repo.GetByID(ctx, meal.MealID)
		require.NoError(t, err)
		assert.Equal(t, meal.MealID, fetched.MealID)
		assert.Equal(t, models.MealTypeDinner, fetched.MealType)
		assert.Len(t, fetched.Items, 1)
		assert.Equal(t, "Salmon", fetched.Items[0].Food)
	})

	t.Run("GetByID_NotFound", func(t *testing.T) {
		_, err := repo.GetByID(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetByAthleteID_Pagination", func(t *testing.T) {
		for i := 0; i < 5; i++ {
			require.NoError(t, repo.Create(ctx, &models.Meal{
				AthleteID: athlete.UserID, Date: time.Now().AddDate(0, 0, -i), MealType: models.MealTypeBreakfast, Items: makeItems(),
			}))
		}
		meals, err := repo.GetByAthleteID(ctx, athlete.UserID, 3, 0)
		require.NoError(t, err)
		assert.Len(t, meals, 3)
	})

	t.Run("GetByAthleteDateRange", func(t *testing.T) {
		now := time.Now()
		start := now.AddDate(0, 0, -1)
		end := now.AddDate(0, 0, 1)
		meals, err := repo.GetByAthleteDateRange(ctx, athlete.UserID, start, end)
		require.NoError(t, err)
		assert.NotEmpty(t, meals)
	})

	// Averages must match the legacy Go arithmetic: per meal, calories counted
	// only when strictly positive, macros only when any of them is positive.
	t.Run("NutritionAverages_WeeklyNutrition_MealTypeCounts", func(t *testing.T) {
		statAthlete := createMealUser(t, "ml_stats", models.RoleAthlete)
		june3 := time.Date(2024, 6, 3, 0, 0, 0, 0, time.UTC)   // 2024-W23
		june10 := time.Date(2024, 6, 10, 0, 0, 0, 0, time.UTC) // 2024-W24
		june12 := june10.AddDate(0, 0, 2)

		require.NoError(t, repo.Create(ctx, &models.Meal{AthleteID: statAthlete.UserID, Date: june3,
			MealType: models.MealTypeBreakfast,
			Items:    []models.FoodItem{{Food: "Oats", Quantity: "80g", Calories: 500, Macros: models.Macros{Protein: 30, Carbs: 40, Fats: 10}}},
		}))
		require.NoError(t, repo.Create(ctx, &models.Meal{AthleteID: statAthlete.UserID, Date: june10,
			MealType: models.MealTypeBreakfast,
			Items:    []models.FoodItem{{Food: "Toast", Quantity: "2 slices", Calories: 300}},
		}))
		require.NoError(t, repo.Create(ctx, &models.Meal{AthleteID: statAthlete.UserID, Date: june12,
			MealType: models.MealTypeLunch,
			Items:    []models.FoodItem{{Food: "Chicken", Quantity: "200g", Calories: 100, Macros: models.Macros{Protein: 10, Carbs: 20, Fats: 5}}},
		}))

		averages, err := repo.NutritionAverages(ctx, statAthlete.UserID)
		require.NoError(t, err)
		assert.Equal(t, 3, averages.Meals)
		assert.InDelta(t, 900.0/3, averages.Calories, 0.01)
		assert.InDelta(t, 40.0/3, averages.Protein, 0.01)
		assert.InDelta(t, 60.0/3, averages.Carbs, 0.01)
		assert.InDelta(t, 15.0/3, averages.Fats, 0.01)

		weeks, err := repo.WeeklyNutrition(ctx, statAthlete.UserID)
		require.NoError(t, err)
		require.Len(t, weeks, 2)
		assert.Equal(t, "2024-W23", weeks[0].Week)
		assert.InDelta(t, 500.0, weeks[0].Calories, 0.01)
		assert.InDelta(t, 30.0, weeks[0].Protein, 0.01)
		assert.Equal(t, "2024-W24", weeks[1].Week)
		assert.InDelta(t, 400.0/2, weeks[1].Calories, 0.01) // per meal, not per item
		assert.InDelta(t, 5.0, weeks[1].Protein, 0.01)
		assert.InDelta(t, 10.0, weeks[1].Carbs, 0.01)
		assert.InDelta(t, 2.5, weeks[1].Fats, 0.01)

		mealTypes, err := repo.MealTypeCounts(ctx, statAthlete.UserID)
		require.NoError(t, err)
		require.Len(t, mealTypes, 2)
		assert.Equal(t, "breakfast", mealTypes[0].MealType)
		assert.Equal(t, 2, mealTypes[0].Count)
		assert.Equal(t, "lunch", mealTypes[1].MealType)
		assert.Equal(t, 1, mealTypes[1].Count)
	})

	t.Run("CountByAthleteSince", func(t *testing.T) {
		sinceAthlete := createMealUser(t, "ml_stats_since", models.RoleAthlete)
		require.NoError(t, repo.Create(ctx, &models.Meal{AthleteID: sinceAthlete.UserID,
			Date: time.Date(2024, 6, 3, 0, 0, 0, 0, time.UTC), MealType: models.MealTypeBreakfast, Items: makeItems(),
		}))

		count, err := repo.CountByAthleteSince(ctx, sinceAthlete.UserID, time.Date(2024, 6, 5, 0, 0, 0, 0, time.UTC))
		require.NoError(t, err)
		assert.Equal(t, 0, count)

		count, err = repo.CountByAthleteSince(ctx, sinceAthlete.UserID, time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC))
		require.NoError(t, err)
		assert.Equal(t, 1, count)
	})

}
