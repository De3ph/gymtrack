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
		return nil, NewServiceError("Only athletes can create workouts", "FORBIDDEN")
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

	if input.RequesterRole == models.RoleAthlete && workout.AthleteID != input.RequesterID {
		return nil, NewServiceError("Access denied", "FORBIDDEN")
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
		return nil, NewServiceError("Only athletes can list their workouts", "FORBIDDEN")
	}

	workouts := make([]*models.Workout, 0)
	var err error

	if input.StartDate != nil && input.EndDate != nil {
		workouts, err = s.workoutRepo.GetByAthleteDateRange(ctx, input.AthleteID, *input.StartDate, *input.EndDate)
	} else {
		workouts, err = s.workoutRepo.GetByAthleteID(ctx, input.AthleteID, input.Limit, input.Offset)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve workouts: %w", err)
	}

	return &GetWorkoutsOutput{
		Workouts: workouts,
		Count:    len(workouts),
	}, nil
}

type UpdateWorkoutInput struct {
	WorkoutID int
	AthleteID int
	Date      time.Time
	Exercises []models.WorkoutExercise
}

func (s *WorkoutService) UpdateWorkout(ctx context.Context, input UpdateWorkoutInput) (*models.Workout, error) {
	workout, err := s.workoutRepo.GetByID(ctx, input.WorkoutID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil, ErrWorkoutNotFound
		}
		return nil, fmt.Errorf("failed to get workout: %w", err)
	}

	if workout.AthleteID != input.AthleteID {
		return nil, NewServiceError("Access denied", "FORBIDDEN")
	}

	if !workout.CanEdit() {
		return nil, NewServiceError("Cannot edit workout after 24 hours", "FORBIDDEN")
	}

	if err := s.validator.Struct(input); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	workout.Date = input.Date
	workout.Exercises = input.Exercises

	if err := s.workoutRepo.Update(ctx, workout); err != nil {
		return nil, fmt.Errorf("failed to update workout: %w", err)
	}

	return workout, nil
}

func (s *WorkoutService) DeleteWorkout(ctx context.Context, workoutID, athleteID int) error {
	workout, err := s.workoutRepo.GetByID(ctx, workoutID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return ErrWorkoutNotFound
		}
		return fmt.Errorf("failed to get workout: %w", err)
	}

	if workout.AthleteID != athleteID {
		return NewServiceError("Access denied", "FORBIDDEN")
	}

	if !workout.CanEdit() {
		return NewServiceError("Cannot delete workout after 24 hours", "FORBIDDEN")
	}

	if err := s.workoutRepo.Delete(ctx, workoutID); err != nil {
		return fmt.Errorf("failed to delete workout: %w", err)
	}

	return nil
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
	relationships, err := s.relationshipRepo.GetByTrainerID(ctx, input.TrainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify relationship: %w", err)
	}

	hasActiveRelationship := false
	for _, rel := range relationships {
		if rel.AthleteID == input.ClientID && rel.IsActive() {
			hasActiveRelationship = true
			break
		}
	}

	if !hasActiveRelationship {
		return nil, NewServiceError("You don't have an active relationship with this client", "FORBIDDEN")
	}

	workouts := make([]*models.Workout, 0)

	if input.StartDate != nil && input.EndDate != nil {
		workouts, err = s.workoutRepo.GetByAthleteDateRange(ctx, input.ClientID, *input.StartDate, *input.EndDate)
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

	return &GetWorkoutsOutput{
		Workouts: workouts,
		Count:    len(workouts),
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

	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")

	if startDateStr != "" && endDateStr != "" {
		start, err1 := time.Parse(time.RFC3339, startDateStr)
		end, err2 := time.Parse(time.RFC3339, endDateStr)
		if err1 != nil || err2 != nil {
			return 0, 0, nil, nil, NewServiceError("Invalid date format. Use RFC3339 format", "INVALID_DATE")
		}
		startDate = &start
		endDate = &end
	}

	return limit, offset, startDate, endDate, nil
}
