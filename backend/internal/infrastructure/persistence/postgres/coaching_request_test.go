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

func TestPostgresCoachingRequestRepository(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	repo := NewPostgresCoachingRequestRepository(pool)
	ctx := context.Background()

	// Helper: create a user for FK references
	createCRTestUser := func(t *testing.T, username string, role models.UserRole) *models.User {
		t.Helper()
		user := &models.User{
			Username: username, Email: username + "@test.com", PasswordHash: "hash", Role: role,
			Profile: models.UserProfile{Name: username},
		}
		err := pool.QueryRow(ctx,
			`INSERT INTO users (username, email, password_hash, role, profile) VALUES ($1,$2,$3,$4,$5) RETURNING user_id`,
			user.Username, user.Email, user.PasswordHash, string(user.Role), `{"name":"`+username+`"}`,
		).Scan(&user.UserID)
		require.NoError(t, err)
		return user
	}

	trainer := createCRTestUser(t, "cr_trainer", models.RoleTrainer)
	athlete := createCRTestUser(t, "cr_athlete", models.RoleAthlete)
	athlete2 := createCRTestUser(t, "cr_athlete2", models.RoleAthlete)

	t.Run("Create", func(t *testing.T) {
		req := &models.CoachingRequest{
			AthleteID: athlete.UserID, TrainerID: trainer.UserID,
			Message: "Please train me", Status: models.CoachingRequestStatusPending,
		}
		err := repo.Create(ctx, req)
		require.NoError(t, err)
		assert.NotZero(t, req.RequestID)
		assert.Equal(t, "coaching_request", req.Type)
	})

	t.Run("GetByID", func(t *testing.T) {
		req := &models.CoachingRequest{
			AthleteID: athlete2.UserID, TrainerID: trainer.UserID,
			Message: "I need help", Status: models.CoachingRequestStatusPending,
		}
		require.NoError(t, repo.Create(ctx, req))

		fetched, err := repo.GetByID(ctx, req.RequestID)
		require.NoError(t, err)
		assert.Equal(t, req.RequestID, fetched.RequestID)
		assert.Equal(t, "I need help", fetched.Message)
		assert.Equal(t, models.CoachingRequestStatusPending, fetched.Status)
	})

	t.Run("GetByID_NotFound", func(t *testing.T) {
		_, err := repo.GetByID(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetByAthleteID", func(t *testing.T) {
		reqs, err := repo.GetByAthleteID(ctx, athlete.UserID)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(reqs), 1)
		for _, r := range reqs {
			assert.Equal(t, athlete.UserID, r.AthleteID)
		}
	})

	t.Run("GetByTrainerID", func(t *testing.T) {
		reqs, err := repo.GetByTrainerID(ctx, trainer.UserID)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(reqs), 2)
		for _, r := range reqs {
			assert.Equal(t, trainer.UserID, r.TrainerID)
		}
	})

	t.Run("GetPendingByTrainerID", func(t *testing.T) {
		pending, err := repo.GetPendingByTrainerID(ctx, trainer.UserID)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(pending), 2)
		for _, r := range pending {
			assert.Equal(t, models.CoachingRequestStatusPending, r.Status)
		}
	})

	t.Run("GetPendingByTrainerID_AfterAccept", func(t *testing.T) {
		// Accept one request, verify it leaves pending list
		reqs, err := repo.GetPendingByTrainerID(ctx, trainer.UserID)
		require.NoError(t, err)
		require.GreaterOrEqual(t, len(reqs), 1)

		reqs[0].Status = models.CoachingRequestStatusAccepted
		require.NoError(t, repo.Update(ctx, reqs[0]))

		pending, err := repo.GetPendingByTrainerID(ctx, trainer.UserID)
		require.NoError(t, err)
		for _, r := range pending {
			assert.NotEqual(t, reqs[0].RequestID, r.RequestID, "accepted request should not be pending")
		}
	})

	t.Run("Update", func(t *testing.T) {
		req := &models.CoachingRequest{
			AthleteID: athlete.UserID, TrainerID: trainer.UserID,
			Message: "Original", Status: models.CoachingRequestStatusPending,
		}
		require.NoError(t, repo.Create(ctx, req))

		req.Message = "Updated message"
		req.Status = models.CoachingRequestStatusAccepted
		err := repo.Update(ctx, req)
		require.NoError(t, err)

		fetched, err := repo.GetByID(ctx, req.RequestID)
		require.NoError(t, err)
		assert.Equal(t, "Updated message", fetched.Message)
		assert.Equal(t, models.CoachingRequestStatusAccepted, fetched.Status)
	})

	t.Run("Update_NotFound", func(t *testing.T) {
		req := &models.CoachingRequest{
			RequestID: 999999, AthleteID: athlete.UserID, TrainerID: trainer.UserID,
			Status: models.CoachingRequestStatusPending,
		}
		err := repo.Update(ctx, req)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("Delete", func(t *testing.T) {
		req := &models.CoachingRequest{
			AthleteID: athlete.UserID, TrainerID: trainer.UserID,
			Message: "To delete", Status: models.CoachingRequestStatusPending,
		}
		require.NoError(t, repo.Create(ctx, req))

		err := repo.Delete(ctx, req.RequestID)
		require.NoError(t, err)

		_, err = repo.GetByID(ctx, req.RequestID)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("Delete_NotFound", func(t *testing.T) {
		err := repo.Delete(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})
}
