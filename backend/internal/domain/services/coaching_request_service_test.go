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

// MockCoachingRequestRepository is a mock implementation of CoachingRequestRepository
type MockCoachingRequestRepository struct {
	mock.Mock
}

func (m *MockCoachingRequestRepository) Create(ctx context.Context, request *models.CoachingRequest) error {
	args := m.Called(ctx, request)
	return args.Error(0)
}

func (m *MockCoachingRequestRepository) GetByID(ctx context.Context, requestID string) (*models.CoachingRequest, error) {
	args := m.Called(ctx, requestID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.CoachingRequest), args.Error(1)
}

func (m *MockCoachingRequestRepository) GetByAthleteID(ctx context.Context, athleteID string) ([]*models.CoachingRequest, error) {
	args := m.Called(ctx, athleteID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.CoachingRequest), args.Error(1)
}

func (m *MockCoachingRequestRepository) GetByTrainerID(ctx context.Context, trainerID string) ([]*models.CoachingRequest, error) {
	args := m.Called(ctx, trainerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.CoachingRequest), args.Error(1)
}

func (m *MockCoachingRequestRepository) GetPendingByTrainerID(ctx context.Context, trainerID string) ([]*models.CoachingRequest, error) {
	args := m.Called(ctx, trainerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.CoachingRequest), args.Error(1)
}

func (m *MockCoachingRequestRepository) Update(ctx context.Context, request *models.CoachingRequest) error {
	args := m.Called(ctx, request)
	return args.Error(0)
}

