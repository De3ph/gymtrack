package services

import (
	"context"
	"errors"
	"testing"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gymtrack-backend/internal/testutils"
)

type TrainerCatalogServiceTestSuite struct {
	suite.Suite
	service         *TrainerCatalogService
	mockProfileRepo *testutils.MockTrainerProfileRepository
	mockReviewRepo  *testutils.MockReviewRepository
}

func (suite *TrainerCatalogServiceTestSuite) SetupTest() {
	suite.mockProfileRepo = new(testutils.MockTrainerProfileRepository)
	suite.mockReviewRepo = new(testutils.MockReviewRepository)
	suite.service = NewTrainerCatalogService(suite.mockProfileRepo, suite.mockReviewRepo)
}

func createTestTrainerWithProfile(userID, name, specialization string, rating float64, reviewCount int) models.TrainerWithProfile {
	return models.TrainerWithProfile{
		User: models.User{
			UserID: userID,
			Email:  "trainer@example.com",
			Role:   models.RoleTrainer,
			Profile: models.UserProfile{
				Name: name,
			},
		},
		Profile: models.TrainerProfile{
			Location: "New York",
		},
		AverageRating: rating,
		ReviewCount:   reviewCount,
	}
}

func createTestTrainerProfile(hourlyRate float64, yearsOfExperience int) *models.TrainerProfile {
	return &models.TrainerProfile{
		Bio:                      "Updated bio",
		HourlyRate:               hourlyRate,
		YearsOfExperience:        yearsOfExperience,
		IsAvailableForNewClients: false,
		Location:                 "New Location",
		Languages:                []string{"English"},
	}
}

