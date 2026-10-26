package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRelationship_Accept(t *testing.T) {
	t.Run("pending becomes active", func(t *testing.T) {
		rel := NewRelationship(2, 7)
		require.NoError(t, rel.Accept())
		assert.Equal(t, RelationshipStatusActive, rel.Status)
		assert.True(t, rel.IsActive())
	})

	t.Run("terminated stays history", func(t *testing.T) {
		rel := &Relationship{TrainerID: 2, AthleteID: 7, Status: RelationshipStatusTerminated}
		err := rel.Accept()
		assert.ErrorIs(t, err, ErrRelationshipIllegalTransition)
		assert.Equal(t, RelationshipStatusTerminated, rel.Status)
	})
}

func TestRelationship_Terminate(t *testing.T) {
	t.Run("active becomes terminated", func(t *testing.T) {
		rel := &Relationship{TrainerID: 2, AthleteID: 7, Status: RelationshipStatusActive}
		require.NoError(t, rel.Terminate())
		assert.Equal(t, RelationshipStatusTerminated, rel.Status)
	})

	t.Run("pending may be terminated", func(t *testing.T) {
		rel := NewRelationship(2, 7)
		require.NoError(t, rel.Terminate())
		assert.Equal(t, RelationshipStatusTerminated, rel.Status)
	})

	t.Run("already terminated cannot be terminated again", func(t *testing.T) {
		rel := &Relationship{TrainerID: 2, AthleteID: 7, Status: RelationshipStatusTerminated}
		err := rel.Terminate()
		assert.ErrorIs(t, err, ErrRelationshipIllegalTransition)
	})
}