// MockUserRepository is a mock implementation of UserRepository
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) GetUserByID(ctx context.Context, userID string) (*models.User, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserRepository) UpdateUser(ctx context.Context, user *models.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

// MockRelationshipRepository is a mock implementation of RelationshipRepository
type MockRelationshipRepository struct {
	mock.Mock
}

func (m *MockRelationshipRepository) Create(relationship *models.Relationship) error {
	args := m.Called(relationship)
	return args.Error(0)
}

func (m *MockRelationshipRepository) GetByAthleteID(athleteID string) (*models.Relationship, error) {
	args := m.Called(athleteID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Relationship), args.Error(1)
}

// CoachingRequestServiceTestSuite is the test suite for CoachingRequestService
type CoachingRequestServiceTestSuite struct {
	suite.Suite
	service                    *CoachingRequestService
	mockCoachingRequestRepo    *MockCoachingRequestRepository
	mockUserRepo               *MockUserRepository
	mockRelationshipRepo       *MockRelationshipRepository
}

func (suite *CoachingRequestServiceTestSuite) SetupTest() {
	suite.mockCoachingRequestRepo = new(MockCoachingRequestRepository)
	suite.mockUserRepo = new(MockUserRepository)
	suite.mockRelationshipRepo = new(MockRelationshipRepository)
	suite.service = NewCoachingRequestService(
		suite.mockCoachingRequestRepo,
		suite.mockUserRepo,
		suite.mockRelationshipRepo,
	)
}

// Test data factory functions
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

func createTestCoachingRequest(requestID, athleteID, trainerID string, status models.CoachingRequestStatus, message string) *models.CoachingRequest {
	return &models.CoachingRequest{
		RequestID: requestID,
		AthleteID: athleteID,
		TrainerID: trainerID,
		Status:    status,
		Message:   message,
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

// CreateCoachingRequest Tests
func (suite *CoachingRequestServiceTestSuite) TestCreateCoachingRequest_Success() {
	ctx := context.Background()
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	message := "I would like to request coaching"
	
	trainer := createTestUser(trainerID, "trainer@example.com", models.RoleTrainer)
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(nil, errors.New("not found"))
	suite.mockCoachingRequestRepo.On("GetByAthleteID", ctx, athleteID).Return([]*models.CoachingRequest{}, nil)
	suite.mockUserRepo.On("GetUserByID", ctx, trainerID).Return(trainer, nil)
	suite.mockCoachingRequestRepo.On("Create", ctx, mock.AnythingOfType("*models.CoachingRequest")).Return(nil)
	
	request, err := suite.service.CreateCoachingRequest(ctx, athleteID, trainerID, message)
	
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), request)
	assert.Equal(suite.T(), athleteID, request.AthleteID)
	assert.Equal(suite.T(), trainerID, request.TrainerID)
	assert.Equal(suite.T(), message, request.Message)
	assert.Equal(suite.T(), models.CoachingRequestStatusPending, request.Status)
	assert.NotEmpty(suite.T(), request.RequestID)
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestCreateCoachingRequest_AlreadyHasActiveTrainer() {
	ctx := context.Background()
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	message := "I would like to request coaching"
	
	activeRelationship := createTestRelationship("rel-123", "existing-trainer", athleteID, models.RelationshipStatusActive)
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(activeRelationship, nil)
	
	request, err := suite.service.CreateCoachingRequest(ctx, athleteID, trainerID, message)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), request)
	assert.Equal(suite.T(), "athlete already has an active trainer", err.Error())
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestCreateCoachingRequest_AlreadyPendingRequest() {
	ctx := context.Background()
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	message := "I would like to request coaching"
	
	existingRequest := createTestCoachingRequest("req-123", athleteID, trainerID, models.CoachingRequestStatusPending, "Previous request")
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(nil, errors.New("not found"))
	suite.mockCoachingRequestRepo.On("GetByAthleteID", ctx, athleteID).Return([]*models.CoachingRequest{existingRequest}, nil)
	
	request, err := suite.service.CreateCoachingRequest(ctx, athleteID, trainerID, message)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), request)
	assert.Equal(suite.T(), "already have a pending request to this trainer", err.Error())
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestCreateCoachingRequest_TrainerNotFound() {
	ctx := context.Background()
	athleteID := "athlete-123"
	trainerID := "nonexistent"
	message := "I would like to request coaching"
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(nil, errors.New("not found"))
	suite.mockCoachingRequestRepo.On("GetByAthleteID", ctx, athleteID).Return([]*models.CoachingRequest{}, nil)
	suite.mockUserRepo.On("GetUserByID", ctx, trainerID).Return(nil, errors.New("user not found"))
	
	request, err := suite.service.CreateCoachingRequest(ctx, athleteID, trainerID, message)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), request)
	assert.Contains(suite.T(), err.Error(), "trainer not found")
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestCreateCoachingRequest_UserNotTrainer() {
	ctx := context.Background()
	athleteID := "athlete-123"
	trainerID := "user-123"
	message := "I would like to request coaching"
	
	user := createTestUser(trainerID, "user@example.com", models.RoleAthlete) // Not a trainer
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(nil, errors.New("not found"))
	suite.mockCoachingRequestRepo.On("GetByAthleteID", ctx, athleteID).Return([]*models.CoachingRequest{}, nil)
	suite.mockUserRepo.On("GetUserByID", ctx, trainerID).Return(user, nil)
	
	request, err := suite.service.CreateCoachingRequest(ctx, athleteID, trainerID, message)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), request)
	assert.Equal(suite.T(), "user is not a trainer", err.Error())
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestCreateCoachingRequest_RepositoryError() {
	ctx := context.Background()
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	message := "I would like to request coaching"
	
	trainer := createTestUser(trainerID, "trainer@example.com", models.RoleTrainer)
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(nil, errors.New("not found"))
	suite.mockCoachingRequestRepo.On("GetByAthleteID", ctx, athleteID).Return([]*models.CoachingRequest{}, nil)
	suite.mockUserRepo.On("GetUserByID", ctx, trainerID).Return(trainer, nil)
	suite.mockCoachingRequestRepo.On("Create", ctx, mock.AnythingOfType("*models.CoachingRequest")).Return(errors.New("database error"))
	
	request, err := suite.service.CreateCoachingRequest(ctx, athleteID, trainerID, message)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), request)
	assert.Contains(suite.T(), err.Error(), "failed to create coaching request")
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestCreateCoachingRequest_EmptyMessage() {
	ctx := context.Background()
	athleteID := "athlete-123"
	trainerID := "trainer-123"
	message := "" // Empty message should be allowed
	
	trainer := createTestUser(trainerID, "trainer@example.com", models.RoleTrainer)
	
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(nil, errors.New("not found"))
	suite.mockCoachingRequestRepo.On("GetByAthleteID", ctx, athleteID).Return([]*models.CoachingRequest{}, nil)
	suite.mockUserRepo.On("GetUserByID", ctx, trainerID).Return(trainer, nil)
	suite.mockCoachingRequestRepo.On("Create", ctx, mock.AnythingOfType("*models.CoachingRequest")).Return(nil)
	
	request, err := suite.service.CreateCoachingRequest(ctx, athleteID, trainerID, message)
	
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), request)
	assert.Equal(suite.T(), message, request.Message)
	
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

