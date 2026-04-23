package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"testing"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/testutils"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

// MockInvitationService is a mock implementation of InvitationService
type MockInvitationService struct {
	mock.Mock
}

func (m *MockInvitationService) GenerateInvitation(trainerID string) (*models.Invitation, error) {
	args := m.Called(trainerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Invitation), args.Error(1)
}

func (m *MockInvitationService) AcceptInvitation(code string, athleteID string) (*models.Relationship, error) {
	args := m.Called(code, athleteID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Relationship), args.Error(1)
}

func (m *MockInvitationService) GetPendingInvitations(athleteID string) ([]*models.Invitation, error) {
	args := m.Called(athleteID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.Invitation), args.Error(1)
}

// MockMealRepository is a mock implementation of MealRepository
type MockMealRepository struct {
	mock.Mock
}

func (m *MockMealRepository) Create(meal *models.Meal) error {
	args := m.Called(meal)
	return args.Error(0)
}

func (m *MockMealRepository) GetByID(id string) (*models.Meal, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Meal), args.Error(1)
}

func (m *MockMealRepository) GetByAthleteID(athleteID string, limit, offset int) ([]*models.Meal, error) {
	args := m.Called(athleteID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.Meal), args.Error(1)
}

func (m *MockMealRepository) GetByAthleteDateRange(athleteID string, startDate, endDate time.Time) ([]*models.Meal, error) {
	args := m.Called(athleteID, startDate, endDate)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.Meal), args.Error(1)
}

func (m *MockMealRepository) Update(meal *models.Meal) error {
	args := m.Called(meal)
	return args.Error(0)
}

func (m *MockMealRepository) Delete(id string) error {
	args := m.Called(id)
	return args.Error(0)
}

// RelationshipHandlerTestSuite is the test suite for RelationshipHandler
type RelationshipHandlerTestSuite struct {
	suite.Suite
	handler               *RelationshipHandler
	mockInvitationService *MockInvitationService
	mockRelationshipRepo  *testutils.MockRelationshipRepository
	mockUserRepo          *testutils.MockUserRepository
	mockWorkoutRepo       *testutils.MockWorkoutRepository
	mockMealRepo          *testutils.MockMealRepository
	validator             *validator.Validate
}

func (suite *RelationshipHandlerTestSuite) SetupTest() {
	suite.mockInvitationService = new(MockInvitationService)
	suite.mockRelationshipRepo = new(testutils.MockRelationshipRepository)
	suite.mockUserRepo = new(testutils.MockUserRepository)
	suite.mockWorkoutRepo = new(testutils.MockWorkoutRepository)
	suite.mockMealRepo = new(testutils.MockMealRepository)
	suite.validator = validator.New()

	suite.handler = NewRelationshipHandler(
		suite.mockInvitationService,
		suite.mockRelationshipRepo,
		suite.mockUserRepo,
		suite.mockWorkoutRepo,
		suite.mockMealRepo,
	)
}

// Test data factory functions
func createTestInvitation(trainerID, code string, expiresAt time.Time) *models.Invitation {
	return &models.Invitation{
		ID:        "inv-123",
		TrainerID: trainerID,
		Code:      code,
		CreatedAt: time.Now().UTC(),
		ExpiresAt: expiresAt,
	}
}

