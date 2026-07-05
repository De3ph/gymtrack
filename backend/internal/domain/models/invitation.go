package models

import "time"

// Invitation represents a trainer-athlete invitation
type Invitation struct {
	Type         string    `json:"type"` // Always "invitation"
	InvitationID int       `json:"invitationId"`
	TrainerID    int       `json:"trainerId"`
	Code         string    `json:"code"`
	Status       string    `json:"status"` // "pending", "used", "expired"
	CreatedAt    time.Time `json:"createdAt"`
	ExpiresAt    time.Time `json:"expiresAt"`
	UsedAt       time.Time `json:"usedAt,omitempty"`
	AthleteID    int       `json:"athleteId,omitempty"`
}
