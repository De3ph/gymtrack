package services

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

type ReviewService struct {
	reviewRepo       *repositories.CouchbaseReviewRepository
	relationshipRepo *repositories.RelationshipRepository
}

func NewReviewService(reviewRepo *repositories.CouchbaseReviewRepository, relationshipRepo *repositories.RelationshipRepository) *ReviewService {
	return &ReviewService{
		reviewRepo:       reviewRepo,
		relationshipRepo: relationshipRepo,
	}
}

func (s *ReviewService) CreateReview(ctx context.Context, trainerID string, athleteID string, rating int, comment string) (*models.TrainerReview, error) {
	// Check if athlete has active relationship with trainer
	relationship, err := s.relationshipRepo.GetByAthleteID(athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to check relationship: %w", err)
	}

	hasActiveRelationship := relationship != nil && relationship.TrainerID == trainerID && relationship.Status == "active"

	if !hasActiveRelationship {
		return nil, fmt.Errorf("you must have an active relationship with this trainer to leave a review")
	}

	// Check if athlete already reviewed this trainer
	existingReview, err := s.reviewRepo.GetByAthleteID(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing review: %w", err)
	}
	if existingReview != nil {
		return nil, fmt.Errorf("you have already reviewed this trainer")
	}

	review := &models.TrainerReview{
		Type:      "review",
		ReviewID:  generateUUID(),
		TrainerID: trainerID,
		AthleteID: athleteID,
		Rating:    rating,
		Comment:   comment,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err = s.reviewRepo.CreateReview(ctx, review)
	if err != nil {
		return nil, fmt.Errorf("failed to create review: %w", err)
	}

	return review, nil
}

func (s *ReviewService) UpdateReview(ctx context.Context, reviewID string, athleteID string, rating int, comment string) error {
	review, err := s.reviewRepo.GetReviewByID(ctx, reviewID)
	if err != nil {
		return fmt.Errorf("failed to get review: %w", err)
	}
	if review == nil {
		return fmt.Errorf("review not found")
	}

	if review.AthleteID != athleteID {
		return fmt.Errorf("you can only edit your own reviews")
	}

	review.Rating = rating
	review.Comment = comment
	review.UpdatedAt = time.Now()

	err = s.reviewRepo.UpdateReview(ctx, review)
	if err != nil {
		return fmt.Errorf("failed to update review: %w", err)
	}

	return nil
}

func (s *ReviewService) DeleteReview(ctx context.Context, reviewID string, userID string) error {
	review, err := s.reviewRepo.GetReviewByID(ctx, reviewID)
	if err != nil {
		return fmt.Errorf("failed to get review: %w", err)
	}
	if review == nil {
		return fmt.Errorf("review not found")
	}

	if review.AthleteID != userID {
		return fmt.Errorf("you can only delete your own reviews")
	}

	err = s.reviewRepo.DeleteReview(ctx, reviewID)
	if err != nil {
		return fmt.Errorf("failed to delete review: %w", err)
	}

	return nil
}

func (s *ReviewService) GetTrainerReviews(ctx context.Context, trainerID string) ([]models.TrainerReview, error) {
	reviews, err := s.reviewRepo.GetByTrainerID(ctx, trainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get reviews: %w", err)
	}
	return reviews, nil
}

func (s *ReviewService) CanReview(athleteID string, trainerID string) bool {
	// This is a placeholder - in real implementation would check active relationship
	return true
}

func (s *ReviewService) CalculateTrainerStats(ctx context.Context, trainerID string) (float64, int, error) {
	return s.reviewRepo.GetAverageRating(ctx, trainerID)
}
