package services

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

type WorkoutService struct {
	workoutRepo      repositories.WorkoutRepository
	relationshipRepo repositories.RelationshipRepository
	validator        *validator.Validate
}

func NewWorkoutService(workoutRepo repositories.WorkoutRepository, relationshipRepo repositories.RelationshipRepository) *WorkoutService {
	return &WorkoutService{
		workoutRepo:      workoutRepo,
		relationshipRepo: relationshipRepo,
		validator:        validator.New(),
	}
}

type CreateWorkoutInput struct {
	AthleteID int
	Date      time.Time
	Exercises []models.WorkoutExercise
	UserRole  models.UserRole
}

func (s *WorkoutService) CreateWorkout(ctx context.Context, input CreateWorkoutInput) (*models.Workout, error) {
	if input.UserRole != models.RoleAthlete {
		return nil, NewServiceError("Only athletes can log workouts. Trainers should create workout plans instead", "FORBIDDEN")
	}

	if err := s.validator.Struct(input); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	workout := models.NewWorkout(input.AthleteID, input.Date, input.Exercises, 0)

	if err := s.validator.Struct(workout); err != nil {
		return nil, fmt.Errorf("workout validation failed: %w", err)
	}

	if err := s.workoutRepo.Create(ctx, workout); err != nil {
		return nil, fmt.Errorf("failed to create workout: %w", err)
	}

	return workout, nil
}

type UpdateWorkoutInput struct {
	WorkoutID int
	AthleteID int
	UserRole  models.UserRole
	Date      time.Time
	Exercises []models.WorkoutExercise
}

func (s *WorkoutService) UpdateWorkout(ctx context.Context, input UpdateWorkoutInput) (*models.Workout, error) {
	if input.UserRole != models.RoleAthlete {
		return nil, NewServiceError("Only athletes can edit workouts", "FORBIDDEN")
	}

	workout, err := s.workoutRepo.GetByID(ctx, input.WorkoutID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil, ErrWorkoutNotFound
		}
		return nil, fmt.Errorf("failed to get workout: %w", err)
	}

	if workout.AthleteID != input.AthleteID {
		return nil, NewServiceError("This workout belongs to another athlete. You can only edit your own workouts", "FORBIDDEN")
	}

	if !workout.CanEdit() {
		return nil, NewServiceError("This workout can no longer be edited because more than 24 hours have passed since it was logged", "FORBIDDEN")
	}

	workout.Date = input.Date
	workout.Exercises = input.Exercises

	if err := s.validator.Struct(workout); err != nil {
		return nil, NewServiceError("Invalid workout data. Please check the date and exercises and try again", "VALIDATION")
	}

	if err := s.workoutRepo.Update(ctx, workout); err != nil {
		return nil, fmt.Errorf("failed to update workout: %w", err)
	}

	return workout, nil
}

type DeleteWorkoutInput struct {
	WorkoutID int
	AthleteID int
	UserRole  models.UserRole
}

func (s *WorkoutService) DeleteWorkout(ctx context.Context, input DeleteWorkoutInput) error {
	if input.UserRole != models.RoleAthlete {
		return NewServiceError("Only athletes can delete workouts", "FORBIDDEN")
	}

	workout, err := s.workoutRepo.GetByID(ctx, input.WorkoutID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return ErrWorkoutNotFound
		}
		return fmt.Errorf("failed to get workout: %w", err)
	}

	if workout.AthleteID != input.AthleteID {
		return NewServiceError("This workout belongs to another athlete. You can only delete your own workouts", "FORBIDDEN")
	}

	if !workout.CanEdit() {
		return NewServiceError("This workout can no longer be deleted because more than 24 hours have passed since it was logged", "FORBIDDEN")
	}

	if err := s.workoutRepo.Delete(ctx, input.WorkoutID); err != nil {
		return fmt.Errorf("failed to delete workout: %w", err)
	}

	return nil
}

type GetWorkoutInput struct {
	WorkoutID     int
	RequesterID   int
	RequesterRole models.UserRole
}

func (s *WorkoutService) GetWorkout(ctx context.Context, input GetWorkoutInput) (*models.Workout, error) {
	workout, err := s.workoutRepo.GetByID(ctx, input.WorkoutID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil, ErrWorkoutNotFound
		}
		return nil, fmt.Errorf("failed to get workout: %w", err)
	}

	if input.RequesterRole == models.RoleAthlete {
		if workout.AthleteID != input.RequesterID {
			return nil, NewServiceError("This workout belongs to another athlete. You can only view your own workouts", "FORBIDDEN")
		}
	} else if input.RequesterRole == models.RoleTrainer {
		hasActive, err := s.relationshipRepo.HasActiveRelationship(ctx, input.RequesterID, workout.AthleteID)
		if err != nil {
			return nil, fmt.Errorf("failed to verify relationship: %w", err)
		}
		if !hasActive {
			return nil, NewServiceError("You don't have an active coaching relationship with this athlete, so you can't view their workouts", "FORBIDDEN")
		}
	}

	return workout, nil
}

