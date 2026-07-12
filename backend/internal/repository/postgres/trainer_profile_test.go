package postgres

import (
	"context"
	"encoding/json"
	"testing"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	repositories "gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/testutils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPostgresTrainerProfileRepository(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	repo := NewPostgresTrainerProfileRepository(pool)
	reviewRepo := NewPostgresTrainerReviewRepository(pool)
	ctx := context.Background()

	createTrainerUser := func(t *testing.T, username string, profile models.UserProfile) *models.User {
		t.Helper()
		profileJSON, err := json.Marshal(profile)
		require.NoError(t, err)
		var userID int
		err = pool.QueryRow(ctx,
			`INSERT INTO users (username, email, password_hash, role, profile) VALUES ($1,$2,$3,$4,$5) RETURNING user_id`,
			username, username+"@test.com", "hash", "trainer", profileJSON,
		).Scan(&userID)
		require.NoError(t, err)
		return &models.User{
			UserID: userID, Username: username, Email: username + "@test.com",
			PasswordHash: "hash", Role: models.RoleTrainer, Profile: profile,
		}
	}

	createAthleteUser := func(t *testing.T, username string) *models.User {
		t.Helper()
		var userID int
		err := pool.QueryRow(ctx,
			`INSERT INTO users (username, email, password_hash, role, profile) VALUES ($1,$2,$3,$4,$5) RETURNING user_id`,
			username, username+"@test.com", "hash", "athlete", `{"name":"`+username+`"}`,
		).Scan(&userID)
		require.NoError(t, err)
		return &models.User{UserID: userID, Username: username, Role: models.RoleAthlete}
	}

	// Create trainers with profiles
	trainer1 := createTrainerUser(t, "tp_trainer1", models.UserProfile{
		Name: "John Trainer", Bio: "Expert in strength training",
		Specializations: "Strength,HIIT", Location: "New York",
		HourlyRate: 75.0, YearsOfExperience: 8,
		IsAvailableForNewClients: true, Languages: []string{"English", "Spanish"},
	})
	trainer2 := createTrainerUser(t, "tp_trainer2", models.UserProfile{
		Name: "Jane Trainer", Bio: "Yoga specialist",
		Specializations: "Yoga,Flexibility", Location: "Los Angeles",
		HourlyRate: 60.0, YearsOfExperience: 5,
		IsAvailableForNewClients: false, Languages: []string{"English"},
	})

	// Create athletes and reviews for trainer1
	athlete1 := createAthleteUser(t, "tp_athlete1")
	athlete2 := createAthleteUser(t, "tp_athlete2")
	require.NoError(t, reviewRepo.CreateReview(ctx, &models.TrainerReview{
		TrainerID: trainer1.UserID, AthleteID: athlete1.UserID, Rating: 5, Comment: "Excellent!",
	}))
	require.NoError(t, reviewRepo.CreateReview(ctx, &models.TrainerReview{
		TrainerID: trainer1.UserID, AthleteID: athlete2.UserID, Rating: 4,
	}))

	t.Run("GetPublicTrainers", func(t *testing.T) {
		trainers, err := repo.GetPublicTrainers(ctx, nil, 10, 0)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(trainers), 2)

		for _, tr := range trainers {
			if tr.UserID == trainer1.UserID {
				assert.Equal(t, "John Trainer", tr.User.Profile.Name)
				assert.Equal(t, "Expert in strength training", tr.Profile.Bio)
				assert.Equal(t, 75.0, tr.Profile.HourlyRate)
				assert.Equal(t, 8, tr.Profile.YearsOfExperience)
				assert.True(t, tr.Profile.IsAvailableForNewClients)
				assert.Equal(t, []string{"English", "Spanish"}, tr.Profile.Languages)
				assert.Greater(t, tr.AverageRating, 0.0)
				assert.Equal(t, 2, tr.ReviewCount)
				assert.Equal(t, "user", tr.Type)
			}
		}
	})

	t.Run("GetPublicTrainers_WithFilters", func(t *testing.T) {
		// Filter by location
		filters := &repositories.TrainerFilters{Location: "New York"}
		trainers, err := repo.GetPublicTrainers(ctx, filters, 10, 0)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(trainers), 1)
		for _, tr := range trainers {
			assert.Equal(t, trainer1.UserID, tr.UserID)
		}

		// Filter by available
		available := true
		filters = &repositories.TrainerFilters{AvailableForNewClients: &available}
		trainers, err = repo.GetPublicTrainers(ctx, filters, 10, 0)
		require.NoError(t, err)
		for _, tr := range trainers {
			assert.True(t, tr.Profile.IsAvailableForNewClients)
		}

		// Filter by specialization
		filters = &repositories.TrainerFilters{Specialization: "Yoga"}
		trainers, err = repo.GetPublicTrainers(ctx, filters, 10, 0)
		require.NoError(t, err)
		require.GreaterOrEqual(t, len(trainers), 1)
		assert.Equal(t, trainer2.UserID, trainers[0].UserID)

		// Filter by min rating
		filters = &repositories.TrainerFilters{MinRating: 4.0}
		trainers, err = repo.GetPublicTrainers(ctx, filters, 10, 0)
		require.NoError(t, err)
		require.GreaterOrEqual(t, len(trainers), 1)
		assert.Equal(t, trainer1.UserID, trainers[0].UserID)
	})

	t.Run("GetPublicTrainers_LimitOffset", func(t *testing.T) {
		trainers, err := repo.GetPublicTrainers(ctx, nil, 1, 0)
		require.NoError(t, err)
		assert.Len(t, trainers, 1)
	})

	t.Run("GetTrainerByID", func(t *testing.T) {
		trainer, err := repo.GetTrainerByID(ctx, trainer1.UserID)
		require.NoError(t, err)
		require.NotNil(t, trainer)
		assert.Equal(t, trainer1.UserID, trainer.UserID)
		assert.Equal(t, "tp_trainer1", trainer.Username)
		assert.Equal(t, "John Trainer", trainer.User.Profile.Name)
		assert.Equal(t, "Expert in strength training", trainer.Profile.Bio)
		assert.Equal(t, "user", trainer.Type)
		assert.Greater(t, trainer.AverageRating, 0.0)
		assert.Equal(t, 2, trainer.ReviewCount)
	})

	t.Run("GetTrainerByID_NotFound", func(t *testing.T) {
		trainer, err := repo.GetTrainerByID(ctx, 999999)
		require.NoError(t, err)
		assert.Nil(t, trainer)
	})

	t.Run("UpdateTrainerProfile", func(t *testing.T) {
		newProfile := &models.TrainerProfile{
			Bio: "Updated bio", ProfilePhotoURL: "https://example.com/photo.jpg",
			HourlyRate: 100.0, YearsOfExperience: 12,
			IsAvailableForNewClients: false, Location: "Chicago",
			Languages: []string{"English", "French"},
		}
		err := repo.UpdateTrainerProfile(ctx, trainer1.UserID, newProfile)
		require.NoError(t, err)

		// Verify update
		trainer, err := repo.GetTrainerByID(ctx, trainer1.UserID)
		require.NoError(t, err)
		require.NotNil(t, trainer)
		assert.Equal(t, "Updated bio", trainer.Profile.Bio)
		assert.Equal(t, "https://example.com/photo.jpg", trainer.Profile.ProfilePhotoURL)
		assert.Equal(t, 100.0, trainer.Profile.HourlyRate)
		assert.Equal(t, 12, trainer.Profile.YearsOfExperience)
		assert.False(t, trainer.Profile.IsAvailableForNewClients)
		assert.Equal(t, "Chicago", trainer.Profile.Location)
		assert.Equal(t, []string{"English", "French"}, trainer.Profile.Languages)

		// Restore trainer1 profile for subsequent tests
		require.NoError(t, repo.UpdateTrainerProfile(ctx, trainer1.UserID, &models.TrainerProfile{
			Bio: "Expert in strength training", Location: "New York",
			HourlyRate: 75.0, YearsOfExperience: 8,
			IsAvailableForNewClients: true, Languages: []string{"English", "Spanish"},
		}))
	})

	t.Run("UpdateTrainerProfile_NotFound", func(t *testing.T) {
		err := repo.UpdateTrainerProfile(ctx, 999999, &models.TrainerProfile{Bio: "test"})
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("SearchTrainers", func(t *testing.T) {
		// Search by name
		trainers, err := repo.SearchTrainers(ctx, "John", nil, 10, 0)
		require.NoError(t, err)
		require.GreaterOrEqual(t, len(trainers), 1)
		assert.Equal(t, trainer1.UserID, trainers[0].UserID)

		// Search by username
		trainers, err = repo.SearchTrainers(ctx, "tp_trainer2", nil, 10, 0)
		require.NoError(t, err)
		require.GreaterOrEqual(t, len(trainers), 1)
		assert.Equal(t, trainer2.UserID, trainers[0].UserID)
	})

	t.Run("SearchTrainers_NoResults", func(t *testing.T) {
		trainers, err := repo.SearchTrainers(ctx, "nonexistent_xyz_999", nil, 10, 0)
		require.NoError(t, err)
		assert.Empty(t, trainers)
	})

	t.Run("CountTrainers", func(t *testing.T) {
		count, err := repo.CountTrainers(ctx, nil)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, count, 2)
	})

	t.Run("CountTrainers_WithFilters", func(t *testing.T) {
		filters := &repositories.TrainerFilters{Location: "Los Angeles"}
		count, err := repo.CountTrainers(ctx, filters)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, count, 1)
	})
}
