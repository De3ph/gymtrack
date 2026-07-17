package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresTrainerReviewRepository implements ReviewRepository using PostgreSQL.
type PostgresTrainerReviewRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresTrainerReviewRepository creates a new PostgreSQL-backed review repository.
func NewPostgresTrainerReviewRepository(pool *pgxpool.Pool) *PostgresTrainerReviewRepository {
	return &PostgresTrainerReviewRepository{pool: pool}
}

func (r *PostgresTrainerReviewRepository) CreateReview(ctx context.Context, review *models.TrainerReview) error {
	now := time.Now()
	review.CreatedAt = now
	review.UpdatedAt = now

	query := `
		INSERT INTO trainer_reviews (trainer_id, athlete_id, rating, comment, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`

	err := r.pool.QueryRow(ctx, query,
		review.TrainerID, review.AthleteID, review.Rating, review.Comment, review.CreatedAt, review.UpdatedAt,
	).Scan(&review.ReviewID)
	if err != nil {
		return fmt.Errorf("failed to create review: %w", err)
	}

	review.Type = "review"
	return nil
}

func (r *PostgresTrainerReviewRepository) GetReviewByID(ctx context.Context, reviewID int) (*models.TrainerReview, error) {
	query := `
		SELECT id, trainer_id, athlete_id, rating, COALESCE(comment, ''), created_at, updated_at
		FROM trainer_reviews WHERE id = $1`

	review := &models.TrainerReview{}
	err := r.pool.QueryRow(ctx, query, reviewID).Scan(
		&review.ReviewID, &review.TrainerID, &review.AthleteID,
		&review.Rating, &review.Comment, &review.CreatedAt, &review.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get review by ID: %w", err)
	}

	review.Type = "review"
	return review, nil
}

func (r *PostgresTrainerReviewRepository) GetByTrainerID(ctx context.Context, trainerID int) ([]models.TrainerReview, error) {
	query := `
		SELECT id, trainer_id, athlete_id, rating, COALESCE(comment, ''), created_at, updated_at
		FROM trainer_reviews WHERE trainer_id = $1 ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, trainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to query reviews by trainer: %w", err)
	}
	defer rows.Close()

	reviews := make([]models.TrainerReview, 0)
	for rows.Next() {
		var review models.TrainerReview
		if err := rows.Scan(
			&review.ReviewID, &review.TrainerID, &review.AthleteID,
			&review.Rating, &review.Comment, &review.CreatedAt, &review.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan review row: %w", err)
		}
		review.Type = "review"
		reviews = append(reviews, review)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return reviews, nil
}

func (r *PostgresTrainerReviewRepository) GetByAthleteID(ctx context.Context, athleteID int) (*models.TrainerReview, error) {
	query := `
		SELECT id, trainer_id, athlete_id, rating, COALESCE(comment, ''), created_at, updated_at
		FROM trainer_reviews WHERE athlete_id = $1 ORDER BY created_at DESC LIMIT 1`

	review := &models.TrainerReview{}
	err := r.pool.QueryRow(ctx, query, athleteID).Scan(
		&review.ReviewID, &review.TrainerID, &review.AthleteID,
		&review.Rating, &review.Comment, &review.CreatedAt, &review.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get review by athlete: %w", err)
	}

	review.Type = "review"
	return review, nil
}

func (r *PostgresTrainerReviewRepository) UpdateReview(ctx context.Context, review *models.TrainerReview) error {
	review.UpdatedAt = time.Now()

	query := `UPDATE trainer_reviews SET rating = $1, comment = $2, updated_at = $3 WHERE id = $4`

	tag, err := r.pool.Exec(ctx, query, review.Rating, review.Comment, review.UpdatedAt, review.ReviewID)
	if err != nil {
		return fmt.Errorf("failed to update review: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *PostgresTrainerReviewRepository) DeleteReview(ctx context.Context, reviewID int) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM trainer_reviews WHERE id = $1`, reviewID)
	if err != nil {
		return fmt.Errorf("failed to delete review: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *PostgresTrainerReviewRepository) GetAverageRating(ctx context.Context, trainerID int) (float64, int, error) {
	query := `SELECT COALESCE(AVG(rating), 0), COUNT(*) FROM trainer_reviews WHERE trainer_id = $1`

	var avg float64
	var count int
	err := r.pool.QueryRow(ctx, query, trainerID).Scan(&avg, &count)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to get average rating: %w", err)
	}

	return avg, count, nil
}

func (r *PostgresTrainerReviewRepository) GetRatingsForTrainers(ctx context.Context, trainerIDs []int) (map[int]struct {
	Avg   float64
	Count int
}, error) {
	result := make(map[int]struct {
		Avg   float64
		Count int
	})

	if len(trainerIDs) == 0 {
		return result, nil
	}

	// Convert to int32 for pgx array compatibility with int4 columns.
	int32IDs := make([]int32, len(trainerIDs))
	for i, id := range trainerIDs {
		int32IDs[i] = int32(id)
	}

	query := `
		SELECT trainer_id, COALESCE(AVG(rating), 0), COUNT(*)
		FROM trainer_reviews
		WHERE trainer_id = ANY($1)
		GROUP BY trainer_id`

	rows, err := r.pool.Query(ctx, query, int32IDs)
	if err != nil {
		return nil, fmt.Errorf("failed to query ratings for trainers: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var trainerID int
		var avg float64
		var count int
		if err := rows.Scan(&trainerID, &avg, &count); err != nil {
			return nil, fmt.Errorf("failed to scan rating row: %w", err)
		}
		result[trainerID] = struct {
			Avg   float64
			Count int
		}{Avg: avg, Count: count}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	// Ensure all requested trainer IDs have an entry (even if 0 ratings).
	for _, id := range trainerIDs {
		if _, exists := result[id]; !exists {
			result[id] = struct {
				Avg   float64
				Count int
			}{Avg: 0, Count: 0}
		}
	}

	return result, nil
}

// Compile-time interface compliance check.
var _ repositories.TrainerReviewRepository = (*PostgresTrainerReviewRepository)(nil)
