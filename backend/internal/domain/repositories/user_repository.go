package repositories

import (
	"context"

	"gymtrack-backend/internal/domain/models"
)

// UserRepository defines data access for users.
type UserRepository interface {
	CreateUser(ctx context.Context, user *models.User) error
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUserByUsername(ctx context.Context, username string) (*models.User, error)
	GetUserByID(ctx context.Context, userID int) (*models.User, error)
	GetAllUsers(ctx context.Context) ([]*models.User, error)
	UpdateUser(ctx context.Context, user *models.User) error
	GetAllUsersFiltered(ctx context.Context, role string, search string, limit, offset int) ([]*models.User, error)
	CountUsers(ctx context.Context, role string, search string) (int, error)
}