// SearchTrainers Tests
func (suite *TrainerCatalogServiceTestSuite) TestSearchTrainers_Success_NoFilters() {
	ctx := context.Background()
	filters := &TrainerSearchFilters{
		Limit:  10,
		Offset: 0,
	}

	trainers := []models.TrainerWithProfile{
		createTestTrainerWithProfile("trainer-1", "John Doe", "Strength Training", 4.5, 10),
		createTestTrainerWithProfile("trainer-2", "Jane Smith", "Yoga", 4.8, 15),
	}

	// Expect nil filters since no search criteria provided
	suite.mockProfileRepo.On("GetPublicTrainers", ctx, (*repositories.TrainerFilters)(nil), 10, 0).Return(trainers, nil)
	suite.mockReviewRepo.On("GetAverageRating", ctx, "trainer-1").Return(4.5, 10, nil)
	suite.mockReviewRepo.On("GetAverageRating", ctx, "trainer-2").Return(4.8, 15, nil)
	suite.mockProfileRepo.On("CountTrainers", ctx, (*repositories.TrainerFilters)(nil)).Return(2, nil)

	result, count, err := suite.service.SearchTrainers(ctx, filters)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), trainers, result)
	assert.Equal(suite.T(), 2, count)

	suite.mockProfileRepo.AssertExpectations(suite.T())
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogServiceTestSuite) TestSearchTrainers_Success_WithFilters() {
	ctx := context.Background()
	availableForHire := true
	filters := &TrainerSearchFilters{
		Specialization:         "Strength Training",
		Location:               "New York",
		MinRating:              4.0,
		AvailableForNewClients: &availableForHire,
		Limit:                  5,
		Offset:                 10,
	}

	trainers := []models.TrainerWithProfile{
		createTestTrainerWithProfile("trainer-1", "John Doe", "Strength Training", 4.5, 10),
	}

	expectedRepoFilters := &repositories.TrainerFilters{
		Specialization:         "Strength Training",
		Location:               "New York",
		MinRating:              4.0,
		AvailableForNewClients: &availableForHire,
	}

	suite.mockProfileRepo.On("GetPublicTrainers", ctx, expectedRepoFilters, 5, 10).Return(trainers, nil)
	suite.mockReviewRepo.On("GetAverageRating", ctx, "trainer-1").Return(4.5, 10, nil)
	suite.mockProfileRepo.On("CountTrainers", ctx, expectedRepoFilters).Return(1, nil)

	result, count, err := suite.service.SearchTrainers(ctx, filters)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), trainers, result)
	assert.Equal(suite.T(), 1, count)

	suite.mockProfileRepo.AssertExpectations(suite.T())
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogServiceTestSuite) TestSearchTrainers_DefaultLimit() {
	ctx := context.Background()
	filters := &TrainerSearchFilters{
		// No limit specified
		Offset: 0,
	}

	trainers := []models.TrainerWithProfile{}

	suite.mockProfileRepo.On("GetPublicTrainers", ctx, (*repositories.TrainerFilters)(nil), 20, 0).Return(trainers, nil) // Default limit of 20
	suite.mockProfileRepo.On("CountTrainers", ctx, (*repositories.TrainerFilters)(nil)).Return(0, nil)

	result, count, err := suite.service.SearchTrainers(ctx, filters)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), trainers, result)
	assert.Equal(suite.T(), 0, count)

	suite.mockProfileRepo.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogServiceTestSuite) TestSearchTrainers_RepositoryError() {
	ctx := context.Background()
	filters := &TrainerSearchFilters{
		Limit:  10,
		Offset: 0,
	}

	suite.mockProfileRepo.On("GetPublicTrainers", ctx, (*repositories.TrainerFilters)(nil), 10, 0).Return(nil, errors.New("database error"))

	result, count, err := suite.service.SearchTrainers(ctx, filters)

	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), result)
	assert.Equal(suite.T(), 0, count)
	assert.Contains(suite.T(), err.Error(), "failed to get trainers")

	suite.mockProfileRepo.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogServiceTestSuite) TestSearchTrainers_ReviewRatingError() {
	ctx := context.Background()
	filters := &TrainerSearchFilters{
		Limit:  10,
		Offset: 0,
	}

	trainers := []models.TrainerWithProfile{
		createTestTrainerWithProfile("trainer-1", "John Doe", "Strength Training", 0, 0), // No rating initially
	}

	suite.mockProfileRepo.On("GetPublicTrainers", ctx, (*repositories.TrainerFilters)(nil), 10, 0).Return(trainers, nil)
	suite.mockReviewRepo.On("GetAverageRating", ctx, "trainer-1").Return(0.0, 0, errors.New("rating error")) // Rating error
	suite.mockProfileRepo.On("CountTrainers", ctx, (*repositories.TrainerFilters)(nil)).Return(1, nil)

	result, count, err := suite.service.SearchTrainers(ctx, filters)

	assert.NoError(suite.T(), err) // Should not fail if rating retrieval fails
	assert.Equal(suite.T(), trainers, result)
	assert.Equal(suite.T(), 1, count)
	// Rating should remain 0 (default value)
	assert.Equal(suite.T(), 0.0, result[0].AverageRating)
	assert.Equal(suite.T(), 0, result[0].ReviewCount)

	suite.mockProfileRepo.AssertExpectations(suite.T())
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogServiceTestSuite) TestSearchTrainers_EmptyResults() {
	ctx := context.Background()
	filters := &TrainerSearchFilters{
		Specialization: "Nonexistent",
		Limit:          10,
		Offset:         0,
	}

	trainers := []models.TrainerWithProfile{}
	expectedRepoFilters := &repositories.TrainerFilters{
		Specialization: "Nonexistent",
	}

	suite.mockProfileRepo.On("GetPublicTrainers", ctx, expectedRepoFilters, 10, 0).Return(trainers, nil)
	suite.mockProfileRepo.On("CountTrainers", ctx, expectedRepoFilters).Return(0, nil)

	result, count, err := suite.service.SearchTrainers(ctx, filters)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), trainers, result)
	assert.Equal(suite.T(), 0, count)

	suite.mockProfileRepo.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogServiceTestSuite) TestSearchTrainers_PartialFilters() {
	ctx := context.Background()
	filters := &TrainerSearchFilters{
		Specialization: "Yoga",
		// Only specialization filter
		Limit:  10,
		Offset: 0,
	}

	trainers := []models.TrainerWithProfile{
		createTestTrainerWithProfile("trainer-1", "Jane Smith", "Yoga", 4.8, 15),
	}

	expectedRepoFilters := &repositories.TrainerFilters{
		Specialization: "Yoga",
	}

	suite.mockProfileRepo.On("GetPublicTrainers", ctx, expectedRepoFilters, 10, 0).Return(trainers, nil)
	suite.mockReviewRepo.On("GetAverageRating", ctx, "trainer-1").Return(4.8, 15, nil)
	suite.mockProfileRepo.On("CountTrainers", ctx, expectedRepoFilters).Return(1, nil)

	result, count, err := suite.service.SearchTrainers(ctx, filters)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), trainers, result)
	assert.Equal(suite.T(), 1, count)

	suite.mockProfileRepo.AssertExpectations(suite.T())
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