func createTestRelationship(trainerID, athleteID string, status models.RelationshipStatus) *models.Relationship {
	return &models.Relationship{
		ID:        "rel-123",
		TrainerID: trainerID,
		AthleteID: athleteID,
		Status:    status,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
}

func createTestUser(id, email string, role models.UserRole) *models.User {
	return &models.User{
		ID:    id,
		Email: email,
		Role:  role,
		Profile: models.UserProfile{
			Name: "Test User",
		},
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
}

func createTestWorkout(athleteID string, date time.Time) *models.Workout {
	return &models.Workout{
		ID:        "workout-123",
		AthleteID: athleteID,
		Date:      date,
		Exercises: []models.Exercise{},
		CreatedAt: date,
		UpdatedAt: date,
	}
}

func createTestMeal(athleteID string, date time.Time) *models.Meal {
	return &models.Meal{
		ID:        "meal-123",
		AthleteID: athleteID,
		Date:      date,
		MealType:  models.MealTypeLunch,
		Items:     []models.FoodItem{},
		CreatedAt: date,
		UpdatedAt: date,
	}
}

// GenerateInvitation Tests
func (suite *RelationshipHandlerTestSuite) TestGenerateInvitation_Success() {
	trainerID := "trainer-123"
	invitation := createTestInvitation(trainerID, "ABC12345", time.Now().Add(24*time.Hour))

	suite.mockInvitationService.On("GenerateInvitation", trainerID).Return(invitation, nil)

	c, w := testutils.CreateTestContext("POST", "/api/relationships/invite", nil, trainerID, models.RoleTrainer)
	suite.handler.GenerateInvitation(c)

	assert.Equal(suite.T(), http.StatusCreated, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Invitation generated successfully", response["message"])
	assert.NotNil(suite.T(), response["invitation"])

	invData := response["invitation"].(map[string]interface{})
	assert.Equal(suite.T(), invitation.Code, invData["code"])

	suite.mockInvitationService.AssertExpectations(suite.T())
}

func (suite *RelationshipHandlerTestSuite) TestGenerateInvitation_Unauthorized() {
	c, w := createTestContext("POST", "/api/relationships/invite", nil, "", models.RoleTrainer)
	suite.handler.GenerateInvitation(c)

	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "User not authenticated", response["error"])
}

func (suite *RelationshipHandlerTestSuite) TestGenerateInvitation_Forbidden_Athlete() {
	athleteID := "athlete-123"

	c, w := createTestContext("POST", "/api/relationships/invite", nil, athleteID, models.RoleAthlete)
	suite.handler.GenerateInvitation(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Only trainers can generate invitations", response["error"])
}

func (suite *RelationshipHandlerTestSuite) TestGenerateInvitation_ServiceError() {
	trainerID := "trainer-123"

	suite.mockInvitationService.On("GenerateInvitation", trainerID).Return(nil, errors.New("service error"))

	c, w := createTestContext("POST", "/api/relationships/invite", nil, trainerID, models.RoleTrainer)
	suite.handler.GenerateInvitation(c)

	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Failed to generate invitation", response["error"])

	suite.mockInvitationService.AssertExpectations(suite.T())
}

// AcceptInvitation Tests
func (suite *RelationshipHandlerTestSuite) TestAcceptInvitation_Success() {
	athleteID := "athlete-123"
	relationship := createTestRelationship("trainer-123", athleteID, models.RelationshipStatusActive)

	req := AcceptInvitationRequest{
		Code: "ABC12345",
	}

	suite.mockInvitationService.On("AcceptInvitation", req.Code, athleteID).Return(relationship, nil)

	c, w := createTestContext("POST", "/api/relationships/accept", req, athleteID, models.RoleAthlete)
	suite.handler.AcceptInvitation(c)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Invitation accepted successfully", response["message"])
	assert.NotNil(suite.T(), response["relationship"])

	suite.mockInvitationService.AssertExpectations(suite.T())
}

func (suite *RelationshipHandlerTestSuite) TestAcceptInvitation_Unauthorized() {
	req := AcceptInvitationRequest{
		Code: "ABC12345",
	}

	c, w := createTestContext("POST", "/api/relationships/accept", req, "", models.RoleAthlete)
	suite.handler.AcceptInvitation(c)

	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "User not authenticated", response["error"])
}

func (suite *RelationshipHandlerTestSuite) TestAcceptInvitation_Forbidden_Trainer() {
	trainerID := "trainer-123"
	req := AcceptInvitationRequest{
		Code: "ABC12345",
	}

	c, w := createTestContext("POST", "/api/relationships/accept", req, trainerID, models.RoleTrainer)
	suite.handler.AcceptInvitation(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Only athletes can accept invitations", response["error"])
}

func (suite *RelationshipHandlerTestSuite) TestAcceptInvitation_InvalidJSON() {
	athleteID := "athlete-123"

	c, w := createTestContext("POST", "/api/relationships/accept", "invalid json", athleteID, models.RoleAthlete)
	suite.handler.AcceptInvitation(c)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Invalid request body", response["error"])
}

func (suite *RelationshipHandlerTestSuite) TestAcceptInvitation_ValidationFailed_EmptyCode() {
	athleteID := "athlete-123"
	req := AcceptInvitationRequest{
		Code: "", // Empty code should fail validation
	}

	c, w := createTestContext("POST", "/api/relationships/accept", req, athleteID, models.RoleAthlete)
	suite.handler.AcceptInvitation(c)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Validation failed", response["error"])
}

func (suite *RelationshipHandlerTestSuite) TestAcceptInvitation_ValidationFailed_InvalidCodeLength() {
	athleteID := "athlete-123"
	req := AcceptInvitationRequest{
		Code: "12345", // Too short
	}

	c, w := createTestContext("POST", "/api/relationships/accept", req, athleteID, models.RoleAthlete)
	suite.handler.AcceptInvitation(c)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Validation failed", response["error"])
}

func (suite *RelationshipHandlerTestSuite) TestAcceptInvitation_ServiceError() {
	athleteID := "athlete-123"
	req := AcceptInvitationRequest{
		Code: "INVALID",
	}

	suite.mockInvitationService.On("AcceptInvitation", req.Code, athleteID).Return(nil, errors.New("invalid invitation code"))

	c, w := createTestContext("POST", "/api/relationships/accept", req, athleteID, models.RoleAthlete)
	suite.handler.AcceptInvitation(c)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "invalid invitation code", response["error"])

	suite.mockInvitationService.AssertExpectations(suite.T())
}

// GetMyTrainer Tests
func (suite *RelationshipHandlerTestSuite) TestGetMyTrainer_Success_WithActiveTrainer() {
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	invitations := []*models.Invitation{
		createTestInvitation(trainerID, "ABC12345", time.Now().Add(24*time.Hour)),
	}
	relationship := createTestRelationship(trainerID, athleteID, models.RelationshipStatusActive)
	trainer := createTestUser(trainerID, "trainer@example.com", models.RoleTrainer)

	suite.mockInvitationService.On("GetPendingInvitations", athleteID).Return(invitations, nil)
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(relationship, nil)
	suite.mockUserRepo.On("GetUserByID", mock.AnythingOfType("*gin.Context"), trainerID).Return(trainer, nil)

	c, w := createTestContext("GET", "/api/relationships/my-trainer", nil, athleteID, models.RoleAthlete)
	suite.handler.GetMyTrainer(c)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response["pendingInvitations"])
	assert.NotNil(suite.T(), response["activeTrainer"])

	suite.mockInvitationService.AssertExpectations(suite.T())
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

func (suite *RelationshipHandlerTestSuite) TestGetMyTrainer_Success_NoActiveTrainer() {
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	invitations := []*models.Invitation{
		createTestInvitation(trainerID, "ABC12345", time.Now().Add(24*time.Hour)),
	}

	suite.mockInvitationService.On("GetPendingInvitations", athleteID).Return(invitations, nil)
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(nil, nil) // No active relationship

	c, w := createTestContext("GET", "/api/relationships/my-trainer", nil, athleteID, models.RoleAthlete)
	suite.handler.GetMyTrainer(c)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response["pendingInvitations"])
	assert.Nil(suite.T(), response["activeTrainer"])

	suite.mockInvitationService.AssertExpectations(suite.T())
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *RelationshipHandlerTestSuite) TestGetMyTrainer_Unauthorized() {
	c, w := createTestContext("GET", "/api/relationships/my-trainer", nil, "", models.RoleAthlete)
	suite.handler.GetMyTrainer(c)

	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "User not authenticated", response["error"])
}

