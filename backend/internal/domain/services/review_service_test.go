package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

// MockReviewRepository is a mock implementation of ReviewRepository
type MockReviewRepository struct {
	mock.Mock
}

func (m *MockReviewRepository) CreateReview(ctx context.Context, review *models.TrainerReview) error {
	args := m.Called(ctx, review)
	return args.Error(0)
}

func (m *MockReviewRepository) GetReviewByID(ctx context.Context, reviewID string) (*models.TrainerReview, error) {
	args := m.Called(ctx, reviewID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.TrainerReview), args.Error(1)
}

func (m *MockReviewRepository) GetByAthleteID(ctx context.Context, athleteID string) (*models.TrainerReview, error) {
	args := m.Called(ctx, athleteID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.TrainerReview), args.Error(1)
}

func (m *MockReviewRepository) GetByTrainerID(ctx context.Context, trainerID string) ([]models.TrainerReview, error) {
	args := m.Called(ctx, trainerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.TrainerReview), args.Error(1)
}

func (m *MockReviewRepository) UpdateReview(ctx context.Context, review *models.TrainerReview) error {
	args := m.Called(ctx, review)
	return args.Error(0)
}

func (m *MockReviewRepository) DeleteReview(ctx context.Context, reviewID string) error {
	args := m.Called(ctx, reviewID)
	return args.Error(0)
}

func (m *MockReviewRepository) GetAverageRating(ctx context.Context, trainerID string) (float64, int, error) {
	args := m.Called(ctx, trainerID)
	return args.Float(0), args.Int(1), args.Error(2)
}

// MockRelationshipRepository is a mock implementation of RelationshipRepository
type MockRelationshipRepository struct {
	mock.Mock
}

func (m *MockRelationshipRepository) GetByAthleteID(athleteID string) (*models.Relationship, error) {
	args := m.Called(athleteID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Relationship), args.Error(1)
}

// ReviewServiceTestSuite is the test suite for ReviewService
type ReviewServiceTestSuite struct {
	suite.Suite
	service              *ReviewService
	mockReviewRepo       *MockReviewRepository
	mockRelationshipRepo *MockRelationshipRepository
}

func (suite *ReviewServiceTestSuite) SetupTest() {
	suite.mockReviewRepo = new(MockReviewRepository)
	suite.mockRelationshipRepo = new(MockRelationshipRepository)
	suite.service = NewReviewService(suite.mockReviewRepo, suite.mockRelationshipRepo)
}

