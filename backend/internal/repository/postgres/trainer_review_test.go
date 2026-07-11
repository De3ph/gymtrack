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

func TestPostgresTrainerReviewRepository(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	repo := NewPostgresTrainerReviewRepository(pool)
	ctx := context.Background()

	// Helper: create a user for FK references
	createReviewTestUser := func(t *testing.T, username string, role models.UserRole) *models.User {
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

	trainer := createReviewTestUser(t, "rev_trainer", models.RoleTrainer)
	athlete1 := createReviewTestUser(t, "rev_athlete1", models.RoleAthlete)
	athlete2 := createReviewTestUser(t, "rev_athlete2", models.RoleAthlete)

	t.Run("CreateReview", func(t *testing.T) {
		review := &models.TrainerReview{
			TrainerID: trainer.UserID, AthleteID: athlete1.UserID,
			Rating: 5, Comment: "Great trainer!",
		}
		err := repo.CreateReview(ctx, review)
		require.NoError(t, err)
		assert.NotZero(t, review.ReviewID)
		assert.Equal(t, "review", review.Type)
		assert.False(t, review.CreatedAt.IsZero())
	})

	t.Run("GetReviewByID", func(t *testing.T) {
		review := &models.TrainerReview{
			TrainerID: trainer.UserID, AthleteID: athlete2.UserID,
			Rating: 4, Comment: "Good experience",
		}
		require.NoError(t, repo.CreateReview(ctx, review))

		fetched, err := repo.GetReviewByID(ctx, review.ReviewID)
		require.NoError(t, err)
		assert.Equal(t, review.ReviewID, fetched.ReviewID)
		assert.Equal(t, 4, fetched.Rating)
		assert.Equal(t, "Good experience", fetched.Comment)
		assert.Equal(t, "review", fetched.Type)
	})

	t.Run("GetReviewByID_NotFound", func(t *testing.T) {
		_, err := repo.GetReviewByID(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetByTrainerID", func(t *testing.T) {
		reviews, err := repo.GetByTrainerID(ctx, trainer.UserID)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(reviews), 2)
		for _, r := range reviews {
			assert.Equal(t, trainer.UserID, r.TrainerID)
			assert.Equal(t, "review", r.Type)
		}
	})

	t.Run("GetByTrainerID_Empty", func(t *testing.T) {
		emptyTrainer := createReviewTestUser(t, "rev_empty_trainer", models.RoleTrainer)
		reviews, err := repo.GetByTrainerID(ctx, emptyTrainer.UserID)
		require.NoError(t, err)
		assert.Empty(t, reviews)
	})

	t.Run("GetByAthleteID", func(t *testing.T) {
		review, err := repo.GetByAthleteID(ctx, athlete1.UserID)
		require.NoError(t, err)
		assert.Equal(t, athlete1.UserID, review.AthleteID)
		assert.Equal(t, "review", review.Type)
	})

	t.Run("GetByAthleteID_NotFound", func(t *testing.T) {
		noAthlete := createReviewTestUser(t, "rev_no_review_athlete", models.RoleAthlete)
		_, err := repo.GetByAthleteID(ctx, noAthlete.UserID)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("UpdateReview", func(t *testing.T) {
		existing, err := repo.GetByAthleteID(ctx, athlete1.UserID)
		require.NoError(t, err)

		existing.Rating = 2
		existing.Comment = "Updated comment"
		err = repo.UpdateReview(ctx, existing)
		require.NoError(t, err)

		fetched, err := repo.GetReviewByID(ctx, existing.ReviewID)
		require.NoError(t, err)
		assert.Equal(t, 2, fetched.Rating)
		assert.Equal(t, "Updated comment", fetched.Comment)
	})

	t.Run("UpdateReview_NotFound", func(t *testing.T) {
		review := &models.TrainerReview{ReviewID: 999999, Rating: 1}
		err := repo.UpdateReview(ctx, review)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("DeleteReview", func(t *testing.T) {
		tmpAthlete := createReviewTestUser(t, "rev_delete_athlete", models.RoleAthlete)
		review := &models.TrainerReview{
			TrainerID: trainer.UserID, AthleteID: tmpAthlete.UserID,
			Rating: 3, Comment: "To be deleted",
		}
		require.NoError(t, repo.CreateReview(ctx, review))

		err := repo.DeleteReview(ctx, review.ReviewID)
		require.NoError(t, err)

		_, err = repo.GetReviewByID(ctx, review.ReviewID)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("DeleteReview_NotFound", func(t *testing.T) {
		err := repo.DeleteReview(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetAverageRating", func(t *testing.T) {
		avg, count, err := repo.GetAverageRating(ctx, trainer.UserID)
		require.NoError(t, err)
		assert.Greater(t, avg, 0.0)
		assert.GreaterOrEqual(t, count, 2)
	})

	t.Run("GetAverageRating_NoReviews", func(t *testing.T) {
		noReviewTrainer := createReviewTestUser(t, "rev_no_reviews_trainer", models.RoleTrainer)
		avg, count, err := repo.GetAverageRating(ctx, noReviewTrainer.UserID)
		require.NoError(t, err)
		assert.Equal(t, 0.0, avg)
		assert.Equal(t, 0, count)
	})

	t.Run("GetRatingsForTrainers", func(t *testing.T) {
		noReviewTrainer := createReviewTestUser(t, "rev_batch_trainer", models.RoleTrainer)
		ratings, err := repo.GetRatingsForTrainers(ctx, []int{trainer.UserID, noReviewTrainer.UserID})
		require.NoError(t, err)
		assert.Len(t, ratings, 2)
		assert.Greater(t, ratings[trainer.UserID].Avg, 0.0)
		assert.Equal(t, 0.0, ratings[noReviewTrainer.UserID].Avg)
		assert.Equal(t, 0, ratings[noReviewTrainer.UserID].Count)
	})

	t.Run("GetRatingsForTrainers_Empty", func(t *testing.T) {
		ratings, err := repo.GetRatingsForTrainers(ctx, []int{})
		require.NoError(t, err)
		assert.Empty(t, ratings)
	})
}
