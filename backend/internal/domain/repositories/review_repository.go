package repositories

import (
	"context"

	"gymtrack-backend/internal/domain/models"
)

// TrainerReviewRepository defines data access for trainer reviews.
type TrainerReviewRepository interface {
	GetByTrainerID(ctx context.Context, trainerID int) ([]models.TrainerReview, error)
	CreateReview(ctx context.Context, review *models.TrainerReview) error
	UpdateReview(ctx context.Context, review *models.TrainerReview) error
	DeleteReview(ctx context.Context, reviewID int) error
	// GetByTrainerAndAthlete returns the athlete's review of one specific trainer.
	//
	// The lookup is keyed on the pair because that is what UNIQUE(trainer_id,
	// athlete_id) enforces: an athlete may review many trainers, one apiece.
	// Querying by athlete alone cannot distinguish "already reviewed this trainer"
	// from "reviewed some other trainer".
	//
	// Reports domainerrors.ErrNotFound when the athlete has not reviewed this
	// trainer, which is the normal first-review case rather than a failure.
	GetByTrainerAndAthlete(ctx context.Context, trainerID int, athleteID int) (*models.TrainerReview, error)
	GetAverageRating(ctx context.Context, trainerID int) (float64, int, error)
	GetReviewByID(ctx context.Context, reviewID int) (*models.TrainerReview, error)
	GetRatingsForTrainers(ctx context.Context, trainerIDs []int) (map[int]struct {
		Avg   float64
		Count int
	}, error)
}