// Test data factory functions
func createTestReview(reviewID, trainerID, athleteID string, rating int, comment string) *models.TrainerReview {
	return &models.TrainerReview{
		Type:      "review",
		ReviewID:  reviewID,
		TrainerID: trainerID,
		AthleteID: athleteID,
		Rating:    rating,
		Comment:   comment,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
}

func createTestRelationship(relationshipID, trainerID, athleteID string, status models.RelationshipStatus) *models.Relationship {
	return &models.Relationship{
		RelationshipID: relationshipID,
		TrainerID:      trainerID,
		AthleteID:      athleteID,
		Status:         status,
		CreatedAt:      time.Now().UTC(),
		UpdatedAt:      time.Now().UTC(),
	}
}

// CreateReview Tests
func (suite *ReviewServiceTestSuite) TestCreateReview_Success() {
	ctx := context.Background()
	trainerID := "trainer-123"
	athleteID := "athlete-123"
	rating := 5
	comment := "Excellent trainer!"
	
	relationship := createTestRelationship("rel-123", trainerID, athleteID, models.RelationshipStatusActive)
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(relationship, nil)
	suite.mockReviewRepo.On("GetByAthleteID", ctx, athleteID).Return(nil, errors.New("not found"))
	suite.mockReviewRepo.On("CreateReview", ctx, mock.AnythingOfType("*models.TrainerReview")).Return(nil)
	
	review, err := suite.service.CreateReview(ctx, trainerID, athleteID, rating, comment)
	
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), review)
	assert.Equal(suite.T(), trainerID, review.TrainerID)
	assert.Equal(suite.T(), athleteID, review.AthleteID)
	assert.Equal(suite.T(), rating, review.Rating)
	assert.Equal(suite.T(), comment, review.Comment)
	assert.Equal(suite.T(), "review", review.Type)
	assert.NotEmpty(suite.T(), review.ReviewID)
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestCreateReview_NoActiveRelationship() {
	ctx := context.Background()
	trainerID := "trainer-123"
	athleteID := "athlete-123"
	rating := 5
	comment := "Excellent trainer!"
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(nil, errors.New("not found"))
	
	review, err := suite.service.CreateReview(ctx, trainerID, athleteID, rating, comment)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), review)
	assert.Contains(suite.T(), err.Error(), "you must have an active relationship with this trainer to leave a review")
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestCreateReview_RelationshipWithDifferentTrainer() {
	ctx := context.Background()
	trainerID := "trainer-123"
	athleteID := "athlete-123"
	rating := 5
	comment := "Excellent trainer!"
	
	// Active relationship with a different trainer
	relationship := createTestRelationship("rel-123", "different-trainer", athleteID, models.RelationshipStatusActive)
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(relationship, nil)
	
	review, err := suite.service.CreateReview(ctx, trainerID, athleteID, rating, comment)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), review)
	assert.Contains(suite.T(), err.Error(), "you must have an active relationship with this trainer to leave a review")
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestCreateReview_RelationshipNotActive() {
	ctx := context.Background()
	trainerID := "trainer-123"
	athleteID := "athlete-123"
	rating := 5
	comment := "Excellent trainer!"
	
	// Relationship exists but is not active
	relationship := createTestRelationship("rel-123", trainerID, athleteID, models.RelationshipStatusPending)
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(relationship, nil)
	
	review, err := suite.service.CreateReview(ctx, trainerID, athleteID, rating, comment)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), review)
	assert.Contains(suite.T(), err.Error(), "you must have an active relationship with this trainer to leave a review")
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestCreateReview_AlreadyReviewed() {
	ctx := context.Background()
	trainerID := "trainer-123"
	athleteID := "athlete-123"
	rating := 5
	comment := "Excellent trainer!"
	
	relationship := createTestRelationship("rel-123", trainerID, athleteID, models.RelationshipStatusActive)
	existingReview := createTestReview("review-123", trainerID, athleteID, 4, "Previous review")
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(relationship, nil)
	suite.mockReviewRepo.On("GetByAthleteID", ctx, athleteID).Return(existingReview, nil)
	
	review, err := suite.service.CreateReview(ctx, trainerID, athleteID, rating, comment)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), review)
	assert.Equal(suite.T(), "you have already reviewed this trainer", err.Error())
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestCreateReview_RepositoryError() {
	ctx := context.Background()
	trainerID := "trainer-123"
	athleteID := "athlete-123"
	rating := 5
	comment := "Excellent trainer!"
	
	relationship := createTestRelationship("rel-123", trainerID, athleteID, models.RelationshipStatusActive)
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(relationship, nil)
	suite.mockReviewRepo.On("GetByAthleteID", ctx, athleteID).Return(nil, errors.New("not found"))
	suite.mockReviewRepo.On("CreateReview", ctx, mock.AnythingOfType("*models.TrainerReview")).Return(errors.New("database error"))
	
	review, err := suite.service.CreateReview(ctx, trainerID, athleteID, rating, comment)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), review)
	assert.Contains(suite.T(), err.Error(), "failed to create review")
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestCreateReview_EmptyComment() {
	ctx := context.Background()
	trainerID := "trainer-123"
	athleteID := "athlete-123"
	rating := 4
	comment := "" // Empty comment should be allowed
	
	relationship := createTestRelationship("rel-123", trainerID, athleteID, models.RelationshipStatusActive)
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(relationship, nil)
	suite.mockReviewRepo.On("GetByAthleteID", ctx, athleteID).Return(nil, errors.New("not found"))
	suite.mockReviewRepo.On("CreateReview", ctx, mock.AnythingOfType("*models.TrainerReview")).Return(nil)
	
	review, err := suite.service.CreateReview(ctx, trainerID, athleteID, rating, comment)
	
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), review)
	assert.Equal(suite.T(), comment, review.Comment)
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

