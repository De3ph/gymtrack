package services

import (
	"context"
	"fmt"
	"time"

	"github.com/go-playground/validator/v10"

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

// CreatePlan creates a new workout plan for a trainer
func (s *WorkoutPlanService) CreatePlan(
	ctx context.Context,
	trainerID, name, description string,
	exercises []models.WorkoutPlanExercise,
) (*models.WorkoutPlan, error) {
	if name == "" {
		return nil, NewServiceError("Plan name is required", "VALIDATION")
	}
	if len(exercises) == 0 {
		return nil, NewServiceError("At least one exercise is required", "VALIDATION")
	}

	plan := models.NewWorkoutPlan(trainerID, name, description, exercises)

	if err := s.validator.Struct(plan); err != nil {
		return nil, fmt.Errorf("plan validation failed: %w", err)
	}

	if err := s.planRepo.Create(plan); err != nil {
		return nil, fmt.Errorf("failed to create plan: %w", err)
	}

	return plan, nil
}

// GetPlans returns all plans owned by a trainer
func (s *WorkoutPlanService) GetPlans(ctx context.Context, trainerID string) ([]*models.WorkoutPlan, error) {
	return s.planRepo.GetByTrainerID(trainerID)
}

// GetPlan returns a single plan with access control
func (s *WorkoutPlanService) GetPlan(ctx context.Context, planID, requesterID string, requesterRole models.UserRole) (*models.WorkoutPlan, error) {
	plan, err := s.planRepo.GetByID(planID)
	if err != nil {
		return nil, ErrWorkoutPlanNotFound
	}

	switch requesterRole {
	case models.RoleTrainer:
		if plan.TrainerID != requesterID {
			return nil, NewServiceError("Access denied", "FORBIDDEN")
		}
	case models.RoleAthlete:
		assignment, err := s.assignmentRepo.GetByAthleteAndPlan(requesterID, planID)
		if err != nil {
			return nil, fmt.Errorf("failed to verify assignment: %w", err)
		}
		if assignment == nil {
			return nil, NewServiceError("Access denied", "FORBIDDEN")
		}
	default:
		return nil, NewServiceError("Access denied", "FORBIDDEN")
	}

	return plan, nil
}

// UpdatePlan updates a plan (owner only)
func (s *WorkoutPlanService) UpdatePlan(
	ctx context.Context,
	planID, trainerID, name, description string,
	exercises []models.WorkoutPlanExercise,
) (*models.WorkoutPlan, error) {
	plan, err := s.planRepo.GetByID(planID)
	if err != nil {
		return nil, ErrWorkoutPlanNotFound
	}

	if plan.TrainerID != trainerID {
		return nil, NewServiceError("Access denied", "FORBIDDEN")
	}

	if name == "" {
		return nil, NewServiceError("Plan name is required", "VALIDATION")
	}
	if len(exercises) == 0 {
		return nil, NewServiceError("At least one exercise is required", "VALIDATION")
	}

	plan.Name = name
	plan.Description = description
	plan.Exercises = exercises

	if err := s.planRepo.Update(plan); err != nil {
		return nil, fmt.Errorf("failed to update plan: %w", err)
	}

	return plan, nil
}

// DeletePlan deletes a plan, optionally force-deleting assignments
func (s *WorkoutPlanService) DeletePlan(ctx context.Context, planID, trainerID string, force bool) error {
	plan, err := s.planRepo.GetByID(planID)
	if err != nil {
		return ErrWorkoutPlanNotFound
	}

	if plan.TrainerID != trainerID {
		return NewServiceError("Access denied", "FORBIDDEN")
	}

	if !force {
		assignments, err := s.assignmentRepo.GetByPlanID(planID)
		if err != nil {
			return fmt.Errorf("failed to check assignments: %w", err)
		}
		if len(assignments) > 0 {
			return NewServiceError(
				fmt.Sprintf("Plan has %d active assignment(s). Use force delete to remove.", len(assignments)),
				"HAS_ASSIGNMENTS",
			)
		}
	} else {
		if err := s.assignmentRepo.DeleteByPlanID(planID); err != nil {
			return fmt.Errorf("failed to delete assignments: %w", err)
		}
	}

	return s.planRepo.Delete(planID)
}

// AssignPlan assigns a plan to one or more athletes
func (s *WorkoutPlanService) AssignPlan(
	ctx context.Context,
	planID, trainerID string,
	athleteIDs []string,
) ([]*models.WorkoutPlanAssignment, error) {
	plan, err := s.planRepo.GetByID(planID)
	if err != nil {
		return nil, ErrWorkoutPlanNotFound
	}

	if plan.TrainerID != trainerID {
		return nil, NewServiceError("Access denied", "FORBIDDEN")
	}

	var created []*models.WorkoutPlanAssignment

	for _, athleteID := range athleteIDs {
		hasRel, err := s.relationshipRepo.HasActiveRelationship(ctx, trainerID, athleteID)
		if err != nil {
			return nil, fmt.Errorf("failed to verify relationship: %w", err)
		}
		if !hasRel {
			continue
		}

		existing, err := s.assignmentRepo.GetByAthleteAndPlan(athleteID, planID)
		if err != nil {
			return nil, fmt.Errorf("failed to check existing assignment: %w", err)
		}
		if existing != nil {
			continue // idempotent: skip duplicates
		}

		assignment := models.NewWorkoutPlanAssignment(planID, athleteID, trainerID)
		if err := s.assignmentRepo.Create(assignment); err != nil {
			return nil, fmt.Errorf("failed to create assignment: %w", err)
		}
		created = append(created, assignment)
	}

	return created, nil
}

// GetAssignmentsForPlan returns all assignments for a plan (trainer only)
func (s *WorkoutPlanService) GetAssignmentsForPlan(ctx context.Context, planID, trainerID string) ([]*models.WorkoutPlanAssignment, error) {
	plan, err := s.planRepo.GetByID(planID)
	if err != nil {
		return nil, ErrWorkoutPlanNotFound
	}

	if plan.TrainerID != trainerID {
		return nil, NewServiceError("Access denied", "FORBIDDEN")
	}

	return s.assignmentRepo.GetByPlanID(planID)
}

// GetMyPlans returns all plans assigned to an athlete
func (s *WorkoutPlanService) GetMyPlans(ctx context.Context, athleteID string) ([]*models.WorkoutPlan, error) {
	assignments, err := s.assignmentRepo.GetByAthleteID(athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to get assignments: %w", err)
	}

	var plans []*models.WorkoutPlan
	for _, a := range assignments {
		plan, err := s.planRepo.GetByID(a.PlanID)
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
	planID, athleteID string,
) (*models.Workout, error) {
	assignment, err := s.assignmentRepo.GetByAthleteAndPlan(athleteID, planID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify assignment: %w", err)
	}
	if assignment == nil {
		return nil, NewServiceError("You are not assigned to this plan", "FORBIDDEN")
	}

	plan, err := s.planRepo.GetByID(planID)
	if err != nil {
		return nil, ErrWorkoutPlanNotFound
	}

	exercises := convertPlanExercisesToWorkout(plan.Exercises)

	workout := models.NewWorkout(athleteID, time.Now(), exercises, planID)

	if err := s.validator.Struct(workout); err != nil {
		return nil, fmt.Errorf("workout validation failed: %w", err)
	}

	if err := s.workoutRepo.Create(workout); err != nil {
		return nil, fmt.Errorf("failed to create workout from plan: %w", err)
	}

	return workout, nil
}

// GetClientPlans returns plans assigned to a client (trainer view)
func (s *WorkoutPlanService) GetClientPlans(
	ctx context.Context,
	trainerID, athleteID string,
) ([]*models.WorkoutPlan, error) {
	hasRel, err := s.relationshipRepo.HasActiveRelationship(ctx, trainerID, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify relationship: %w", err)
	}
	if !hasRel {
		return nil, NewServiceError("You don't have an active relationship with this client", "FORBIDDEN")
	}

	assignments, err := s.assignmentRepo.GetByAthleteID(athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to get assignments: %w", err)
	}

	var plans []*models.WorkoutPlan
	for _, a := range assignments {
		plan, err := s.planRepo.GetByID(a.PlanID)
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
