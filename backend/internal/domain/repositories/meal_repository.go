package repositories

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type MealRepository struct {
	collection *gocb.Collection
}

func NewMealRepository(collection *gocb.Collection) *MealRepository {
	return &MealRepository{
		collection: collection,
	}
}

// Create inserts a new meal into the database
func (r *MealRepository) Create(meal *models.Meal) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.Insert(meal.MealID, meal, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create meal: %w", err)
	}

	return nil
}

// GetByID retrieves a meal by its ID
func (r *MealRepository) GetByID(mealID string) (*models.Meal, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := r.collection.Get(mealID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get meal: %w", err)
	}

	var meal models.Meal
	if err := result.Content(&meal); err != nil {
		return nil, fmt.Errorf("failed to decode meal: %w", err)
	}

	return &meal, nil
}

// GetByAthleteID retrieves meals for a specific athlete with pagination
func (r *MealRepository) GetByAthleteID(athleteID string, limit, offset int) ([]*models.Meal, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT m.* FROM `%s`.`%s`.`%s` m WHERE m.type = 'meal' AND m.athleteId = $1 ORDER BY m.date DESC LIMIT $2 OFFSET $3",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionMeals)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID, limit, offset},
		Context:              ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query meals: %w", err)
	}
	defer result.Close()

	var meals []*models.Meal
	for result.Next() {
		var meal models.Meal
		if err := result.Row(&meal); err != nil {
			return nil, fmt.Errorf("failed to decode meal row: %w", err)
		}
		meals = append(meals, &meal)
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("query iteration error: %w", err)
	}

	return meals, nil
}

// GetByAthleteDateRange retrieves meals for a specific athlete within a date range
func (r *MealRepository) GetByAthleteDateRange(athleteID string, startDate, endDate time.Time) ([]*models.Meal, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT m.* FROM `%s`.`%s`.`%s` m WHERE m.type = 'meal' AND m.athleteId = $1 AND m.date >= $2 AND m.date <= $3 ORDER BY m.date DESC",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionMeals)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID, startDate.Format(time.RFC3339), endDate.Format(time.RFC3339)},
		Context:              ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query meals by date range: %w", err)
	}
	defer result.Close()

	var meals []*models.Meal
	for result.Next() {
		var meal models.Meal
		if err := result.Row(&meal); err != nil {
			return nil, fmt.Errorf("failed to decode meal row: %w", err)
		}
		meals = append(meals, &meal)
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("query iteration error: %w", err)
	}

	return meals, nil
}

// Update updates an existing meal
func (r *MealRepository) Update(meal *models.Meal) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	meal.UpdatedAt = time.Now()

	_, err := r.collection.Replace(meal.MealID, meal, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to update meal: %w", err)
	}

	return nil
}

// Delete removes a meal from the database
func (r *MealRepository) Delete(mealID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.Remove(mealID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete meal: %w", err)
	}

	return nil
}
