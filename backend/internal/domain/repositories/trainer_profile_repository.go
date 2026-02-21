package repositories

import (
	"context"
	"fmt"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type TrainerProfileRepository interface {
	GetPublicTrainers(ctx context.Context, filters *TrainerFilters, limit, offset int) ([]models.TrainerWithProfile, error)
	GetTrainerByID(ctx context.Context, trainerID string) (*models.TrainerWithProfile, error)
	UpdateTrainerProfile(ctx context.Context, trainerID string, profile *models.TrainerProfile) error
	SearchTrainers(ctx context.Context, query string, filters *TrainerFilters, limit, offset int) ([]models.TrainerWithProfile, error)
	CountTrainers(ctx context.Context, filters *TrainerFilters) (int, error)
}

type TrainerFilters struct {
	Specialization         string
	Location               string
	MinRating              float64
	AvailableForNewClients *bool
}

type CouchbaseTrainerProfileRepository struct {
	collection *gocb.Collection
}

func NewCouchbaseTrainerProfileRepository(collection *gocb.Collection) *CouchbaseTrainerProfileRepository {
	return &CouchbaseTrainerProfileRepository{
		collection: collection,
	}
}

func (r *CouchbaseTrainerProfileRepository) buildQuery(filters *TrainerFilters) (string, []interface{}) {
	whereClause := "u.type = 'user' AND u.`role` = 'trainer'"
	params := []interface{}{}

	if filters != nil {
		if filters.Specialization != "" {
			whereClause += " AND LOWER(u.profile.specializations) LIKE LOWER($1)"
			params = append(params, "%"+filters.Specialization+"%")
		}
		if filters.Location != "" {
			whereClause += " AND LOWER(u.profile.location) LIKE LOWER($1)"
			params = append(params, "%"+filters.Location+"%")
		}
		if filters.MinRating > 0 {
			whereClause += " AND u.profile.averageRating >= $1"
			params = append(params, filters.MinRating)
		}
		if filters.AvailableForNewClients != nil {
			whereClause += " AND u.profile.isAvailableForNewClients = $1"
			params = append(params, *filters.AvailableForNewClients)
		}
	}

	query := fmt.Sprintf("SELECT u.* FROM `%s`.`%s`.`%s` u WHERE %s",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionUsers, whereClause)
	return query, params
}

func (r *CouchbaseTrainerProfileRepository) GetPublicTrainers(ctx context.Context, filters *TrainerFilters, limit, offset int) ([]models.TrainerWithProfile, error) {
	query, params := r.buildQuery(filters)
	query += fmt.Sprintf(" ORDER BY u.profile.averageRating DESC NULLS LAST LIMIT %d OFFSET %d", limit, offset)

	rows, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: params,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query trainers: %w", err)
	}
	defer rows.Close()

	var trainers []models.TrainerWithProfile
	for rows.Next() {
		var trainer models.TrainerWithProfile
		if err := rows.Row(&trainer); err != nil {
			return nil, fmt.Errorf("failed to unmarshal trainer: %w", err)
		}
		// Map profile fields from UserProfile to TrainerProfile
		trainer.Profile = models.TrainerProfile{
			Bio:                      trainer.User.Profile.Certifications,
			ProfilePhotoURL:          "",
			HourlyRate:               0,
			YearsOfExperience:        0,
			IsAvailableForNewClients: true,
			Location:                 "",
			Languages:                nil,
		}
		// Use existing trainer-specific fields from UserProfile
		if trainer.User.Profile.Certifications != "" {
			trainer.Profile.Bio = trainer.User.Profile.Certifications
		}
		if trainer.User.Profile.Specializations != "" {
			trainer.Profile.Location = trainer.User.Profile.Specializations
		}
		trainers = append(trainers, trainer)
	}

	return trainers, nil
}

func (r *CouchbaseTrainerProfileRepository) GetTrainerByID(ctx context.Context, trainerID string) (*models.TrainerWithProfile, error) {
	var trainer models.TrainerWithProfile
	getResult, err := r.collection.Get(trainerID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		if err == gocb.ErrDocumentNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get trainer: %w", err)
	}

	err = getResult.Content(&trainer.User)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal trainer content: %w", err)
	}

	trainer.Profile = models.TrainerProfile{
		Bio:                      trainer.User.Profile.Certifications,
		ProfilePhotoURL:          "",
		HourlyRate:               0,
		YearsOfExperience:        0,
		IsAvailableForNewClients: true,
		Location:                 trainer.User.Profile.Specializations,
		Languages:                nil,
	}

	return &trainer, nil
}

func (r *CouchbaseTrainerProfileRepository) UpdateTrainerProfile(ctx context.Context, trainerID string, profile *models.TrainerProfile) error {
	var user models.User
	getResult, err := r.collection.Get(trainerID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to get trainer: %w", err)
	}

	err = getResult.Content(&user)
	if err != nil {
		return fmt.Errorf("failed to unmarshal user: %w", err)
	}

	// Update profile fields
	user.Profile.Certifications = profile.Bio
	user.Profile.Specializations = profile.Location

	_, err = r.collection.Replace(trainerID, user, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to update trainer profile: %w", err)
	}

	return nil
}

func (r *CouchbaseTrainerProfileRepository) SearchTrainers(ctx context.Context, query string, filters *TrainerFilters, limit, offset int) ([]models.TrainerWithProfile, error) {
	return r.GetPublicTrainers(ctx, filters, limit, offset)
}

func (r *CouchbaseTrainerProfileRepository) CountTrainers(ctx context.Context, filters *TrainerFilters) (int, error) {
	return 0, nil
}
