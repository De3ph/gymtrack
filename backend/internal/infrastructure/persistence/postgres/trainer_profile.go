package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	repositories "gymtrack-backend/internal/domain/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresTrainerProfileRepository implements TrainerProfileRepository using PostgreSQL.
type PostgresTrainerProfileRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresTrainerProfileRepository creates a new PostgreSQL-backed trainer profile repository.
func NewPostgresTrainerProfileRepository(pool *pgxpool.Pool) *PostgresTrainerProfileRepository {
	return &PostgresTrainerProfileRepository{pool: pool}
}

// buildFilterWhereClause builds a WHERE clause from trainer filters, returning the clause,
// parameters, and the next available parameter index.
func (r *PostgresTrainerProfileRepository) buildFilterWhereClause(filters *repositories.TrainerFilters) (string, []interface{}, int) {
	conditions := []string{"role = 'trainer'"}
	params := []interface{}{}
	paramIdx := 1

	if filters != nil {
		if filters.Specialization != "" {
			conditions = append(conditions, fmt.Sprintf("profile->>'specializations' ILIKE $%d", paramIdx))
			params = append(params, "%"+filters.Specialization+"%")
			paramIdx++
		}
		if filters.Location != "" {
			conditions = append(conditions, fmt.Sprintf("profile->>'location' ILIKE $%d", paramIdx))
			params = append(params, "%"+filters.Location+"%")
			paramIdx++
		}
		if filters.MinRating > 0 {
			conditions = append(conditions, fmt.Sprintf(
				"user_id IN (SELECT trainer_id FROM trainer_reviews GROUP BY trainer_id HAVING COALESCE(AVG(rating), 0) >= $%d)", paramIdx))
			params = append(params, filters.MinRating)
			paramIdx++
		}
		if filters.AvailableForNewClients != nil {
			conditions = append(conditions, fmt.Sprintf("(profile->>'isAvailableForNewClients')::boolean = $%d", paramIdx))
			params = append(params, *filters.AvailableForNewClients)
			paramIdx++
		}
	}

	return strings.Join(conditions, " AND "), params, paramIdx
}

// mapUserProfileToTrainerProfile maps a UserProfile to a TrainerProfile.
func mapUserProfileToTrainerProfile(p models.UserProfile) models.TrainerProfile {
	return models.TrainerProfile{
		Bio:                      p.Bio,
		ProfilePhotoURL:          p.ProfilePhotoURL,
		HourlyRate:               p.HourlyRate,
		YearsOfExperience:        p.YearsOfExperience,
		IsAvailableForNewClients: p.IsAvailableForNewClients,
		Location:                 p.Location,
		Languages:                p.Languages,
	}
}

const trainerSelectBase = `
	SELECT u.user_id, u.username, u.email, u.password_hash, u.role, u.profile, u.created_at, u.updated_at,
	       COALESCE(r.avg_rating, 0), COALESCE(r.review_count, 0)
	FROM users u
	LEFT JOIN (
		SELECT trainer_id, AVG(rating) as avg_rating, COUNT(*) as review_count
		FROM trainer_reviews GROUP BY trainer_id
	) r ON r.trainer_id = u.user_id`

func (r *PostgresTrainerProfileRepository) GetPublicTrainers(ctx context.Context, filters *repositories.TrainerFilters, limit, offset int) ([]models.TrainerWithProfile, error) {
	whereClause, params, nextIdx := r.buildFilterWhereClause(filters)
	query := fmt.Sprintf(`%s WHERE %s ORDER BY COALESCE(r.avg_rating, 0) DESC LIMIT $%d OFFSET $%d`,
		trainerSelectBase, whereClause, nextIdx, nextIdx+1)
	params = append(params, limit, offset)

	rows, err := r.pool.Query(ctx, query, params...)
	if err != nil {
		return nil, fmt.Errorf("failed to query trainers: %w", err)
	}
	defer rows.Close()

	return r.scanTrainerRows(rows)
}

func (r *PostgresTrainerProfileRepository) GetTrainerByID(ctx context.Context, trainerID int) (*models.TrainerWithProfile, error) {
	query := trainerSelectBase + ` WHERE u.user_id = $1 AND u.role = 'trainer'`

	trainer, profileRaw, err := r.scanTrainerPoolRow(ctx, query, trainerID)
	if err != nil {
		return nil, err
	}

	if err := UnmarshalFromJSONB(profileRaw, &trainer.User.Profile); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user profile: %w", err)
	}

	trainer.Type = "user"
	trainer.Profile = mapUserProfileToTrainerProfile(trainer.User.Profile)

	return trainer, nil
}

// scanTrainerPoolRow scans a single trainer row (with profile bytes) from a QueryRow.
// Translates pgx.ErrNoRows to domainerrors.ErrNotFound to keep the not-found contract
// consistent with other required getters (e.g. GetByID on coaching_request, workout).
func (r *PostgresTrainerProfileRepository) scanTrainerPoolRow(ctx context.Context, query string, args ...interface{}) (*models.TrainerWithProfile, []byte, error) {
	var trainer models.TrainerWithProfile
	var profileRaw []byte
	var avgRating float64
	var reviewCount int

	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&trainer.UserID, &trainer.Username, &trainer.Email, &trainer.PasswordHash,
		&trainer.Role, &profileRaw, &trainer.CreatedAt, &trainer.UpdatedAt,
		&avgRating, &reviewCount,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, domainerrors.ErrNotFound
		}
		return nil, nil, fmt.Errorf("failed to get trainer: %w", err)
	}
	trainer.AverageRating = avgRating
	trainer.ReviewCount = reviewCount
	return &trainer, profileRaw, nil
}

