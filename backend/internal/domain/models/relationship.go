package models

import (
	"errors"
	"time"
)

// ErrRelationshipIllegalTransition reports a status change the aggregate does
// not allow: Accept on a terminated relationship, or Terminate on an already
// terminated one. Callers map it to their own domain errors.
var ErrRelationshipIllegalTransition = errors.New("relationship status transition not allowed")

type RelationshipStatus string

const (
	RelationshipStatusPending    RelationshipStatus = "pending"
	RelationshipStatusActive     RelationshipStatus = "active"
	RelationshipStatusTerminated RelationshipStatus = "terminated"
)

type Relationship struct {
	Type           string             `json:"type"` // Always "relationship"
	RelationshipID int                `json:"relationshipId" example:"1"`
	TrainerID      int                `json:"trainerId" validate:"required" example:"1"`
	AthleteID      int                `json:"athleteId" validate:"required" example:"1"`
	Status         RelationshipStatus `json:"status" validate:"required,oneof=pending active terminated"`
	CreatedAt      time.Time          `json:"createdAt"`
	UpdatedAt      time.Time          `json:"updatedAt"`
}

// NewRelationship creates a new trainer-athlete relationship
func NewRelationship(trainerID, athleteID int) *Relationship {
	now := time.Now()
	return &Relationship{
		Type:           "relationship",
		RelationshipID: 0,
		TrainerID:      trainerID,
		AthleteID:      athleteID,
		Status:         RelationshipStatusPending,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

// Accept marks the relationship as active. A terminated relationship is
// history and cannot be reopened: reconnection always creates a new row.
func (r *Relationship) Accept() error {
	if r.Status == RelationshipStatusTerminated {
		return ErrRelationshipIllegalTransition
	}
	r.Status = RelationshipStatusActive
	r.UpdatedAt = time.Now()
	return nil
}

// Terminate marks the relationship as ended. A pending relationship may be
// terminated (the pair withdraws from being open); an already terminated one
// may not be terminated again, so re-terminating does not reset UpdatedAt.
func (r *Relationship) Terminate() error {
	if r.Status == RelationshipStatusTerminated {
		return ErrRelationshipIllegalTransition
	}
	r.Status = RelationshipStatusTerminated
	r.UpdatedAt = time.Now()
	return nil
}

// IsActive checks if the relationship is currently active
func (r *Relationship) IsActive() bool {
	return r.Status == RelationshipStatusActive
}
