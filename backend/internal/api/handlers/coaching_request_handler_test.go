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

// MockCoachingRequestService is a mock implementation of CoachingRequestService
type MockCoachingRequestService struct {
	mock.Mock
}

func (m *MockCoachingRequestService) CreateCoachingRequest(ctx context.Context, athleteID string, trainerID string, message string) (*models.CoachingRequest, error) {
	args := m.Called(ctx, athleteID, trainerID, message)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.CoachingRequest), args.Error(1)
}

func (m *MockCoachingRequestService) GetMyRequests(ctx context.Context, userID string, userRole string) ([]*models.CoachingRequest, error) {
	args := m.Called(ctx, userID, userRole)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.CoachingRequest), args.Error(1)
}

func (m *MockCoachingRequestService) AcceptCoachingRequest(ctx context.Context, requestID string, trainerID string) (*models.Relationship, error) {
	args := m.Called(ctx, requestID, trainerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Relationship), args.Error(1)
}

func (m *MockCoachingRequestService) RejectCoachingRequest(ctx context.Context, requestID string, trainerID string) error {
	args := m.Called(ctx, requestID, trainerID)
	return args.Error(0)
}

func (m *MockCoachingRequestService) GetPendingRequestsForTrainer(ctx context.Context, trainerID string) ([]*models.CoachingRequest, error) {
	args := m.Called(ctx, trainerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.CoachingRequest), args.Error(1)
}

// CoachingRequestHandlerTestSuite is the test suite for CoachingRequestHandler
type CoachingRequestHandlerTestSuite struct {
	suite.Suite
	handler                     *CoachingRequestHandler
	mockCoachingRequestService  *MockCoachingRequestService
}

func (suite *CoachingRequestHandlerTestSuite) SetupTest() {
	suite.mockCoachingRequestService = new(MockCoachingRequestService)
	suite.handler = NewCoachingRequestHandler(suite.mockCoachingRequestService)
}

// Test data factory functions
func createTestCoachingRequest(id, athleteID, trainerID string, status models.CoachingRequestStatus, message string) *models.CoachingRequest {
	return &models.CoachingRequest{
		ID:        id,
		AthleteID: athleteID,
		TrainerID: trainerID,
		Status:    status,
		Message:   message,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
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

// CreateCoachingRequest Tests
func (suite *CoachingRequestHandlerTestSuite) TestCreateCoachingRequest_Success() {
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	message := "I would like to request coaching for strength training"
	request := createTestCoachingRequest("req-123", athleteID, trainerID, models.CoachingRequestStatusPending, message)
	
	req := CreateCoachingRequestRequest{
		TrainerID: trainerID,
		Message:   message,
	}
	
	suite.mockCoachingRequestService.On("CreateCoachingRequest", mock.AnythingOfType("*gin.Context"), athleteID, trainerID, message).Return(request, nil)
	
	c, w := createTestContext("POST", "/api/coaching-requests", req, athleteID, models.RoleAthlete)
	suite.handler.CreateCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusCreated, w.Code)
	
	var response models.CoachingRequest
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), request.ID, response.ID)
	assert.Equal(suite.T(), request.AthleteID, response.AthleteID)
	assert.Equal(suite.T(), request.TrainerID, response.TrainerID)
	assert.Equal(suite.T(), request.Status, response.Status)
	assert.Equal(suite.T(), request.Message, response.Message)
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

func (suite *CoachingRequestHandlerTestSuite) TestCreateCoachingRequest_Unauthorized() {
	req := CreateCoachingRequestRequest{
		TrainerID: "trainer-123",
		Message:   "I need coaching",
	}
	
	c, w := createTestContext("POST", "/api/coaching-requests", req, "", models.RoleAthlete)
	suite.handler.CreateCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "unauthorized", response["error"])
}

func (suite *CoachingRequestHandlerTestSuite) TestCreateCoachingRequest_Forbidden_Trainer() {
	trainerID := "trainer-123"
	req := CreateCoachingRequestRequest{
		TrainerID: trainerID,
		Message:   "I need coaching",
	}
	
	c, w := createTestContext("POST", "/api/coaching-requests", req, trainerID, models.RoleTrainer)
	suite.handler.CreateCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusForbidden, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "only athletes can create coaching requests", response["error"])
}

func (suite *CoachingRequestHandlerTestSuite) TestCreateCoachingRequest_InvalidJSON() {
	athleteID := "athlete-123"
	
	c, w := createTestContext("POST", "/api/coaching-requests", "invalid json", athleteID, models.RoleAthlete)
	suite.handler.CreateCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Contains(suite.T(), response["error"], "invalid character")
}

