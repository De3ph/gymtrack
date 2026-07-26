package models

import (
	"time"
)

type CoachingRequestStatus string

const (
	CoachingRequestStatusPending  CoachingRequestStatus = "pending"
	CoachingRequestStatusAccepted CoachingRequestStatus = "accepted"
	CoachingRequestStatusRejected CoachingRequestStatus = "rejected"
)

type CoachingRequest struct {
	RequestID int                   `json:"requestId" example:"1"`
	AthleteID int                   `json:"athleteId" example:"1"`
	TrainerID int                   `json:"trainerId" example:"1"`
	Message   string                `json:"message"`
	Status    CoachingRequestStatus `json:"status"`
	Type      string                `json:"type"`
	CreatedAt time.Time             `json:"createdAt"`
	UpdatedAt time.Time             `json:"updatedAt"`
}

type CoachingRequestWithDetails struct {
	*CoachingRequest
	Athlete *User `json:"athlete,omitempty"`
	Trainer *User `json:"trainer,omitempty"`
}
