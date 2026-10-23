package services

import (
	"context"
	"testing"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type stubMealRepo struct {
	meal *models.Meal
}

func (s *stubMealRepo) GetByID(_ context.Context, id int) (*models.Meal, error) {
	if s.meal == nil || s.meal.MealID != id {
		return nil, domainerrors.ErrNotFound
	}
	return s.meal, nil
}

func (s *stubMealRepo) Create(context.Context, *models.Meal) error { return nil }
func (s *stubMealRepo) GetByAthleteID(context.Context, int, int, int) ([]*models.Meal, error) {
	return nil, nil
}
func (s *stubMealRepo) GetByAthleteDateRange(context.Context, int, time.Time, time.Time) ([]*models.Meal, error) {
	return nil, nil
}
func (s *stubMealRepo) CountAll(context.Context) (int, error) { return 0, nil }
func (s *stubMealRepo) NutritionAverages(context.Context, int) (*repositories.NutritionAveragesRow, error) {
	return nil, nil
}
func (s *stubMealRepo) WeeklyNutrition(context.Context, int) ([]repositories.WeeklyNutritionRow, error) {
	return nil, nil
}
func (s *stubMealRepo) MealTypeCounts(context.Context, int) ([]repositories.MealTypeCountRow, error) {
	return nil, nil
}
func (s *stubMealRepo) CountByAthleteSince(context.Context, int, time.Time) (int, error) {
	return 0, nil
}

func TestGetMealAccessControl(t *testing.T) {
	const (
		athleteID    = 10
		otherAthlete = 20
		trainerID    = 30
		otherTrainer = 31
		mealID       = 42
	)

	newService := func(relActive bool) *MealService {
		repo := &stubMealRepo{meal: &models.Meal{MealID: mealID, AthleteID: athleteID}}
		if relActive {
			return NewMealService(repo, alwaysRelationshipRepo{})
		}
		return NewMealService(repo, noRelationshipRepo{})
	}

	t.Run("athlete can view own meal", func(t *testing.T) {
		svc := newService(false)
		m, err := svc.GetMeal(context.Background(), GetMealInput{
			MealID: mealID, RequesterID: athleteID, RequesterRole: models.RoleAthlete,
		})
		require.NoError(t, err)
		assert.Equal(t, mealID, m.MealID)
	})

	t.Run("athlete cannot view another athlete's meal", func(t *testing.T) {
		svc := newService(false)
		_, err := svc.GetMeal(context.Background(), GetMealInput{
			MealID: mealID, RequesterID: otherAthlete, RequesterRole: models.RoleAthlete,
		})
		require.Error(t, err)
		var svcErr *ServiceError
		require.ErrorAs(t, err, &svcErr)
		assert.Equal(t, "FORBIDDEN", svcErr.Code)
	})

	t.Run("trainer with active relationship can view client meal", func(t *testing.T) {
		svc := newService(true)
		m, err := svc.GetMeal(context.Background(), GetMealInput{
			MealID: mealID, RequesterID: trainerID, RequesterRole: models.RoleTrainer,
		})
		require.NoError(t, err)
		assert.Equal(t, mealID, m.MealID)
	})

	// Regression test for cross-tenant read via IDOR: a trainer who does not
	// coach an athlete must not be able to fetch that athlete's meal by ID.
	t.Run("trainer without active relationship cannot view meal", func(t *testing.T) {
		svc := newService(false)
		_, err := svc.GetMeal(context.Background(), GetMealInput{
			MealID: mealID, RequesterID: otherTrainer, RequesterRole: models.RoleTrainer,
		})
		require.Error(t, err)
		var svcErr *ServiceError
		require.ErrorAs(t, err, &svcErr)
		assert.Equal(t, "FORBIDDEN", svcErr.Code)
	})

	t.Run("relationship lookup failure propagates as error", func(t *testing.T) {
		repo := &stubMealRepo{meal: &models.Meal{MealID: mealID, AthleteID: athleteID}}
		svc := NewMealService(repo, noRelationshipRepo{err: domainerrors.ErrUnauthorized})
		_, err := svc.GetMeal(context.Background(), GetMealInput{
			MealID: mealID, RequesterID: trainerID, RequesterRole: models.RoleTrainer,
		})
		require.Error(t, err)
		assert.ErrorIs(t, err, domainerrors.ErrUnauthorized)
	})
}
