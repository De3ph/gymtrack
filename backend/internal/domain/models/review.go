package models

import "time"

type TrainerReview struct {
	Type      string    `json:"type"` // Always "review"
	ReviewID  int       `json:"reviewId" example:"1"`
	TrainerID int       `json:"trainerId" example:"1"`
	AthleteID int       `json:"athleteId" example:"1"`
	Rating    int       `json:"rating" validate:"required,min=1,max=5"`
	Comment   string    `json:"comment,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ReviewWithAthlete struct {
	TrainerReview
	AthleteName string `json:"athleteName"`
}
