package services

import (
	"context"
	"testing"

	"gymtrack-backend/internal/domain/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
			svc := NewRelationshipService(&stubRelationshipRepo{existing: tt.existing}, &stubUserRepo{}, nil)

			got, err := svc.HasActiveTrainer(context.Background(), 7)

			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestRelationshipService_Activate_RefusesSecondActiveTrainer(t *testing.T) {
	rels := &stubRelationshipRepo{existing: &models.Relationship{Status: models.RelationshipStatusActive}}
	svc := NewRelationshipService(rels, &stubUserRepo{}, nil)

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
	svc := NewRelationshipService(rels, users, nil)

	relationship, err := svc.Activate(context.Background(), trainerID, athleteID)

	require.NoError(t, err)
	assert.Equal(t, models.RelationshipStatusActive, relationship.Status)
	assert.Equal(t, []int{trainerID}, rels.createdTrainers)
	assert.Equal(t, trainerID, users.user.Profile.TrainerAssignment)
}

func TestRelationshipService_Activate_ReusesTerminatedRow(t *testing.T) {
	relationship := &models.Relationship{
		RelationshipID: 5,
		TrainerID:      2,
		AthleteID:      7,
		Status:         models.RelationshipStatusTerminated,
	}
	rels := &stubRelationshipRepo{byPair: relationship}
	users := &stubUserRepo{user: &models.User{UserID: 7, Role: models.RoleAthlete}}
	svc := NewRelationshipService(rels, users, nil)

	reactivated, err := svc.Activate(context.Background(), 2, 7)

	require.NoError(t, err)
	assert.Same(t, relationship, reactivated)
	assert.Equal(t, models.RelationshipStatusActive, reactivated.Status)
	assert.Empty(t, rels.createdTrainers, "reconnecting must update the existing row")
	assert.Len(t, rels.updated, 1)
	assert.Equal(t, 2, users.user.Profile.TrainerAssignment)
}

func TestRelationshipService_Activate_ProfileFailureRollsBackRelationship(t *testing.T) {
	rels := &stubRelationshipRepo{}
	users := &stubUserRepo{
		user:      &models.User{UserID: 7, Role: models.RoleAthlete},
		updateErr: assert.AnError,
	}
	svc := NewRelationshipService(rels, users, nil)

	_, err := svc.Activate(context.Background(), 2, 7)

	require.Error(t, err)
	assert.Equal(t, []int{1}, rels.deleted, "the inserted relationship must be rolled back")
}

func TestRelationshipService_Terminate_ForbidsNonParticipant(t *testing.T) {
	relationships := &stubRelationshipRepo{byID: &models.Relationship{
		RelationshipID: 1,
		TrainerID:      2,
		AthleteID:      3,
		Status:         models.RelationshipStatusActive,
	}}
	svc := NewRelationshipService(relationships, &stubUserRepo{}, nil)

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
	svc := NewRelationshipService(relationships, users, nil)

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
	svc := NewRelationshipService(relationships, users, nil)

	terminated, err := svc.Terminate(context.Background(), 1, 3, models.RoleAthlete)

	require.NoError(t, err)
	assert.Equal(t, models.RelationshipStatusTerminated, terminated.Status)
	assert.Len(t, relationships.updated, 1)
	assert.Equal(t, 0, users.user.Profile.TrainerAssignment)
}