// AcceptCoachingRequest Tests
func (suite *CoachingRequestServiceTestSuite) TestAcceptCoachingRequest_Success() {
	ctx := context.Background()
	requestID := "req-123"
	trainerID := "trainer-123"
	
	request := createTestCoachingRequest(requestID, "athlete-123", trainerID, models.CoachingRequestStatusPending, "Request message")
	athlete := createTestUser("athlete-123", "athlete@example.com", models.RoleAthlete)
	
	suite.mockCoachingRequestRepo.On("GetByID", ctx, requestID).Return(request, nil)
	suite.mockRelationshipRepo.On("GetByAthleteID", request.AthleteID).Return(nil, errors.New("not found"))
	suite.mockRelationshipRepo.On("Create", mock.AnythingOfType("*models.Relationship")).Return(nil)
	suite.mockUserRepo.On("GetUserByID", ctx, request.AthleteID).Return(athlete, nil)
	suite.mockUserRepo.On("UpdateUser", ctx, mock.AnythingOfType("*models.User")).Return(nil)
	suite.mockCoachingRequestRepo.On("Update", ctx, mock.AnythingOfType("*models.CoachingRequest")).Return(nil)
	
	relationship, err := suite.service.AcceptCoachingRequest(ctx, requestID, trainerID)
	
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), relationship)
	assert.Equal(suite.T(), trainerID, relationship.TrainerID)
	assert.Equal(suite.T(), request.AthleteID, relationship.AthleteID)
	assert.Equal(suite.T(), models.RelationshipStatusActive, relationship.Status)
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestAcceptCoachingRequest_RequestNotFound() {
	ctx := context.Background()
	requestID := "nonexistent"
	trainerID := "trainer-123"
	
	suite.mockCoachingRequestRepo.On("GetByID", ctx, requestID).Return(nil, errors.New("not found"))
	
	relationship, err := suite.service.AcceptCoachingRequest(ctx, requestID, trainerID)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), relationship)
	assert.Contains(suite.T(), err.Error(), "coaching request not found")
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestAcceptCoachingRequest_Unauthorized() {
	ctx := context.Background()
	requestID := "req-123"
	trainerID := "trainer-456" // Different trainer
	wrongTrainerID := "trainer-123"
	
	request := createTestCoachingRequest(requestID, "athlete-123", wrongTrainerID, models.CoachingRequestStatusPending, "Request message")
	
	suite.mockCoachingRequestRepo.On("GetByID", ctx, requestID).Return(request, nil)
	
	relationship, err := suite.service.AcceptCoachingRequest(ctx, requestID, trainerID)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), relationship)
	assert.Equal(suite.T(), "unauthorized: this request is not for you", err.Error())
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestAcceptCoachingRequest_NotPending() {
	ctx := context.Background()
	requestID := "req-123"
	trainerID := "trainer-123"
	
	request := createTestCoachingRequest(requestID, "athlete-123", trainerID, models.CoachingRequestStatusAccepted, "Request message")
	
	suite.mockCoachingRequestRepo.On("GetByID", ctx, requestID).Return(request, nil)
	
	relationship, err := suite.service.AcceptCoachingRequest(ctx, requestID, trainerID)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), relationship)
	assert.Contains(suite.T(), err.Error(), "request has already been accepted")
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestAcceptCoachingRequest_AthleteAlreadyHasTrainer() {
	ctx := context.Background()
	requestID := "req-123"
	trainerID := "trainer-123"
	
	request := createTestCoachingRequest(requestID, "athlete-123", trainerID, models.CoachingRequestStatusPending, "Request message")
	activeRelationship := createTestRelationship("rel-123", "existing-trainer", request.AthleteID, models.RelationshipStatusActive)
	
	suite.mockCoachingRequestRepo.On("GetByID", ctx, requestID).Return(request, nil)
	suite.mockRelationshipRepo.On("GetByAthleteID", request.AthleteID).Return(activeRelationship, nil)
	
	relationship, err := suite.service.AcceptCoachingRequest(ctx, requestID, trainerID)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), relationship)
	assert.Equal(suite.T(), "athlete already has an active trainer", err.Error())
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestAcceptCoachingRequest_RelationshipCreationError() {
	ctx := context.Background()
	requestID := "req-123"
	trainerID := "trainer-123"
	
	request := createTestCoachingRequest(requestID, "athlete-123", trainerID, models.CoachingRequestStatusPending, "Request message")
	
	suite.mockCoachingRequestRepo.On("GetByID", ctx, requestID).Return(request, nil)
	suite.mockRelationshipRepo.On("GetByAthleteID", request.AthleteID).Return(nil, errors.New("not found"))
	suite.mockRelationshipRepo.On("Create", mock.AnythingOfType("*models.Relationship")).Return(errors.New("database error"))
	
	relationship, err := suite.service.AcceptCoachingRequest(ctx, requestID, trainerID)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), relationship)
	assert.Contains(suite.T(), err.Error(), "failed to create relationship")
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