// UpdateReview Tests
func (suite *ReviewServiceTestSuite) TestUpdateReview_Success() {
	ctx := context.Background()
	reviewID := "review-123"
	athleteID := "athlete-123"
	newRating := 4
	newComment := "Updated review"
	
	review := createTestReview(reviewID, "trainer-123", athleteID, 5, "Original review")
	
	suite.mockReviewRepo.On("GetReviewByID", ctx, reviewID).Return(review, nil)
	suite.mockReviewRepo.On("UpdateReview", ctx, mock.AnythingOfType("*models.TrainerReview")).Return(nil)
	
	err := suite.service.UpdateReview(ctx, reviewID, athleteID, newRating, newComment)
	
	assert.NoError(suite.T(), err)
	
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestUpdateReview_ReviewNotFound() {
	ctx := context.Background()
	reviewID := "nonexistent"
	athleteID := "athlete-123"
	newRating := 4
	newComment := "Updated review"
	
	suite.mockReviewRepo.On("GetReviewByID", ctx, reviewID).Return(nil, errors.New("not found"))
	
	err := suite.service.UpdateReview(ctx, reviewID, athleteID, newRating, newComment)
	
	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "failed to get review")
	
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestUpdateReview_NotAuthor() {
	ctx := context.Background()
	reviewID := "review-123"
	athleteID := "athlete-456" // Different athlete
	newRating := 4
	newComment := "Updated review"
	
	review := createTestReview(reviewID, "trainer-123", "athlete-123", 5, "Original review")
	
	suite.mockReviewRepo.On("GetReviewByID", ctx, reviewID).Return(review, nil)
	
	err := suite.service.UpdateReview(ctx, reviewID, athleteID, newRating, newComment)
	
	assert.Error(suite.T(), err)
	assert.Equal(suite.T(), "you can only edit your own reviews", err.Error())
	
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestUpdateReview_UpdateError() {
	ctx := context.Background()
	reviewID := "review-123"
	athleteID := "athlete-123"
	newRating := 4
	newComment := "Updated review"
	
	review := createTestReview(reviewID, "trainer-123", athleteID, 5, "Original review")
	
	suite.mockReviewRepo.On("GetReviewByID", ctx, reviewID).Return(review, nil)
	suite.mockReviewRepo.On("UpdateReview", ctx, mock.AnythingOfType("*models.TrainerReview")).Return(errors.New("database error"))
	
	err := suite.service.UpdateReview(ctx, reviewID, athleteID, newRating, newComment)
	
	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "failed to update review")
	
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

// DeleteReview Tests
func (suite *ReviewServiceTestSuite) TestDeleteReview_Success() {
	ctx := context.Background()
	reviewID := "review-123"
	userID := "athlete-123"
	
	review := createTestReview(reviewID, "trainer-123", userID, 5, "Great trainer")
	
	suite.mockReviewRepo.On("GetReviewByID", ctx, reviewID).Return(review, nil)
	suite.mockReviewRepo.On("DeleteReview", ctx, reviewID).Return(nil)
	
	err := suite.service.DeleteReview(ctx, reviewID, userID)
	
	assert.NoError(suite.T(), err)
	
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestDeleteReview_ReviewNotFound() {
	ctx := context.Background()
	reviewID := "nonexistent"
	userID := "athlete-123"
	
	suite.mockReviewRepo.On("GetReviewByID", ctx, reviewID).Return(nil, errors.New("not found"))
	
	err := suite.service.DeleteReview(ctx, reviewID, userID)
	
	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "failed to get review")
	
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestDeleteReview_NotAuthor() {
	ctx := context.Background()
	reviewID := "review-123"
	userID := "athlete-456" // Different user
	
	review := createTestReview(reviewID, "trainer-123", "athlete-123", 5, "Great trainer")
	
	suite.mockReviewRepo.On("GetReviewByID", ctx, reviewID).Return(review, nil)
	
	err := suite.service.DeleteReview(ctx, reviewID, userID)
	
	assert.Error(suite.T(), err)
	assert.Equal(suite.T(), "you can only delete your own reviews", err.Error())
	
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestDeleteReview_DeleteError() {
	ctx := context.Background()
	reviewID := "review-123"
	userID := "athlete-123"
	
	review := createTestReview(reviewID, "trainer-123", userID, 5, "Great trainer")
	
	suite.mockReviewRepo.On("GetReviewByID", ctx, reviewID).Return(review, nil)
	suite.mockReviewRepo.On("DeleteReview", ctx, reviewID).Return(errors.New("database error"))
	
	err := suite.service.DeleteReview(ctx, reviewID, userID)
	
	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "failed to delete review")
	
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

// GetTrainerReviews Tests
func (suite *ReviewServiceTestSuite) TestGetTrainerReviews_Success() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	reviews := []models.TrainerReview{
		*createTestReview("review-1", trainerID, "athlete-123", 5, "Excellent"),
		*createTestReview("review-2", trainerID, "athlete-456", 4, "Very good"),
	}
	
	suite.mockReviewRepo.On("GetByTrainerID", ctx, trainerID).Return(reviews, nil)
	
	result, err := suite.service.GetTrainerReviews(ctx, trainerID)
	
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), reviews, result)
	
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestGetTrainerReviews_RepositoryError() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	suite.mockReviewRepo.On("GetByTrainerID", ctx, trainerID).Return(nil, errors.New("database error"))
	
	result, err := suite.service.GetTrainerReviews(ctx, trainerID)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), result)
	assert.Contains(suite.T(), err.Error(), "failed to get reviews")
	
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestGetTrainerReviews_EmptyReviews() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	reviews := []models.TrainerReview{}
	
	suite.mockReviewRepo.On("GetByTrainerID", ctx, trainerID).Return(reviews, nil)
	
	result, err := suite.service.GetTrainerReviews(ctx, trainerID)
	
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), reviews, result)
	
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

