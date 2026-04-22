package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
	"gymtrack-backend/internal/testutils"
)

// MockInvitationMethod is a mock implementation of InvitationMethod
type MockInvitationMethod struct {
	mock.Mock
}

type MockGetResult = testutils.MockGetResult

type MockInvitationCollection struct {
	mock.Mock
}

func (m *MockInvitationCollection) Insert(id string, value interface{}, opts *gocb.InsertOptions) (*gocb.MutationResult, error) {
	args := m.Called(id, value, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*gocb.MutationResult), args.Error(1)
}

func (m *MockInvitationCollection) Get(id string, opts *gocb.GetOptions) (InvitationGetResult, error) {
	args := m.Called(id, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(InvitationGetResult), args.Error(1)
}

func (m *MockInvitationCollection) Replace(id string, value interface{}, opts *gocb.ReplaceOptions) (*gocb.MutationResult, error) {
	args := m.Called(id, value, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*gocb.MutationResult), args.Error(1)
}

func (m *MockInvitationMethod) GenerateInvitation(trainerID string, athleteID string) (*models.Invitation, error) {
	args := m.Called(trainerID, athleteID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Invitation), args.Error(1)
}

func (m *MockInvitationMethod) ValidateInvitation(code string) (*models.Invitation, error) {
	args := m.Called(code)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Invitation), args.Error(1)
}

func (m *MockInvitationMethod) MarkInvitationUsed(invitationID string) error {
	args := m.Called(invitationID)
	return args.Error(0)
}

// InvitationServiceTestSuite is the test suite for InvitationService
type InvitationServiceTestSuite struct {
	suite.Suite
	service              *InvitationService
	mockInvitationMethod *MockInvitationMethod
	mockRelationshipRepo *testutils.MockRelationshipRepository
	mockUserRepo         *testutils.MockUserRepository
}

func (suite *InvitationServiceTestSuite) SetupTest() {
	suite.mockInvitationMethod = new(MockInvitationMethod)
	suite.mockRelationshipRepo = new(testutils.MockRelationshipRepository)
	suite.mockUserRepo = new(testutils.MockUserRepository)
	suite.service = NewInvitationService(
		suite.mockInvitationMethod,
		suite.mockRelationshipRepo,
		suite.mockUserRepo,
	)
}

// CodeBasedInvitationTestSuite is the test suite for CodeBasedInvitation
type CodeBasedInvitationTestSuite struct {
	suite.Suite
	service        *CodeBasedInvitation
	mockCollection *MockInvitationCollection
}

func (suite *CodeBasedInvitationTestSuite) SetupTest() {
	suite.mockCollection = new(MockInvitationCollection)
	suite.service = NewCodeBasedInvitation(suite.mockCollection)
}

func createTestInvitation(invitationID, trainerID, code, status string) *models.Invitation {
	return testutils.NewTestInvitation(invitationID, trainerID, code, status)
}

// InvitationService Tests

// GenerateInvitation Tests
func (suite *InvitationServiceTestSuite) TestGenerateInvitation_Success() {
	trainerID := "trainer-123"
	invitation := createTestInvitation("inv-123", trainerID, "ABC12345", "pending")

	suite.mockInvitationMethod.On("GenerateInvitation", trainerID, "").Return(invitation, nil)

	result, err := suite.service.GenerateInvitation(trainerID)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), invitation, result)

	suite.mockInvitationMethod.AssertExpectations(suite.T())
}

func (suite *InvitationServiceTestSuite) TestGenerateInvitation_MethodError() {
	trainerID := "trainer-123"

	suite.mockInvitationMethod.On("GenerateInvitation", trainerID, "").Return(nil, errors.New("generation failed"))

	result, err := suite.service.GenerateInvitation(trainerID)

	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), result)
	assert.Equal(suite.T(), "generation failed", err.Error())

	suite.mockInvitationMethod.AssertExpectations(suite.T())
}

// AcceptInvitation Tests
func (suite *InvitationServiceTestSuite) TestAcceptInvitation_Success() {
	code := "ABC12345"
	athleteID := "athlete-123"
	trainerID := "trainer-123"

	invitation := createTestInvitation("inv-123", trainerID, code, "pending")
	athlete := testutils.NewTestUser(athleteID, "athlete@example.com", models.RoleAthlete)

	suite.mockInvitationMethod.On("ValidateInvitation", code).Return(invitation, nil)
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(nil, nil) // No existing relationship
	suite.mockRelationshipRepo.On("Create", mock.AnythingOfType("*models.Relationship")).Return(nil)
	suite.mockUserRepo.On("GetUserByID", mock.Anything, athleteID).Return(athlete, nil)
	suite.mockUserRepo.On("UpdateUser", mock.Anything, mock.AnythingOfType("*models.User")).Return(nil)
	suite.mockInvitationMethod.On("MarkInvitationUsed", invitation.InvitationID).Return(nil)

	result, err := suite.service.AcceptInvitation(code, athleteID)

	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), result)
	assert.Equal(suite.T(), trainerID, result.TrainerID)
	assert.Equal(suite.T(), athleteID, result.AthleteID)
	assert.Equal(suite.T(), models.RelationshipStatusActive, result.Status)

	suite.mockInvitationMethod.AssertExpectations(suite.T())
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

