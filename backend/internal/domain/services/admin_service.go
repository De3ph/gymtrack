package services

import (
	"context"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"

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

// DashboardStats holds aggregate platform statistics.
type DashboardStats struct {
	TotalUsers        int `json:"totalUsers"`
	TotalTrainers     int `json:"totalTrainers"`
	TotalAthletes     int `json:"totalAthletes"`
	NewUsersToday     int `json:"newUsersToday"`
	NewUsersThisWeek  int `json:"newUsersThisWeek"`
	NewUsersThisMonth int `json:"newUsersThisMonth"`
	ActiveUsersToday  int `json:"activeUsersToday"`
	TotalWorkouts     int `json:"totalWorkouts"`
	TotalMeals        int `json:"totalMeals"`
}

// GetDashboardStats computes aggregate platform statistics.
func (s *AdminService) GetDashboardStats(ctx context.Context) (*DashboardStats, error) {
	users, err := s.userRepo.GetAllUsers(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve users for stats: %w", err)
	}

	stats := &DashboardStats{}
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekStart := todayStart.AddDate(0, 0, -int(now.Weekday()))
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	for _, u := range users {
		stats.TotalUsers++
		switch u.Role {
		case models.RoleTrainer:
			stats.TotalTrainers++
		case models.RoleAthlete:
			stats.TotalAthletes++
		}

		if u.CreatedAt.After(todayStart) || u.CreatedAt.Equal(todayStart) {
			stats.NewUsersToday++
		}
		if u.CreatedAt.After(weekStart) || u.CreatedAt.Equal(weekStart) {
			stats.NewUsersThisWeek++
		}
		if u.CreatedAt.After(monthStart) || u.CreatedAt.Equal(monthStart) {
			stats.NewUsersThisMonth++
		}

		// Rough "active today": user was updated today
		if u.UpdatedAt.After(todayStart) || u.UpdatedAt.Equal(todayStart) {
			stats.ActiveUsersToday++
		}
	}

	// Workout and meal totals are best-effort from available data
	stats.TotalWorkouts = 0 // would need a workout repo aggregate
	stats.TotalMeals = 0    // would need a meal repo aggregate

	return stats, nil
}

// ChangePasswordRequest holds old + new password for a password change.
type ChangePasswordRequest struct {
	UserID      string
	OldPassword string
	NewPassword string
}

// ChangePassword changes a user's password after verifying the old one.
func (s *AdminService) ChangePassword(ctx context.Context, req ChangePasswordRequest) error {
	user, err := s.userRepo.GetUserByID(ctx, req.UserID)
	if err != nil {
		return fmt.Errorf("failed to retrieve user: %w", err)
	}
	if user == nil {
		return ErrUserNotFound
	}

	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		return NewServiceError("current password is incorrect", "INVALID_PASSWORD")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	user.PasswordHash = string(hashedPassword)
	user.UpdatedAt = time.Now()

	if err := s.userRepo.UpdateUser(ctx, user); err != nil {
		return fmt.Errorf("failed to update user password: %w", err)
	}

	return nil
}