type GetWorkoutsInput struct {
	AthleteID int
	UserRole  models.UserRole
	Limit     int
	Offset    int
	StartDate *time.Time
	EndDate   *time.Time
}

type GetWorkoutsOutput struct {
	Workouts []*models.Workout
	Count    int
}

func (s *WorkoutService) GetWorkouts(ctx context.Context, input GetWorkoutsInput) (*GetWorkoutsOutput, error) {
	if input.UserRole != models.RoleAthlete {
		return nil, NewServiceError("Only athletes can view their workout history. Trainers, please use the client workouts view", "FORBIDDEN")
	}

	var workouts []*models.Workout
	var err error

	if input.StartDate != nil || input.EndDate != nil {
		workouts, err = s.workoutRepo.GetByAthleteDateRange(ctx, input.AthleteID, input.StartDate, input.EndDate, input.Limit, input.Offset)
	} else {
		workouts, err = s.workoutRepo.GetByAthleteID(ctx, input.AthleteID, input.Limit, input.Offset)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve workouts: %w", err)
	}

	// Count is the total number of workouts matching the request filters
	// (not the size of this page); clients use it for pagination.
	total, err := s.workoutRepo.CountByAthlete(ctx, input.AthleteID, input.StartDate, input.EndDate)
	if err != nil {
		return nil, fmt.Errorf("failed to count workouts: %w", err)
	}

	return &GetWorkoutsOutput{
		Workouts: workouts,
		Count:    total,
	}, nil
}

type GetClientWorkoutsInput struct {
	TrainerID    int
	ClientID     int
	Limit        int
	Offset       int
	StartDate    *time.Time
	EndDate      *time.Time
	ExerciseType string
}

func (s *WorkoutService) GetClientWorkouts(ctx context.Context, input GetClientWorkoutsInput) (*GetWorkoutsOutput, error) {
	// Single indexed EXISTS instead of scanning the trainer's whole
	// relationship set and matching on the athlete in Go.
	hasActiveRelationship, err := s.relationshipRepo.HasActiveRelationship(ctx, input.TrainerID, input.ClientID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify relationship: %w", err)
	}

	if !hasActiveRelationship {
		return nil, NewServiceError("You don't have an active coaching relationship with this client, so you can't view their workouts", "FORBIDDEN")
	}

	var workouts []*models.Workout

	if input.StartDate != nil || input.EndDate != nil {
		workouts, err = s.workoutRepo.GetByAthleteDateRange(ctx, input.ClientID, input.StartDate, input.EndDate, input.Limit, input.Offset)
	} else {
		workouts, err = s.workoutRepo.GetByAthleteID(ctx, input.ClientID, input.Limit, input.Offset)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve workouts: %w", err)
	}

	if input.ExerciseType != "" {
		filtered := make([]*models.Workout, 0)
		for _, w := range workouts {
			for _, e := range w.Exercises {
				if containsIgnoreCase(e.Name, input.ExerciseType) {
					filtered = append(filtered, w)
					break
				}
			}
		}
		workouts = filtered
	}

	// Count reflects the date-window filter; exerciseType is applied in
	// memory to the returned page, so it does not affect the total.
	total, err := s.workoutRepo.CountByAthlete(ctx, input.ClientID, input.StartDate, input.EndDate)
	if err != nil {
		return nil, fmt.Errorf("failed to count workouts: %w", err)
	}

	return &GetWorkoutsOutput{
		Workouts: workouts,
		Count:    total,
	}, nil
}

func containsIgnoreCase(s, substr string) bool {
	s = strings.ToLower(s)
	substr = strings.ToLower(substr)
	return strings.Contains(s, substr)
}

func ParseWorkoutQueryParams(c interface {
	DefaultQuery(key, def string) string
	Query(key string) string
}) (limit, offset int, startDate, endDate *time.Time, err error) {
	limit, _ = strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ = strconv.Atoi(c.DefaultQuery("offset", "0"))

	// Each bound is applied independently, so a request carrying only
	// startDate (or only endDate) still filters.
	if startDateStr := c.Query("startDate"); startDateStr != "" {
		start, err := parseRFC3339(startDateStr)
		if err != nil {
			return 0, 0, nil, nil, err
		}
		startDate = &start
	}

	if endDateStr := c.Query("endDate"); endDateStr != "" {
		end, err := parseRFC3339(endDateStr)
		if err != nil {
			return 0, 0, nil, nil, err
		}
		endDate = &end
	}

	return limit, offset, startDate, endDate, nil
}
