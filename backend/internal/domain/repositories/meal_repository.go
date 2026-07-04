package repositories

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gymtrack-backend/internal/config"
	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type MealRepository interface {
	Create(ctx context.Context, meal *models.Meal) error
	GetByID(ctx context.Context, mealID string) (*models.Meal, error)
	GetByAthleteID(ctx context.Context, athleteID string, limit, offset int) ([]*models.Meal, error)
	GetByAthleteDateRange(ctx context.Context, athleteID string, startDate, endDate time.Time) ([]*models.Meal, error)
	Update(ctx context.Context, meal *models.Meal) error
	Delete(ctx context.Context, mealID string) error
}

type CouchbaseMealRepository struct {
	cluster *gocb.Cluster
	bucket  *gocb.Bucket
}

func NewMealRepository(cluster *gocb.Cluster, bucket *gocb.Bucket) *CouchbaseMealRepository {
	return &CouchbaseMealRepository{
		cluster: cluster,
		bucket:  bucket,
	}
}

// Create inserts a new meal into the database
func (r *CouchbaseMealRepository) Create(ctx context.Context, meal *models.Meal) error {
	_, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionMeals).Insert(meal.MealID, meal, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create meal: %w", err)
	}

	return nil
}

// GetByID retrieves a meal by its ID
func (r *CouchbaseMealRepository) GetByID(ctx context.Context, mealID string) (*models.Meal, error) {
	result, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionMeals).Get(mealID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		if errors.Is(err, gocb.ErrDocumentNotFound) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get meal: %w", err)
	}

	var meal models.Meal
	if err := result.Content(&meal); err != nil {
		return nil, fmt.Errorf("failed to decode meal: %w", err)
	}

	return &meal, nil
}

// GetByAthleteID retrieves meals for a specific athlete with pagination
func (r *CouchbaseMealRepository) GetByAthleteID(ctx context.Context, athleteID string, limit, offset int) ([]*models.Meal, error) {
	query := fmt.Sprintf("SELECT m.* FROM `%s`.`%s`.`%s` m WHERE m.type = 'meal' AND m.athleteId = $1 ORDER BY m.date DESC LIMIT $2 OFFSET $3",
		r.bucket.Name(), config.ScopeDefault, config.CollectionMeals)

	result, err := r.cluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID, limit, offset},
		Context:              ctx,
		Timeout:              config.DefaultQueryTimeout,
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
func (r *CouchbaseMealRepository) GetByAthleteDateRange(ctx context.Context, athleteID string, startDate, endDate time.Time) ([]*models.Meal, error) {
	query := fmt.Sprintf("SELECT m.* FROM `%s`.`%s`.`%s` m WHERE m.type = 'meal' AND m.athleteId = $1 AND m.date >= $2 AND m.date <= $3 ORDER BY m.date DESC",
		r.bucket.Name(), config.ScopeDefault, config.CollectionMeals)

	result, err := r.cluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID, startDate.Format(time.RFC3339), endDate.Format(time.RFC3339)},
		Context:              ctx,
		Timeout:              config.DefaultQueryTimeout,
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
func (r *CouchbaseMealRepository) Update(ctx context.Context, meal *models.Meal) error {
	meal.UpdatedAt = time.Now()

	_, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionMeals).Replace(meal.MealID, meal, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to update meal: %w", err)
	}

	return nil
}

// Delete removes a meal from the database
func (r *CouchbaseMealRepository) Delete(ctx context.Context, mealID string) error {
	_, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionMeals).Remove(mealID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete meal: %w", err)
	}

	return nil
}
