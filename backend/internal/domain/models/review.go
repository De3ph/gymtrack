package models

import "time"

type TrainerReview struct {
	Type      string    `json:"type"` // Always "review"
	ReviewID  int       `json:"reviewId"`
	TrainerID int       `json:"trainerId"`
	AthleteID int       `json:"athleteId"`
	Rating    int       `json:"rating" validate:"required,min=1,max=5"`
	Comment   string    `json:"comment,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ReviewWithAthlete struct {
	TrainerReview
	AthleteName string `json:"athleteName"`
}