func (suite *InvitationServiceTestSuite) TestAcceptInvitation_InvalidCode() {
	code := "INVALID"
	athleteID := "athlete-123"

	suite.mockInvitationMethod.On("ValidateInvitation", code).Return(nil, errors.New("invalid invitation code"))

	result, err := suite.service.AcceptInvitation(code, athleteID)

	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), result)
	assert.Equal(suite.T(), "invalid invitation code", err.Error())

	suite.mockInvitationMethod.AssertExpectations(suite.T())
}

func (suite *InvitationServiceTestSuite) TestAcceptInvitation_AlreadyHasActiveTrainer() {
	code := "ABC12345"
	athleteID := "athlete-123"
	trainerID := "trainer-123"

	invitation := createTestInvitation("inv-123", trainerID, code, "pending")
	existingRelationship := testutils.NewTestRelationship("rel-456", "existing-trainer", athleteID, models.RelationshipStatusActive)

	suite.mockInvitationMethod.On("ValidateInvitation", code).Return(invitation, nil)
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(existingRelationship, nil)

	result, err := suite.service.AcceptInvitation(code, athleteID)

	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), result)
	assert.Equal(suite.T(), "you already have an active trainer", err.Error())

	suite.mockInvitationMethod.AssertExpectations(suite.T())
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *InvitationServiceTestSuite) TestAcceptInvitation_RelationshipCreationError() {
	code := "ABC12345"
	athleteID := "athlete-123"
	trainerID := "trainer-123"

	invitation := createTestInvitation("inv-123", trainerID, code, "pending")

	suite.mockInvitationMethod.On("ValidateInvitation", code).Return(invitation, nil)
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(nil, nil)
	suite.mockRelationshipRepo.On("Create", mock.AnythingOfType("*models.Relationship")).Return(errors.New("database error"))

	result, err := suite.service.AcceptInvitation(code, athleteID)

	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), result)
	assert.Contains(suite.T(), err.Error(), "failed to create relationship")

	suite.mockInvitationMethod.AssertExpectations(suite.T())
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *InvitationServiceTestSuite) TestAcceptInvitation_UserNotFoundError() {
	code := "ABC12345"
	athleteID := "athlete-123"
	trainerID := "trainer-123"

	invitation := createTestInvitation("inv-123", trainerID, code, "pending")

	suite.mockInvitationMethod.On("ValidateInvitation", code).Return(invitation, nil)
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(nil, nil)
	suite.mockRelationshipRepo.On("Create", mock.AnythingOfType("*models.Relationship")).Return(nil)
	suite.mockUserRepo.On("GetUserByID", mock.Anything, athleteID).Return(nil, errors.New("user not found"))

	result, err := suite.service.AcceptInvitation(code, athleteID)

	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), result)
	assert.Contains(suite.T(), err.Error(), "failed to get athlete")

	suite.mockInvitationMethod.AssertExpectations(suite.T())
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

func (suite *InvitationServiceTestSuite) TestAcceptInvitation_UserUpdateError() {
	code := "ABC12345"
	athleteID := "athlete-123"
	trainerID := "trainer-123"

	invitation := createTestInvitation("inv-123", trainerID, code, "pending")
	athlete := testutils.NewTestUser(athleteID, "athlete@example.com", models.RoleAthlete)

	suite.mockInvitationMethod.On("ValidateInvitation", code).Return(invitation, nil)
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(nil, nil)
	suite.mockRelationshipRepo.On("Create", mock.AnythingOfType("*models.Relationship")).Return(nil)
	suite.mockUserRepo.On("GetUserByID", mock.Anything, athleteID).Return(athlete, nil)
	suite.mockUserRepo.On("UpdateUser", mock.Anything, mock.AnythingOfType("*models.User")).Return(errors.New("update failed"))

	result, err := suite.service.AcceptInvitation(code, athleteID)

	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), result)
	assert.Contains(suite.T(), err.Error(), "failed to update athlete profile")

	suite.mockInvitationMethod.AssertExpectations(suite.T())
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

