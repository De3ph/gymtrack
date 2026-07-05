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
	RequestID int                   `json:"requestId"`
	AthleteID int                   `json:"athleteId"`
	TrainerID int                   `json:"trainerId"`
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
