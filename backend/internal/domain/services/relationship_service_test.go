package services

import (
	"context"
	"testing"

	"gymtrack-backend/internal/domain/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// recordingTransactions counts transaction boundaries. It does not roll
// anything back: the repositories in these tests are fakes, and the production
// manager's rollback is covered by the PostgreSQL tests.
type recordingTransactions struct {
	calls int
}

func (r *recordingTransactions) WithinTransaction(ctx context.Context, fn func(context.Context) error) error {
	r.calls++
	return fn(ctx)
}

func TestRelationshipService_HasActiveTrainer(t *testing.T) {
	tests := []struct {
		name     string
		existing *models.Relationship
		want     bool
	}{
		{name: "no relationship", existing: nil, want: false},
		{name: "pending relationship", existing: &models.Relationship{Status: models.RelationshipStatusPending}, want: false},
		{name: "terminated relationship", existing: &models.Relationship{Status: models.RelationshipStatusTerminated}, want: false},
		{name: "active relationship", existing: &models.Relationship{Status: models.RelationshipStatusActive}, want: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewRelationshipService(&stubRelationshipRepo{existing: tt.existing}, &stubUserRepo{}, nil, nil)

			got, err := svc.HasActiveTrainer(context.Background(), 7)

			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestRelationshipService_Activate_RefusesSecondActiveTrainer(t *testing.T) {
	rels := &stubRelationshipRepo{existing: &models.Relationship{Status: models.RelationshipStatusActive}}
	svc := NewRelationshipService(rels, &stubUserRepo{}, nil, nil)

	_, err := svc.Activate(context.Background(), 2, 7)

	assert.ErrorIs(t, err, ErrAlreadyHasActiveTrainer)
	assert.Empty(t, rels.createdTrainers, "no relationship may be written")
}

func TestRelationshipService_Activate_CreatesActiveRelationshipAndAssignsTrainer(t *testing.T) {
	const (
		trainerID = 2
		athleteID = 7
	)
	rels := &stubRelationshipRepo{}
	users := &stubUserRepo{user: &models.User{UserID: athleteID, Role: models.RoleAthlete}}
	svc := NewRelationshipService(rels, users, nil, nil)

	relationship, err := svc.Activate(context.Background(), trainerID, athleteID)

	require.NoError(t, err)
	assert.Equal(t, models.RelationshipStatusActive, relationship.Status)
	assert.Equal(t, []int{trainerID}, rels.createdTrainers)
	assert.Equal(t, trainerID, users.user.Profile.TrainerAssignment)
}

func TestRelationshipService_Activate_CreatesNewRowAfterTermination(t *testing.T) {
	rels := &stubRelationshipRepo{}
	users := &stubUserRepo{user: &models.User{UserID: 7, Role: models.RoleAthlete}}
	svc := NewRelationshipService(rels, users, nil, nil)

	relationship, err := svc.Activate(context.Background(), 2, 7)

	require.NoError(t, err)
	assert.Equal(t, []int{2}, rels.createdTrainers, "a terminated pair must be re-invitable as a new row")
	assert.Empty(t, rels.updated, "history must not be reopened")
	assert.Equal(t, models.RelationshipStatusActive, relationship.Status)
	assert.Equal(t, 2, users.user.Profile.TrainerAssignment)
}

func TestRelationshipService_Activate_PromotesPendingRow(t *testing.T) {
	pending := &models.Relationship{
		RelationshipID: 5,
		TrainerID:      2,
		AthleteID:      7,
		Status:         models.RelationshipStatusPending,
	}
	rels := &stubRelationshipRepo{byPair: pending}
	users := &stubUserRepo{user: &models.User{UserID: 7, Role: models.RoleAthlete}}
	svc := NewRelationshipService(rels, users, nil, nil)

	activated, err := svc.Activate(context.Background(), 2, 7)

	require.NoError(t, err)
	assert.Same(t, pending, activated)
	assert.Equal(t, models.RelationshipStatusActive, activated.Status)
	assert.Empty(t, rels.createdTrainers, "an open pending row must be promoted, not duplicated")
	assert.Len(t, rels.updated, 1)
	assert.Equal(t, 2, users.user.Profile.TrainerAssignment)
}

func TestRelationshipService_Activate_ProfileFailureAbortsTransaction(t *testing.T) {
	rels := &stubRelationshipRepo{}
	users := &stubUserRepo{
		user:      &models.User{UserID: 7, Role: models.RoleAthlete},
		updateErr: assert.AnError,
	}
	transactions := &recordingTransactions{}
	svc := NewRelationshipService(rels, users, transactions, nil)

	_, err := svc.Activate(context.Background(), 2, 7)

	require.Error(t, err)
	assert.Equal(t, 1, transactions.calls,
		"the relationship insert and the profile projection must share one transaction")
	assert.Empty(t, rels.deleted,
		"rollback belongs to the transaction, not to a compensating delete in the service")
}

func TestRelationshipService_Terminate_ForbidsNonParticipant(t *testing.T) {
	relationships := &stubRelationshipRepo{byID: &models.Relationship{
		RelationshipID: 1,
		TrainerID:      2,
		AthleteID:      3,
		Status:         models.RelationshipStatusActive,
	}}
	svc := NewRelationshipService(relationships, &stubUserRepo{}, nil, nil)

	_, err := svc.Terminate(context.Background(), 1, 99, models.RoleTrainer)

	assert.ErrorIs(t, err, ErrRelationshipTerminationForbidden)
	assert.Empty(t, relationships.updated, "an unauthorized call must not write")
}

func TestRelationshipService_Terminate_OldRelationshipDoesNotClearNewAssignment(t *testing.T) {
	relationship := &models.Relationship{
		RelationshipID: 1,
		TrainerID:      2,
		AthleteID:      3,
		Status:         models.RelationshipStatusTerminated,
	}
	relationships := &stubRelationshipRepo{byID: relationship}
	users := &stubUserRepo{user: &models.User{
		UserID:  3,
		Role:    models.RoleAthlete,
		Profile: models.UserProfile{TrainerAssignment: 99},
	}}
	svc := NewRelationshipService(relationships, users, nil, nil)

	_, err := svc.Terminate(context.Background(), 1, 3, models.RoleAthlete)

	require.NoError(t, err)
	assert.Equal(t, 99, users.user.Profile.TrainerAssignment, "a newer trainer assignment must survive")
}

func TestRelationshipService_Terminate_EndsRelationshipAndClearsAssignment(t *testing.T) {
	relationship := &models.Relationship{
		RelationshipID: 1,
		TrainerID:      2,
		AthleteID:      3,
		Status:         models.RelationshipStatusActive,
	}
	relationships := &stubRelationshipRepo{byID: relationship}
	users := &stubUserRepo{user: &models.User{
		UserID:  3,
		Role:    models.RoleAthlete,
		Profile: models.UserProfile{TrainerAssignment: 2},
	}}
	svc := NewRelationshipService(relationships, users, nil, nil)

	terminated, err := svc.Terminate(context.Background(), 1, 3, models.RoleAthlete)

	require.NoError(t, err)
	assert.Equal(t, models.RelationshipStatusTerminated, terminated.Status)
	assert.Len(t, relationships.updated, 1)
	assert.Equal(t, 0, users.user.Profile.TrainerAssignment)
}
