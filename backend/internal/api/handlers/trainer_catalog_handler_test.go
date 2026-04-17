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

// MockTrainerCatalogService is a mock implementation of TrainerCatalogService
type MockTrainerCatalogService struct {
	mock.Mock
}

func (m *MockTrainerCatalogService) SearchTrainers(ctx context.Context, filters *services.TrainerSearchFilters) ([]*models.TrainerWithProfile, int64, error) {
	args := m.Called(ctx, filters)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int64), args.Error(2)
	}
	return args.Get(0).([]*models.TrainerWithProfile), args.Get(1).(int64), args.Error(2)
}

func (m *MockTrainerCatalogService) GetTrainerProfile(ctx context.Context, trainerID string) (*models.TrainerWithProfile, error) {
	args := m.Called(ctx, trainerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.TrainerWithProfile), args.Error(1)
}

func (m *MockTrainerCatalogService) UpdateTrainerProfile(ctx context.Context, trainerID string, profile *models.TrainerProfile) error {
	args := m.Called(ctx, trainerID, profile)
	return args.Error(0)
}

// TrainerCatalogHandlerTestSuite is the test suite for TrainerCatalogHandler
type TrainerCatalogHandlerTestSuite struct {
	suite.Suite
	handler                     *TrainerCatalogHandler
	mockTrainerCatalogService   *MockTrainerCatalogService
}

func (suite *TrainerCatalogHandlerTestSuite) SetupTest() {
	suite.mockTrainerCatalogService = new(MockTrainerCatalogService)
	suite.handler = NewTrainerCatalogHandler(suite.mockTrainerCatalogService)
}

// Test data factory functions
func createTestTrainerWithProfile(id, name, email string, rating float64, specialization string) *models.TrainerWithProfile {
	return &models.TrainerWithProfile{
		User: models.User{
			ID:    id,
			Email: email,
			Role:  models.RoleTrainer,
			Profile: models.UserProfile{
				Name: name,
			},
			CreatedAt: time.Now().UTC(),
			UpdatedAt: time.Now().UTC(),
		},
		TrainerProfile: &models.TrainerProfile{
			UserID:                    id,
			Specializations:           []string{specialization},
			Bio:                       "Experienced trainer",
			Certifications:            []string{"Certified Personal Trainer"},
			YearsOfExperience:          5,
			AverageRating:             rating,
			TotalReviews:              10,
			AvailableForNewClients:    true,
			HourlyRate:                50.0,
			Location:                  "New York",
			CreatedAt:                 time.Now().UTC(),
			UpdatedAt:                 time.Now().UTC(),
		},
	}
}

