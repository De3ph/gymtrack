package repositories

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type ReviewRepository interface {
	GetByTrainerID(ctx context.Context, trainerID string) ([]models.TrainerReview, error)
	CreateReview(ctx context.Context, review *models.TrainerReview) error
	UpdateReview(ctx context.Context, review *models.TrainerReview) error
	DeleteReview(ctx context.Context, reviewID string) error
	GetByAthleteID(ctx context.Context, athleteID string) (*models.TrainerReview, error)
	GetAverageRating(ctx context.Context, trainerID string) (float64, int, error)
	GetReviewByID(ctx context.Context, reviewID string) (*models.TrainerReview, error)
}

type CouchbaseReviewRepository struct {
	collection *gocb.Collection
}

func NewCouchbaseReviewRepository(collection *gocb.Collection) *CouchbaseReviewRepository {
	return &CouchbaseReviewRepository{
		collection: collection,
	}
}

func (r *CouchbaseReviewRepository) GetByTrainerID(ctx context.Context, trainerID string) ([]models.TrainerReview, error) {
	query := fmt.Sprintf("SELECT rev.* FROM `%s`.`%s`.`%s` rev WHERE rev.type = 'review' AND rev.trainerId = $1 ORDER BY rev.createdAt DESC",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{trainerID},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query reviews: %w", err)
	}
	defer rows.Close()

	reviews := make([]models.TrainerReview, 0)
	for rows.Next() {
		var review models.TrainerReview
		if err := rows.Row(&review); err != nil {
			return nil, fmt.Errorf("failed to unmarshal review: %w", err)
		}
		reviews = append(reviews, review)
	}

	return reviews, nil
}

func (r *CouchbaseReviewRepository) CreateReview(ctx context.Context, review *models.TrainerReview) error {
	review.Type = "review"
	review.CreatedAt = time.Now()
	review.UpdatedAt = time.Now()

	_, err := r.collection.Insert(review.ReviewID, review, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create review: %w", err)
	}
	return nil
}

func (r *CouchbaseReviewRepository) UpdateReview(ctx context.Context, review *models.TrainerReview) error {
	review.UpdatedAt = time.Now()

	_, err := r.collection.Replace(review.ReviewID, review, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to update review: %w", err)
	}
	return nil
}

func (r *CouchbaseReviewRepository) DeleteReview(ctx context.Context, reviewID string) error {
	_, err := r.collection.Remove(reviewID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete review: %w", err)
	}
	return nil
}

func (r *CouchbaseReviewRepository) GetByAthleteID(ctx context.Context, athleteID string) (*models.TrainerReview, error) {
	query := fmt.Sprintf("SELECT rev.* FROM `%s`.`%s`.`%s` rev WHERE rev.type = 'review' AND rev.athleteId = $1",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{athleteID},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query review by athlete: %w", err)
	}
	defer rows.Close()

	var review models.TrainerReview
	if rows.Next() {
		if err := rows.Row(&review); err != nil {
			return nil, fmt.Errorf("failed to unmarshal review: %w", err)
		}
		return &review, nil
	}

	return nil, nil
}

func (r *CouchbaseReviewRepository) GetAverageRating(ctx context.Context, trainerID string) (float64, int, error) {
	query := fmt.Sprintf("SELECT AVG(rev.rating) as avgRating, COUNT(rev) as reviewCount FROM `%s`.`%s`.`%s` rev WHERE rev.type = 'review' AND rev.trainerId = $1",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{trainerID},
	})
	if err != nil {
		return 0, 0, fmt.Errorf("failed to query average rating: %w", err)
	}
	defer rows.Close()

	type result struct {
		AvgRating   float64 `json:"avgRating"`
		ReviewCount int     `json:"reviewCount"`
	}

	var res result
	if rows.Next() {
		if err := rows.Row(&res); err != nil {
			return 0, 0, fmt.Errorf("failed to unmarshal result: %w", err)
		}
	}

	return res.AvgRating, res.ReviewCount, nil
}

func (r *CouchbaseReviewRepository) GetReviewByID(ctx context.Context, reviewID string) (*models.TrainerReview, error) {
	var review models.TrainerReview
	getResult, err := r.collection.Get(reviewID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		if err == gocb.ErrDocumentNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get review: %w", err)
	}

	err = getResult.Content(&review)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal review content: %w", err)
	}

	return &review, nil
}
