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

// WorkoutPlanRepository defines data access for workout plans
type WorkoutPlanRepository interface {
	Create(ctx context.Context, plan *models.WorkoutPlan) error
	GetByID(ctx context.Context, planID string) (*models.WorkoutPlan, error)
	GetByTrainerID(ctx context.Context, trainerID string) ([]*models.WorkoutPlan, error)
	Update(ctx context.Context, plan *models.WorkoutPlan) error
	Delete(ctx context.Context, planID string) error
}

// CouchbaseWorkoutPlanRepository implements WorkoutPlanRepository with Couchbase
type CouchbaseWorkoutPlanRepository struct {
	cluster *gocb.Cluster
	bucket  *gocb.Bucket
}

func NewWorkoutPlanRepository(cluster *gocb.Cluster, bucket *gocb.Bucket) *CouchbaseWorkoutPlanRepository {
	return &CouchbaseWorkoutPlanRepository{
		cluster: cluster,
		bucket:  bucket,
	}
}

// Create inserts a new workout plan
func (r *CouchbaseWorkoutPlanRepository) Create(ctx context.Context, plan *models.WorkoutPlan) error {
	collection := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionWorkoutPlans)
	_, err := collection.Insert(plan.PlanID, plan, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create workout plan: %w", err)
	}
	return nil
}

// GetByID retrieves a workout plan by its ID
func (r *CouchbaseWorkoutPlanRepository) GetByID(ctx context.Context, planID string) (*models.WorkoutPlan, error) {
	collection := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionWorkoutPlans)
	result, err := collection.Get(planID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		if errors.Is(err, gocb.ErrDocumentNotFound) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get workout plan: %w", err)
	}

	var plan models.WorkoutPlan
	if err := result.Content(&plan); err != nil {
		return nil, fmt.Errorf("failed to decode workout plan: %w", err)
	}
	return &plan, nil
}

// GetByTrainerID retrieves all workout plans for a trainer
func (r *CouchbaseWorkoutPlanRepository) GetByTrainerID(ctx context.Context, trainerID string) ([]*models.WorkoutPlan, error) {
	query := fmt.Sprintf("SELECT p.* FROM `%s`.`%s`.`%s` p WHERE p.type = 'workout_plan' AND p.trainerId = $1 ORDER BY p.createdAt DESC",
		r.bucket.Name(), config.ScopeDefault, config.CollectionWorkoutPlans)

	result, err := r.cluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{trainerID},
		Context:              ctx,
		Timeout:              config.DefaultQueryTimeout,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query workout plans: %w", err)
	}
	defer result.Close()

	var plans []*models.WorkoutPlan
	for result.Next() {
		var plan models.WorkoutPlan
		if err := result.Row(&plan); err != nil {
			return nil, fmt.Errorf("failed to decode workout plan row: %w", err)
		}
		plans = append(plans, &plan)
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("query iteration error: %w", err)
	}

	return plans, nil
}

// Update updates an existing workout plan
func (r *CouchbaseWorkoutPlanRepository) Update(ctx context.Context, plan *models.WorkoutPlan) error {
	plan.UpdatedAt = time.Now()

	collection := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionWorkoutPlans)
	_, err := collection.Replace(plan.PlanID, plan, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to update workout plan: %w", err)
	}
	return nil
}

// Delete removes a workout plan
func (r *CouchbaseWorkoutPlanRepository) Delete(ctx context.Context, planID string) error {
	collection := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionWorkoutPlans)
	_, err := collection.Remove(planID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete workout plan: %w", err)
	}
	return nil
}

// WorkoutPlanAssignmentRepository defines data access for plan assignments
type WorkoutPlanAssignmentRepository interface {
	Create(ctx context.Context, assignment *models.WorkoutPlanAssignment) error
	GetByPlanID(ctx context.Context, planID string) ([]*models.WorkoutPlanAssignment, error)
	GetByAthleteID(ctx context.Context, athleteID string) ([]*models.WorkoutPlanAssignment, error)
	GetByAthleteAndPlan(ctx context.Context, athleteID, planID string) (*models.WorkoutPlanAssignment, error)
	GetByTrainerID(ctx context.Context, trainerID string) ([]*models.WorkoutPlanAssignment, error)
	DeleteByPlanID(ctx context.Context, planID string) error
}

// CouchbaseWorkoutPlanAssignmentRepository implements WorkoutPlanAssignmentRepository
type CouchbaseWorkoutPlanAssignmentRepository struct {
	cluster *gocb.Cluster
	bucket  *gocb.Bucket
}

func NewWorkoutPlanAssignmentRepository(cluster *gocb.Cluster, bucket *gocb.Bucket) *CouchbaseWorkoutPlanAssignmentRepository {
	return &CouchbaseWorkoutPlanAssignmentRepository{
		cluster: cluster,
		bucket:  bucket,
	}
}

// Create inserts a new assignment
func (r *CouchbaseWorkoutPlanAssignmentRepository) Create(ctx context.Context, assignment *models.WorkoutPlanAssignment) error {
	_, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionWorkoutPlanAssignments).Insert(assignment.AssignmentID, assignment, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create assignment: %w", err)
	}
	return nil
}

