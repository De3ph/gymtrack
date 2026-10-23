package repositories

import (
	"context"
	"time"

	"gymtrack-backend/internal/domain/models"
)

// UserRepository defines data access for users.
type UserRepository interface {
	CreateUser(ctx context.Context, user *models.User) error
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUserByUsername(ctx context.Context, username string) (*models.User, error)
	GetUserByID(ctx context.Context, userID int) (*models.User, error)
	GetUsersByIDs(ctx context.Context, userIDs []int) (map[int]*models.User, error)
	GetAllUsers(ctx context.Context) ([]*models.User, error)
	UpdateUser(ctx context.Context, user *models.User) error
	// SetTrainerAssignment projects trainerID onto the athlete's profile.
	//
	// It is a targeted UPDATE rather than a read-modify-write of the whole
	// users row: the relationship writer must not resurrect a concurrent
	// password, role or status change from a stale copy.
	SetTrainerAssignment(ctx context.Context, athleteID int, trainerID int) error
	// ClearTrainerAssignment clears the projection only while it still points
	// at trainerID. The guard lives in the UPDATE, not in the caller, so a
	// stale read cannot wipe a newer trainer's assignment.
	ClearTrainerAssignment(ctx context.Context, athleteID int, trainerID int) error
	GetAllUsersFiltered(ctx context.Context, role string, search string, limit, offset int) ([]*models.User, error)
	CountUsers(ctx context.Context, role string, search string) (int, error)
	// BumpTokenVersion atomically increments users.token_version, invalidating
	// every JWT outstanding for that user. Returns the new version.
	BumpTokenVersion(ctx context.Context, userID int) (int, error)
	SoftDeleteUser(ctx context.Context, userID int) error
	RestoreUser(ctx context.Context, userID int) error
	GetUsersReadyForHardDelete(ctx context.Context, before time.Time) ([]int, error)
	HardDeleteUser(ctx context.Context, userID int) error
}
