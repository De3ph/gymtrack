package repositories

import (
	"context"
	"fmt"
	"time"

	"strconv"

	"gymtrack-backend/internal/config"
	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type ReviewRepository interface {
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

type CouchbaseReviewRepository struct {
	cluster *gocb.Cluster
	bucket  *gocb.Bucket
}

func NewCouchbaseReviewRepository(cluster *gocb.Cluster, bucket *gocb.Bucket) *CouchbaseReviewRepository {
	return &CouchbaseReviewRepository{
		cluster: cluster,
		bucket:  bucket,
	}
}

func (r *CouchbaseReviewRepository) GetByTrainerID(ctx context.Context, trainerID int) ([]models.TrainerReview, error) {
	query := fmt.Sprintf("SELECT rev.* FROM `%s`.`%s`.`%s` rev WHERE rev.type = 'review' AND rev.trainerId = $1 ORDER BY rev.createdAt DESC",
		r.bucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := r.cluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{trainerID},
		Timeout:              config.DefaultQueryTimeout,
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

	_, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers).Insert(strconv.Itoa(review.ReviewID), review, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create review: %w", err)
	}
	return nil
}

func (r *CouchbaseReviewRepository) UpdateReview(ctx context.Context, review *models.TrainerReview) error {
	review.UpdatedAt = time.Now()

	_, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers).Replace(strconv.Itoa(review.ReviewID), review, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to update review: %w", err)
	}
	return nil
}

func (r *CouchbaseReviewRepository) DeleteReview(ctx context.Context, reviewID int) error {
	_, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers).Remove(strconv.Itoa(reviewID), &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete review: %w", err)
	}
	return nil
}

func (r *CouchbaseReviewRepository) GetByAthleteID(ctx context.Context, athleteID int) (*models.TrainerReview, error) {
	query := fmt.Sprintf("SELECT rev.* FROM `%s`.`%s`.`%s` rev WHERE rev.type = 'review' AND rev.athleteId = $1",
		r.bucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := r.cluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{athleteID},
		Timeout:              config.DefaultQueryTimeout,
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

	return nil, domainerrors.ErrNotFound
}

func (r *CouchbaseReviewRepository) GetAverageRating(ctx context.Context, trainerID int) (float64, int, error) {
	query := fmt.Sprintf("SELECT AVG(rev.rating) as avgRating, COUNT(rev) as reviewCount FROM `%s`.`%s`.`%s` rev WHERE rev.type = 'review' AND rev.trainerId = $1",
		r.bucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := r.cluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{trainerID},
		Timeout:              config.DefaultQueryTimeout,
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

func (r *CouchbaseReviewRepository) GetReviewByID(ctx context.Context, reviewID int) (*models.TrainerReview, error) {
	var review models.TrainerReview
	getResult, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers).Get(strconv.Itoa(reviewID), &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		if err == gocb.ErrDocumentNotFound {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get review: %w", err)
	}

	err = getResult.Content(&review)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal review content: %w", err)
	}

	return &review, nil
}

// GetRatingsForTrainers retrieves average ratings and review counts for multiple trainers in a single query
func (r *CouchbaseReviewRepository) GetRatingsForTrainers(ctx context.Context, trainerIDs []int) (map[int]struct {
	Avg   float64
	Count int
}, error) {
	if len(trainerIDs) == 0 {
		return make(map[int]struct {
			Avg   float64
			Count int
		}), nil
	}

	query := fmt.Sprintf("SELECT rev.trainerId, AVG(rev.rating) as avgRating, COUNT(rev) as reviewCount FROM `%s`.`%s`.`%s` rev WHERE rev.type = 'review' AND rev.trainerId IN $1 GROUP BY rev.trainerId",
		r.bucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := r.cluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{trainerIDs},
		Timeout:              config.DefaultQueryTimeout,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query ratings for trainers: %w", err)
	}
	defer rows.Close()

	type result struct {
		TrainerID   int     `json:"trainerId"`
		AvgRating   float64 `json:"avgRating"`
		ReviewCount int     `json:"reviewCount"`
	}

	ratings := make(map[int]struct {
		Avg   float64
		Count int
	})
	for rows.Next() {
		var res result
		if err := rows.Row(&res); err != nil {
			return nil, fmt.Errorf("failed to unmarshal rating result: %w", err)
		}
		ratings[res.TrainerID] = struct {
			Avg   float64
			Count int
		}{
			Avg:   res.AvgRating,
			Count: res.ReviewCount,
		}
	}

	// Ensure all requested trainer IDs have an entry (even if 0 ratings)
	for _, trainerID := range trainerIDs {
		if _, exists := ratings[trainerID]; !exists {
			ratings[trainerID] = struct {
				Avg   float64
				Count int
			}{Avg: 0, Count: 0}
		}
	}

	return ratings, nil
}
