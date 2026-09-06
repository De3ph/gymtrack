package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/go-playground/validator/v10"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

type WorkoutPlanService struct {
	planRepo         repositories.WorkoutPlanRepository
	assignmentRepo   repositories.WorkoutPlanAssignmentRepository
	relationshipRepo repositories.RelationshipRepository
	workoutRepo      repositories.WorkoutRepository
	validator        *validator.Validate
}

func NewWorkoutPlanService(
	planRepo repositories.WorkoutPlanRepository,
	assignmentRepo repositories.WorkoutPlanAssignmentRepository,
	relationshipRepo repositories.RelationshipRepository,
	workoutRepo repositories.WorkoutRepository,
) *WorkoutPlanService {
	return &WorkoutPlanService{
		planRepo:         planRepo,
		assignmentRepo:   assignmentRepo,
		relationshipRepo: relationshipRepo,
		workoutRepo:      workoutRepo,
		validator:        validator.New(),
	}
}

// CreatePlan creates a new workout plan for a trainer or athlete
func (s *WorkoutPlanService) CreatePlan(
	ctx context.Context,
	creatorID int, role models.UserRole, name, description string,
	exercises []models.WorkoutPlanExercise,
) (*models.WorkoutPlan, error) {
	if name == "" {
		return nil, NewServiceError("Please give your workout plan a name", "VALIDATION")
	}
	if len(exercises) == 0 {
		return nil, NewServiceError("Please add at least one exercise to your workout plan", "VALIDATION")
	}

	if role == models.RoleAthlete {
		count, err := s.planRepo.CountByCreatorID(ctx, creatorID)
		if err != nil {
			return nil, fmt.Errorf("failed to count plans: %w", err)
		}
		if count >= 3 {
			return nil, NewServiceError("You've reached the limit of 3 workout plans. Please delete an existing plan to create a new one", "PLAN_LIMIT_REACHED")
		}
	}

	plan := models.NewWorkoutPlan(creatorID, name, description, exercises)

	if err := s.validator.Struct(plan); err != nil {
		return nil, fmt.Errorf("plan validation failed: %w", err)
	}

	if err := s.planRepo.Create(ctx, plan); err != nil {
		return nil, fmt.Errorf("failed to create plan: %w", err)
	}

	return plan, nil
}

// GetPlans returns all plans owned by a trainer or athlete
func (s *WorkoutPlanService) GetPlans(ctx context.Context, creatorID int) ([]*models.WorkoutPlan, error) {
	return s.planRepo.GetByCreatorID(ctx, creatorID)
}

// GetPlan returns a single plan with access control
func (s *WorkoutPlanService) GetPlan(ctx context.Context, planID, requesterID int, requesterRole models.UserRole) (*models.WorkoutPlan, error) {
	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil, ErrWorkoutPlanNotFound
		}
		return nil, fmt.Errorf("failed to get plan: %w", err)
	}

	switch requesterRole {
	case models.RoleTrainer:
		if plan.CreatorID != requesterID {
			return nil, NewServiceError("You can only view workout plans you created", "FORBIDDEN")
		}
	case models.RoleAthlete:
		if plan.CreatorID == requesterID {
			return plan, nil
		}
		assignment, err := s.assignmentRepo.GetByAthleteAndPlan(ctx, requesterID, planID)
		if err != nil {
			return nil, fmt.Errorf("failed to verify assignment: %w", err)
		}
		if assignment == nil {
			return nil, NewServiceError("This workout plan hasn't been assigned to you. Ask your trainer to assign it first", "FORBIDDEN")
		}
	default:
		return nil, NewServiceError("You don't have permission to view this workout plan", "FORBIDDEN")
	}

	return plan, nil
}

// UpdatePlan updates a plan (owner only)
func (s *WorkoutPlanService) UpdatePlan(
	ctx context.Context,
	planID, creatorID int, name, description string,
	exercises []models.WorkoutPlanExercise,
) (*models.WorkoutPlan, error) {
	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil, ErrWorkoutPlanNotFound
		}
		return nil, fmt.Errorf("failed to get plan: %w", err)
	}

	if plan.CreatorID != creatorID {
		return nil, NewServiceError("You can only edit workout plans you created", "FORBIDDEN")
	}

	if name == "" {
		return nil, NewServiceError("Please give your workout plan a name", "VALIDATION")
	}
	if len(exercises) == 0 {
		return nil, NewServiceError("Please add at least one exercise to your workout plan", "VALIDATION")
	}

	plan.Name = name
	plan.Description = description
	plan.Exercises = exercises

	if err := s.planRepo.Update(ctx, plan); err != nil {
		return nil, fmt.Errorf("failed to update plan: %w", err)
	}

	return plan, nil
}

// DeletePlan deletes a plan, optionally force-deleting assignments
func (s *WorkoutPlanService) DeletePlan(ctx context.Context, planID, creatorID int, force bool) error {
	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return ErrWorkoutPlanNotFound
		}
		return fmt.Errorf("failed to get plan: %w", err)
	}

	if plan.CreatorID != creatorID {
		return NewServiceError("You can only delete workout plans you created", "FORBIDDEN")
	}

	if force {
		if err := s.assignmentRepo.DeleteByPlanID(ctx, planID); err != nil {
			return fmt.Errorf("failed to delete assignments: %w", err)
		}
	}

	assignments, err := s.assignmentRepo.GetByPlanID(ctx, planID)
	if err != nil {
		return fmt.Errorf("failed to check assignments: %w", err)
	}
	if len(assignments) > 0 {
		return NewServiceError(
			fmt.Sprintf("This plan is still assigned to %d athlete(s). Please unassign it first or use force delete to remove it anyway.", len(assignments)),
			"HAS_ASSIGNMENTS",
		)
	}

	return s.planRepo.Delete(ctx, planID)
}

