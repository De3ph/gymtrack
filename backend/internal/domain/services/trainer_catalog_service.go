package services

import (
	"context"
	"fmt"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

type TrainerCatalogService struct {
	profileRepo *repositories.CouchbaseTrainerProfileRepository
	reviewRepo  *repositories.CouchbaseReviewRepository
}

func NewTrainerCatalogService(profileRepo *repositories.CouchbaseTrainerProfileRepository, reviewRepo *repositories.CouchbaseReviewRepository) *TrainerCatalogService {
	return &TrainerCatalogService{
		profileRepo: profileRepo,
		reviewRepo:  reviewRepo,
	}
}

type TrainerSearchFilters struct {
	Specialization         string
	Location               string
	MinRating              float64
	AvailableForNewClients *bool
	Limit                  int
	Offset                 int
}

func (s *TrainerCatalogService) SearchTrainers(ctx context.Context, filters *TrainerSearchFilters) ([]models.TrainerWithProfile, int, error) {
	if filters.Limit == 0 {
		filters.Limit = 20
	}

	repoFilters := &repositories.TrainerFilters{
		Specialization:         filters.Specialization,
		Location:               filters.Location,
		MinRating:              filters.MinRating,
		AvailableForNewClients: filters.AvailableForNewClients,
	}

	// Get trainers with ratings
	var repoFiltersPtr *repositories.TrainerFilters
	if filters.Specialization != "" || filters.Location != "" || filters.MinRating > 0 || filters.AvailableForNewClients != nil {
		repoFiltersPtr = repoFilters
	}

	trainers, err := s.profileRepo.GetPublicTrainers(ctx, repoFiltersPtr, filters.Limit, filters.Offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get trainers: %w", err)
	}

	// Enrich with ratings
	for i := range trainers {
		avgRating, reviewCount, err := s.reviewRepo.GetAverageRating(ctx, trainers[i].UserID)
		if err == nil {
			trainers[i].AverageRating = avgRating
			trainers[i].ReviewCount = reviewCount
		}
	}

	count, _ := s.profileRepo.CountTrainers(ctx, repoFiltersPtr)
	return trainers, count, nil
}

func (s *TrainerCatalogService) GetTrainerProfile(ctx context.Context, trainerID string) (*models.TrainerWithProfile, error) {
	trainer, err := s.profileRepo.GetTrainerByID(ctx, trainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get trainer: %w", err)
	}
	if trainer == nil {
		return nil, nil
	}

	avgRating, reviewCount, err := s.reviewRepo.GetAverageRating(ctx, trainerID)
	if err == nil {
		trainer.AverageRating = avgRating
		trainer.ReviewCount = reviewCount
	}

	return trainer, nil
}

func (s *TrainerCatalogService) UpdateTrainerProfile(ctx context.Context, trainerID string, profile *models.TrainerProfile) error {
	err := s.profileRepo.UpdateTrainerProfile(ctx, trainerID, profile)
	if err != nil {
		return fmt.Errorf("failed to update trainer profile: %w", err)
	}
	return nil
}

func (s *TrainerCatalogService) ValidateProfileUpdate(profile *models.TrainerProfile) error {
	if profile.HourlyRate < 0 {
		return fmt.Errorf("hourly rate cannot be negative")
	}
	if profile.YearsOfExperience < 0 {
		return fmt.Errorf("years of experience cannot be negative")
	}
	return nil
}
