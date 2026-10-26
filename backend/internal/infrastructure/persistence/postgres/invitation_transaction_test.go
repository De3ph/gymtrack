package postgres

import (
	"context"
	"errors"
	"testing"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/domain/services"
	"gymtrack-backend/internal/testutils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// failingAssignmentUserRepo fails the profile projection while delegating every
// other read and write to the real repository. That makes activation fail
// deterministically *after* the invitation has been claimed and the
// relationship row inserted — the point of no return the transaction must undo.
type failingAssignmentUserRepo struct {
	repositories.UserRepository
	err error
}

func (f failingAssignmentUserRepo) SetTrainerAssignment(context.Context, int, int) error {
	return f.err
}

func (f failingAssignmentUserRepo) ClearTrainerAssignment(ctx context.Context, athleteID int, trainerID int) error {
	return f.UserRepository.ClearTrainerAssignment(ctx, athleteID, trainerID)
}

// Accepting an invitation is claim + relationship + profile projection in one
// transaction. When activation fails after the claim, the code must be usable
// again and no relationship may survive: deleting the compensating release path
// is only safe if the transaction actually provides that guarantee.
func TestAcceptInvitation_RollsBackClaimWhenActivationFails(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	ctx := context.Background()
	relationships := NewPostgresRelationshipRepository(pool)
	users := NewPostgresUserRepository(pool)
	transactions := NewPostgresTransactionManager(pool)

	trainer := createTransactionTestUser(t, pool, "claim_tx_trainer", "claim_tx_trainer@test.com", models.RoleTrainer)
	athlete := createTransactionTestUser(t, pool, "claim_tx_athlete", "claim_tx_athlete@test.com", models.RoleAthlete)

	projectionFailure := errors.New("profile projection failed")
	failingUsers := failingAssignmentUserRepo{UserRepository: users, err: projectionFailure}

	relationshipSvc := services.NewRelationshipService(relationships, failingUsers, nil, transactions, nil)
	invitationSvc := services.NewInvitationService(NewPostgresCodeBasedInvitation(pool, nil), relationshipSvc, transactions)

	invitation, err := invitationSvc.GenerateInvitation(ctx, trainer.UserID)
	require.NoError(t, err)

	_, err = invitationSvc.AcceptInvitation(ctx, invitation.Code, athlete.UserID)
	require.ErrorIs(t, err, projectionFailure)

	var status string
	var usedAt *time.Time
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT status, used_at FROM invitations WHERE id = $1`, invitation.InvitationID,
	).Scan(&status, &usedAt))
	assert.Equal(t, "pending", status, "the claim must roll back with the failed activation")
	assert.Nil(t, usedAt, "a rolled-back claim must not record a redemption time")

	var relationshipCount int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM relationships WHERE athlete_id = $1`, athlete.UserID,
	).Scan(&relationshipCount))
	assert.Zero(t, relationshipCount, "the relationship insert must roll back with the claim")

	var assignment int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COALESCE((profile->>'trainerAssignment')::int, 0) FROM users WHERE user_id = $1`, athlete.UserID,
	).Scan(&assignment))
	assert.Zero(t, assignment, "the profile projection must be untouched")
}