func (suite *RelationshipHandlerTestSuite) TestGetMyTrainer_Forbidden_Trainer() {
	trainerID := "trainer-123"

	c, w := createTestContext("GET", "/api/relationships/my-trainer", nil, trainerID, models.RoleTrainer)
	suite.handler.GetMyTrainer(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Only athletes can view their trainer", response["error"])
}

func (suite *RelationshipHandlerTestSuite) TestGetMyTrainer_InvitationServiceError() {
	athleteID := "athlete-123"

	suite.mockInvitationService.On("GetPendingInvitations", athleteID).Return(nil, errors.New("service error"))

	c, w := createTestContext("GET", "/api/relationships/my-trainer", nil, athleteID, models.RoleAthlete)
	suite.handler.GetMyTrainer(c)

	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Failed to retrieve invitations", response["error"])

	suite.mockInvitationService.AssertExpectations(suite.T())
}

func (suite *RelationshipHandlerTestSuite) TestGetMyTrainer_RelationshipError() {
	athleteID := "athlete-123"
	invitations := []*models.Invitation{}

	suite.mockInvitationService.On("GetPendingInvitations", athleteID).Return(invitations, nil)
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(nil, errors.New("database error"))

	c, w := createTestContext("GET", "/api/relationships/my-trainer", nil, athleteID, models.RoleAthlete)
	suite.handler.GetMyTrainer(c)

	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Failed to retrieve relationships", response["error"])

	suite.mockInvitationService.AssertExpectations(suite.T())
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

// GetMyClients Tests
func (suite *RelationshipHandlerTestSuite) TestGetMyClients_Success() {
	trainerID := "trainer-123"
	athleteID := "athlete-123"
	relationships := []*models.Relationship{
		createTestRelationship(trainerID, athleteID, models.RelationshipStatusActive),
		createTestRelationship(trainerID, "athlete-456", models.RelationshipStatusTerminated), // Should be filtered out
	}
	athlete := createTestUser(athleteID, "athlete@example.com", models.RoleAthlete)

	suite.mockRelationshipRepo.On("GetByTrainerID", trainerID).Return(relationships, nil)
	suite.mockUserRepo.On("GetUserByID", mock.AnythingOfType("*gin.Context"), athleteID).Return(athlete, nil)

	c, w := createTestContext("GET", "/api/relationships/my-clients", nil, trainerID, models.RoleTrainer)
	suite.handler.GetMyClients(c)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), float64(1), response["count"]) // Only active relationships
	assert.NotNil(suite.T(), response["clients"])

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

func (suite *RelationshipHandlerTestSuite) TestGetMyClients_Success_NoClients() {
	trainerID := "trainer-123"
	relationships := []*models.Relationship{}

	suite.mockRelationshipRepo.On("GetByTrainerID", trainerID).Return(relationships, nil)

	c, w := createTestContext("GET", "/api/relationships/my-clients", nil, trainerID, models.RoleTrainer)
	suite.handler.GetMyClients(c)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), float64(0), response["count"])

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *RelationshipHandlerTestSuite) TestGetMyClients_Unauthorized() {
	c, w := createTestContext("GET", "/api/relationships/my-clients", nil, "", models.RoleTrainer)
	suite.handler.GetMyClients(c)

	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "User not authenticated", response["error"])
}