func (suite *CoachingRequestHandlerTestSuite) TestCreateCoachingRequest_MissingTrainerID() {
	athleteID := "athlete-123"
	req := CreateCoachingRequestRequest{
		TrainerID: "", // Missing trainer ID
		Message:   "I need coaching",
	}
	
	c, w := createTestContext("POST", "/api/coaching-requests", req, athleteID, models.RoleAthlete)
	suite.handler.CreateCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Contains(suite.T(), response["error"], "Required")
}

func (suite *CoachingRequestHandlerTestSuite) TestCreateCoachingRequest_ServiceError() {
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	message := "I would like to request coaching"
	
	req := CreateCoachingRequestRequest{
		TrainerID: trainerID,
		Message:   message,
	}
	
	suite.mockCoachingRequestService.On("CreateCoachingRequest", mock.AnythingOfType("*gin.Context"), athleteID, trainerID, message).Return(nil, errors.New("athlete already has an active trainer"))
	
	c, w := createTestContext("POST", "/api/coaching-requests", req, athleteID, models.RoleAthlete)
	suite.handler.CreateCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "athlete already has an active trainer", response["error"])
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

func (suite *CoachingRequestHandlerTestSuite) TestCreateCoachingRequest_EmptyMessage() {
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	request := createTestCoachingRequest("req-123", athleteID, trainerID, models.CoachingRequestStatusPending, "")
	
	req := CreateCoachingRequestRequest{
		TrainerID: trainerID,
		Message:   "", // Empty message should be allowed
	}
	
	suite.mockCoachingRequestService.On("CreateCoachingRequest", mock.AnythingOfType("*gin.Context"), athleteID, trainerID, "").Return(request, nil)
	
	c, w := createTestContext("POST", "/api/coaching-requests", req, athleteID, models.RoleAthlete)
	suite.handler.CreateCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusCreated, w.Code)
	
	var response models.CoachingRequest
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), request.ID, response.ID)
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

// GetMyRequests Tests
func (suite *CoachingRequestHandlerTestSuite) TestGetMyRequests_Success_Athlete() {
	athleteID := "athlete-123"
	requests := []*models.CoachingRequest{
		createTestCoachingRequest("req-1", athleteID, "trainer-123", models.CoachingRequestStatusPending, "Need coaching"),
		createTestCoachingRequest("req-2", athleteID, "trainer-456", models.CoachingRequestStatusRejected, "Previous request"),
	}
	
	suite.mockCoachingRequestService.On("GetMyRequests", mock.AnythingOfType("*gin.Context"), athleteID, "athlete").Return(requests, nil)
	
	c, w := createTestContext("GET", "/api/coaching-requests/my", nil, athleteID, models.RoleAthlete)
	suite.handler.GetMyRequests(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response["requests"])
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

func (suite *CoachingRequestHandlerTestSuite) TestGetMyRequests_Success_Trainer() {
	trainerID := "trainer-123"
	requests := []*models.CoachingRequest{
		createTestCoachingRequest("req-1", "athlete-123", trainerID, models.CoachingRequestStatusPending, "Need coaching"),
		createTestCoachingRequest("req-2", "athlete-456", trainerID, models.CoachingRequestStatusAccepted, "Accepted request"),
	}
	
	suite.mockCoachingRequestService.On("GetMyRequests", mock.AnythingOfType("*gin.Context"), trainerID, "trainer").Return(requests, nil)
	
	c, w := createTestContext("GET", "/api/coaching-requests/my", nil, trainerID, models.RoleTrainer)
	suite.handler.GetMyRequests(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response["requests"])
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

func (suite *CoachingRequestHandlerTestSuite) TestGetMyRequests_Unauthorized() {
	c, w := createTestContext("GET", "/api/coaching-requests/my", nil, "", models.RoleAthlete)
	suite.handler.GetMyRequests(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "unauthorized", response["error"])
}

func (suite *CoachingRequestHandlerTestSuite) TestGetMyRequests_EmptyRequests() {
	athleteID := "athlete-123"
	requests := []*models.CoachingRequest{}
	
	suite.mockCoachingRequestService.On("GetMyRequests", mock.AnythingOfType("*gin.Context"), athleteID, "athlete").Return(requests, nil)
	
	c, w := createTestContext("GET", "/api/coaching-requests/my", nil, athleteID, models.RoleAthlete)
	suite.handler.GetMyRequests(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response["requests"])
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

func (suite *CoachingRequestHandlerTestSuite) TestGetMyRequests_ServiceError() {
	athleteID := "athlete-123"
	
	suite.mockCoachingRequestService.On("GetMyRequests", mock.AnythingOfType("*gin.Context"), athleteID, "athlete").Return(nil, errors.New("database error"))
	
	c, w := createTestContext("GET", "/api/coaching-requests/my", nil, athleteID, models.RoleAthlete)
	suite.handler.GetMyRequests(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "database error", response["error"])
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

// AcceptCoachingRequest Tests
func (suite *CoachingRequestHandlerTestSuite) TestAcceptCoachingRequest_Success() {
	trainerID := "trainer-123"
	requestID := "req-123"
	relationship := createTestRelationship(trainerID, "athlete-123", models.RelationshipStatusActive)
	
	suite.mockCoachingRequestService.On("AcceptCoachingRequest", mock.AnythingOfType("*gin.Context"), requestID, trainerID).Return(relationship, nil)
	
	c, w := createTestContext("POST", "/api/coaching-requests/"+requestID+"/accept", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: requestID}}
	suite.handler.AcceptCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "coaching request accepted", response["message"])
	assert.NotNil(suite.T(), response["relationship"])
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

func (suite *CoachingRequestHandlerTestSuite) TestAcceptCoachingRequest_Unauthorized() {
	requestID := "req-123"
	
	c, w := createTestContext("POST", "/api/coaching-requests/"+requestID+"/accept", nil, "", models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: requestID}}
	suite.handler.AcceptCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "unauthorized", response["error"])
}

func (suite *CoachingRequestHandlerTestSuite) TestAcceptCoachingRequest_Forbidden_Athlete() {
	athleteID := "athlete-123"
	requestID := "req-123"
	
	c, w := createTestContext("POST", "/api/coaching-requests/"+requestID+"/accept", nil, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: requestID}}
	suite.handler.AcceptCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusForbidden, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "only trainers can accept coaching requests", response["error"])
}