// RejectCoachingRequest Tests
func (suite *CoachingRequestServiceTestSuite) TestRejectCoachingRequest_Success() {
	ctx := context.Background()
	requestID := "req-123"
	trainerID := "trainer-123"
	
	request := createTestCoachingRequest(requestID, "athlete-123", trainerID, models.CoachingRequestStatusPending, "Request message")
	
	suite.mockCoachingRequestRepo.On("GetByID", ctx, requestID).Return(request, nil)
	suite.mockCoachingRequestRepo.On("Update", ctx, mock.AnythingOfType("*models.CoachingRequest")).Return(nil)
	
	err := suite.service.RejectCoachingRequest(ctx, requestID, trainerID)
	
	assert.NoError(suite.T(), err)
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestRejectCoachingRequest_RequestNotFound() {
	ctx := context.Background()
	requestID := "nonexistent"
	trainerID := "trainer-123"
	
	suite.mockCoachingRequestRepo.On("GetByID", ctx, requestID).Return(nil, errors.New("not found"))
	
	err := suite.service.RejectCoachingRequest(ctx, requestID, trainerID)
	
	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "coaching request not found")
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestRejectCoachingRequest_Unauthorized() {
	ctx := context.Background()
	requestID := "req-123"
	trainerID := "trainer-456" // Different trainer
	wrongTrainerID := "trainer-123"
	
	request := createTestCoachingRequest(requestID, "athlete-123", wrongTrainerID, models.CoachingRequestStatusPending, "Request message")
	
	suite.mockCoachingRequestRepo.On("GetByID", ctx, requestID).Return(request, nil)
	
	err := suite.service.RejectCoachingRequest(ctx, requestID, trainerID)
	
	assert.Error(suite.T(), err)
	assert.Equal(suite.T(), "unauthorized: this request is not for you", err.Error())
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestRejectCoachingRequest_NotPending() {
	ctx := context.Background()
	requestID := "req-123"
	trainerID := "trainer-123"
	
	request := createTestCoachingRequest(requestID, "athlete-123", trainerID, models.CoachingRequestStatusRejected, "Request message")
	
	suite.mockCoachingRequestRepo.On("GetByID", ctx, requestID).Return(request, nil)
	
	err := suite.service.RejectCoachingRequest(ctx, requestID, trainerID)
	
	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "request has already been rejected")
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestRejectCoachingRequest_UpdateError() {
	ctx := context.Background()
	requestID := "req-123"
	trainerID := "trainer-123"
	
	request := createTestCoachingRequest(requestID, "athlete-123", trainerID, models.CoachingRequestStatusPending, "Request message")
	
	suite.mockCoachingRequestRepo.On("GetByID", ctx, requestID).Return(request, nil)
	suite.mockCoachingRequestRepo.On("Update", ctx, mock.AnythingOfType("*models.CoachingRequest")).Return(errors.New("database error"))
	
	err := suite.service.RejectCoachingRequest(ctx, requestID, trainerID)
	
	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "failed to update coaching request")
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
}

// GetMyRequests Tests
func (suite *CoachingRequestServiceTestSuite) TestGetMyRequests_Success_Athlete() {
	ctx := context.Background()
	athleteID := "athlete-123"
	userRole := "athlete"
	
	requests := []*models.CoachingRequest{
		createTestCoachingRequest("req-1", athleteID, "trainer-123", models.CoachingRequestStatusPending, "Request 1"),
		createTestCoachingRequest("req-2", athleteID, "trainer-456", models.CoachingRequestStatusRejected, "Request 2"),
	}
	
	athlete := createTestUser(athleteID, "athlete@example.com", models.RoleAthlete)
	trainer1 := createTestUser("trainer-123", "trainer1@example.com", models.RoleTrainer)
	trainer2 := createTestUser("trainer-456", "trainer2@example.com", models.RoleTrainer)
	
	suite.mockCoachingRequestRepo.On("GetByAthleteID", ctx, athleteID).Return(requests, nil)
	suite.mockUserRepo.On("GetUserByID", ctx, athleteID).Return(athlete, nil)
	suite.mockUserRepo.On("GetUserByID", ctx, "trainer-123").Return(trainer1, nil)
	suite.mockUserRepo.On("GetUserByID", ctx, "trainer-456").Return(trainer2, nil)
	
	requestsWithDetails, err := suite.service.GetMyRequests(ctx, athleteID, userRole)
	
	assert.NoError(suite.T(), err)
	assert.Len(suite.T(), requestsWithDetails, 2)
	assert.Equal(suite.T(), requests[0], requestsWithDetails[0].CoachingRequest)
	assert.Equal(suite.T(), athlete, requestsWithDetails[0].Athlete)
	assert.Equal(suite.T(), trainer1, requestsWithDetails[0].Trainer)
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestGetMyRequests_Success_Trainer() {
	ctx := context.Background()
	trainerID := "trainer-123"
	userRole := "trainer"
	
	requests := []*models.CoachingRequest{
		createTestCoachingRequest("req-1", "athlete-123", trainerID, models.CoachingRequestStatusPending, "Request 1"),
		createTestCoachingRequest("req-2", "athlete-456", trainerID, models.CoachingRequestStatusAccepted, "Request 2"),
	}
	
	athlete1 := createTestUser("athlete-123", "athlete1@example.com", models.RoleAthlete)
	athlete2 := createTestUser("athlete-456", "athlete2@example.com", models.RoleAthlete)
	trainer := createTestUser(trainerID, "trainer@example.com", models.RoleTrainer)
	
	suite.mockCoachingRequestRepo.On("GetByTrainerID", ctx, trainerID).Return(requests, nil)
	suite.mockUserRepo.On("GetUserByID", ctx, "athlete-123").Return(athlete1, nil)
	suite.mockUserRepo.On("GetUserByID", ctx, "athlete-456").Return(athlete2, nil)
	suite.mockUserRepo.On("GetUserByID", ctx, trainerID).Return(trainer, nil)
	
	requestsWithDetails, err := suite.service.GetMyRequests(ctx, trainerID, userRole)
	
	assert.NoError(suite.T(), err)
	assert.Len(suite.T(), requestsWithDetails, 2)
	assert.Equal(suite.T(), requests[0], requestsWithDetails[0].CoachingRequest)
	assert.Equal(suite.T(), athlete1, requestsWithDetails[0].Athlete)
	assert.Equal(suite.T(), trainer, requestsWithDetails[0].Trainer)
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestGetMyRequests_InvalidRole() {
	ctx := context.Background()
	userID := "user-123"
	userRole := "invalid"
	
	requestsWithDetails, err := suite.service.GetMyRequests(ctx, userID, userRole)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), requestsWithDetails)
	assert.Equal(suite.T(), "invalid user role", err.Error())
}

func (suite *CoachingRequestServiceTestSuite) TestGetMyRequests_RepositoryError() {
	ctx := context.Background()
	athleteID := "athlete-123"
	userRole := "athlete"
	
	suite.mockCoachingRequestRepo.On("GetByAthleteID", ctx, athleteID).Return(nil, errors.New("database error"))
	
	requestsWithDetails, err := suite.service.GetMyRequests(ctx, athleteID, userRole)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), requestsWithDetails)
	assert.Contains(suite.T(), err.Error(), "failed to get coaching requests")
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestGetMyRequests_EmptyRequests() {
	ctx := context.Background()
	athleteID := "athlete-123"
	userRole := "athlete"
	
	requests := []*models.CoachingRequest{}
	
	suite.mockCoachingRequestRepo.On("GetByAthleteID", ctx, athleteID).Return(requests, nil)
	
	requestsWithDetails, err := suite.service.GetMyRequests(ctx, athleteID, userRole)
	
	assert.NoError(suite.T(), err)
	assert.Len(suite.T(), requestsWithDetails, 0)
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
}

