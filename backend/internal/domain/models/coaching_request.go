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
	RequestID   string              `json:"requestId" cbjson:"requestId"`
	AthleteID   string              `json:"athleteId" cbjson:"athleteId"`
	TrainerID   string              `json:"trainerId" cbjson:"trainerId"`
	Message     string              `json:"message" cbjson:"message"`
	Status      CoachingRequestStatus `json:"status" cbjson:"status"`
	Type        string              `json:"type" cbjson:"type"`
	CreatedAt   time.Time           `json:"createdAt" cbjson:"createdAt"`
	UpdatedAt   time.Time           `json:"updatedAt" cbjson:"updatedAt"`
}

type CoachingRequestWithDetails struct {
	*CoachingRequest
	Athlete *User `json:"athlete,omitempty"`
	Trainer *User `json:"trainer,omitempty"`
}
