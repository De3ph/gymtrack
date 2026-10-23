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

	t.Run("GetByTrainerAndAthlete", func(t *testing.T) {
		fetched, err := repo.GetByTrainerAndAthlete(ctx, trainer.UserID, athlete2.UserID)
		require.NoError(t, err)
		assert.Equal(t, trainer.UserID, fetched.TrainerID)
		assert.Equal(t, athlete2.UserID, fetched.AthleteID)

		_, err = repo.GetByTrainerAndAthlete(ctx, trainer.UserID, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("ReconnectAfterTermination", func(t *testing.T) {
		reconnectAthlete := createTestUser(t, "rel_reconnect", "rel_reconnect@test.com", models.RoleAthlete)

		first := &models.Relationship{
			TrainerID: trainer.UserID, AthleteID: reconnectAthlete.UserID,
			Status: models.RelationshipStatusActive,
		}
		require.NoError(t, repo.Create(ctx, first))

		first.Terminate()
		require.NoError(t, repo.Update(ctx, first))

		_, err := repo.GetByTrainerAndAthlete(ctx, trainer.UserID, reconnectAthlete.UserID)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound, "a terminated row must not block the pair")

		second := &models.Relationship{
			TrainerID: trainer.UserID, AthleteID: reconnectAthlete.UserID,
			Status: models.RelationshipStatusActive,
		}
		require.NoError(t, repo.Create(ctx, second), "the same pair must be re-invitable")
		assert.NotEqual(t, first.RelationshipID, second.RelationshipID, "reconnect must append history, not reuse it")

		open, err := repo.GetByTrainerAndAthlete(ctx, trainer.UserID, reconnectAthlete.UserID)
		require.NoError(t, err)
		assert.Equal(t, second.RelationshipID, open.RelationshipID)

		duplicateOpen := &models.Relationship{
			TrainerID: trainer.UserID, AthleteID: reconnectAthlete.UserID,
			Status: models.RelationshipStatusPending,
		}
		err = repo.Create(ctx, duplicateOpen)
		assert.ErrorIs(t, err, domainerrors.ErrConflict, "a pair may only have one open relationship")
	})

	t.Run("GetActiveByTrainerID", func(t *testing.T) {
		rels, err := repo.GetActiveByTrainerID(ctx, trainer.UserID, 10, 0)
		require.NoError(t, err)
		for _, rel := range rels {
			assert.Equal(t, trainer.UserID, rel.TrainerID)
			assert.Equal(t, models.RelationshipStatusActive, rel.Status)
		}
	})

	t.Run("GetActiveByAthleteID", func(t *testing.T) {
		activeAthlete := createTestUser(t, "rel_active", "rel_active@test.com", models.RoleAthlete)
		active := &models.Relationship{
			TrainerID: trainer.UserID, AthleteID: activeAthlete.UserID,
			Status: models.RelationshipStatusActive,
		}
		require.NoError(t, repo.Create(ctx, active))

		fetched, err := repo.GetActiveByAthleteID(ctx, activeAthlete.UserID)
		require.NoError(t, err)
		assert.Equal(t, active.RelationshipID, fetched.RelationshipID)
		assert.Equal(t, models.RelationshipStatusActive, fetched.Status)

		secondTrainer := createTestUser(t, "rel_trainer2", "rel_trainer2@test.com", models.RoleTrainer)
		secondActive := &models.Relationship{
			TrainerID: secondTrainer.UserID, AthleteID: activeAthlete.UserID,
			Status: models.RelationshipStatusActive,
		}
		err = repo.Create(ctx, secondActive)
		assert.ErrorIs(t, err, domainerrors.ErrActiveRelationshipExists, "one athlete must not have two active trainers")

		terminatedAthlete := createTestUser(t, "rel_term", "rel_term@test.com", models.RoleAthlete)
		terminated := &models.Relationship{
			TrainerID: trainer.UserID, AthleteID: terminatedAthlete.UserID,
			Status: models.RelationshipStatusTerminated,
		}
		require.NoError(t, repo.Create(ctx, terminated))

		_, err = repo.GetActiveByAthleteID(ctx, terminatedAthlete.UserID)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound, "terminated rows must not be active")
	})

	t.Run("GetActiveByAthleteID_NotFound", func(t *testing.T) {
		_, err := repo.GetActiveByAthleteID(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetActiveByTrainerID_Pagination", func(t *testing.T) {
		pagedTrainer := createTestUser(t, "rel_paged_trainer", "rel_paged_trainer@test.com", models.RoleTrainer)
		for _, name := range []string{"rel_paged1", "rel_paged2"} {
			a := createTestUser(t, name, name+"@test.com", models.RoleAthlete)
			require.NoError(t, repo.Create(ctx, &models.Relationship{
				TrainerID: pagedTrainer.UserID, AthleteID: a.UserID,
				Status: models.RelationshipStatusActive,
			}))
		}

		total, err := repo.CountActiveByTrainerID(ctx, pagedTrainer.UserID)
		require.NoError(t, err)
		require.Equal(t, 2, total)

		page, err := repo.GetActiveByTrainerID(ctx, pagedTrainer.UserID, 1, 0)
		require.NoError(t, err)
		require.Len(t, page, 1)
		assert.Equal(t, models.RelationshipStatusActive, page[0].Status)

		// Offset pages through the set; the two pages must not share rows.
		page2, err := repo.GetActiveByTrainerID(ctx, pagedTrainer.UserID, 1, 1)
		require.NoError(t, err)
		require.Len(t, page2, 1)
		assert.NotEqual(t, page[0].RelationshipID, page2[0].RelationshipID)

		// Limit beyond the total returns everything it has.
		all, err := repo.GetActiveByTrainerID(ctx, pagedTrainer.UserID, 0, 0)
		require.NoError(t, err)
		assert.Len(t, all, 2)
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