func (suite *InvitationServiceTestSuite) TestAcceptInvitation_MarkUsedError() {
	code := "ABC12345"
	athleteID := "athlete-123"
	trainerID := "trainer-123"

	invitation := createTestInvitation("inv-123", trainerID, code, "pending")
	athlete := testutils.NewTestUser(athleteID, "athlete@example.com", models.RoleAthlete)

	suite.mockInvitationMethod.On("ValidateInvitation", code).Return(invitation, nil)
	suite.mockRelationshipRepo.On("GetByAthleteID", athleteID).Return(nil, nil)
	suite.mockRelationshipRepo.On("Create", mock.AnythingOfType("*models.Relationship")).Return(nil)
	suite.mockUserRepo.On("GetUserByID", mock.Anything, athleteID).Return(athlete, nil)
	suite.mockUserRepo.On("UpdateUser", mock.Anything, mock.AnythingOfType("*models.User")).Return(nil)
	suite.mockInvitationMethod.On("MarkInvitationUsed", invitation.InvitationID).Return(errors.New("mark used failed"))

	result, err := suite.service.AcceptInvitation(code, athleteID)

	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), result)
	assert.Equal(suite.T(), trainerID, result.TrainerID)

	suite.mockInvitationMethod.AssertExpectations(suite.T())
	suite.mockRelationshipRepo.AssertExpectations(suite.T())
	suite.mockUserRepo.AssertExpectations(suite.T())
}

// GetPendingInvitations Tests
func (suite *InvitationServiceTestSuite) TestGetPendingInvitations_Success() {
	athleteID := "athlete-123"
	relationships := []*models.Relationship{
		testutils.NewTestRelationship("rel-1", "trainer-123", athleteID, models.RelationshipStatusPending),
		testutils.NewTestRelationship("rel-2", "trainer-456", athleteID, models.RelationshipStatusPending),
	}

	suite.mockRelationshipRepo.On("GetPendingByAthleteID", athleteID).Return(relationships, nil)

	result, err := suite.service.GetPendingInvitations(athleteID)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), relationships, result)

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *InvitationServiceTestSuite) TestGetPendingInvitations_RepositoryError() {
	athleteID := "athlete-123"

	suite.mockRelationshipRepo.On("GetPendingByAthleteID", athleteID).Return(nil, errors.New("database error"))

	result, err := suite.service.GetPendingInvitations(athleteID)

	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), result)
	assert.Equal(suite.T(), "database error", err.Error())

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

func (suite *InvitationServiceTestSuite) TestGetPendingInvitations_Empty() {
	athleteID := "athlete-123"
	relationships := []*models.Relationship{}

	suite.mockRelationshipRepo.On("GetPendingByAthleteID", athleteID).Return(relationships, nil)

	result, err := suite.service.GetPendingInvitations(athleteID)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), relationships, result)

	suite.mockRelationshipRepo.AssertExpectations(suite.T())
}

// CodeBasedInvitation Tests

// GenerateInvitation Tests
func (suite *CodeBasedInvitationTestSuite) TestGenerateInvitation_Success() {
	trainerID := "trainer-123"
	athleteID := ""

	mockResult := &gocb.MutationResult{}
	suite.mockCollection.On("Insert", mock.AnythingOfType("string"), mock.AnythingOfType("*models.Invitation"), mock.AnythingOfType("*gocb.InsertOptions")).Return(mockResult, nil)

	invitation, err := suite.service.GenerateInvitation(trainerID, athleteID)

	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), invitation)
	assert.Equal(suite.T(), trainerID, invitation.TrainerID)
	assert.Equal(suite.T(), "invitation", invitation.Type)
	assert.Equal(suite.T(), "pending", invitation.Status)
	assert.NotEmpty(suite.T(), invitation.InvitationID)
	assert.NotEmpty(suite.T(), invitation.Code)
	assert.True(suite.T(), time.Now().Before(invitation.ExpiresAt))

	suite.mockCollection.AssertExpectations(suite.T())
}

func (suite *CodeBasedInvitationTestSuite) TestGenerateInvitation_InsertError() {
	trainerID := "trainer-123"
	athleteID := ""

	suite.mockCollection.On("Insert", mock.AnythingOfType("string"), mock.AnythingOfType("*models.Invitation"), mock.AnythingOfType("*gocb.InsertOptions")).Return(nil, errors.New("database error"))

	invitation, err := suite.service.GenerateInvitation(trainerID, athleteID)

	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), invitation)
	assert.Contains(suite.T(), err.Error(), "failed to save invitation")

	suite.mockCollection.AssertExpectations(suite.T())
}