// GetPendingRequestsForTrainer Tests
func (suite *CoachingRequestServiceTestSuite) TestGetPendingRequestsForTrainer_Success() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	requests := []*models.CoachingRequest{
		createTestCoachingRequest("req-1", "athlete-123", trainerID, models.CoachingRequestStatusPending, "Request 1"),
		createTestCoachingRequest("req-2", "athlete-456", trainerID, models.CoachingRequestStatusPending, "Request 2"),
	}
	
	athlete1 := createTestUser("athlete-123", "athlete1@example.com", models.RoleAthlete)
	athlete2 := createTestUser("athlete-456", "athlete2@example.com", models.RoleAthlete)
	
	suite.mockCoachingRequestRepo.On("GetPendingByTrainerID", ctx, trainerID).Return(requests, nil)
	suite.mockUserRepo.On("GetUserByID", ctx, "athlete-123").Return(athlete1, nil)
	suite.mockUserRepo.On("GetUserByID", ctx, "athlete-456").Return(athlete2, nil)
	
	requestsWithDetails, err := suite.service.GetPendingRequestsForTrainer(ctx, trainerID)
	
	assert.NoError(suite.T(), err)
	assert.Len(suite.T(), requestsWithDetails, 2)
	assert.Equal(suite.T(), requests[0], requestsWithDetails[0].CoachingRequest)
	assert.Equal(suite.T(), athlete1, requestsWithDetails[0].Athlete)
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestGetPendingRequestsForTrainer_RepositoryError() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	suite.mockCoachingRequestRepo.On("GetPendingByTrainerID", ctx, trainerID).Return(nil, errors.New("database error"))
	
	requestsWithDetails, err := suite.service.GetPendingRequestsForTrainer(ctx, trainerID)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), requestsWithDetails)
	assert.Contains(suite.T(), err.Error(), "failed to get pending coaching requests")
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestGetPendingRequestsForTrainer_EmptyRequests() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	requests := []*models.CoachingRequest{}
	
	suite.mockCoachingRequestRepo.On("GetPendingByTrainerID", ctx, trainerID).Return(requests, nil)
	
	requestsWithDetails, err := suite.service.GetPendingRequestsForTrainer(ctx, trainerID)
	
	assert.NoError(suite.T(), err)
	assert.Len(suite.T(), requestsWithDetails, 0)
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
}

func (suite *CoachingRequestServiceTestSuite) TestGetPendingRequestsForTrainer_AthleteNotFoundError() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	requests := []*models.CoachingRequest{
		createTestCoachingRequest("req-1", "athlete-123", trainerID, models.CoachingRequestStatusPending, "Request 1"),
	}
	
	suite.mockCoachingRequestRepo.On("GetPendingByTrainerID", ctx, trainerID).Return(requests, nil)
	suite.mockUserRepo.On("GetUserByID", ctx, "athlete-123").Return(nil, errors.New("athlete not found"))
	
	requestsWithDetails, err := suite.service.GetPendingRequestsForTrainer(ctx, trainerID)
	
	assert.NoError(suite.T(), err) // Should not fail if athlete not found
	assert.Len(suite.T(), requestsWithDetails, 1)
	assert.Nil(suite.T(), requestsWithDetails[0].Athlete) // Athlete should be nil
	
	suite.mockCoachingRequestRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

// Test runner
func TestCoachingRequestServiceSuite(t *testing.T) {
	suite.Run(t, new(CoachingRequestServiceTestSuite))
}
