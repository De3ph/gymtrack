package postgres

import (
	"context"
	"errors"
	"testing"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/testutils"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createTransactionTestUser(t *testing.T, pool *pgxpool.Pool, username, email string, role models.UserRole) *models.User {
	t.Helper()

	var userID int
	err := pool.QueryRow(context.Background(),
		`INSERT INTO users (username, email, password_hash, role, profile)
		 VALUES ($1, $2, 'hash', $3, $4) RETURNING user_id`,
		username, email, string(role), `{"name":"`+username+`"}`,
	).Scan(&userID)
	require.NoError(t, err)

	return &models.User{UserID: userID, Username: username, Email: email, Role: role}
}

func TestPostgresTransactionManager_RollsBackWritesFromEveryRepository(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	ctx := context.Background()
	users := NewPostgresUserRepository(pool)
	relationships := NewPostgresRelationshipRepository(pool)
	transactions := NewPostgresTransactionManager(pool)

	trainer := createTransactionTestUser(t, pool, "tx_trainer", "tx_trainer@test.com", models.RoleTrainer)
	athlete := createTransactionTestUser(t, pool, "tx_athlete", "tx_athlete@test.com", models.RoleAthlete)

	failure := errors.New("abort after both writes")

	err := transactions.WithinTransaction(ctx, func(txCtx context.Context) error {
		relationship := &models.Relationship{
			TrainerID: trainer.UserID,
			AthleteID: athlete.UserID,
			Status:    models.RelationshipStatusActive,
		}
		if err := relationships.Create(txCtx, relationship); err != nil {
			return err
		}

		loaded, err := users.GetUserByID(txCtx, athlete.UserID)
		if err != nil {
			return err
		}
		loaded.Profile.TrainerAssignment = trainer.UserID
		if err := users.UpdateUser(txCtx, loaded); err != nil {
			return err
		}

		return failure
	})
	require.ErrorIs(t, err, failure)

	var relationshipCount int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM relationships WHERE athlete_id = $1`, athlete.UserID,
	).Scan(&relationshipCount))
	assert.Zero(t, relationshipCount, "the relationship insert must be rolled back")

	reloaded, err := users.GetUserByID(ctx, athlete.UserID)
	require.NoError(t, err)
	assert.Zero(t, reloaded.Profile.TrainerAssignment,
		"the profile projection must be rolled back with the relationship")
}

func TestPostgresTransactionManager_CommitsJoinedUnitOfWork(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	ctx := context.Background()
	users := NewPostgresUserRepository(pool)
	relationships := NewPostgresRelationshipRepository(pool)
	transactions := NewPostgresTransactionManager(pool)

	trainer := createTransactionTestUser(t, pool, "tx_commit_trainer", "tx_commit_trainer@test.com", models.RoleTrainer)
	athlete := createTransactionTestUser(t, pool, "tx_commit_athlete", "tx_commit_athlete@test.com", models.RoleAthlete)

	err := transactions.WithinTransaction(ctx, func(txCtx context.Context) error {
		// A joined call must not open (or commit) a second transaction.
		if err := transactions.WithinTransaction(txCtx, func(context.Context) error {
			return nil
		}); err != nil {
			return err
		}

		created := &models.Relationship{
			TrainerID: trainer.UserID,
			AthleteID: athlete.UserID,
			Status:    models.RelationshipStatusActive,
		}
		if err := relationships.Create(txCtx, created); err != nil {
			return err
		}

		loaded, err := users.GetUserByID(txCtx, athlete.UserID)
		if err != nil {
			return err
		}
		loaded.Profile.TrainerAssignment = trainer.UserID
		return users.UpdateUser(txCtx, loaded)
	})
	require.NoError(t, err)

	reloaded, err := users.GetUserByID(ctx, athlete.UserID)
	require.NoError(t, err)
	assert.Equal(t, trainer.UserID, reloaded.Profile.TrainerAssignment)

	relationship, err := relationships.GetActiveByAthleteID(ctx, athlete.UserID)
	require.NoError(t, err)
	assert.Equal(t, trainer.UserID, relationship.TrainerID)
}

func TestAfterTransaction_DefersWhenTransactionIsOpen(t *testing.T) {
	ran := false
	afterTransaction(context.Background(), func() { ran = true })
	assert.True(t, ran, "outside a transaction the hook runs immediately")

	ran = false
	state := &transactionState{}
	ctx := context.WithValue(context.Background(), transactionContextKey{}, state)
	afterTransaction(ctx, func() { ran = true })

	assert.False(t, ran, "inside a transaction the hook must wait for the commit")
	require.Len(t, state.afterCommit, 1)

	state.afterCommit[0]()
	assert.True(t, ran)
}