func (suite *CoachingRequestHandlerTestSuite) TestAcceptCoachingRequest_RequestNotFound() {
	trainerID := "trainer-123"
	requestID := "nonexistent"
	
	suite.mockCoachingRequestService.On("AcceptCoachingRequest", mock.AnythingOfType("*gin.Context"), requestID, trainerID).Return(nil, errors.New("coaching request not found"))
	
	c, w := createTestContext("POST", "/api/coaching-requests/"+requestID+"/accept", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: requestID}}
	suite.handler.AcceptCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "coaching request not found", response["error"])
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

func (suite *CoachingRequestHandlerTestSuite) TestAcceptCoachingRequest_NotAuthorized() {
	trainerID := "trainer-123"
	requestID := "req-123"
	
	suite.mockCoachingRequestService.On("AcceptCoachingRequest", mock.AnythingOfType("*gin.Context"), requestID, trainerID).Return(nil, errors.New("not authorized to accept this request"))
	
	c, w := createTestContext("POST", "/api/coaching-requests/"+requestID+"/accept", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: requestID}}
	suite.handler.AcceptCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "not authorized to accept this request", response["error"])
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

func (suite *CoachingRequestHandlerTestSuite) TestAcceptCoachingRequest_ServiceError() {
	trainerID := "trainer-123"
	requestID := "req-123"
	
	suite.mockCoachingRequestService.On("AcceptCoachingRequest", mock.AnythingOfType("*gin.Context"), requestID, trainerID).Return(nil, errors.New("database error"))
	
	c, w := createTestContext("POST", "/api/coaching-requests/"+requestID+"/accept", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: requestID}}
	suite.handler.AcceptCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "database error", response["error"])
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

// RejectCoachingRequest Tests
func (suite *CoachingRequestHandlerTestSuite) TestRejectCoachingRequest_Success() {
	trainerID := "trainer-123"
	requestID := "req-123"
	
	suite.mockCoachingRequestService.On("RejectCoachingRequest", mock.AnythingOfType("*gin.Context"), requestID, trainerID).Return(nil)
	
	c, w := createTestContext("POST", "/api/coaching-requests/"+requestID+"/reject", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: requestID}}
	suite.handler.RejectCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "coaching request rejected", response["message"])
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

func (suite *CoachingRequestHandlerTestSuite) TestRejectCoachingRequest_Unauthorized() {
	requestID := "req-123"
	
	c, w := createTestContext("POST", "/api/coaching-requests/"+requestID+"/reject", nil, "", models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: requestID}}
	suite.handler.RejectCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "unauthorized", response["error"])
}

func (suite *CoachingRequestHandlerTestSuite) TestRejectCoachingRequest_Forbidden_Athlete() {
	athleteID := "athlete-123"
	requestID := "req-123"
	
	c, w := createTestContext("POST", "/api/coaching-requests/"+requestID+"/reject", nil, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: requestID}}
	suite.handler.RejectCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusForbidden, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "only trainers can reject coaching requests", response["error"])
}

