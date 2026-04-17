package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

// MockReviewService is a mock implementation of ReviewService
type MockReviewService struct {
	mock.Mock
}

func (m *MockReviewService) CreateReview(ctx context.Context, trainerID string, athleteID string, rating int, comment string) (*models.TrainerReview, error) {
	args := m.Called(ctx, trainerID, athleteID, rating, comment)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.TrainerReview), args.Error(1)
}

func (m *MockReviewService) GetTrainerReviews(ctx context.Context, trainerID string) ([]*models.TrainerReview, error) {
	args := m.Called(ctx, trainerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.TrainerReview), args.Error(1)
}

func (m *MockReviewService) UpdateReview(ctx context.Context, reviewID string, athleteID string, rating int, comment string) error {
	args := m.Called(ctx, reviewID, athleteID, rating, comment)
	return args.Error(0)
}

func (m *MockReviewService) DeleteReview(ctx context.Context, reviewID string, athleteID string) error {
	args := m.Called(ctx, reviewID, athleteID)
	return args.Error(0)
}

// ReviewHandlerTestSuite is the test suite for ReviewHandler
type ReviewHandlerTestSuite struct {
	suite.Suite
	handler           *ReviewHandler
	mockReviewService *MockReviewService
}

func (suite *ReviewHandlerTestSuite) SetupTest() {
	suite.mockReviewService = new(MockReviewService)
	suite.handler = NewReviewHandler(suite.mockReviewService)
}