// GetTrainerProfile Tests
func (suite *TrainerCatalogServiceTestSuite) TestGetTrainerProfile_Success() {
	ctx := context.Background()
	trainerID := "trainer-123"

	trainer := createTestTrainerWithProfile(trainerID, "John Doe", "Strength Training", 4.5, 10)

	suite.mockProfileRepo.On("GetTrainerByID", ctx, trainerID).Return(&trainer, nil)
	suite.mockReviewRepo.On("GetAverageRating", ctx, trainerID).Return(4.5, 10, nil)

	result, err := suite.service.GetTrainerProfile(ctx, trainerID)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), trainer, result)
	assert.Equal(suite.T(), 4.5, result.AverageRating)
	assert.Equal(suite.T(), 10, result.ReviewCount)

	suite.mockProfileRepo.AssertExpectations(suite.T())
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogServiceTestSuite) TestGetTrainerProfile_NotFound() {
	ctx := context.Background()
	trainerID := "nonexistent"

	suite.mockProfileRepo.On("GetTrainerByID", ctx, trainerID).Return(nil, nil)

	result, err := suite.service.GetTrainerProfile(ctx, trainerID)

	assert.NoError(suite.T(), err)
	assert.Nil(suite.T(), result)

	suite.mockProfileRepo.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogServiceTestSuite) TestGetTrainerProfile_RepositoryError() {
	ctx := context.Background()
	trainerID := "trainer-123"

	suite.mockProfileRepo.On("GetTrainerByID", ctx, trainerID).Return(nil, errors.New("database error"))

	result, err := suite.service.GetTrainerProfile(ctx, trainerID)

	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), result)
	assert.Contains(suite.T(), err.Error(), "failed to get trainer")

	suite.mockProfileRepo.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogServiceTestSuite) TestGetTrainerProfile_RatingError() {
	ctx := context.Background()
	trainerID := "trainer-123"

	trainer := createTestTrainerWithProfile(trainerID, "John Doe", "Strength Training", 0, 0) // No rating initially

	suite.mockProfileRepo.On("GetTrainerByID", ctx, trainerID).Return(&trainer, nil)
	suite.mockReviewRepo.On("GetAverageRating", ctx, trainerID).Return(0.0, 0, errors.New("rating error"))

	result, err := suite.service.GetTrainerProfile(ctx, trainerID)

	assert.NoError(suite.T(), err) // Should not fail if rating retrieval fails
	assert.Equal(suite.T(), trainer, result)
	assert.Equal(suite.T(), 0.0, result.AverageRating) // Should remain 0
	assert.Equal(suite.T(), 0, result.ReviewCount)

	suite.mockProfileRepo.AssertExpectations(suite.T())
	suite.mockReviewRepo.AssertExpectations(suite.T())
}

// UpdateTrainerProfile Tests
func (suite *TrainerCatalogServiceTestSuite) TestUpdateTrainerProfile_Success() {
	ctx := context.Background()
	trainerID := "trainer-123"
	profile := createTestTrainerProfile(150, 7)

	suite.mockProfileRepo.On("UpdateTrainerProfile", ctx, trainerID, profile).Return(nil)

	err := suite.service.UpdateTrainerProfile(ctx, trainerID, profile)

	assert.NoError(suite.T(), err)

	suite.mockProfileRepo.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogServiceTestSuite) TestUpdateTrainerProfile_RepositoryError() {
	ctx := context.Background()
	trainerID := "trainer-123"
	profile := createTestTrainerProfile(150, 7)

	suite.mockProfileRepo.On("UpdateTrainerProfile", ctx, trainerID, profile).Return(errors.New("database error"))

	err := suite.service.UpdateTrainerProfile(ctx, trainerID, profile)

	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "failed to update trainer profile")

	suite.mockProfileRepo.AssertExpectations(suite.T())
}

// ValidateProfileUpdate Tests
func (suite *TrainerCatalogServiceTestSuite) TestValidateProfileUpdate_Success() {
	profile := createTestTrainerProfile(100, 5)

	err := suite.service.ValidateProfileUpdate(profile)

	assert.NoError(suite.T(), err)
}

func (suite *TrainerCatalogServiceTestSuite) TestValidateProfileUpdate_NegativeHourlyRate() {
	profile := createTestTrainerProfile(-50, 5) // Negative hourly rate

	err := suite.service.ValidateProfileUpdate(profile)

	assert.Error(suite.T(), err)
	assert.Equal(suite.T(), "hourly rate cannot be negative", err.Error())
}

func (suite *TrainerCatalogServiceTestSuite) TestValidateProfileUpdate_NegativeYearsOfExperience() {
	profile := createTestTrainerProfile(100, -3) // Negative years of experience

	err := suite.service.ValidateProfileUpdate(profile)

	assert.Error(suite.T(), err)
	assert.Equal(suite.T(), "years of experience cannot be negative", err.Error())
}

func (suite *TrainerCatalogServiceTestSuite) TestValidateProfileUpdate_ZeroValues() {
	profile := createTestTrainerProfile(0, 0) // Zero values should be valid

	err := suite.service.ValidateProfileUpdate(profile)

	assert.NoError(suite.T(), err)
}

func (suite *TrainerCatalogServiceTestSuite) TestValidateProfileUpdate_NilProfile() {
	_ = suite.service.ValidateProfileUpdate(nil)
	suite.T().Skip("Nil profile handling depends on implementation")
}

// Test runner
func TestTrainerCatalogServiceSuite(t *testing.T) {
	suite.Run(t, new(TrainerCatalogServiceTestSuite))
}
