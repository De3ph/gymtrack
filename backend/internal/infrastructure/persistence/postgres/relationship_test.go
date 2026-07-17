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

func TestPostgresRelationshipRepository(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	repo := NewPostgresRelationshipRepository(pool)
	ctx := context.Background()

	// Helper: create a user for FK references
	createTestUser := func(t *testing.T, username, email string, role models.UserRole) *models.User {
		t.Helper()
		user := &models.User{
			Username: username, Email: email, PasswordHash: "hash", Role: role,
			Profile: models.UserProfile{Name: username},
		}
		_, err := pool.Exec(ctx,
			`INSERT INTO users (username, email, password_hash, role, profile) VALUES ($1,$2,$3,$4,$5) RETURNING user_id`,
			user.Username, user.Email, user.PasswordHash, string(user.Role), `{"name":"`+username+`"}`,
		)
		require.NoError(t, err)
		// Get the generated ID
		err = pool.QueryRow(ctx, `SELECT user_id FROM users WHERE email = $1`, email).Scan(&user.UserID)
		require.NoError(t, err)
		return user
	}

	trainer := createTestUser(t, "rel_trainer", "rel_trainer@test.com", models.RoleTrainer)
	athlete := createTestUser(t, "rel_athlete", "rel_athlete@test.com", models.RoleAthlete)
	athlete2 := createTestUser(t, "rel_athlete2", "rel_athlete2@test.com", models.RoleAthlete)

	t.Run("Create", func(t *testing.T) {
		rel := &models.Relationship{
			TrainerID: trainer.UserID, AthleteID: athlete.UserID,
			Status: models.RelationshipStatusPending,
		}
		err := repo.Create(ctx, rel)
		require.NoError(t, err)
		assert.NotZero(t, rel.RelationshipID)
		assert.Equal(t, "relationship", rel.Type)
	})

	t.Run("GetByID", func(t *testing.T) {
		rel := &models.Relationship{
			TrainerID: trainer.UserID, AthleteID: athlete2.UserID,
			Status: models.RelationshipStatusActive,
		}
		require.NoError(t, repo.Create(ctx, rel))

		fetched, err := repo.GetByID(ctx, rel.RelationshipID)
		require.NoError(t, err)
		assert.Equal(t, rel.RelationshipID, fetched.RelationshipID)
		assert.Equal(t, trainer.UserID, fetched.TrainerID)
		assert.Equal(t, athlete2.UserID, fetched.AthleteID)
		assert.Equal(t, models.RelationshipStatusActive, fetched.Status)
	})

	t.Run("GetByID_NotFound", func(t *testing.T) {
		_, err := repo.GetByID(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetByTrainerID", func(t *testing.T) {
		rels, err := repo.GetByTrainerID(ctx, trainer.UserID)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(rels), 2)
		for _, r := range rels {
			assert.Equal(t, trainer.UserID, r.TrainerID)
		}
	})

	t.Run("GetByAthleteID", func(t *testing.T) {
		rel, err := repo.GetByAthleteID(ctx, athlete.UserID)
		require.NoError(t, err)
		assert.Equal(t, athlete.UserID, rel.AthleteID)
	})

	t.Run("GetByAthleteID_NotFound", func(t *testing.T) {
		_, err := repo.GetByAthleteID(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetPendingByAthleteID", func(t *testing.T) {
		pending, err := repo.GetPendingByAthleteID(ctx, athlete.UserID)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(pending), 1)
		for _, r := range pending {
			assert.Equal(t, models.RelationshipStatusPending, r.Status)
			assert.Equal(t, athlete.UserID, r.AthleteID)
		}
	})

	t.Run("HasActiveRelationship", func(t *testing.T) {
		has, err := repo.HasActiveRelationship(ctx, trainer.UserID, athlete2.UserID)
		require.NoError(t, err)
		assert.True(t, has)

		has, err = repo.HasActiveRelationship(ctx, trainer.UserID, athlete.UserID)
		require.NoError(t, err)
		assert.False(t, false) // athlete's rel is pending, not active
	})

	t.Run("Update", func(t *testing.T) {
		updAthlete := createTestUser(t, "rel_upd", "rel_upd@test.com", models.RoleAthlete)
		rel := &models.Relationship{
			TrainerID: trainer.UserID, AthleteID: updAthlete.UserID,
			Status: models.RelationshipStatusPending,
		}
		require.NoError(t, repo.Create(ctx, rel))

		rel.Status = models.RelationshipStatusActive
		err := repo.Update(ctx, rel)
		require.NoError(t, err)

		fetched, err := repo.GetByID(ctx, rel.RelationshipID)
		require.NoError(t, err)
		assert.Equal(t, models.RelationshipStatusActive, fetched.Status)
	})

	t.Run("Update_NotFound", func(t *testing.T) {
		rel := &models.Relationship{
			RelationshipID: 999999, TrainerID: trainer.UserID, AthleteID: athlete.UserID,
			Status: models.RelationshipStatusActive,
		}
		err := repo.Update(ctx, rel)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("Delete", func(t *testing.T) {
		delAthlete := createTestUser(t, "rel_del", "rel_del@test.com", models.RoleAthlete)
		rel := &models.Relationship{
			TrainerID: trainer.UserID, AthleteID: delAthlete.UserID,
			Status: models.RelationshipStatusPending,
		}
		require.NoError(t, repo.Create(ctx, rel))

		err := repo.Delete(ctx, rel.RelationshipID)
		require.NoError(t, err)

		_, err = repo.GetByID(ctx, rel.RelationshipID)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("Delete_NotFound", func(t *testing.T) {
		err := repo.Delete(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})
}