func createTestTrainerProfile(specialization string, yearsExperience int, hourlyRate float64) models.TrainerProfile {
	return models.TrainerProfile{
		Specializations:        []string{specialization},
		Bio:                   "Updated bio",
		Certifications:         []string{"Advanced Certification"},
		YearsOfExperience:      yearsExperience,
		HourlyRate:            hourlyRate,
		Location:              "Los Angeles",
		AvailableForNewClients: false,
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

// GetTrainers Tests
func (suite *TrainerCatalogHandlerTestSuite) TestGetTrainers_Success_NoFilters() {
	trainers := []*models.TrainerWithProfile{
		createTestTrainerWithProfile("trainer-1", "John Doe", "john@example.com", 4.5, "strength"),
		createTestTrainerWithProfile("trainer-2", "Jane Smith", "jane@example.com", 4.8, "yoga"),
	}
	
	filters := &services.TrainerSearchFilters{
		Limit:  20,
		Offset: 0,
	}
	
	suite.mockTrainerCatalogService.On("SearchTrainers", mock.AnythingOfType("*gin.Context"), filters).Return(trainers, int64(2), nil)
	
	c, w := createTestContext("GET", "/api/trainers", nil, "", models.RoleAthlete)
	suite.handler.GetTrainers(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), float64(2), response["total"])
	assert.Equal(suite.T(), float64(20), response["limit"])
	assert.Equal(suite.T(), float64(0), response["offset"])
	assert.NotNil(suite.T(), response["trainers"])
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogHandlerTestSuite) TestGetTrainers_Success_WithFilters() {
	trainers := []*models.TrainerWithProfile{
		createTestTrainerWithProfile("trainer-1", "John Doe", "john@example.com", 4.5, "strength"),
	}
	
	trueVal := true
	filters := &services.TrainerSearchFilters{
		Specialization:         "strength",
		Location:               "New York",
		MinRating:              4.0,
		AvailableForNewClients: &trueVal,
		Limit:                  10,
		Offset:                 5,
	}
	
	suite.mockTrainerCatalogService.On("SearchTrainers", mock.AnythingOfType("*gin.Context"), filters).Return(trainers, int64(1), nil)
	
	c, w := createTestContext("GET", "/api/trainers?specialization=strength&location=New York&minRating=4.0&availableForNewClients=true&limit=10&offset=5", nil, "", models.RoleAthlete)
	suite.handler.GetTrainers(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), float64(1), response["total"])
	assert.Equal(suite.T(), float64(10), response["limit"])
	assert.Equal(suite.T(), float64(5), response["offset"])
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogHandlerTestSuite) TestGetTrainers_Success_Pagination() {
	trainers := []*models.TrainerWithProfile{}
	
	filters := &services.TrainerSearchFilters{
		Limit:  5,
		Offset: 20,
	}
	
	suite.mockTrainerCatalogService.On("SearchTrainers", mock.AnythingOfType("*gin.Context"), filters).Return(trainers, int64(0), nil)
	
	c, w := createTestContext("GET", "/api/trainers?limit=5&offset=20", nil, "", models.RoleAthlete)
	suite.handler.GetTrainers(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), float64(0), response["total"])
	assert.Equal(suite.T(), float64(5), response["limit"])
	assert.Equal(suite.T(), float64(20), response["offset"])
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogHandlerTestSuite) TestGetTrainers_InvalidMinRating() {
	// Invalid rating should be ignored (not passed to service)
	filters := &services.TrainerSearchFilters{
		Limit:  20,
		Offset: 0,
	}
	
	suite.mockTrainerCatalogService.On("SearchTrainers", mock.AnythingOfType("*gin.Context"), filters).Return([]*models.TrainerWithProfile{}, int64(0), nil)
	
	c, w := createTestContext("GET", "/api/trainers?minRating=invalid", nil, "", models.RoleAthlete)
	suite.handler.GetTrainers(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogHandlerTestSuite) TestGetTrainers_AvailableForNewClientsFalse() {
	trainers := []*models.TrainerWithProfile{}
	
	falseVal := false
	filters := &services.TrainerSearchFilters{
		AvailableForNewClients: &falseVal,
		Limit:                   20,
		Offset:                  0,
	}
	
	suite.mockTrainerCatalogService.On("SearchTrainers", mock.AnythingOfType("*gin.Context"), filters).Return(trainers, int64(0), nil)
	
	c, w := createTestContext("GET", "/api/trainers?availableForNewClients=false", nil, "", models.RoleAthlete)
	suite.handler.GetTrainers(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogHandlerTestSuite) TestGetTrainers_ServiceError() {
	filters := &services.TrainerSearchFilters{
		Limit:  20,
		Offset: 0,
	}
	
	suite.mockTrainerCatalogService.On("SearchTrainers", mock.AnythingOfType("*gin.Context"), filters).Return(nil, int64(0), errors.New("database error"))
	
	c, w := createTestContext("GET", "/api/trainers", nil, "", models.RoleAthlete)
	suite.handler.GetTrainers(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "database error", response["error"])
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogHandlerTestSuite) TestGetTrainers_EmptyResults() {
	trainers := []*models.TrainerWithProfile{}
	
	filters := &services.TrainerSearchFilters{
		Specialization: "nonexistent",
		Limit:          20,
		Offset:         0,
	}
	
	suite.mockTrainerCatalogService.On("SearchTrainers", mock.AnythingOfType("*gin.Context"), filters).Return(trainers, int64(0), nil)
	
	c, w := createTestContext("GET", "/api/trainers?specialization=nonexistent", nil, "", models.RoleAthlete)
	suite.handler.GetTrainers(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), float64(0), response["total"])
	assert.NotNil(suite.T(), response["trainers"])
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

// GetTrainerByID Tests
func (suite *TrainerCatalogHandlerTestSuite) TestGetTrainerByID_Success() {
	trainerID := "trainer-123"
	trainer := createTestTrainerWithProfile(trainerID, "John Doe", "john@example.com", 4.5, "strength")
	
	suite.mockTrainerCatalogService.On("GetTrainerProfile", mock.AnythingOfType("*gin.Context"), trainerID).Return(trainer, nil)
	
	c, w := createTestContext("GET", "/api/trainers/"+trainerID, nil, "", models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.GetTrainerByID(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response models.TrainerWithProfile
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), trainer.ID, response.ID)
	assert.Equal(suite.T(), trainer.Email, response.Email)
	assert.Equal(suite.T(), trainer.Profile.Name, response.Profile.Name)
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogHandlerTestSuite) TestGetTrainerByID_NotFound() {
	trainerID := "nonexistent"
	
	suite.mockTrainerCatalogService.On("GetTrainerProfile", mock.AnythingOfType("*gin.Context"), trainerID).Return(nil, nil)
	
	c, w := createTestContext("GET", "/api/trainers/"+trainerID, nil, "", models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.GetTrainerByID(c)
	
	assert.Equal(suite.T(), http.StatusNotFound, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "trainer not found", response["error"])
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogHandlerTestSuite) TestGetTrainerByID_ServiceError() {
	trainerID := "trainer-123"
	
	suite.mockTrainerCatalogService.On("GetTrainerProfile", mock.AnythingOfType("*gin.Context"), trainerID).Return(nil, errors.New("database error"))
	
	c, w := createTestContext("GET", "/api/trainers/"+trainerID, nil, "", models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.GetTrainerByID(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "database error", response["error"])
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogHandlerTestSuite) TestGetTrainerByID_EmptyID() {
	trainerID := ""
	
	suite.mockTrainerCatalogService.On("GetTrainerProfile", mock.AnythingOfType("*gin.Context"), trainerID).Return(nil, errors.New("invalid trainer ID"))
	
	c, w := createTestContext("GET", "/api/trainers/", nil, "", models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.GetTrainerByID(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "invalid trainer ID", response["error"])
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

// UpdateMyProfile Tests
func (suite *TrainerCatalogHandlerTestSuite) TestUpdateMyProfile_Success() {
	trainerID := "trainer-123"
	profile := createTestTrainerProfile("advanced strength", 10, 75.0)
	
	suite.mockTrainerCatalogService.On("UpdateTrainerProfile", mock.AnythingOfType("*gin.Context"), trainerID, &profile).Return(nil)
	
	c, w := createTestContext("PUT", "/api/trainers/me/profile", profile, trainerID, models.RoleTrainer)
	suite.handler.UpdateMyProfile(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "profile updated successfully", response["message"])
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogHandlerTestSuite) TestUpdateMyProfile_Unauthorized() {
	profile := createTestTrainerProfile("strength", 5, 50.0)
	
	c, w := createTestContext("PUT", "/api/trainers/me/profile", profile, "", models.RoleTrainer)
	suite.handler.UpdateMyProfile(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "unauthorized", response["error"])
}

func (suite *TrainerCatalogHandlerTestSuite) TestUpdateMyProfile_InvalidJSON() {
	trainerID := "trainer-123"
	
	c, w := createTestContext("PUT", "/api/trainers/me/profile", "invalid json", trainerID, models.RoleTrainer)
	suite.handler.UpdateMyProfile(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Contains(suite.T(), response["error"], "invalid character")
}

func (suite *TrainerCatalogHandlerTestSuite) TestUpdateMyProfile_ServiceError() {
	trainerID := "trainer-123"
	profile := createTestTrainerProfile("strength", 5, 50.0)
	
	suite.mockTrainerCatalogService.On("UpdateTrainerProfile", mock.AnythingOfType("*gin.Context"), trainerID, &profile).Return(errors.New("validation failed"))
	
	c, w := createTestContext("PUT", "/api/trainers/me/profile", profile, trainerID, models.RoleTrainer)
	suite.handler.UpdateMyProfile(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "validation failed", response["error"])
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogHandlerTestSuite) TestUpdateMyProfile_EmptyProfile() {
	trainerID := "trainer-123"
	profile := models.TrainerProfile{}
	
	suite.mockTrainerCatalogService.On("UpdateTrainerProfile", mock.AnythingOfType("*gin.Context"), trainerID, &profile).Return(nil)
	
	c, w := createTestContext("PUT", "/api/trainers/me/profile", profile, trainerID, models.RoleTrainer)
	suite.handler.UpdateMyProfile(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "profile updated successfully", response["message"])
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogHandlerTestSuite) TestUpdateMyProfile_PartialUpdate() {
	trainerID := "trainer-123"
	profile := models.TrainerProfile{
		Bio: "Updated bio only",
		// Other fields should remain unchanged
	}
	
	suite.mockTrainerCatalogService.On("UpdateTrainerProfile", mock.AnythingOfType("*gin.Context"), trainerID, &profile).Return(nil)
	
	c, w := createTestContext("PUT", "/api/trainers/me/profile", profile, trainerID, models.RoleTrainer)
	suite.handler.UpdateMyProfile(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

// GetMyProfile Tests
func (suite *TrainerCatalogHandlerTestSuite) TestGetMyProfile_Success() {
	trainerID := "trainer-123"
	trainer := createTestTrainerWithProfile(trainerID, "John Doe", "john@example.com", 4.5, "strength")
	
	suite.mockTrainerCatalogService.On("GetTrainerProfile", mock.AnythingOfType("*gin.Context"), trainerID).Return(trainer, nil)
	
	c, w := createTestContext("GET", "/api/trainers/me/profile", nil, trainerID, models.RoleTrainer)
	suite.handler.GetMyProfile(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response models.TrainerWithProfile
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), trainer.ID, response.ID)
	assert.Equal(suite.T(), trainer.Email, response.Email)
	assert.Equal(suite.T(), trainer.Profile.Name, response.Profile.Name)
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogHandlerTestSuite) TestGetMyProfile_Unauthorized() {
	c, w := createTestContext("GET", "/api/trainers/me/profile", nil, "", models.RoleTrainer)
	suite.handler.GetMyProfile(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "unauthorized", response["error"])
}

func (suite *TrainerCatalogHandlerTestSuite) TestGetMyProfile_Forbidden_Athlete() {
	athleteID := "athlete-123"
	
	c, w := createTestContext("GET", "/api/trainers/me/profile", nil, athleteID, models.RoleAthlete)
	suite.handler.GetMyProfile(c)
	
	assert.Equal(suite.T(), http.StatusForbidden, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Only trainers can access profile", response["error"])
}

func (suite *TrainerCatalogHandlerTestSuite) TestGetMyProfile_NotFound() {
	trainerID := "trainer-123"
	
	suite.mockTrainerCatalogService.On("GetTrainerProfile", mock.AnythingOfType("*gin.Context"), trainerID).Return(nil, nil)
	
	c, w := createTestContext("GET", "/api/trainers/me/profile", nil, trainerID, models.RoleTrainer)
	suite.handler.GetMyProfile(c)
	
	assert.Equal(suite.T(), http.StatusNotFound, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "trainer profile not found", response["error"])
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogHandlerTestSuite) TestGetMyProfile_ServiceError() {
	trainerID := "trainer-123"
	
	suite.mockTrainerCatalogService.On("GetTrainerProfile", mock.AnythingOfType("*gin.Context"), trainerID).Return(nil, errors.New("database error"))
	
	c, w := createTestContext("GET", "/api/trainers/me/profile", nil, trainerID, models.RoleTrainer)
	suite.handler.GetMyProfile(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "database error", response["error"])
	
	suite.mockTrainerCatalogService.AssertExpectations(suite.T())
}

func (suite *TrainerCatalogHandlerTestSuite) TestGetMyProfile_MissingUserRole() {
	trainerID := "trainer-123"
	
	c, w := createTestContext("GET", "/api/trainers/me/profile", nil, trainerID, "") // No user role set
	suite.handler.GetMyProfile(c)
	
	assert.Equal(suite.T(), http.StatusForbidden, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Only trainers can access profile", response["error"])
}

// Test runner
func TestTrainerCatalogHandlerSuite(t *testing.T) {
	suite.Run(t, new(TrainerCatalogHandlerTestSuite))
}