func (r *PostgresTrainerProfileRepository) UpdateTrainerProfile(ctx context.Context, trainerID int, profile *models.TrainerProfile) error {
	// Wrap the read-modify-write in a transaction with a row-level lock
	// (SELECT ... FOR UPDATE) so concurrent updates can't clobber each other
	// (lost-update race). The lock is held until COMMIT/ROLLBACK.
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // safe to ignore: rollback after commit is a no-op

	var profileRaw []byte
	err = tx.QueryRow(ctx,
		`SELECT profile FROM users WHERE user_id = $1 AND role = 'trainer' FOR UPDATE`,
		trainerID,
	).Scan(&profileRaw)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domainerrors.ErrNotFound
		}
		return fmt.Errorf("failed to get trainer: %w", err)
	}

	var userProfile models.UserProfile
	if err := UnmarshalFromJSONB(profileRaw, &userProfile); err != nil {
		return fmt.Errorf("failed to unmarshal user profile: %w", err)
	}

	userProfile.Bio = profile.Bio
	userProfile.ProfilePhotoURL = profile.ProfilePhotoURL
	userProfile.HourlyRate = profile.HourlyRate
	userProfile.YearsOfExperience = profile.YearsOfExperience
	userProfile.IsAvailableForNewClients = profile.IsAvailableForNewClients
	userProfile.Location = profile.Location
	userProfile.Languages = profile.Languages

	updatedJSON, err := MarshalToJSONB(userProfile)
	if err != nil {
		return fmt.Errorf("failed to marshal user profile: %w", err)
	}

	tag, err := tx.Exec(ctx,
		`UPDATE users SET profile = $1, updated_at = $2 WHERE user_id = $3`,
		updatedJSON, time.Now(), trainerID,
	)
	if err != nil {
		return fmt.Errorf("failed to update trainer profile: %w", err)
	}
	if tag.RowsAffected() == 0 {
		// The row is locked and was confirmed to exist above, so reaching here
		// means a concurrent delete raced between the SELECT and UPDATE.
		return domainerrors.ErrNotFound
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	return nil
}

func (r *PostgresTrainerProfileRepository) SearchTrainers(ctx context.Context, query string, filters *repositories.TrainerFilters, limit, offset int) ([]models.TrainerWithProfile, error) {
	whereClause, params, nextIdx := r.buildFilterWhereClause(filters)

	searchCond := fmt.Sprintf("(username ILIKE $%d OR profile->>'name' ILIKE $%d)", nextIdx, nextIdx)
	whereClause += " AND " + searchCond
	params = append(params, "%"+query+"%")
	nextIdx++

	sqlQuery := fmt.Sprintf(`%s WHERE %s ORDER BY COALESCE(r.avg_rating, 0) DESC LIMIT $%d OFFSET $%d`,
		trainerSelectBase, whereClause, nextIdx, nextIdx+1)
	params = append(params, limit, offset)

	rows, err := r.pool.Query(ctx, sqlQuery, params...)
	if err != nil {
		return nil, fmt.Errorf("failed to search trainers: %w", err)
	}
	defer rows.Close()

	return r.scanTrainerRows(rows)
}

func (r *PostgresTrainerProfileRepository) CountTrainers(ctx context.Context, filters *repositories.TrainerFilters) (int, error) {
	whereClause, params, _ := r.buildFilterWhereClause(filters)
	query := fmt.Sprintf("SELECT COUNT(*) FROM users WHERE %s", whereClause)

	var count int
	err := r.pool.QueryRow(ctx, query, params...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count trainers: %w", err)
	}

	return count, nil
}

// scanTrainerRows scans multiple trainer rows with joined review data.
func (r *PostgresTrainerProfileRepository) scanTrainerRows(rows pgx.Rows) ([]models.TrainerWithProfile, error) {
	trainers := make([]models.TrainerWithProfile, 0)
	for rows.Next() {
		var trainer models.TrainerWithProfile
		var profileRaw []byte
		var avgRating float64
		var reviewCount int

		if err := rows.Scan(
			&trainer.UserID, &trainer.Username, &trainer.Email, &trainer.PasswordHash,
			&trainer.Role, &profileRaw, &trainer.CreatedAt, &trainer.UpdatedAt,
			&avgRating, &reviewCount,
		); err != nil {
			return nil, fmt.Errorf("failed to scan trainer row: %w", err)
		}

		if err := UnmarshalFromJSONB(profileRaw, &trainer.User.Profile); err != nil {
			return nil, fmt.Errorf("failed to unmarshal user profile: %w", err)
		}

		trainer.Type = "user"
		trainer.Profile = mapUserProfileToTrainerProfile(trainer.User.Profile)
		trainer.AverageRating = avgRating
		trainer.ReviewCount = reviewCount

		trainers = append(trainers, trainer)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return trainers, nil
}

// Compile-time interface compliance check.
var _ repositories.TrainerProfileRepository = (*PostgresTrainerProfileRepository)(nil)
