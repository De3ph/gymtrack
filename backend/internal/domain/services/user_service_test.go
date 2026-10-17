package services

import (
	"context"
	"sync"
	"testing"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

// fakeUserRepo is an in-memory UserRepository for service tests.
type fakeUserRepo struct {
	mu    sync.Mutex
	users map[int]*models.User
	// softDeleted tracks IDs that have been soft-deleted (for RestoreUser).
	softDeleted map[int]bool
	nextID      int
}

func newFakeUserRepo() *fakeUserRepo {
	return &fakeUserRepo{
		users:       make(map[int]*models.User),
		softDeleted: make(map[int]bool),
		nextID:      0,
	}
}

func (f *fakeUserRepo) CreateUser(_ context.Context, user *models.User) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.nextID++
	user.UserID = f.nextID
	if user.Status == "" {
		user.Status = models.UserStatusActive
	}
	if user.Type == "" {
		user.Type = "user"
	}
	user.CreatedAt = time.Now().UTC()
	user.UpdatedAt = time.Now().UTC()
	clone := *user
	f.users[user.UserID] = &clone
	return nil
}

func (f *fakeUserRepo) GetUserByID(_ context.Context, userID int) (*models.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.users[userID]
	if !ok {
		return nil, domainerrors.ErrNotFound
	}
	clone := *u
	return &clone, nil
}

func (f *fakeUserRepo) GetUserByEmail(_ context.Context, email string) (*models.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, u := range f.users {
		if u.Email == email {
			clone := *u
			return &clone, nil
		}
	}
	return nil, domainerrors.ErrNotFound
}

func (f *fakeUserRepo) GetUserByUsername(_ context.Context, username string) (*models.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, u := range f.users {
		if u.Username == username {
			clone := *u
			return &clone, nil
		}
	}
	return nil, domainerrors.ErrNotFound
}

func (f *fakeUserRepo) GetAllUsers(_ context.Context) ([]*models.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]*models.User, 0, len(f.users))
	for _, u := range f.users {
		clone := *u
		out = append(out, &clone)
	}
	return out, nil
}

func (f *fakeUserRepo) UpdateUser(_ context.Context, user *models.User) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	existing, ok := f.users[user.UserID]
	if !ok {
		return domainerrors.ErrNotFound
	}
	user.UpdatedAt = time.Now().UTC()
	clone := *user
	// Mirror the Postgres repository: token_version is only mutated by
	// BumpTokenVersion, never by a full-row update.
	clone.TokenVersion = existing.TokenVersion
	f.users[user.UserID] = &clone
	return nil
}

func (f *fakeUserRepo) GetAllUsersFiltered(_ context.Context, role string, search string, limit, offset int) ([]*models.User, error) {
	return f.GetAllUsers(context.Background())
}

func (f *fakeUserRepo) CountUsers(_ context.Context, role string, search string) (int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.users), nil
}

func (f *fakeUserRepo) BumpTokenVersion(_ context.Context, userID int) (int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.users[userID]
	if !ok {
		return 0, domainerrors.ErrNotFound
	}
	u.TokenVersion++
	return u.TokenVersion, nil
}

func (f *fakeUserRepo) SoftDeleteUser(_ context.Context, userID int) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.users[userID]
	if !ok {
		return domainerrors.ErrNotFound
	}
	now := time.Now().UTC()
	u.Status = models.UserStatusDeleted
	u.DeletedAt = &now
	u.UpdatedAt = now
	return nil
}

func (f *fakeUserRepo) RestoreUser(_ context.Context, userID int) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.users[userID]
	if !ok {
		return domainerrors.ErrNotFound
	}
	u.Status = models.UserStatusActive
	u.DeletedAt = nil
	u.UpdatedAt = time.Now().UTC()
	return nil
}

func (f *fakeUserRepo) GetUsersReadyForHardDelete(_ context.Context, before time.Time) ([]int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var ids []int
	for _, u := range f.users {
		if u.Status == models.UserStatusDeleted && u.DeletedAt != nil && u.DeletedAt.Before(before) {
			ids = append(ids, u.UserID)
		}
	}
	return ids, nil
}

