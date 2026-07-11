package postgres

import (
	"context"
	"testing"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/testutils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPostgresUserRepository(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	repo := NewPostgresUserRepository(pool)
	ctx := context.Background()

	t.Run("CreateUser", func(t *testing.T) {
		user := &models.User{
			Username:     "testuser",
			Email:        "test@example.com",
			PasswordHash: "hashedpassword123",
			Role:         models.RoleAthlete,
			Profile: models.UserProfile{
				Name: "Test User",
				Age:  25,
			},
		}

		err := repo.CreateUser(ctx, user)
		require.NoError(t, err)
		assert.NotZero(t, user.UserID, "user ID should be set after creation")
		assert.Equal(t, "user", user.Type)
		assert.False(t, user.CreatedAt.IsZero())
		assert.False(t, user.UpdatedAt.IsZero())
	})

	t.Run("GetUserByID", func(t *testing.T) {
		user := &models.User{
			Username:     "getbyid_user",
			Email:        "getbyid@example.com",
			PasswordHash: "hashedpassword",
			Role:         models.RoleTrainer,
			Profile: models.UserProfile{
				Name:              "Get By ID User",
				Bio:               "Experienced trainer",
				HourlyRate:        50.0,
				YearsOfExperience: 5,
			},
		}
		err := repo.CreateUser(ctx, user)
		require.NoError(t, err)

		fetched, err := repo.GetUserByID(ctx, user.UserID)
		require.NoError(t, err)
		assert.Equal(t, user.UserID, fetched.UserID)
		assert.Equal(t, "getbyid_user", fetched.Username)
		assert.Equal(t, "getbyid@example.com", fetched.Email)
		assert.Equal(t, models.RoleTrainer, fetched.Role)
		assert.Equal(t, "Get By ID User", fetched.Profile.Name)
		assert.Equal(t, "Experienced trainer", fetched.Profile.Bio)
		assert.Equal(t, 50.0, fetched.Profile.HourlyRate)
		assert.Equal(t, "user", fetched.Type)
	})

	t.Run("GetUserByID_NotFound", func(t *testing.T) {
		_, err := repo.GetUserByID(ctx, 999999)
		require.Error(t, err)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetUserByEmail", func(t *testing.T) {
		user := &models.User{
			Username:     "emailuser",
			Email:        "email_test@example.com",
			PasswordHash: "hashedpassword",
			Role:         models.RoleAthlete,
			Profile:      models.UserProfile{Name: "Email User"},
		}
		err := repo.CreateUser(ctx, user)
		require.NoError(t, err)

		fetched, err := repo.GetUserByEmail(ctx, "email_test@example.com")
		require.NoError(t, err)
		assert.Equal(t, user.UserID, fetched.UserID)
		assert.Equal(t, "emailuser", fetched.Username)
		assert.Equal(t, "Email User", fetched.Profile.Name)
	})

	t.Run("GetUserByEmail_NotFound", func(t *testing.T) {
		_, err := repo.GetUserByEmail(ctx, "nonexistent@example.com")
		require.Error(t, err)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetUserByUsername", func(t *testing.T) {
		user := &models.User{
			Username:     "UniqueUsername",
			Email:        "username_test@example.com",
			PasswordHash: "hashedpassword",
			Role:         models.RoleTrainer,
			Profile:      models.UserProfile{Name: "Username User"},
		}
		err := repo.CreateUser(ctx, user)
		require.NoError(t, err)

		fetched, err := repo.GetUserByUsername(ctx, "uniqueusername")
		require.NoError(t, err)
		assert.Equal(t, user.UserID, fetched.UserID)
		assert.Equal(t, "UniqueUsername", fetched.Username)
	})

	t.Run("GetUserByUsername_NotFound", func(t *testing.T) {
		_, err := repo.GetUserByUsername(ctx, "nonexistent_user")
		require.Error(t, err)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetAllUsers", func(t *testing.T) {
		users, err := repo.GetAllUsers(ctx)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(users), 5, "should have at least 5 users from previous tests")

		for _, u := range users {
			assert.Equal(t, "user", u.Type)
			assert.NotZero(t, u.UserID)
			assert.NotEmpty(t, u.Username)
			assert.NotEmpty(t, u.Email)
		}
	})

	t.Run("UpdateUser", func(t *testing.T) {
		user := &models.User{
			Username:     "updateuser",
			Email:        "update@example.com",
			PasswordHash: "hashedpassword",
			Role:         models.RoleAthlete,
			Profile:      models.UserProfile{Name: "Original Name", Age: 20},
		}
		err := repo.CreateUser(ctx, user)
		require.NoError(t, err)
		originalUpdatedAt := user.UpdatedAt

		user.Profile.Name = "Updated Name"
		user.Profile.Age = 25
		user.Email = "updated@example.com"

		err = repo.UpdateUser(ctx, user)
		require.NoError(t, err)
		assert.True(t, user.UpdatedAt.After(originalUpdatedAt))

		fetched, err := repo.GetUserByID(ctx, user.UserID)
		require.NoError(t, err)
		assert.Equal(t, "Updated Name", fetched.Profile.Name)
		assert.Equal(t, 25, fetched.Profile.Age)
		assert.Equal(t, "updated@example.com", fetched.Email)
	})

	t.Run("UpdateUser_NotFound", func(t *testing.T) {
		user := &models.User{
			UserID:       999999,
			Username:     "ghost",
			Email:        "ghost@example.com",
			PasswordHash: "hash",
			Role:         models.RoleAthlete,
		}
		err := repo.UpdateUser(ctx, user)
		require.Error(t, err)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("CreateUser_DuplicateEmail", func(t *testing.T) {
		user1 := &models.User{
			Username: "dup_email_1", Email: "dup@example.com",
			PasswordHash: "hash", Role: models.RoleAthlete,
			Profile: models.UserProfile{Name: "Dup 1"},
		}
		require.NoError(t, repo.CreateUser(ctx, user1))

		user2 := &models.User{
			Username: "dup_email_2", Email: "dup@example.com",
			PasswordHash: "hash", Role: models.RoleAthlete,
			Profile: models.UserProfile{Name: "Dup 2"},
		}
		err := repo.CreateUser(ctx, user2)
		require.Error(t, err, "should fail on duplicate email")
	})

	t.Run("CreateUser_DuplicateUsername", func(t *testing.T) {
		user1 := &models.User{
			Username: "dup_user_name", Email: "dup_user_1@example.com",
			PasswordHash: "hash", Role: models.RoleAthlete,
			Profile: models.UserProfile{Name: "Dup Username 1"},
		}
		require.NoError(t, repo.CreateUser(ctx, user1))

		user2 := &models.User{
			Username: "dup_user_name", Email: "dup_user_2@example.com",
			PasswordHash: "hash", Role: models.RoleAthlete,
			Profile: models.UserProfile{Name: "Dup Username 2"},
		}
		err := repo.CreateUser(ctx, user2)
		require.Error(t, err, "should fail on duplicate username")
	})

	t.Run("JSONB_Profile_RoundTrip", func(t *testing.T) {
		user := &models.User{
			Username: "jsonb_user", Email: "jsonb@example.com",
			PasswordHash: "hash", Role: models.RoleTrainer,
			Profile: models.UserProfile{
				Name: "JSONB Test", Bio: "Full bio",
				ProfilePhotoURL: "https://example.com/photo.jpg",
				HourlyRate: 75.50, YearsOfExperience: 10,
				Location: "New York", IsAvailableForNewClients: true,
				Languages: []string{"English", "Spanish"},
				Certifications: "NASM, ACE", Specializations: "Strength, HIIT",
				ClientList: []int{1, 2, 3},
			},
		}
		require.NoError(t, repo.CreateUser(ctx, user))

		fetched, err := repo.GetUserByID(ctx, user.UserID)
		require.NoError(t, err)

		assert.Equal(t, "JSONB Test", fetched.Profile.Name)
		assert.Equal(t, 75.50, fetched.Profile.HourlyRate)
		assert.Equal(t, 10, fetched.Profile.YearsOfExperience)
		assert.True(t, fetched.Profile.IsAvailableForNewClients)
		assert.Equal(t, []string{"English", "Spanish"}, fetched.Profile.Languages)
		assert.Equal(t, []int{1, 2, 3}, fetched.Profile.ClientList)
	})
}
