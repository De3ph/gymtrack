package services

import (
	"context"
	"fmt"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

type AdminService struct {
	userRepo repositories.UserRepository
}

func NewAdminService(userRepo repositories.UserRepository) *AdminService {
	return &AdminService{
		userRepo: userRepo,
	}
}

// GetAllUsers returns all registered users ordered by creation date descending.
func (s *AdminService) GetAllUsers(ctx context.Context) ([]*models.User, error) {
	users, err := s.userRepo.GetAllUsers(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve all users: %w", err)
	}
	return users, nil
}

// GetUserByID returns a specific user's details by ID.
func (s *AdminService) GetUserByID(ctx context.Context, userID string) (*models.User, error) {
	user, err := s.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve user: %w", err)
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}
