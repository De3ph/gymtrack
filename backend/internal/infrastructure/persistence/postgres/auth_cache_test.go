package postgres

import (
	"context"
	"testing"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/infrastructure/cache"
	"gymtrack-backend/internal/testutils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// countingUserRepo wraps a UserRepository and counts how many times
// GetUserByID delegates to the inner implementation.
type countingUserRepo struct {
	inner     repositories.UserRepository
	callCount int
}

func (c *countingUserRepo) GetUserByID(ctx context.Context, userID int) (*models.User, error) {
	c.callCount++
	return c.inner.GetUserByID(ctx, userID)
}
func (c *countingUserRepo) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	return c.inner.GetUserByEmail(ctx, email)
}
func (c *countingUserRepo) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	return c.inner.GetUserByUsername(ctx, username)
}
func (c *countingUserRepo) CreateUser(ctx context.Context, user *models.User) error {
	return c.inner.CreateUser(ctx, user)
}
func (c *countingUserRepo) UpdateUser(ctx context.Context, user *models.User) error {
	return c.inner.UpdateUser(ctx, user)
}
func (c *countingUserRepo) GetAllUsers(ctx context.Context) ([]*models.User, error) {
	return c.inner.GetAllUsers(ctx)
}
func (c *countingUserRepo) GetAllUsersFiltered(ctx context.Context, role string, search string, limit, offset int) ([]*models.User, error) {
	return c.inner.GetAllUsersFiltered(ctx, role, search, limit, offset)
}
func (c *countingUserRepo) CountUsers(ctx context.Context, role string, search string) (int, error) {
	return c.inner.CountUsers(ctx, role, search)
}

func TestCachedUserRepository_AuthCacheHit(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	ctx := context.Background()

	// Seed a test user.
	innerRepo := NewPostgresUserRepository(pool)
	user := &models.User{
		Username:     "cache_test_user",
		Email:        "cache_test_user@example.com",
		PasswordHash: "hashedpassword",
		Role:         models.RoleAthlete,
		Profile:      models.UserProfile{Name: "Cache Test"},
	}
	err := innerRepo.CreateUser(ctx, user)
	require.NoError(t, err)
	userID := user.UserID

	// Wrap with cache — short TTL so test is self-contained.
	gc := cache.NewGoCache[*models.User](5*time.Minute, 1*time.Minute, nil)
	countingWrapper := &countingUserRepo{inner: innerRepo}
	cachedRepo := NewCachedUserRepository(countingWrapper, gc)

	// First call — cache miss, inner repo called once.
	fetched1, err := cachedRepo.GetUserByID(ctx, userID)
	require.NoError(t, err)
	assert.Equal(t, userID, fetched1.UserID)
	assert.Equal(t, 1, countingWrapper.callCount, "first call should hit inner repo")

	// Second call — cache hit, inner repo NOT called again.
	fetched2, err := cachedRepo.GetUserByID(ctx, userID)
	require.NoError(t, err)
	assert.Equal(t, userID, fetched2.UserID)
	assert.Equal(t, 1, countingWrapper.callCount, "second call should hit cache, not inner repo")
}

func TestCachedUserRepository_DeepCopyIsolation(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	ctx := context.Background()

	innerRepo := NewPostgresUserRepository(pool)
	user := &models.User{
		Username:     "deep_copy_user",
		Email:        "deep_copy_user@example.com",
		PasswordHash: "hashedpassword",
		Role:         models.RoleAthlete,
		Profile:      models.UserProfile{Name: "Deep Copy Test"},
	}
	err := innerRepo.CreateUser(ctx, user)
	require.NoError(t, err)
	userID := user.UserID

	gc := cache.NewGoCache[*models.User](5*time.Minute, 1*time.Minute, nil)
	cachedRepo := NewCachedUserRepository(innerRepo, gc)

	fetched1, err := cachedRepo.GetUserByID(ctx, userID)
	require.NoError(t, err)

	fetched1.Profile.Name = "MUTATED"

	fetched2, err := cachedRepo.GetUserByID(ctx, userID)
	require.NoError(t, err)
	assert.Equal(t, "Deep Copy Test", fetched2.Profile.Name, "mutating fetched copy must not affect cache")
}
