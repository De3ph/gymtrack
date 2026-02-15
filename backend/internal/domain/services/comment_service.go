package services

import (
	"errors"
	"fmt"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

var (
	ErrTargetNotFound = errors.New("target not found")
	ErrAccessDenied   = errors.New("access denied")
	ErrNotAuthor      = errors.New("only the comment author can perform this action")
)

// CommentService encapsulates comment authorization and target resolution.
type CommentService struct {
	commentRepo      *repositories.CommentRepository
	relationshipRepo *repositories.RelationshipRepository
	workoutRepo      *repositories.WorkoutRepository
	mealRepo         *repositories.MealRepository
}

// NewCommentService creates a new CommentService.
func NewCommentService(
	commentRepo *repositories.CommentRepository,
	relationshipRepo *repositories.RelationshipRepository,
	workoutRepo *repositories.WorkoutRepository,
	mealRepo *repositories.MealRepository,
) *CommentService {
	return &CommentService{
		commentRepo:      commentRepo,
		relationshipRepo: relationshipRepo,
		workoutRepo:      workoutRepo,
		mealRepo:         mealRepo,
	}
}

// ResolveTargetAthlete returns the athleteID that owns the given target (workout or meal).
// Returns ErrTargetNotFound if the target does not exist.
func (s *CommentService) ResolveTargetAthlete(targetType models.TargetType, targetID string) (athleteID string, err error) {
	switch targetType {
	case models.TargetTypeWorkout:
		workout, err := s.workoutRepo.GetByID(targetID)
		if err != nil || workout == nil {
			return "", ErrTargetNotFound
		}
		return workout.AthleteID, nil
	case models.TargetTypeMeal:
		meal, err := s.mealRepo.GetByID(targetID)
		if err != nil || meal == nil {
			return "", ErrTargetNotFound
		}
		return meal.AthleteID, nil
	default:
		return "", fmt.Errorf("invalid target type: %s", targetType)
	}
}

// CanAccessComments returns nil if the user (trainer or athlete) is allowed to list comments on the target.
// Athlete: must own the target. Trainer: must have an active relationship with the target's athlete.
func (s *CommentService) CanAccessComments(userID string, userRole models.UserRole, targetType models.TargetType, targetID string) error {
	athleteID, err := s.ResolveTargetAthlete(targetType, targetID)
	if err != nil {
		return err
	}
	if userRole == models.RoleAthlete {
		if userID != athleteID {
			return ErrAccessDenied
		}
		return nil
	}
	if userRole == models.RoleTrainer {
		relationships, err := s.relationshipRepo.GetByTrainerID(userID)
		if err != nil {
			return err
		}
		for _, rel := range relationships {
			if rel.AthleteID == athleteID && rel.IsActive() {
				return nil
			}
		}
		return ErrAccessDenied
	}
	return ErrAccessDenied
}

// CanCreateComment returns nil if the user can create a comment (top-level or reply) on the target.
// Trainer: allowed if they have an active relationship with the target's athlete.
// Athlete: allowed on own target (top-level or reply).
func (s *CommentService) CanCreateComment(userID string, userRole models.UserRole, targetType models.TargetType, targetID string, parentCommentID *string) error {
	return s.CanAccessComments(userID, userRole, targetType, targetID)
}

// CanEditOrDeleteComment returns nil if the user can edit or delete the comment (must be the author).
func (s *CommentService) CanEditOrDeleteComment(userID string, commentID string) error {
	comment, err := s.commentRepo.GetByID(commentID)
	if err != nil || comment == nil {
		return ErrTargetNotFound
	}
	if comment.AuthorID != userID {
		return ErrNotAuthor
	}
	return nil
}
