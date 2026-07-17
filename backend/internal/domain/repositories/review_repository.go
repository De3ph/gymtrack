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
	GetByAthleteID(ctx context.Context, athleteID int) (*models.TrainerReview, error)
	GetAverageRating(ctx context.Context, trainerID int) (float64, int, error)
	GetReviewByID(ctx context.Context, reviewID int) (*models.TrainerReview, error)
	GetRatingsForTrainers(ctx context.Context, trainerIDs []int) (map[int]struct {
		Avg   float64
		Count int
	}, error)
}