func (suite *CoachingRequestHandlerTestSuite) TestRejectCoachingRequest_RequestNotFound() {
	trainerID := "trainer-123"
	requestID := "nonexistent"
	
	suite.mockCoachingRequestService.On("RejectCoachingRequest", mock.AnythingOfType("*gin.Context"), requestID, trainerID).Return(errors.New("coaching request not found"))
	
	c, w := createTestContext("POST", "/api/coaching-requests/"+requestID+"/reject", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: requestID}}
	suite.handler.RejectCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "coaching request not found", response["error"])
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

func (suite *CoachingRequestHandlerTestSuite) TestRejectCoachingRequest_NotAuthorized() {
	trainerID := "trainer-123"
	requestID := "req-123"
	
	suite.mockCoachingRequestService.On("RejectCoachingRequest", mock.AnythingOfType("*gin.Context"), requestID, trainerID).Return(errors.New("not authorized to reject this request"))
	
	c, w := createTestContext("POST", "/api/coaching-requests/"+requestID+"/reject", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: requestID}}
	suite.handler.RejectCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "not authorized to reject this request", response["error"])
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

func (suite *CoachingRequestHandlerTestSuite) TestRejectCoachingRequest_ServiceError() {
	trainerID := "trainer-123"
	requestID := "req-123"
	
	suite.mockCoachingRequestService.On("RejectCoachingRequest", mock.AnythingOfType("*gin.Context"), requestID, trainerID).Return(errors.New("database error"))
	
	c, w := createTestContext("POST", "/api/coaching-requests/"+requestID+"/reject", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: requestID}}
	suite.handler.RejectCoachingRequest(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "database error", response["error"])
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

// GetPendingRequests Tests
func (suite *CoachingRequestHandlerTestSuite) TestGetPendingRequests_Success() {
	trainerID := "trainer-123"
	requests := []*models.CoachingRequest{
		createTestCoachingRequest("req-1", "athlete-123", trainerID, models.CoachingRequestStatusPending, "Need coaching"),
		createTestCoachingRequest("req-2", "athlete-456", trainerID, models.CoachingRequestStatusPending, "Want to start training"),
	}
	
	suite.mockCoachingRequestService.On("GetPendingRequestsForTrainer", mock.AnythingOfType("*gin.Context"), trainerID).Return(requests, nil)
	
	c, w := createTestContext("GET", "/api/coaching-requests/pending", nil, trainerID, models.RoleTrainer)
	suite.handler.GetPendingRequests(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response["requests"])
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

func (suite *CoachingRequestHandlerTestSuite) TestGetPendingRequests_Unauthorized() {
	c, w := createTestContext("GET", "/api/coaching-requests/pending", nil, "", models.RoleTrainer)
	suite.handler.GetPendingRequests(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "unauthorized", response["error"])
}

func (suite *CoachingRequestHandlerTestSuite) TestGetPendingRequests_Forbidden_Athlete() {
	athleteID := "athlete-123"
	
	c, w := createTestContext("GET", "/api/coaching-requests/pending", nil, athleteID, models.RoleAthlete)
	suite.handler.GetPendingRequests(c)
	
	assert.Equal(suite.T(), http.StatusForbidden, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "only trainers can view pending requests", response["error"])
}

func (suite *CoachingRequestHandlerTestSuite) TestGetPendingRequests_EmptyRequests() {
	trainerID := "trainer-123"
	requests := []*models.CoachingRequest{}
	
	suite.mockCoachingRequestService.On("GetPendingRequestsForTrainer", mock.AnythingOfType("*gin.Context"), trainerID).Return(requests, nil)
	
	c, w := createTestContext("GET", "/api/coaching-requests/pending", nil, trainerID, models.RoleTrainer)
	suite.handler.GetPendingRequests(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response["requests"])
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

func (suite *CoachingRequestHandlerTestSuite) TestGetPendingRequests_ServiceError() {
	trainerID := "trainer-123"
	
	suite.mockCoachingRequestService.On("GetPendingRequestsForTrainer", mock.AnythingOfType("*gin.Context"), trainerID).Return(nil, errors.New("database error"))
	
	c, w := createTestContext("GET", "/api/coaching-requests/pending", nil, trainerID, models.RoleTrainer)
	suite.handler.GetPendingRequests(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "database error", response["error"])
	
	suite.mockCoachingRequestService.AssertExpectations(suite.T())
}

// Test runner
func TestCoachingRequestHandlerSuite(t *testing.T) {
	suite.Run(t, new(CoachingRequestHandlerTestSuite))
}
