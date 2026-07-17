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

	createMealUser := func(t *testing.T, username string) *models.User {
		t.Helper()
		var userID int
		err := pool.QueryRow(ctx,
			`INSERT INTO users (username, email, password_hash, role, profile) VALUES ($1,$2,$3,$4,$5) RETURNING user_id`,
			username, username+"@test.com", "hash", "athlete", `{"name":"`+username+`"}`,
		).Scan(&userID)
		require.NoError(t, err)
		return &models.User{UserID: userID, Username: username, Role: models.RoleAthlete}
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

	t.Run("Update", func(t *testing.T) {
		meal := &models.Meal{AthleteID: athlete.UserID, Date: time.Now(), MealType: models.MealTypeSnack, Items: makeItems()}
		require.NoError(t, repo.Create(ctx, meal))

		meal.Items = append(meal.Items, models.FoodItem{Food: "Apple", Quantity: "1", Calories: 95})
		err := repo.Update(ctx, meal)
		require.NoError(t, err)

		fetched, err := repo.GetByID(ctx, meal.MealID)
		require.NoError(t, err)
		assert.Len(t, fetched.Items, 3)
	})

	t.Run("Update_NotFound", func(t *testing.T) {
		meal := &models.Meal{MealID: 999999, AthleteID: athlete.UserID, Date: time.Now(), MealType: models.MealTypeSnack, Items: makeItems()}
		err := repo.Update(ctx, meal)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("Delete", func(t *testing.T) {
		meal := &models.Meal{AthleteID: athlete.UserID, Date: time.Now(), MealType: models.MealTypeLunch, Items: makeItems()}
		require.NoError(t, repo.Create(ctx, meal))
		require.NoError(t, repo.Delete(ctx, meal.MealID))
		_, err := repo.GetByID(ctx, meal.MealID)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("Delete_NotFound", func(t *testing.T) {
		err := repo.Delete(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})
}
