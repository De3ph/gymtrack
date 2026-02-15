package models

import (
	"time"

	"github.com/google/uuid"
)

type RelationshipStatus string

const (
	RelationshipStatusPending    RelationshipStatus = "pending"
	RelationshipStatusActive     RelationshipStatus = "active"
	RelationshipStatusTerminated RelationshipStatus = "terminated"
)

type Relationship struct {
	Type           string             `json:"type"` // Always "relationship"
	RelationshipID string             `json:"relationshipId"`
	TrainerID      string             `json:"trainerId" validate:"required"`
	AthleteID      string             `json:"athleteId" validate:"required"`
	Status         RelationshipStatus `json:"status" validate:"required,oneof=pending active terminated"`
	CreatedAt      time.Time          `json:"createdAt"`
	UpdatedAt      time.Time          `json:"updatedAt"`
}

// NewRelationship creates a new trainer-athlete relationship
func NewRelationship(trainerID, athleteID string) *Relationship {
	now := time.Now()
	return &Relationship{
		Type:           "relationship",
		RelationshipID: uuid.New().String(),
		TrainerID:      trainerID,
		AthleteID:      athleteID,
		Status:         RelationshipStatusPending,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

// Accept marks the relationship as active
func (r *Relationship) Accept() {
	r.Status = RelationshipStatusActive
	r.UpdatedAt = time.Now()
}

// Terminate marks the relationship as terminated
func (r *Relationship) Terminate() {
	r.Status = RelationshipStatusTerminated
	r.UpdatedAt = time.Now()
}

// IsActive checks if the relationship is currently active
func (r *Relationship) IsActive() bool {
	return r.Status == RelationshipStatusActive
}