// CanReview Tests
func (suite *ReviewServiceTestSuite) TestCanReview_True() {
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	
	relationship := createTestRelationship("rel-123", trainerID, athleteID, models.RelationshipStatusActive)
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(relationship, nil)
	
	result := suite.service.CanReview(athleteID, trainerID)
	
	assert.True(suite.T(), result)
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestCanReview_False_NoRelationship() {
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(nil, errors.New("not found"))
	
	result := suite.service.CanReview(athleteID, trainerID)
	
	assert.False(suite.T(), result)
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestCanReview_False_DifferentTrainer() {
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	
	relationship := createTestRelationship("rel-123", "different-trainer", athleteID, models.RelationshipStatusActive)
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(relationship, nil)
	
	result := suite.service.CanReview(athleteID, trainerID)
	
	assert.False(suite.T(), result)
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestCanReview_False_NotActive() {
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	
	relationship := createTestRelationship("rel-123", trainerID, athleteID, models.RelationshipStatusPending)
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(relationship, nil)
	
	result := suite.service.CanReview(athleteID, trainerID)
	
	assert.False(suite.T(), result)
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

// CalculateTrainerStats Tests
func (suite *ReviewServiceTestSuite) TestCalculateTrainerStats_Success() {
	ctx := context.Background()
	trainerID := "trainer-123"
	averageRating := 4.5
	totalReviews := 10
	
	suite.mockReviewRepo.On("GetAverageRating", ctx, trainerID).Return(averageRating, totalReviews, nil)
	
	rating, count, err := suite.service.CalculateTrainerStats(ctx, trainerID)
	
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), averageRating, rating)
	assert.Equal(suite.T(), totalReviews, count)
	
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestCalculateTrainerStats_RepositoryError() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	suite.mockReviewRepo.On("GetAverageRating", ctx, trainerID).Return(0.0, 0, errors.New("database error"))
	
	rating, count, err := suite.service.CalculateTrainerStats(ctx, trainerID)
	
	assert.Error(suite.T(), err)
	assert.Equal(suite.T(), 0.0, rating)
	assert.Equal(suite.T(), 0, count)
	
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

func (suite *ReviewServiceTestSuite) TestCalculateTrainerStats_NoReviews() {
	ctx := context.Background()
	trainerID := "trainer-123"
	averageRating := 0.0
	totalReviews := 0
	
	suite.mockReviewRepo.On("GetAverageRating", ctx, trainerID).Return(averageRating, totalReviews, nil)
	
	rating, count, err := suite.service.CalculateTrainerStats(ctx, trainerID)
	
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), averageRating, rating)
	assert.Equal(suite.T(), totalReviews, count)
	
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

// Test runner
func TestReviewServiceSuite(t *testing.T) {
	suite.Run(t, new(ReviewServiceTestSuite))
}