func (suite *CodeBasedInvitationTestSuite) TestGenerateInvitation_UUIDError() {
	trainerID := "trainer-123"
	athleteID := ""

	originalGenerateUUIDSafe := generateUUIDSafe
	generateUUIDSafe = func(ctx context.Context) (string, error) {
		return "", errors.New("UUID generation failed")
	}
	defer func() { generateUUIDSafe = originalGenerateUUIDSafe }()

	invitation, err := suite.service.GenerateInvitation(trainerID, athleteID)

	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), invitation)
	assert.Contains(suite.T(), err.Error(), "failed to generate invitation UUID")
}

func (suite *CodeBasedInvitationTestSuite) TestMarkInvitationUsed_AlreadyUsed() {
	invitationID := "inv-123"

	mockGetResult := &MockGetResult{}
	invitation := createTestInvitation(invitationID, "trainer-123", "ABC12345", "used")
	mockGetResult.On("Content", mock.Anything).Run(func(args mock.Arguments) {
		ptr := args.Get(0).(*models.Invitation)
		*ptr = *invitation
	}).Return(nil)
	mockGetResult.On("Cas").Return(gocb.Cas(1))

	suite.mockCollection.On("Get", invitationID, mock.AnythingOfType("*gocb.GetOptions")).Return(mockGetResult, nil)

	err := suite.service.MarkInvitationUsed(invitationID)

	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "invitation already used")

	suite.mockCollection.AssertExpectations(suite.T())
	mockGetResult.AssertExpectations(suite.T())
}

// ValidateInvitation Tests
func (suite *CodeBasedInvitationTestSuite) TestValidateInvitation_EmptyCode() {
	_, err := suite.service.ValidateInvitation("")

	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "code cannot be empty")
}

// MarkInvitationUsed Tests
func (suite *CodeBasedInvitationTestSuite) TestMarkInvitationUsed_Success() {
	invitationID := "inv-123"

	mockGetResult := &MockGetResult{}
	invitation := createTestInvitation(invitationID, "trainer-123", "ABC12345", "pending")
	mockGetResult.On("Content", mock.Anything).Run(func(args mock.Arguments) {
		ptr := args.Get(0).(*models.Invitation)
		*ptr = *invitation
	}).Return(nil)
	mockGetResult.On("Cas").Return(gocb.Cas(1))

	mockReplaceResult := &gocb.MutationResult{}

	suite.mockCollection.On("Get", invitationID, mock.AnythingOfType("*gocb.GetOptions")).Return(mockGetResult, nil)
	suite.mockCollection.On("Replace", invitationID, mock.Anything, mock.AnythingOfType("*gocb.ReplaceOptions")).Return(mockReplaceResult, nil)

	err := suite.service.MarkInvitationUsed(invitationID)

	assert.NoError(suite.T(), err)

	suite.mockCollection.AssertExpectations(suite.T())
	mockGetResult.AssertExpectations(suite.T())
}

func (suite *CodeBasedInvitationTestSuite) TestMarkInvitationUsed_GetError() {
	invitationID := "inv-123"

	suite.mockCollection.On("Get", invitationID, mock.AnythingOfType("*gocb.GetOptions")).Return(nil, errors.New("get failed"))

	err := suite.service.MarkInvitationUsed(invitationID)

	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "failed to get invitation")

	suite.mockCollection.AssertExpectations(suite.T())
}

func (suite *CodeBasedInvitationTestSuite) TestMarkInvitationUsed_ReplaceError() {
	invitationID := "inv-123"

	mockGetResult := &MockGetResult{}
	invitation := createTestInvitation(invitationID, "trainer-123", "ABC12345", "pending")
	mockGetResult.On("Content", mock.Anything).Run(func(args mock.Arguments) {
		ptr := args.Get(0).(*models.Invitation)
		*ptr = *invitation
	}).Return(nil)
	mockGetResult.On("Cas").Return(gocb.Cas(1))

	suite.mockCollection.On("Get", invitationID, mock.AnythingOfType("*gocb.GetOptions")).Return(mockGetResult, nil)
	suite.mockCollection.On("Replace", invitationID, mock.Anything, mock.AnythingOfType("*gocb.ReplaceOptions")).Return(nil, errors.New("replace failed"))

	err := suite.service.MarkInvitationUsed(invitationID)

	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "failed to update invitation")

	suite.mockCollection.AssertExpectations(suite.T())
	mockGetResult.AssertExpectations(suite.T())
}

// Test runners
func TestInvitationServiceSuite(t *testing.T) {
	suite.Run(t, new(InvitationServiceTestSuite))
}

func TestCodeBasedInvitationSuite(t *testing.T) {
	suite.Run(t, new(CodeBasedInvitationTestSuite))
}
