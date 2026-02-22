package models

import "time"

// TrainerAvailability represents a time slot when a trainer is available for sessions.
// @Description TrainerAvailability model representing a single availability slot
type TrainerAvailability struct {
	Type string `json:"type" example:"availability"` // Always "availability"
	// @Description Unique identifier for the availability slot
	AvailabilityID string `json:"availabilityId" example:"550e8400-e29b-41d4-a716-446655440000"`
	// @Description Trainer user ID
	TrainerID string `json:"trainerId" example:"550e8400-e29b-41d4-a716-446655440001"`
	// @Description Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
	DayOfWeek int `json:"dayOfWeek" example:"1" minimum:"0" maximum:"6"`
	// @Description Start time in HH:MM format (24-hour)
	StartTime string `json:"startTime" example:"09:00"`
	// @Description End time in HH:MM format (24-hour)
	EndTime string `json:"endTime" example:"17:00"`
	// @Description Whether this slot has been booked by a client
	IsBooked bool `json:"isBooked"`
	// @Description Timestamp when the slot was created
	CreatedAt time.Time `json:"createdAt"`
	// @Description Timestamp when the slot was last updated
	UpdatedAt time.Time `json:"updatedAt"`
}
