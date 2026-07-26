package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

type AdminService struct {
	userRepo    repositories.UserRepository
	workoutRepo repositories.WorkoutRepository
	mealRepo    repositories.MealRepository
	commentRepo repositories.CommentRepository
	exerciseRepo repositories.ExerciseRepository
}

func NewAdminService(userRepo repositories.UserRepository, workoutRepo repositories.WorkoutRepository, mealRepo repositories.MealRepository, commentRepo repositories.CommentRepository, exerciseRepo repositories.ExerciseRepository) *AdminService {
	return &AdminService{
		userRepo:    userRepo,
		workoutRepo: workoutRepo,
		mealRepo:    mealRepo,
		commentRepo: commentRepo,
		exerciseRepo: exerciseRepo,
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

// GetAllUsersFiltered returns filtered, paginated users with total count.
func (s *AdminService) GetAllUsersFiltered(ctx context.Context, role, search string, limit, offset int) ([]*models.User, int, error) {
	if limit <= 0 {
		limit = 25
	}
	if offset < 0 {
		offset = 0
	}

	users, err := s.userRepo.GetAllUsersFiltered(ctx, role, search, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to retrieve filtered users: %w", err)
	}

	total, err := s.userRepo.CountUsers(ctx, role, search)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	return users, total, nil
}

// GetUserByID returns a specific user's details by ID.
func (s *AdminService) GetUserByID(ctx context.Context, userID int) (*models.User, error) {
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

	// Workout and meal totals from DB aggregates
	totalWorkouts, err := s.workoutRepo.CountAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to count workouts: %w", err)
	}
	totalMeals, err := s.mealRepo.CountAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to count meals: %w", err)
	}
	stats.TotalWorkouts = totalWorkouts
	stats.TotalMeals = totalMeals

	return stats, nil
}

// ChangePasswordRequest holds old + new password for a password change.
type ChangePasswordRequest struct {
	UserID      int
	OldPassword string
	NewPassword string
}

// ChangePassword changes a user's password after verifying the old one.
func (s *AdminService) ChangePassword(ctx context.Context, req ChangePasswordRequest) error {
	user, err := s.userRepo.GetUserByID(ctx, req.UserID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return ErrUserNotFound
		}
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

// UpdateUserRole changes a user's role. Cannot change own role or demote last admin.
func (s *AdminService) UpdateUserRole(ctx context.Context, adminID int, targetUserID int, newRole models.UserRole) error {
	// Prevent self-demotion
	if adminID == targetUserID {
		return NewServiceError("cannot change your own role", "SELF_ROLE_CHANGE")
	}

	target, err := s.userRepo.GetUserByID(ctx, targetUserID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return ErrUserNotFound
		}
		return fmt.Errorf("failed to retrieve target user: %w", err)
	}

	// Prevent demoting the last admin
	if target.Role == models.RoleAdmin && newRole != models.RoleAdmin {
		adminCount, err := s.userRepo.CountUsers(ctx, "admin", "")
		if err != nil {
			return fmt.Errorf("failed to count admins: %w", err)
		}
		if adminCount <= 1 {
			return NewServiceError("cannot demote the last admin", "LAST_ADMIN")
		}
	}

	target.Role = newRole
	target.UpdatedAt = time.Now()
	return s.userRepo.UpdateUser(ctx, target)
}

// UpdateUserStatus suspends, bans, or reactivates a user account.
func (s *AdminService) UpdateUserStatus(ctx context.Context, targetUserID int, status models.UserStatus) error {
	target, err := s.userRepo.GetUserByID(ctx, targetUserID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return ErrUserNotFound
		}
		return fmt.Errorf("failed to retrieve target user: %w", err)
	}

	// Prevent banning the last admin
	if target.Role == models.RoleAdmin && status != models.UserStatusActive {
		adminCount, err := s.userRepo.CountUsers(ctx, "admin", "")
		if err != nil {
			return fmt.Errorf("failed to count admins: %w", err)
		}
		if adminCount <= 1 {
			return NewServiceError("cannot suspend/ban the last admin", "LAST_ADMIN")
		}
	}

	target.Status = status
	target.UpdatedAt = time.Now()
	return s.userRepo.UpdateUser(ctx, target)
}

// GetAllComments returns paginated comments for admin moderation.
func (s *AdminService) GetAllComments(ctx context.Context, targetType string, limit, offset int) ([]*models.Comment, int, error) {
	if limit <= 0 {
		limit = 25
	}
	if offset < 0 {
		offset = 0
	}

	comments, err := s.commentRepo.GetAllComments(ctx, targetType, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to retrieve comments: %w", err)
	}

	total, err := s.commentRepo.CountAllComments(ctx, targetType)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count comments: %w", err)
	}

	for _, c := range comments {
		c.Type = "comment"
	}

	return comments, total, nil
}

// DeleteComment force-deletes any comment by ID (admin bypass).
func (s *AdminService) DeleteComment(ctx context.Context, commentID int) error {
	err := s.commentRepo.Delete(ctx, commentID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return NewServiceError("comment not found", "COMMENT_NOT_FOUND")
		}
		return fmt.Errorf("failed to delete comment: %w", err)
	}
	return nil
}

// VerifyExercise marks an exercise as verified by admin.
func (s *AdminService) VerifyExercise(ctx context.Context, exerciseID int) error {
	exercise, err := s.exerciseRepo.GetExerciseByID(ctx, exerciseID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return ErrUserNotFound
		}
		return fmt.Errorf("failed to get exercise: %w", err)
	}
	exercise.IsVerified = true
	return s.exerciseRepo.UpdateExercise(ctx, exercise)
}

// DeleteExercise force-deletes an exercise by admin.
func (s *AdminService) DeleteExercise(ctx context.Context, exerciseID int) error {
	err := s.exerciseRepo.DeleteExercise(ctx, exerciseID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return NewServiceError("exercise not found", "EXERCISE_NOT_FOUND")
		}
		return fmt.Errorf("failed to delete exercise: %w", err)
	}
	return nil
}