// GetByPlanID retrieves all assignments for a plan
func (r *CouchbaseWorkoutPlanAssignmentRepository) GetByPlanID(ctx context.Context, planID string) ([]*models.WorkoutPlanAssignment, error) {
	query := fmt.Sprintf("SELECT a.* FROM `%s`.`%s`.`%s` a WHERE a.type = 'workout_plan_assignment' AND a.planId = $1",
		r.bucket.Name(), config.ScopeDefault, config.CollectionWorkoutPlanAssignments)

	result, err := r.cluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{planID},
		Context:              ctx,
		Timeout:              config.DefaultQueryTimeout,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query assignments by plan: %w", err)
	}
	defer result.Close()

	var assignments []*models.WorkoutPlanAssignment
	for result.Next() {
		var a models.WorkoutPlanAssignment
		if err := result.Row(&a); err != nil {
			return nil, fmt.Errorf("failed to decode assignment row: %w", err)
		}
		assignments = append(assignments, &a)
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("query iteration error: %w", err)
	}

	return assignments, nil
}

// GetByAthleteID retrieves active assignments for an athlete
func (r *CouchbaseWorkoutPlanAssignmentRepository) GetByAthleteID(ctx context.Context, athleteID string) ([]*models.WorkoutPlanAssignment, error) {
	query := fmt.Sprintf("SELECT a.* FROM `%s`.`%s`.`%s` a WHERE a.type = 'workout_plan_assignment' AND a.athleteId = $1 AND a.status = 'active'",
		r.bucket.Name(), config.ScopeDefault, config.CollectionWorkoutPlanAssignments)

	result, err := r.cluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID},
		Context:              ctx,
		Timeout:              config.DefaultQueryTimeout,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query assignments by athlete: %w", err)
	}
	defer result.Close()

	var assignments []*models.WorkoutPlanAssignment
	for result.Next() {
		var a models.WorkoutPlanAssignment
		if err := result.Row(&a); err != nil {
			return nil, fmt.Errorf("failed to decode assignment row: %w", err)
		}
		assignments = append(assignments, &a)
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("query iteration error: %w", err)
	}

	return assignments, nil
}

// GetByAthleteAndPlan retrieves a specific assignment by athlete and plan
func (r *CouchbaseWorkoutPlanAssignmentRepository) GetByAthleteAndPlan(ctx context.Context, athleteID, planID string) (*models.WorkoutPlanAssignment, error) {
	query := fmt.Sprintf("SELECT a.* FROM `%s`.`%s`.`%s` a WHERE a.type = 'workout_plan_assignment' AND a.athleteId = $1 AND a.planId = $2 LIMIT 1",
		r.bucket.Name(), config.ScopeDefault, config.CollectionWorkoutPlanAssignments)

	result, err := r.cluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID, planID},
		Context:              ctx,
		Timeout:              config.DefaultQueryTimeout,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query assignment by athlete and plan: %w", err)
	}
	defer result.Close()

	var assignment models.WorkoutPlanAssignment
	if result.Next() {
		if err := result.Row(&assignment); err != nil {
			return nil, fmt.Errorf("failed to decode assignment row: %w", err)
		}
		return &assignment, nil
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("query iteration error: %w", err)
	}

	return nil, nil
}

// GetByTrainerID retrieves all assignments for a trainer
func (r *CouchbaseWorkoutPlanAssignmentRepository) GetByTrainerID(ctx context.Context, trainerID string) ([]*models.WorkoutPlanAssignment, error) {
	query := fmt.Sprintf("SELECT a.* FROM `%s`.`%s`.`%s` a WHERE a.type = 'workout_plan_assignment' AND a.trainerId = $1",
		r.bucket.Name(), config.ScopeDefault, config.CollectionWorkoutPlanAssignments)

	result, err := r.cluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{trainerID},
		Context:              ctx,
		Timeout:              config.DefaultQueryTimeout,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query assignments by trainer: %w", err)
	}
	defer result.Close()

	var assignments []*models.WorkoutPlanAssignment
	for result.Next() {
		var a models.WorkoutPlanAssignment
		if err := result.Row(&a); err != nil {
			return nil, fmt.Errorf("failed to decode assignment row: %w", err)
		}
		assignments = append(assignments, &a)
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("query iteration error: %w", err)
	}

	return assignments, nil
}

// DeleteByPlanID removes all assignments for a plan (used when force-deleting)
func (r *CouchbaseWorkoutPlanAssignmentRepository) DeleteByPlanID(ctx context.Context, planID string) error {
	query := fmt.Sprintf("DELETE FROM `%s`.`%s`.`%s` a WHERE a.type = 'workout_plan_assignment' AND a.planId = $1",
		r.bucket.Name(), config.ScopeDefault, config.CollectionWorkoutPlanAssignments)

	_, err := r.cluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{planID},
		Context:              ctx,
		Timeout:              config.DefaultQueryTimeout,
	})
	if err != nil {
		return fmt.Errorf("failed to delete assignments by plan: %w", err)
	}
	return nil
}
