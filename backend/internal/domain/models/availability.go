package models

import "time"

type TrainerAvailability struct {
	Type           string    `json:"type"` // Always "availability"
	AvailabilityID string    `json:"availabilityId"`
	TrainerID      string    `json:"trainerId"`
	DayOfWeek      int       `json:"dayOfWeek"` // 0-6 (Sunday-Saturday)
	StartTime      string    `json:"startTime"` // HH:MM format
	EndTime        string    `json:"endTime"`   // HH:MM format
	IsBooked       bool      `json:"isBooked"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}
