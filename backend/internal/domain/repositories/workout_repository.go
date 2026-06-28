package repositories

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type WorkoutRepository interface {
	Create(workout *models.Workout) error
	GetByID(workoutID string) (*models.Workout, error)
	GetByAthleteID(athleteID string, limit, offset int) ([]*models.Workout, error)
	GetByAthleteDateRange(athleteID string, startDate, endDate time.Time) ([]*models.Workout, error)
	Update(workout *models.Workout) error
	Delete(workoutID string) error
}

type CouchbaseWorkoutRepository struct {
	cluster *gocb.Cluster
	bucket  *gocb.Bucket
}

func NewWorkoutRepository(cluster *gocb.Cluster, bucket *gocb.Bucket) *CouchbaseWorkoutRepository {
	return &CouchbaseWorkoutRepository{
		cluster: cluster,
		bucket:  bucket,
	}
}

// Create inserts a new workout into the database
func (r *CouchbaseWorkoutRepository) Create(workout *models.Workout) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionWorkouts).Insert(workout.WorkoutID, workout, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create workout: %w", err)
	}

	return nil
}

// GetByID retrieves a workout by its ID
func (r *CouchbaseWorkoutRepository) GetByID(workoutID string) (*models.Workout, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionWorkouts).Get(workoutID, &gocb.GetOptions{
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
func (r *CouchbaseWorkoutRepository) GetByAthleteID(athleteID string, limit, offset int) ([]*models.Workout, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT w.* FROM `%s`.`%s`.`%s` w WHERE w.type = 'workout' AND w.athleteId = $1 ORDER BY w.date DESC LIMIT $2 OFFSET $3",
		r.bucket.Name(), config.ScopeDefault, config.CollectionWorkouts)

	result, err := r.cluster.Query(query, &gocb.QueryOptions{
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
func (r *CouchbaseWorkoutRepository) GetByAthleteDateRange(athleteID string, startDate, endDate time.Time) ([]*models.Workout, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT w.* FROM `%s`.`%s`.`%s` w WHERE w.type = 'workout' AND w.athleteId = $1 AND w.date >= $2 AND w.date <= $3 ORDER BY w.date DESC",
		r.bucket.Name(), config.ScopeDefault, config.CollectionWorkouts)

	result, err := r.cluster.Query(query, &gocb.QueryOptions{
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
func (r *CouchbaseWorkoutRepository) Update(workout *models.Workout) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	workout.UpdatedAt = time.Now()

	_, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionWorkouts).Replace(workout.WorkoutID, workout, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to update workout: %w", err)
	}

	return nil
}

// Delete removes a workout from the database
func (r *CouchbaseWorkoutRepository) Delete(workoutID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionWorkouts).Remove(workoutID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete workout: %w", err)
	}

	return nil
}