func (f *fakeUserRepo) HardDeleteUser(_ context.Context, userID int) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.users[userID]; !ok {
		return domainerrors.ErrNotFound
	}
	delete(f.users, userID)
	return nil
}

// Compile-time check that fakeUserRepo satisfies the interface.
var _ repositories.UserRepository = (*fakeUserRepo)(nil)

// hashPassword is a test helper that bcrypt-hashes a plaintext password.
func hashPassword(t *testing.T, plain string) string {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.MinCost)
	require.NoError(t, err)
	return string(hash)
}

// seedUser creates a user in the fake repo and returns it.
func seedUser(t *testing.T, repo *fakeUserRepo, username, email, password string, role models.UserRole) *models.User {
	t.Helper()
	u := &models.User{
		Username:     username,
		Email:        email,
		PasswordHash: hashPassword(t, password),
		Role:         role,
		Status:       models.UserStatusActive,
		Profile:      models.UserProfile{Name: username},
	}
	require.NoError(t, repo.CreateUser(context.Background(), u))
	return u
}

// --- UserService.DeleteAccount tests ---

func TestUserService_DeleteAccount_Success(t *testing.T) {
	repo := newFakeUserRepo()
	svc := NewUserService(repo)
	ctx := context.Background()

	user := seedUser(t, repo, "deleteok", "del@example.com", "correctpass", models.RoleAthlete)

	err := svc.DeleteAccount(ctx, user.UserID, "correctpass")
	require.NoError(t, err)

	// Verify user is now soft-deleted.
	got, err := repo.GetUserByID(ctx, user.UserID)
	require.NoError(t, err)
	assert.Equal(t, models.UserStatusDeleted, got.Status)
	assert.NotNil(t, got.DeletedAt)
}

func TestUserService_DeleteAccount_WrongPassword(t *testing.T) {
	repo := newFakeUserRepo()
	svc := NewUserService(repo)
	ctx := context.Background()

	user := seedUser(t, repo, "wrongpw", "wrongpw@example.com", "realpassword", models.RoleAthlete)

	err := svc.DeleteAccount(ctx, user.UserID, "wrongpassword")
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "INVALID_CREDENTIALS", svcErr.Code)

	// User should still be active.
	got, err := repo.GetUserByID(ctx, user.UserID)
	require.NoError(t, err)
	assert.Equal(t, models.UserStatusActive, got.Status)
}

func TestUserService_DeleteAccount_AdminBlocked(t *testing.T) {
	repo := newFakeUserRepo()
	svc := NewUserService(repo)
	ctx := context.Background()

	admin := seedUser(t, repo, "adminuser", "admin@example.com", "adminpass", models.RoleAdmin)

	err := svc.DeleteAccount(ctx, admin.UserID, "adminpass")
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "ADMIN_DELETE_FORBIDDEN", svcErr.Code)

	// Admin should still be active.
	got, err := repo.GetUserByID(ctx, admin.UserID)
	require.NoError(t, err)
	assert.Equal(t, models.UserStatusActive, got.Status)
}

func TestUserService_DeleteAccount_AlreadyDeleted(t *testing.T) {
	repo := newFakeUserRepo()
	svc := NewUserService(repo)
	ctx := context.Background()

	user := seedUser(t, repo, "alreadydel", "alreadydel@example.com", "mypass", models.RoleAthlete)

	// Delete once.
	require.NoError(t, svc.DeleteAccount(ctx, user.UserID, "mypass"))

	// Try to delete again.
	err := svc.DeleteAccount(ctx, user.UserID, "mypass")
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "ACCOUNT_DELETED", svcErr.Code)
}

func TestUserService_DeleteAccount_UserNotFound(t *testing.T) {
	repo := newFakeUserRepo()
	svc := NewUserService(repo)
	ctx := context.Background()

	err := svc.DeleteAccount(ctx, 999999, "anypass")
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "USER_NOT_FOUND", svcErr.Code)
}
