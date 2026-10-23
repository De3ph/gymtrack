package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/go-playground/validator/v10"
	"golang.org/x/crypto/bcrypt"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

type UserService struct {
	userRepo  repositories.UserRepository
	validator *validator.Validate
}

func NewUserService(userRepo repositories.UserRepository) *UserService {
	return &UserService{
		userRepo:  userRepo,
		validator: validator.New(),
	}
}

func (s *UserService) GetUserByID(ctx context.Context, userID int) (*models.User, error) {
	user, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to retrieve user: %w", err)
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (s *UserService) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	user, err := s.userRepo.GetUserByUsername(ctx, username)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to retrieve user: %w", err)
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (s *UserService) UpdateUserProfile(ctx context.Context, userID int, profile models.UserProfile) (*models.User, error) {
	user, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to retrieve user: %w", err)
	}
	if user == nil {
		return nil, ErrUserNotFound
	}

	// Merge rather than blind-replace: only the fields owned by this endpoint
	// are taken from the incoming profile. Server-managed fields
	// (TrainerAssignment, ClientList) and the public trainer-catalog fields
	// (hourly rate, location, availability, photo, ... — edited via the trainer
	// profile endpoint) are preserved from the stored row, so a partial or stale
	// client payload can never wipe them. This mirrors the read-modify-write
	// merge in trainer_profile.go. Note bio is intentionally accepted here too:
	// it is edited through this endpoint by the mobile profile screen.
	existing := user.Profile
	existing.Name = profile.Name
	existing.Bio = profile.Bio
	existing.Age = profile.Age
	existing.Weight = profile.Weight
	existing.Height = profile.Height
	existing.FitnessGoals = profile.FitnessGoals
	existing.Certifications = profile.Certifications
	existing.Specializations = profile.Specializations
	user.Profile = existing
	user.UpdatedAt = time.Now()

	if err := s.userRepo.UpdateUser(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return user, nil
}

func (s *UserService) DeleteAccount(ctx context.Context, userID int, password string) error {
	user, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return ErrUserNotFound
		}
		return fmt.Errorf("failed to retrieve user: %w", err)
	}
	if user == nil {
		return ErrUserNotFound
	}

	// Block admin self-deletion
	if user.Role == models.RoleAdmin {
		return ErrAccountCannotBeDeleted
	}

	// Block already-deleted accounts
	if user.Status == models.UserStatusDeleted {
		return ErrAccountDeleted
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return ErrInvalidCredentials
	}

	if err := s.userRepo.SoftDeleteUser(ctx, userID); err != nil {
		return fmt.Errorf("failed to delete account: %w", err)
	}

	return nil
}

func (s *UserService) RestoreUser(ctx context.Context, userID int) error {
	if err := s.userRepo.RestoreUser(ctx, userID); err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return ErrUserNotFound
		}
		return fmt.Errorf("failed to restore account: %w", err)
	}
	return nil
}