// AssignPlan assigns a plan to one or more athletes
func (s *WorkoutPlanService) AssignPlan(
	ctx context.Context,
	planID, trainerID int,
	athleteIDs []int,
) ([]*models.WorkoutPlanAssignment, error) {
	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil, ErrWorkoutPlanNotFound
		}
		return nil, fmt.Errorf("failed to get plan: %w", err)
	}

	if plan.CreatorID != trainerID {
		return nil, NewServiceError("You can only assign workout plans you created", "FORBIDDEN")
	}

	created := make([]*models.WorkoutPlanAssignment, 0)

	for _, athleteID := range athleteIDs {
		hasRel, err := s.relationshipRepo.HasActiveRelationship(ctx, trainerID, athleteID)
		if err != nil {
			return nil, fmt.Errorf("failed to verify relationship: %w", err)
		}
		if !hasRel {
			continue
		}

		existing, err := s.assignmentRepo.GetByAthleteAndPlan(ctx, athleteID, planID)
		if err != nil {
			return nil, fmt.Errorf("failed to check existing assignment: %w", err)
		}
		if existing != nil {
			continue // idempotent: skip duplicates
		}

		assignment := models.NewWorkoutPlanAssignment(planID, athleteID, trainerID)
		if err := s.assignmentRepo.Create(ctx, assignment); err != nil {
			return nil, fmt.Errorf("failed to create assignment: %w", err)
		}
		created = append(created, assignment)
	}

	return created, nil
}

// GetAssignmentsForPlan returns all assignments for a plan (trainer only)
func (s *WorkoutPlanService) GetAssignmentsForPlan(ctx context.Context, planID, trainerID int) ([]*models.WorkoutPlanAssignment, error) {
	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil, ErrWorkoutPlanNotFound
		}
		return nil, fmt.Errorf("failed to get plan: %w", err)
	}

	if plan.CreatorID != trainerID {
		return nil, NewServiceError("You can only view assignments for workout plans you created", "FORBIDDEN")
	}

	return s.assignmentRepo.GetByPlanID(ctx, planID)
}

// GetMyPlans returns all plans assigned to an athlete
func (s *WorkoutPlanService) GetMyPlans(ctx context.Context, athleteID int) ([]*models.WorkoutPlan, error) {
	assignments, err := s.assignmentRepo.GetByAthleteID(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to get assignments: %w", err)
	}

	plans := make([]*models.WorkoutPlan, 0)
	for _, a := range assignments {
		plan, err := s.planRepo.GetByID(ctx, a.PlanID)
		if err != nil {
			continue // skip unavailable plans
		}
		plans = append(plans, plan)
	}

	return plans, nil
}

// StartWorkoutFromPlan creates a logged workout from a plan template
func (s *WorkoutPlanService) StartWorkoutFromPlan(
	ctx context.Context,
	planID, athleteID int,
) (*models.Workout, error) {
	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil, ErrWorkoutPlanNotFound
		}
		return nil, fmt.Errorf("failed to get plan: %w", err)
	}

	if plan.CreatorID != athleteID {
		assignment, err := s.assignmentRepo.GetByAthleteAndPlan(ctx, athleteID, planID)
		if err != nil {
			return nil, fmt.Errorf("failed to verify assignment: %w", err)
		}
		if assignment == nil {
			return nil, NewServiceError("This workout plan hasn't been assigned to you yet. Ask your trainer to assign it first", "FORBIDDEN")
		}
	}

	exercises := convertPlanExercisesToWorkout(plan.Exercises)

	workout := models.NewWorkout(athleteID, time.Now(), exercises, planID)

	if err := s.validator.Struct(workout); err != nil {
		return nil, fmt.Errorf("workout validation failed: %w", err)
	}

	if err := s.workoutRepo.Create(ctx, workout); err != nil {
		return nil, fmt.Errorf("failed to create workout from plan: %w", err)
	}

	return workout, nil
}

// GetClientPlans returns plans assigned to a client (trainer view)
func (s *WorkoutPlanService) GetClientPlans(
	ctx context.Context,
	trainerID, athleteID int,
) ([]*models.WorkoutPlan, error) {
	hasRel, err := s.relationshipRepo.HasActiveRelationship(ctx, trainerID, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify relationship: %w", err)
	}
	if !hasRel {
		return nil, NewServiceError("You don't have an active coaching relationship with this client, so you can't view their workout plans", "FORBIDDEN")
	}

	assignments, err := s.assignmentRepo.GetByAthleteID(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to get assignments: %w", err)
	}

	plans := make([]*models.WorkoutPlan, 0)
	for _, a := range assignments {
		plan, err := s.planRepo.GetByID(ctx, a.PlanID)
		if err != nil {
			continue
		}
		plans = append(plans, plan)
	}

	return plans, nil
}

// convertPlanExercisesToWorkout converts plan exercises to workout exercises
func convertPlanExercisesToWorkout(planExercises []models.WorkoutPlanExercise) []models.WorkoutExercise {
	workoutExercises := make([]models.WorkoutExercise, len(planExercises))
	for i, pe := range planExercises {
		sets := make([]models.ExerciseSet, len(pe.Sets))
		for j, ps := range pe.Sets {
			sets[j] = models.ExerciseSet{
				SetID:      ps.SetID, // reuse plan set ID
				Weight:     ps.Weight,
				WeightUnit: ps.WeightUnit,
				Reps:       ps.Reps,
				RestTime:   ps.RestTime,
				Completed:  false,
			}
		}
		workoutExercises[i] = models.WorkoutExercise{
			ExerciseID: pe.ExerciseID,
			Name:       pe.Name,
			Sets:       sets,
			Notes:      pe.Notes,
		}
	}
	return workoutExercises
}
