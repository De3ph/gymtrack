package repositories

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

// WorkoutPlanRepository defines data access for workout plans
type WorkoutPlanRepository interface {
	Create(plan *models.WorkoutPlan) error
	GetByID(planID string) (*models.WorkoutPlan, error)
	GetByTrainerID(trainerID string) ([]*models.WorkoutPlan, error)
	Update(plan *models.WorkoutPlan) error
	Delete(planID string) error
}

// CouchbaseWorkoutPlanRepository implements WorkoutPlanRepository with Couchbase
type CouchbaseWorkoutPlanRepository struct {
	collection *gocb.Collection
}

func NewWorkoutPlanRepository(collection *gocb.Collection) *CouchbaseWorkoutPlanRepository {
	return &CouchbaseWorkoutPlanRepository{
		collection: collection,
	}
}

// Create inserts a new workout plan
func (r *CouchbaseWorkoutPlanRepository) Create(plan *models.WorkoutPlan) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.Insert(plan.PlanID, plan, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create workout plan: %w", err)
	}
	return nil
}

// GetByID retrieves a workout plan by its ID
func (r *CouchbaseWorkoutPlanRepository) GetByID(planID string) (*models.WorkoutPlan, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := r.collection.Get(planID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get workout plan: %w", err)
	}

	var plan models.WorkoutPlan
	if err := result.Content(&plan); err != nil {
		return nil, fmt.Errorf("failed to decode workout plan: %w", err)
	}
	return &plan, nil
}

// GetByTrainerID retrieves all workout plans for a trainer
func (r *CouchbaseWorkoutPlanRepository) GetByTrainerID(trainerID string) ([]*models.WorkoutPlan, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT p.* FROM `%s`.`%s`.`%s` p WHERE p.type = 'workout_plan' AND p.trainerId = $1 ORDER BY p.createdAt DESC",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionWorkoutPlans)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{trainerID},
		Context:              ctx,
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
func (r *CouchbaseWorkoutPlanRepository) Update(plan *models.WorkoutPlan) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	plan.UpdatedAt = time.Now()

	_, err := r.collection.Replace(plan.PlanID, plan, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to update workout plan: %w", err)
	}
	return nil
}

// Delete removes a workout plan
func (r *CouchbaseWorkoutPlanRepository) Delete(planID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.Remove(planID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete workout plan: %w", err)
	}
	return nil
}

// WorkoutPlanAssignmentRepository defines data access for plan assignments
type WorkoutPlanAssignmentRepository interface {
	Create(assignment *models.WorkoutPlanAssignment) error
	GetByPlanID(planID string) ([]*models.WorkoutPlanAssignment, error)
	GetByAthleteID(athleteID string) ([]*models.WorkoutPlanAssignment, error)
	GetByAthleteAndPlan(athleteID, planID string) (*models.WorkoutPlanAssignment, error)
	GetByTrainerID(trainerID string) ([]*models.WorkoutPlanAssignment, error)
	DeleteByPlanID(planID string) error
}

// CouchbaseWorkoutPlanAssignmentRepository implements WorkoutPlanAssignmentRepository
type CouchbaseWorkoutPlanAssignmentRepository struct {
	collection *gocb.Collection
}

func NewWorkoutPlanAssignmentRepository(collection *gocb.Collection) *CouchbaseWorkoutPlanAssignmentRepository {
	return &CouchbaseWorkoutPlanAssignmentRepository{
		collection: collection,
	}
}

// Create inserts a new assignment
func (r *CouchbaseWorkoutPlanAssignmentRepository) Create(assignment *models.WorkoutPlanAssignment) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.Insert(assignment.AssignmentID, assignment, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create assignment: %w", err)
	}
	return nil
}

// GetByPlanID retrieves all assignments for a plan
func (r *CouchbaseWorkoutPlanAssignmentRepository) GetByPlanID(planID string) ([]*models.WorkoutPlanAssignment, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT a.* FROM `%s`.`%s`.`%s` a WHERE a.type = 'workout_plan_assignment' AND a.planId = $1",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionWorkoutPlanAssignments)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{planID},
		Context:              ctx,
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
func (r *CouchbaseWorkoutPlanAssignmentRepository) GetByAthleteID(athleteID string) ([]*models.WorkoutPlanAssignment, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT a.* FROM `%s`.`%s`.`%s` a WHERE a.type = 'workout_plan_assignment' AND a.athleteId = $1 AND a.status = 'active'",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionWorkoutPlanAssignments)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID},
		Context:              ctx,
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
func (r *CouchbaseWorkoutPlanAssignmentRepository) GetByAthleteAndPlan(athleteID, planID string) (*models.WorkoutPlanAssignment, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT a.* FROM `%s`.`%s`.`%s` a WHERE a.type = 'workout_plan_assignment' AND a.athleteId = $1 AND a.planId = $2 LIMIT 1",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionWorkoutPlanAssignments)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID, planID},
		Context:              ctx,
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
func (r *CouchbaseWorkoutPlanAssignmentRepository) GetByTrainerID(trainerID string) ([]*models.WorkoutPlanAssignment, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT a.* FROM `%s`.`%s`.`%s` a WHERE a.type = 'workout_plan_assignment' AND a.trainerId = $1",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionWorkoutPlanAssignments)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{trainerID},
		Context:              ctx,
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
func (r *CouchbaseWorkoutPlanAssignmentRepository) DeleteByPlanID(planID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	query := fmt.Sprintf("DELETE FROM `%s`.`%s`.`%s` a WHERE a.type = 'workout_plan_assignment' AND a.planId = $1",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionWorkoutPlanAssignments)

	_, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{planID},
		Context:              ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete assignments by plan: %w", err)
	}
	return nil
}