func (suite *RelationshipHandlerTestSuite) TestGetMyClients_Forbidden_Athlete() {
	athleteID := "athlete-123"

	c, w := createTestContext("GET", "/api/relationships/my-clients", nil, athleteID, models.RoleAthlete)
	suite.handler.GetMyClients(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Only trainers can view their clients", response["error"])
}

func (suite *RelationshipHandlerTestSuite) TestGetMyClients_DatabaseError() {
	trainerID := "trainer-123"

	suite.mockRelationshipRepo.On("GetByTrainerID", trainerID).Return(nil, errors.New("database error"))

	c, w := createTestContext("GET", "/api/relationships/my-clients", nil, trainerID, models.RoleTrainer)
	suite.handler.GetMyClients(c)

	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Failed to retrieve clients", response["error"])

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

// GetClientDetails Tests
func (suite *RelationshipHandlerTestSuite) TestGetClientDetails_Success() {
	trainerID := "trainer-123"
	clientID := "athlete-123"
	relationship := createTestRelationship(trainerID, clientID, models.RelationshipStatusActive)
	athlete := createTestUser(clientID, "athlete@example.com", models.RoleAthlete)
	workouts := []*models.Workout{
		createTestWorkout(clientID, time.Now()),
	}
	meals := []*models.Meal{
		createTestMeal(clientID, time.Now()),
	}

	suite.mockRelationshipRepo.On("GetByTrainerID", trainerID).Return([]*models.Relationship{relationship}, nil)
	suite.mockUserRepo.On("GetUserByID", mock.AnythingOfType("*gin.Context"), clientID).Return(athlete, nil)
	suite.mockWorkoutRepo.On("GetByAthleteID", clientID, 1000, 0).Return(workouts, nil)
	suite.mockMealRepo.On("GetByAthleteID", clientID, 1000, 0).Return(meals, nil)

	c, w := createTestContext("GET", "/api/relationships/client/"+clientID, nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientDetails(c)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response GetClientDetailsResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), relationship.ID, response.Relationship.ID)
	assert.Equal(suite.T(), athlete.ID, response.Athlete.ID)
	assert.Equal(suite.T(), 1, response.Stats.TotalWorkouts)
	assert.Equal(suite.T(), 1, response.Stats.TotalMeals)

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
	suite.mockWorkoutRepo.AssertExpectations(suite.T())
	suite.mockMealRepo.AssertExpectations(suite.T())
}

func (suite *RelationshipHandlerTestSuite) TestGetClientDetails_Unauthorized() {
	clientID := "athlete-123"

	c, w := createTestContext("GET", "/api/relationships/client/"+clientID, nil, "", models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientDetails(c)

	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "User not authenticated", response["error"])
}

func (suite *RelationshipHandlerTestSuite) TestGetClientDetails_Forbidden_Athlete() {
	trainerID := "trainer-123"
	clientID := "athlete-123"

	c, w := createTestContext("GET", "/api/relationships/client/"+clientID, nil, trainerID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientDetails(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Only trainers can view client details", response["error"])
}

func (suite *RelationshipHandlerTestSuite) TestGetClientDetails_Forbidden_NoRelationship() {
	trainerID := "trainer-123"
	clientID := "athlete-123"

	suite.mockRelationshipRepo.On("GetByTrainerID", trainerID).Return([]*models.Relationship{}, nil)

	c, w := createTestContext("GET", "/api/relationships/client/"+clientID, nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientDetails(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "You don't have an active relationship with this client", response["error"])

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *RelationshipHandlerTestSuite) TestGetClientDetails_RelationshipError() {
	trainerID := "trainer-123"
	clientID := "athlete-123"

	suite.mockRelationshipRepo.On("GetByTrainerID", trainerID).Return(nil, errors.New("database error"))

	c, w := createTestContext("GET", "/api/relationships/client/"+clientID, nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientDetails(c)

	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Failed to verify relationship", response["error"])

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *RelationshipHandlerTestSuite) TestGetClientDetails_UserError() {
	trainerID := "trainer-123"
	clientID := "athlete-123"
	relationship := createTestRelationship(trainerID, clientID, models.RelationshipStatusActive)

	suite.mockRelationshipRepo.On("GetByTrainerID", trainerID).Return([]*models.Relationship{relationship}, nil)
	suite.mockUserRepo.On("GetUserByID", mock.AnythingOfType("*gin.Context"), clientID).Return(nil, errors.New("user not found"))

	c, w := createTestContext("GET", "/api/relationships/client/"+clientID, nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientDetails(c)

	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Failed to get athlete details", response["error"])

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

// TerminateRelationship Tests
func (suite *RelationshipHandlerTestSuite) TestTerminateRelationship_Success_Trainer() {
	trainerID := "trainer-123"
	athleteID := "athlete-123"
	relationship := createTestRelationship(trainerID, athleteID, models.RelationshipStatusActive)
	athlete := createTestUser(athleteID, "athlete@example.com", models.RoleAthlete)
	athlete.Profile.TrainerAssignment = trainerID

	suite.mockRelationshipRepo.On("GetByID", relationship.ID).Return(relationship, nil)
	suite.mockRelationshipRepo.On("Update", mock.AnythingOfType("*models.Relationship")).Return(nil)
	suite.mockUserRepo.On("GetUserByID", mock.AnythingOfType("*gin.Context"), athleteID).Return(athlete, nil)
	suite.mockUserRepo.On("UpdateUser", mock.AnythingOfType("*gin.Context"), mock.AnythingOfType("*models.User")).Return(nil)

	c, w := createTestContext("DELETE", "/api/relationships/"+relationship.ID, nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: relationship.ID}}
	suite.handler.TerminateRelationship(c)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Relationship terminated successfully", response["message"])
	assert.NotNil(suite.T(), response["relationship"])

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

func (suite *RelationshipHandlerTestSuite) TestTerminateRelationship_Success_Athlete() {
	trainerID := "trainer-123"
	athleteID := "athlete-123"
	relationship := createTestRelationship(trainerID, athleteID, models.RelationshipStatusActive)
	athlete := createTestUser(athleteID, "athlete@example.com", models.RoleAthlete)
	athlete.Profile.TrainerAssignment = trainerID

	suite.mockRelationshipRepo.On("GetByID", relationship.ID).Return(relationship, nil)
	suite.mockRelationshipRepo.On("Update", mock.AnythingOfType("*models.Relationship")).Return(nil)
	suite.mockUserRepo.On("GetUserByID", mock.AnythingOfType("*gin.Context"), athleteID).Return(athlete, nil)
	suite.mockUserRepo.On("UpdateUser", mock.AnythingOfType("*gin.Context"), mock.AnythingOfType("*models.User")).Return(nil)

	c, w := createTestContext("DELETE", "/api/relationships/"+relationship.ID, nil, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: relationship.ID}}
	suite.handler.TerminateRelationship(c)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Relationship terminated successfully", response["message"])

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

func (suite *RelationshipHandlerTestSuite) TestTerminateRelationship_NotFound() {
	relationshipID := "nonexistent"
	userID := "trainer-123"

	suite.mockRelationshipRepo.On("GetByID", relationshipID).Return(nil, errors.New("not found"))

	c, w := createTestContext("DELETE", "/api/relationships/"+relationshipID, nil, userID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: relationshipID}}
	suite.handler.TerminateRelationship(c)

	assert.Equal(suite.T(), http.StatusNotFound, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Relationship not found", response["error"])

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *RelationshipHandlerTestSuite) TestTerminateRelationship_Forbidden_UnauthorizedUser() {
	trainerID := "trainer-123"
	otherTrainerID := "trainer-456"
	athleteID := "athlete-123"
	relationship := createTestRelationship(trainerID, athleteID, models.RelationshipStatusActive)

	suite.mockRelationshipRepo.On("GetByID", relationship.ID).Return(relationship, nil)

	c, w := createTestContext("DELETE", "/api/relationships/"+relationship.ID, nil, otherTrainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: relationship.ID}}
	suite.handler.TerminateRelationship(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "You are not authorized to terminate this relationship", response["error"])

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *RelationshipHandlerTestSuite) TestTerminateRelationship_UpdateError() {
	trainerID := "trainer-123"
	athleteID := "athlete-123"
	relationship := createTestRelationship(trainerID, athleteID, models.RelationshipStatusActive)

	suite.mockRelationshipRepo.On("GetByID", relationship.ID).Return(relationship, nil)
	suite.mockRelationshipRepo.On("Update", mock.AnythingOfType("*models.Relationship")).Return(errors.New("update failed"))

	c, w := createTestContext("DELETE", "/api/relationships/"+relationship.ID, nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: relationship.ID}}
	suite.handler.TerminateRelationship(c)

	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Failed to terminate relationship", response["error"])

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *RelationshipHandlerTestSuite) TestTerminateRelationship_UserUpdateError() {
	trainerID := "trainer-123"
	athleteID := "athlete-123"
	relationship := createTestRelationship(trainerID, athleteID, models.RelationshipStatusActive)
	athlete := createTestUser(athleteID, "athlete@example.com", models.RoleAthlete)
	athlete.Profile.TrainerAssignment = trainerID

	suite.mockRelationshipRepo.On("GetByID", relationship.ID).Return(relationship, nil)
	suite.mockRelationshipRepo.On("Update", mock.AnythingOfType("*models.Relationship")).Return(nil)
	suite.mockUserRepo.On("GetUserByID", mock.AnythingOfType("*gin.Context"), athleteID).Return(athlete, nil)
	suite.mockUserRepo.On("UpdateUser", mock.AnythingOfType("*gin.Context"), mock.AnythingOfType("*models.User")).Return(errors.New("user update failed"))

	c, w := createTestContext("DELETE", "/api/relationships/"+relationship.ID, nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: relationship.ID}}
	suite.handler.TerminateRelationship(c)

	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Failed to update athlete profile", response["error"])

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

// GetClientStats Tests
func (suite *RelationshipHandlerTestSuite) TestGetClientStats_Success() {
	trainerID := "trainer-123"
	clientID := "athlete-123"
	relationship := createTestRelationship(trainerID, clientID, models.RelationshipStatusActive)
	workouts := []*models.Workout{
		createTestWorkout(clientID, time.Now()),
	}
	meals := []*models.Meal{
		createTestMeal(clientID, time.Now()),
	}

	suite.mockRelationshipRepo.On("GetByTrainerID", trainerID).Return([]*models.Relationship{relationship}, nil)
	suite.mockWorkoutRepo.On("GetByAthleteID", clientID, 1000, 0).Return(workouts, nil)
	suite.mockMealRepo.On("GetByAthleteID", clientID, 1000, 0).Return(meals, nil)

	c, w := createTestContext("GET", "/api/relationships/client/"+clientID+"/stats", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientStats(c)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response GetClientStatsResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response.WorkoutStats)
	assert.NotNil(suite.T(), response.MealStats)

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockWorkoutRepo.AssertExpectations(suite.T())
	suite.mockMealRepo.AssertExpectations(suite.T())
}

func (suite *RelationshipHandlerTestSuite) TestGetClientStats_Unauthorized() {
	clientID := "athlete-123"

	c, w := createTestContext("GET", "/api/relationships/client/"+clientID+"/stats", nil, "", models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientStats(c)

	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "User not authenticated", response["error"])
}

func (suite *RelationshipHandlerTestSuite) TestGetClientStats_Forbidden_Athlete() {
	trainerID := "trainer-123"
	clientID := "athlete-123"

	c, w := createTestContext("GET", "/api/relationships/client/"+clientID+"/stats", nil, trainerID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientStats(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Only trainers can view client stats", response["error"])
}

func (suite *RelationshipHandlerTestSuite) TestGetClientStats_Forbidden_NoRelationship() {
	trainerID := "trainer-123"
	clientID := "athlete-123"

	suite.mockRelationshipRepo.On("GetByTrainerID", trainerID).Return([]*models.Relationship{}, nil)

	c, w := createTestContext("GET", "/api/relationships/client/"+clientID+"/stats", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientStats(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "You don't have an active relationship with this client", response["error"])

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *RelationshipHandlerTestSuite) TestGetClientStats_RelationshipError() {
	trainerID := "trainer-123"
	clientID := "athlete-123"

	suite.mockRelationshipRepo.On("GetByTrainerID", trainerID).Return(nil, errors.New("database error"))

	c, w := createTestContext("GET", "/api/relationships/client/"+clientID+"/stats", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientStats(c)

	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Failed to verify relationship", response["error"])

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

// Test runner
func TestRelationshipHandlerSuite(t *testing.T) {
	suite.Run(t, new(RelationshipHandlerTestSuite))
}
