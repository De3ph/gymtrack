package repositories

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type WorkoutRepository struct {
	collection *gocb.Collection
}

func NewWorkoutRepository(collection *gocb.Collection) *WorkoutRepository {
	return &WorkoutRepository{
		collection: collection,
	}
}

// Create inserts a new workout into the database
func (r *WorkoutRepository) Create(workout *models.Workout) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.Insert(workout.WorkoutID, workout, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create workout: %w", err)
	}

	return nil
}

// GetByID retrieves a workout by its ID
func (r *WorkoutRepository) GetByID(workoutID string) (*models.Workout, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := r.collection.Get(workoutID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get workout: %w", err)
	}

	var workout models.Workout
	if err := result.Content(&workout); err != nil {
		return nil, fmt.Errorf("failed to decode workout: %w", err)
	}

	return &workout, nil
}

// GetByAthleteID retrieves workouts for a specific athlete with pagination
func (r *WorkoutRepository) GetByAthleteID(athleteID string, limit, offset int) ([]*models.Workout, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT w.* FROM `%s`.`%s`.`%s` w WHERE w.type = 'workout' AND w.athleteId = $1 ORDER BY w.date DESC LIMIT $2 OFFSET $3",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionWorkouts)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID, limit, offset},
		Context:              ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query workouts: %w", err)
	}
	defer result.Close()

	var workouts []*models.Workout
	for result.Next() {
		var workout models.Workout
		if err := result.Row(&workout); err != nil {
			return nil, fmt.Errorf("failed to decode workout row: %w", err)
		}
		workouts = append(workouts, &workout)
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("query iteration error: %w", err)
	}

	return workouts, nil
}

// GetByAthleteDateRange retrieves workouts for a specific athlete within a date range
func (r *WorkoutRepository) GetByAthleteDateRange(athleteID string, startDate, endDate time.Time) ([]*models.Workout, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT w.* FROM `%s`.`%s`.`%s` w WHERE w.type = 'workout' AND w.athleteId = $1 AND w.date >= $2 AND w.date <= $3 ORDER BY w.date DESC",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionWorkouts)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID, startDate.Format(time.RFC3339), endDate.Format(time.RFC3339)},
		Context:              ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query workouts by date range: %w", err)
	}
	defer result.Close()

	var workouts []*models.Workout
	for result.Next() {
		var workout models.Workout
		if err := result.Row(&workout); err != nil {
			return nil, fmt.Errorf("failed to decode workout row: %w", err)
		}
		workouts = append(workouts, &workout)
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("query iteration error: %w", err)
	}

	return workouts, nil
}

// Update updates an existing workout
func (r *WorkoutRepository) Update(workout *models.Workout) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	workout.UpdatedAt = time.Now()

	_, err := r.collection.Replace(workout.WorkoutID, workout, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to update workout: %w", err)
	}

	return nil
}

// Delete removes a workout from the database
func (r *WorkoutRepository) Delete(workoutID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.Remove(workoutID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete workout: %w", err)
	}

	return nil
}