// Test data factory functions
func createTestReview(id, trainerID, athleteID string, rating int, comment string) *models.TrainerReview {
	return &models.TrainerReview{
		ID:        id,
		TrainerID: trainerID,
		AthleteID: athleteID,
		Rating:    rating,
		Comment:   comment,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
}

// Helper function to create Gin context with user authentication
func createTestContext(method, path string, body interface{}, userID string, userRole models.UserRole) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	
	var req *http.Request
	if body != nil {
		jsonBody, _ := json.Marshal(body)
		req = httptest.NewRequest(method, path, bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	
	// Set user authentication context
	c.Set("userID", userID)
	c.Set("userRole", userRole)
	
	return c, w
}

// CreateReview Tests
func (suite *ReviewHandlerTestSuite) TestCreateReview_Success() {
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	rating := 5
	comment := "Excellent trainer, very knowledgeable!"
	review := createTestReview("review-123", trainerID, athleteID, rating, comment)
	
	req := CreateReviewRequest{
		Rating:  rating,
		Comment: comment,
	}
	
	suite.mockReviewService.On("CreateReview", mock.AnythingOfType("*gin.Context"), trainerID, athleteID, rating, comment).Return(review, nil)
	
	c, w := createTestContext("POST", "/api/trainers/"+trainerID+"/reviews", req, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.CreateReview(c)
	
	assert.Equal(suite.T(), http.StatusCreated, w.Code)
	
	var response models.TrainerReview
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), review.ID, response.ID)
	assert.Equal(suite.T(), review.TrainerID, response.TrainerID)
	assert.Equal(suite.T(), review.AthleteID, response.AthleteID)
	assert.Equal(suite.T(), review.Rating, response.Rating)
	assert.Equal(suite.T(), review.Comment, response.Comment)
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

func (suite *ReviewHandlerTestSuite) TestCreateReview_Unauthorized() {
	trainerID := "trainer-123"
	req := CreateReviewRequest{
		Rating:  5,
		Comment: "Great trainer",
	}
	
	c, w := createTestContext("POST", "/api/trainers/"+trainerID+"/reviews", req, "", models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.CreateReview(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "unauthorized", response["error"])
}

func (suite *ReviewHandlerTestSuite) TestCreateReview_Forbidden_Trainer() {
	trainerID := "trainer-123"
	req := CreateReviewRequest{
		Rating:  5,
		Comment: "Great trainer",
	}
	
	c, w := createTestContext("POST", "/api/trainers/"+trainerID+"/reviews", req, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.CreateReview(c)
	
	assert.Equal(suite.T(), http.StatusForbidden, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "only athletes can create reviews", response["error"])
}

func (suite *ReviewHandlerTestSuite) TestCreateReview_InvalidJSON() {
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	
	c, w := createTestContext("POST", "/api/trainers/"+trainerID+"/reviews", "invalid json", athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.CreateReview(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Contains(suite.T(), response["error"], "invalid character")
}

func (suite *ReviewHandlerTestSuite) TestCreateReview_MissingRating() {
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	req := CreateReviewRequest{
		Rating:  0, // Invalid rating
		Comment: "Great trainer",
	}
	
	c, w := createTestContext("POST", "/api/trainers/"+trainerID+"/reviews", req, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.CreateReview(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Contains(suite.T(), response["error"], "Rating")
}

func (suite *ReviewHandlerTestSuite) TestCreateReview_InvalidRating_TooLow() {
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	req := CreateReviewRequest{
		Rating:  0, // Below minimum
		Comment: "Great trainer",
	}
	
	c, w := createTestContext("POST", "/api/trainers/"+trainerID+"/reviews", req, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.CreateReview(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Contains(suite.T(), response["error"], "Rating")
}

func (suite *ReviewHandlerTestSuite) TestCreateReview_InvalidRating_TooHigh() {
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	req := CreateReviewRequest{
		Rating:  6, // Above maximum
		Comment: "Great trainer",
	}
	
	c, w := createTestContext("POST", "/api/trainers/"+trainerID+"/reviews", req, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.CreateReview(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Contains(suite.T(), response["error"], "Rating")
}

func (suite *ReviewHandlerTestSuite) TestCreateReview_ServiceError() {
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	rating := 5
	comment := "Great trainer"
	
	req := CreateReviewRequest{
		Rating:  rating,
		Comment: comment,
	}
	
	suite.mockReviewService.On("CreateReview", mock.AnythingOfType("*gin.Context"), trainerID, athleteID, rating, comment).Return(nil, errors.New("no active relationship with trainer"))
	
	c, w := createTestContext("POST", "/api/trainers/"+trainerID+"/reviews", req, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.CreateReview(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "no active relationship with trainer", response["error"])
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

func (suite *ReviewHandlerTestSuite) TestCreateReview_EmptyComment() {
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	rating := 4
	comment := ""
	review := createTestReview("review-123", trainerID, athleteID, rating, comment)
	
	req := CreateReviewRequest{
		Rating:  rating,
		Comment: comment, // Empty comment should be allowed
	}
	
	suite.mockReviewService.On("CreateReview", mock.AnythingOfType("*gin.Context"), trainerID, athleteID, rating, comment).Return(review, nil)
	
	c, w := createTestContext("POST", "/api/trainers/"+trainerID+"/reviews", req, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.CreateReview(c)
	
	assert.Equal(suite.T(), http.StatusCreated, w.Code)
	
	var response models.TrainerReview
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), review.ID, response.ID)
	assert.Equal(suite.T(), review.Comment, response.Comment)
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

func (suite *ReviewHandlerTestSuite) TestCreateReview_AllRatingValues() {
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	
	// Test all valid rating values (1-5)
	for rating := 1; rating <= 5; rating++ {
		comment := "Rating " + string(rating+'0')
		review := createTestReview("review-123", trainerID, athleteID, rating, comment)
		
		req := CreateReviewRequest{
			Rating:  rating,
			Comment: comment,
		}
		
		suite.mockReviewService.On("CreateReview", mock.AnythingOfType("*gin.Context"), trainerID, athleteID, rating, comment).Return(review, nil).Once()
		
		c, w := createTestContext("POST", "/api/trainers/"+trainerID+"/reviews", req, athleteID, models.RoleAthlete)
		c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
		suite.handler.CreateReview(c)
		
		assert.Equal(suite.T(), http.StatusCreated, w.Code)
	}
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

// GetTrainerReviews Tests
func (suite *ReviewHandlerTestSuite) TestGetTrainerReviews_Success() {
	trainerID := "trainer-123"
	reviews := []*models.TrainerReview{
		createTestReview("review-1", trainerID, "athlete-123", 5, "Excellent trainer"),
		createTestReview("review-2", trainerID, "athlete-456", 4, "Very good"),
		createTestReview("review-3", trainerID, "athlete-789", 3, "Average experience"),
	}
	
	suite.mockReviewService.On("GetTrainerReviews", mock.AnythingOfType("*gin.Context"), trainerID).Return(reviews, nil)
	
	c, w := createTestContext("GET", "/api/trainers/"+trainerID+"/reviews", nil, "", models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.GetTrainerReviews(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response["reviews"])
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

func (suite *ReviewHandlerTestSuite) TestGetTrainerReviews_EmptyReviews() {
	trainerID := "trainer-123"
	reviews := []*models.TrainerReview{}
	
	suite.mockReviewService.On("GetTrainerReviews", mock.AnythingOfType("*gin.Context"), trainerID).Return(reviews, nil)
	
	c, w := createTestContext("GET", "/api/trainers/"+trainerID+"/reviews", nil, "", models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.GetTrainerReviews(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response["reviews"])
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

func (suite *ReviewHandlerTestSuite) TestGetTrainerReviews_ServiceError() {
	trainerID := "trainer-123"
	
	suite.mockReviewService.On("GetTrainerReviews", mock.AnythingOfType("*gin.Context"), trainerID).Return(nil, errors.New("trainer not found"))
	
	c, w := createTestContext("GET", "/api/trainers/"+trainerID+"/reviews", nil, "", models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.GetTrainerReviews(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "trainer not found", response["error"])
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

func (suite *ReviewHandlerTestSuite) TestGetTrainerReviews_PublicAccess() {
	trainerID := "trainer-123"
	reviews := []*models.TrainerReview{
		createTestReview("review-1", trainerID, "athlete-123", 5, "Excellent trainer"),
	}
	
	suite.mockReviewService.On("GetTrainerReviews", mock.AnythingOfType("*gin.Context"), trainerID).Return(reviews, nil)
	
	// Test without authentication (should work for public access)
	c, w := createTestContext("GET", "/api/trainers/"+trainerID+"/reviews", nil, "", "")
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.GetTrainerReviews(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response["reviews"])
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

// UpdateReview Tests
func (suite *ReviewHandlerTestSuite) TestUpdateReview_Success() {
	athleteID := "athlete-123"
	reviewID := "review-123"
	rating := 4
	comment := "Updated comment"
	
	req := UpdateReviewRequest{
		Rating:  rating,
		Comment: comment,
	}
	
	suite.mockReviewService.On("UpdateReview", mock.AnythingOfType("*gin.Context"), reviewID, athleteID, rating, comment).Return(nil)
	
	c, w := createTestContext("PUT", "/api/reviews/"+reviewID, req, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: reviewID}}
	suite.handler.UpdateReview(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "review updated successfully", response["message"])
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

func (suite *ReviewHandlerTestSuite) TestUpdateReview_Unauthorized() {
	reviewID := "review-123"
	req := UpdateReviewRequest{
		Rating:  4,
		Comment: "Updated comment",
	}
	
	c, w := createTestContext("PUT", "/api/reviews/"+reviewID, req, "", models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: reviewID}}
	suite.handler.UpdateReview(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "unauthorized", response["error"])
}

func (suite *ReviewHandlerTestSuite) TestUpdateReview_InvalidJSON() {
	athleteID := "athlete-123"
	reviewID := "review-123"
	
	c, w := createTestContext("PUT", "/api/reviews/"+reviewID, "invalid json", athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: reviewID}}
	suite.handler.UpdateReview(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Contains(suite.T(), response["error"], "invalid character")
}

func (suite *ReviewHandlerTestSuite) TestUpdateReview_InvalidRating() {
	athleteID := "athlete-123"
	reviewID := "review-123"
	req := UpdateReviewRequest{
		Rating:  6, // Invalid rating
		Comment: "Updated comment",
	}
	
	c, w := createTestContext("PUT", "/api/reviews/"+reviewID, req, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: reviewID}}
	suite.handler.UpdateReview(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Contains(suite.T(), response["error"], "Rating")
}

func (suite *ReviewHandlerTestSuite) TestUpdateReview_NotFound() {
	athleteID := "athlete-123"
	reviewID := "nonexistent"
	rating := 4
	comment := "Updated comment"
	
	req := UpdateReviewRequest{
		Rating:  rating,
		Comment: comment,
	}
	
	suite.mockReviewService.On("UpdateReview", mock.AnythingOfType("*gin.Context"), reviewID, athleteID, rating, comment).Return(errors.New("review not found"))
	
	c, w := createTestContext("PUT", "/api/reviews/"+reviewID, req, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: reviewID}}
	suite.handler.UpdateReview(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "review not found", response["error"])
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

func (suite *ReviewHandlerTestSuite) TestUpdateReview_NotAuthorized() {
	athleteID := "athlete-123"
	reviewID := "review-123"
	rating := 4
	comment := "Updated comment"
	
	req := UpdateReviewRequest{
		Rating:  rating,
		Comment: comment,
	}
	
	suite.mockReviewService.On("UpdateReview", mock.AnythingOfType("*gin.Context"), reviewID, athleteID, rating, comment).Return(errors.New("not authorized to update this review"))
	
	c, w := createTestContext("PUT", "/api/reviews/"+reviewID, req, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: reviewID}}
	suite.handler.UpdateReview(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "not authorized to update this review", response["error"])
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

func (suite *ReviewHandlerTestSuite) TestUpdateReview_ServiceError() {
	athleteID := "athlete-123"
	reviewID := "review-123"
	rating := 4
	comment := "Updated comment"
	
	req := UpdateReviewRequest{
		Rating:  rating,
		Comment: comment,
	}
	
	suite.mockReviewService.On("UpdateReview", mock.AnythingOfType("*gin.Context"), reviewID, athleteID, rating, comment).Return(errors.New("database error"))
	
	c, w := createTestContext("PUT", "/api/reviews/"+reviewID, req, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: reviewID}}
	suite.handler.UpdateReview(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "database error", response["error"])
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

func (suite *ReviewHandlerTestSuite) TestUpdateReview_EmptyComment() {
	athleteID := "athlete-123"
	reviewID := "review-123"
	rating := 4
	comment := ""
	
	req := UpdateReviewRequest{
		Rating:  rating,
		Comment: comment, // Empty comment should be allowed
	}
	
	suite.mockReviewService.On("UpdateReview", mock.AnythingOfType("*gin.Context"), reviewID, athleteID, rating, comment).Return(nil)
	
	c, w := createTestContext("PUT", "/api/reviews/"+reviewID, req, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: reviewID}}
	suite.handler.UpdateReview(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "review updated successfully", response["message"])
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

// DeleteReview Tests
func (suite *ReviewHandlerTestSuite) TestDeleteReview_Success() {
	athleteID := "athlete-123"
	reviewID := "review-123"
	
	suite.mockReviewService.On("DeleteReview", mock.AnythingOfType("*gin.Context"), reviewID, athleteID).Return(nil)
	
	c, w := createTestContext("DELETE", "/api/reviews/"+reviewID, nil, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: reviewID}}
	suite.handler.DeleteReview(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "review deleted successfully", response["message"])
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

func (suite *ReviewHandlerTestSuite) TestDeleteReview_Unauthorized() {
	reviewID := "review-123"
	
	c, w := createTestContext("DELETE", "/api/reviews/"+reviewID, nil, "", models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: reviewID}}
	suite.handler.DeleteReview(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "unauthorized", response["error"])
}

func (suite *ReviewHandlerTestSuite) TestDeleteReview_NotFound() {
	athleteID := "athlete-123"
	reviewID := "nonexistent"
	
	suite.mockReviewService.On("DeleteReview", mock.AnythingOfType("*gin.Context"), reviewID, athleteID).Return(errors.New("review not found"))
	
	c, w := createTestContext("DELETE", "/api/reviews/"+reviewID, nil, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: reviewID}}
	suite.handler.DeleteReview(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "review not found", response["error"])
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

func (suite *ReviewHandlerTestSuite) TestDeleteReview_NotAuthorized() {
	athleteID := "athlete-123"
	reviewID := "review-123"
	
	suite.mockReviewService.On("DeleteReview", mock.AnythingOfType("*gin.Context"), reviewID, athleteID).Return(errors.New("not authorized to delete this review"))
	
	c, w := createTestContext("DELETE", "/api/reviews/"+reviewID, nil, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: reviewID}}
	suite.handler.DeleteReview(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "not authorized to delete this review", response["error"])
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

func (suite *ReviewHandlerTestSuite) TestDeleteReview_ServiceError() {
	athleteID := "athlete-123"
	reviewID := "review-123"
	
	suite.mockReviewService.On("DeleteReview", mock.AnythingOfType("*gin.Context"), reviewID, athleteID).Return(errors.New("database error"))
	
	c, w := createTestContext("DELETE", "/api/reviews/"+reviewID, nil, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: reviewID}}
	suite.handler.DeleteReview(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "database error", response["error"])
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

func (suite *ReviewHandlerTestSuite) TestDeleteReview_EmptyReviewID() {
	athleteID := "athlete-123"
	reviewID := ""
	
	suite.mockReviewService.On("DeleteReview", mock.AnythingOfType("*gin.Context"), reviewID, athleteID).Return(errors.New("invalid review ID"))
	
	c, w := createTestContext("DELETE", "/api/reviews/"+reviewID, nil, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: reviewID}}
	suite.handler.DeleteReview(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "invalid review ID", response["error"])
	
	suite.mockReviewService.AssertExpectations(suite.T())
}

// Test runner
func TestReviewHandlerSuite(t *testing.T) {
	suite.Run(t, new(ReviewHandlerTestSuite))
}
