package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"testing"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
	"gymtrack-backend/internal/testutils"
)

// MockCommentRepository is a mock implementation of CommentRepository

// MockCommentService is a mock implementation of CommentService
type MockCommentService struct {
	mock.Mock
}

func (m *MockCommentService) CanCreateComment(userID string, userRole models.UserRole, targetType models.TargetType, targetID string, parentCommentID *string) error {
	args := m.Called(userID, userRole, targetType, targetID, parentCommentID)
	return args.Error(0)
}

func (m *MockCommentService) CanAccessComments(userID string, userRole models.UserRole, targetType models.TargetType, targetID string) error {
	args := m.Called(userID, userRole, targetType, targetID)
	return args.Error(0)
}

func (m *MockCommentService) CanEditOrDeleteComment(userID string, commentID string) error {
	args := m.Called(userID, commentID)
	return args.Error(0)
}

// CommentHandlerTestSuite is the test suite for CommentHandler
type CommentHandlerTestSuite struct {
	suite.Suite
	handler            *CommentHandler
	mockCommentRepo    *testutils.MockCommentRepository
	mockCommentService *MockCommentService
	validator          *validator.Validate
}

func (suite *CommentHandlerTestSuite) SetupTest() {
	suite.mockCommentRepo = &testutils.MockCommentRepository{}
	suite.mockCommentService = new(MockCommentService)
	suite.validator = validator.New()
	suite.handler = NewCommentHandler(suite.mockCommentRepo, suite.mockCommentService)
}


func createTestCommentWithParent(id string, targetType models.TargetType, targetID string, authorID string, authorRole models.AuthorRole, content string, parentID *string) *models.Comment {
	comment := models.NewComment(targetType, targetID, authorID, authorRole, content, parentID)
	comment.CommentID = id
	comment.CreatedAt = time.Now().UTC()
	return comment
}


// CreateComment Tests
func (suite *CommentHandlerTestSuite) TestCreateComment_Success_Trainer() {
	trainerID := "trainer-123"
	targetType := models.TargetTypeWorkout
	targetID := "workout-123"
	content := "Great workout! Keep up the good work."
	
	req := CreateCommentRequest{
		TargetType: targetType,
		TargetID:   targetID,
		Content:    content,
	}
	
	comment := testutils.CreateTestComment("comment-123", targetType, targetID, trainerID, models.AuthorRoleTrainer, content)
	
	suite.mockCommentService.On("CanCreateComment", trainerID, models.RoleTrainer, targetType, targetID, (*string)(nil)).Return(nil)
	suite.mockCommentRepo.On("Create", mock.AnythingOfType("*models.Comment")).Return(nil)
	
	c, w := testutils.CreateTestContext("POST", "/api/comments", req, trainerID, models.RoleTrainer)
	suite.handler.CreateComment(c)
	
	assert.Equal(suite.T(), http.StatusCreated, w.Code)
	
	var response models.Comment
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), targetType, response.TargetType)
	assert.Equal(suite.T(), targetID, response.TargetID)
	assert.Equal(suite.T(), trainerID, response.AuthorID)
	assert.Equal(suite.T(), models.AuthorRoleTrainer, response.AuthorRole)
	assert.Equal(suite.T(), content, response.Content)
	
	suite.mockCommentService.AssertExpectations(suite.T())
	suite.mockCommentRepo.AssertExpectations(suite.T())
}

func (suite *CommentHandlerTestSuite) TestCreateComment_Success_Athlete() {
	athleteID := "athlete-123"
	targetType := models.TargetTypeMeal
	targetID := "meal-123"
	content := "This meal looks delicious!"
	
	req := CreateCommentRequest{
		TargetType: targetType,
		TargetID:   targetID,
		Content:    content,
	}
	
	comment := testutils.CreateTestComment("comment-123", targetType, targetID, athleteID, models.AuthorRoleAthlete, content)
	
	suite.mockCommentService.On("CanCreateComment", athleteID, models.RoleAthlete, targetType, targetID, (*string)(nil)).Return(nil)
	suite.mockCommentRepo.On("Create", mock.AnythingOfType("*models.Comment")).Return(nil)
	
	c, w := testutils.CreateTestContext("POST", "/api/comments", req, athleteID, models.RoleAthlete)
	suite.handler.CreateComment(c)
	
	assert.Equal(suite.T(), http.StatusCreated, w.Code)
	
	var response models.Comment
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), targetType, response.TargetType)
	assert.Equal(suite.T(), targetID, response.TargetID)
	assert.Equal(suite.T(), athleteID, response.AuthorID)
	assert.Equal(suite.T(), models.AuthorRoleAthlete, response.AuthorRole)
	assert.Equal(suite.T(), content, response.Content)
	
	suite.mockCommentService.AssertExpectations(suite.T())
	suite.mockCommentRepo.AssertExpectations(suite.T())
}

func (suite *CommentHandlerTestSuite) TestCreateComment_Success_WithParent() {
	trainerID := "trainer-123"
	targetType := models.TargetTypeWorkout
	targetID := "workout-123"
	parentID := "parent-123"
	content := "I agree with the parent comment."
	
	req := CreateCommentRequest{
		TargetType:      targetType,
		TargetID:        targetID,
		Content:         content,
		ParentCommentID: &parentID,
	}
	
	parentComment := testutils.CreateTestComment(parentID, targetType, targetID, "trainer-456", models.AuthorRoleTrainer, "Original comment")
	
	suite.mockCommentService.On("CanCreateComment", trainerID, models.RoleTrainer, targetType, targetID, &parentID).Return(nil)
	suite.mockCommentRepo.On("GetByID", parentID).Return(parentComment, nil)
	suite.mockCommentRepo.On("Create", mock.AnythingOfType("*models.Comment")).Return(nil)
	
	c, w := testutils.CreateTestContext("POST", "/api/comments", req, trainerID, models.RoleTrainer)
	suite.handler.CreateComment(c)
	
	assert.Equal(suite.T(), http.StatusCreated, w.Code)
	
	var response models.Comment
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), parentID, *response.ParentCommentID)
	
	suite.mockCommentService.AssertExpectations(suite.T())
	suite.mockCommentRepo.AssertExpectations(suite.T())
}

func (suite *CommentHandlerTestSuite) TestCreateComment_Unauthorized() {
	req := CreateCommentRequest{
		TargetType: models.TargetTypeWorkout,
		TargetID:   "workout-123",
		Content:    "Great workout!",
	}
	
	c, w := testutils.CreateTestContext("POST", "/api/comments", req, "", models.RoleTrainer)
	suite.handler.CreateComment(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "User not authenticated", response["error"])
}

func (suite *CommentHandlerTestSuite) TestCreateComment_MissingUserRole() {
	trainerID := "trainer-123"
	req := CreateCommentRequest{
		TargetType: models.TargetTypeWorkout,
		TargetID:   "workout-123",
		Content:    "Great workout!",
	}
	
	c, w := testutils.CreateTestContext("POST", "/api/comments", req, trainerID, "") // No user role set
	suite.handler.CreateComment(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "User role not found", response["error"])
}

func (suite *CommentHandlerTestSuite) TestCreateComment_InvalidJSON() {
	trainerID := "trainer-123"
	
	c, w := testutils.CreateTestContext("POST", "/api/comments", "invalid json", trainerID, models.RoleTrainer)
	suite.handler.CreateComment(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Invalid request body", response["error"])
}

func (suite *CommentHandlerTestSuite) TestCreateComment_ValidationFailed_MissingTargetType() {
	trainerID := "trainer-123"
	req := CreateCommentRequest{
		TargetType: "", // Missing target type
		TargetID:   "workout-123",
		Content:    "Great workout!",
	}
	
	c, w := testutils.CreateTestContext("POST", "/api/comments", req, trainerID, models.RoleTrainer)
	suite.handler.CreateComment(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Validation failed", response["error"])
}

func (suite *CommentHandlerTestSuite) TestCreateComment_ValidationFailed_EmptyContent() {
	trainerID := "trainer-123"
	req := CreateCommentRequest{
		TargetType: models.TargetTypeWorkout,
		TargetID:   "workout-123",
		Content:    "", // Empty content
	}
	
	c, w := testutils.CreateTestContext("POST", "/api/comments", req, trainerID, models.RoleTrainer)
	suite.handler.CreateComment(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Validation failed", response["error"])
}

func (suite *CommentHandlerTestSuite) TestCreateComment_ValidationFailed_ContentTooLong() {
	trainerID := "trainer-123"
	longContent := string(make([]byte, 2001)) // 2001 characters, exceeds max 2000
	req := CreateCommentRequest{
		TargetType: models.TargetTypeWorkout,
		TargetID:   "workout-123",
		Content:    longContent,
	}
	
	c, w := testutils.CreateTestContext("POST", "/api/comments", req, trainerID, models.RoleTrainer)
	suite.handler.CreateComment(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Validation failed", response["error"])
}

func (suite *CommentHandlerTestSuite) TestCreateComment_TargetNotFound() {
	trainerID := "trainer-123"
	req := CreateCommentRequest{
		TargetType: models.TargetTypeWorkout,
		TargetID:   "nonexistent",
		Content:    "Great workout!",
	}
	
	suite.mockCommentService.On("CanCreateComment", trainerID, models.RoleTrainer, req.TargetType, req.TargetID, (*string)(nil)).Return(services.ErrTargetNotFound)
	
	c, w := testutils.CreateTestContext("POST", "/api/comments", req, trainerID, models.RoleTrainer)
	suite.handler.CreateComment(c)
	
	assert.Equal(suite.T(), http.StatusNotFound, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Workout or meal not found", response["error"])
	
	suite.mockCommentService.AssertExpectations(suite.T())
}

func (suite *CommentHandlerTestSuite) TestCreateComment_AccessDenied() {
	trainerID := "trainer-123"
	req := CreateCommentRequest{
		TargetType: models.TargetTypeWorkout,
		TargetID:   "workout-123",
		Content:    "Great workout!",
	}
	
	suite.mockCommentService.On("CanCreateComment", trainerID, models.RoleTrainer, req.TargetType, req.TargetID, (*string)(nil)).Return(services.ErrAccessDenied)
	
	c, w := testutils.CreateTestContext("POST", "/api/comments", req, trainerID, models.RoleTrainer)
	suite.handler.CreateComment(c)
	
	assert.Equal(suite.T(), http.StatusForbidden, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "You do not have permission to comment on this", response["error"])
	
	suite.mockCommentService.AssertExpectations(suite.T())
}

func (suite *CommentHandlerTestSuite) TestCreateComment_ParentCommentNotFound() {
	trainerID := "trainer-123"
	parentID := "nonexistent-parent"
	req := CreateCommentRequest{
		TargetType:      models.TargetTypeWorkout,
		TargetID:        "workout-123",
		Content:         "Reply to parent",
		ParentCommentID: &parentID,
	}
	
	suite.mockCommentService.On("CanCreateComment", trainerID, models.RoleTrainer, req.TargetType, req.TargetID, &parentID).Return(nil)
	suite.mockCommentRepo.On("GetByID", parentID).Return(nil, errors.New("not found"))
	
	c, w := testutils.CreateTestContext("POST", "/api/comments", req, trainerID, models.RoleTrainer)
	suite.handler.CreateComment(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Parent comment not found", response["error"])
	
	suite.mockCommentService.AssertExpectations(suite.T())
	suite.mockCommentRepo.AssertExpectations(suite.T())
}

func (suite *CommentHandlerTestSuite) TestCreateComment_ParentCommentWrongTarget() {
	trainerID := "trainer-123"
	parentID := "parent-123"
	req := CreateCommentRequest{
		TargetType:      models.TargetTypeWorkout,
		TargetID:        "workout-123",
		Content:         "Reply to parent",
		ParentCommentID: &parentID,
	}
	
	// Parent comment belongs to a different target
	parentComment := testutils.CreateTestComment(parentID, models.TargetTypeMeal, "meal-456", "trainer-456", models.AuthorRoleTrainer, "Original comment")
	
	suite.mockCommentService.On("CanCreateComment", trainerID, models.RoleTrainer, req.TargetType, req.TargetID, &parentID).Return(nil)
	suite.mockCommentRepo.On("GetByID", parentID).Return(parentComment, nil)
	
	c, w := testutils.CreateTestContext("POST", "/api/comments", req, trainerID, models.RoleTrainer)
	suite.handler.CreateComment(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Parent comment does not belong to this target", response["error"])
	
	suite.mockCommentService.AssertExpectations(suite.T())
	suite.mockCommentRepo.AssertExpectations(suite.T())
}

func (suite *CommentHandlerTestSuite) TestCreateComment_RepositoryError() {
	trainerID := "trainer-123"
	req := CreateCommentRequest{
		TargetType: models.TargetTypeWorkout,
		TargetID:   "workout-123",
		Content:    "Great workout!",
	}
	
	suite.mockCommentService.On("CanCreateComment", trainerID, models.RoleTrainer, req.TargetType, req.TargetID, (*string)(nil)).Return(nil)
	suite.mockCommentRepo.On("Create", mock.AnythingOfType("*models.Comment")).Return(errors.New("database error"))
	
	c, w := testutils.CreateTestContext("POST", "/api/comments", req, trainerID, models.RoleTrainer)
	suite.handler.CreateComment(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Failed to create comment", response["error"])
	
	suite.mockCommentService.AssertExpectations(suite.T())
	suite.mockCommentRepo.AssertExpectations(suite.T())
}

// GetComments Tests
func (suite *CommentHandlerTestSuite) TestGetComments_Success() {
	userID := "user-123"
	targetType := models.TargetTypeWorkout
	targetID := "workout-123"
	comments := []*models.Comment{
		testutils.CreateTestComment("comment-1", targetType, targetID, "trainer-123", models.AuthorRoleTrainer, "Great workout!"),
		testutils.CreateTestComment("comment-2", targetType, targetID, "athlete-456", models.AuthorRoleAthlete, "Thanks!"),
	}
	
	suite.mockCommentService.On("CanAccessComments", userID, models.RoleAthlete, targetType, targetID).Return(nil)
	suite.mockCommentRepo.On("GetByTarget", targetType, targetID).Return(comments, nil)
	
	c, w := testutils.CreateTestContext("GET", "/api/comments?targetType=workout&targetId=workout-123", nil, userID, models.RoleAthlete)
	suite.handler.GetComments(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response["comments"])
	
	suite.mockCommentService.AssertExpectations(suite.T())
	suite.mockCommentRepo.AssertExpectations(suite.T())
}

func (suite *CommentHandlerTestSuite) TestGetComments_Unauthorized() {
	c, w := testutils.CreateTestContext("GET", "/api/comments?targetType=workout&targetId=workout-123", nil, "", models.RoleAthlete)
	suite.handler.GetComments(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "User not authenticated", response["error"])
}

func (suite *CommentHandlerTestSuite) TestGetComments_MissingUserRole() {
	userID := "user-123"
	
	c, w := testutils.CreateTestContext("GET", "/api/comments?targetType=workout&targetId=workout-123", nil, userID, "") // No user role set
	suite.handler.GetComments(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "User role not found", response["error"])
}

func (suite *CommentHandlerTestSuite) TestGetComments_MissingTargetType() {
	userID := "user-123"
	
	c, w := testutils.CreateTestContext("GET", "/api/comments?targetId=workout-123", nil, userID, models.RoleAthlete)
	suite.handler.GetComments(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "targetType and targetId are required", response["error"])
}

func (suite *CommentHandlerTestSuite) TestGetComments_MissingTargetID() {
	userID := "user-123"
	
	c, w := testutils.CreateTestContext("GET", "/api/comments?targetType=workout", nil, userID, models.RoleAthlete)
	suite.handler.GetComments(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "targetType and targetId are required", response["error"])
}

func (suite *CommentHandlerTestSuite) TestGetComments_InvalidTargetType() {
	userID := "user-123"
	
	c, w := testutils.CreateTestContext("GET", "/api/comments?targetType=invalid&targetId=workout-123", nil, userID, models.RoleAthlete)
	suite.handler.GetComments(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "targetType must be workout or meal", response["error"])
}

func (suite *CommentHandlerTestSuite) TestGetComments_TargetNotFound() {
	userID := "user-123"
	targetType := models.TargetTypeWorkout
	targetID := "nonexistent"
	
	suite.mockCommentService.On("CanAccessComments", userID, models.RoleAthlete, targetType, targetID).Return(services.ErrTargetNotFound)
	
	c, w := testutils.CreateTestContext("GET", "/api/comments?targetType=workout&targetId=nonexistent", nil, userID, models.RoleAthlete)
	suite.handler.GetComments(c)
	
	assert.Equal(suite.T(), http.StatusNotFound, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Workout or meal not found", response["error"])
	
	suite.mockCommentService.AssertExpectations(suite.T())
}

func (suite *CommentHandlerTestSuite) TestGetComments_AccessDenied() {
	userID := "user-123"
	targetType := models.TargetTypeWorkout
	targetID := "workout-123"
	
	suite.mockCommentService.On("CanAccessComments", userID, models.RoleAthlete, targetType, targetID).Return(services.ErrAccessDenied)
	
	c, w := testutils.CreateTestContext("GET", "/api/comments?targetType=workout&targetId=workout-123", nil, userID, models.RoleAthlete)
	suite.handler.GetComments(c)
	
	assert.Equal(suite.T(), http.StatusForbidden, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Access denied", response["error"])
	
	suite.mockCommentService.AssertExpectations(suite.T())
}

func (suite *CommentHandlerTestSuite) TestGetComments_RepositoryError() {
	userID := "user-123"
	targetType := models.TargetTypeWorkout
	targetID := "workout-123"
	
	suite.mockCommentService.On("CanAccessComments", userID, models.RoleAthlete, targetType, targetID).Return(nil)
	suite.mockCommentRepo.On("GetByTarget", targetType, targetID).Return(nil, errors.New("database error"))
	
	c, w := testutils.CreateTestContext("GET", "/api/comments?targetType=workout&targetId=workout-123", nil, userID, models.RoleAthlete)
	suite.handler.GetComments(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Failed to load comments", response["error"])
	
	suite.mockCommentService.AssertExpectations(suite.T())
	suite.mockCommentRepo.AssertExpectations(suite.T())
}

func (suite *CommentHandlerTestSuite) TestGetComments_EmptyComments() {
	userID := "user-123"
	targetType := models.TargetTypeWorkout
	targetID := "workout-123"
	comments := []*models.Comment{}
	
	suite.mockCommentService.On("CanAccessComments", userID, models.RoleAthlete, targetType, targetID).Return(nil)
	suite.mockCommentRepo.On("GetByTarget", targetType, targetID).Return(comments, nil)
	
	c, w := testutils.CreateTestContext("GET", "/api/comments?targetType=workout&targetId=workout-123", nil, userID, models.RoleAthlete)
	suite.handler.GetComments(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response["comments"])
	
	suite.mockCommentService.AssertExpectations(suite.T())
	suite.mockCommentRepo.AssertExpectations(suite.T())
}

// UpdateComment Tests
func (suite *CommentHandlerTestSuite) TestUpdateComment_Success() {
	userID := "user-123"
	commentID := "comment-123"
	newContent := "Updated comment content"
	
	req := UpdateCommentRequest{
		Content: newContent,
	}
	
	comment := testutils.CreateTestComment(commentID, models.TargetTypeWorkout, "workout-123", userID, models.AuthorRoleAthlete, "Original content")
	
	suite.mockCommentService.On("CanEditOrDeleteComment", userID, commentID).Return(nil)
	suite.mockCommentRepo.On("GetByID", commentID).Return(comment, nil)
	suite.mockCommentRepo.On("Update", mock.AnythingOfType("*models.Comment")).Return(nil)
	
	c, w := testutils.CreateTestContext("PUT", "/api/comments/"+commentID, req, userID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: commentID}}
	suite.handler.UpdateComment(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response models.Comment
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), newContent, response.Content)
	
	suite.mockCommentService.AssertExpectations(suite.T())
	suite.mockCommentRepo.AssertExpectations(suite.T())
}

func (suite *CommentHandlerTestSuite) TestUpdateComment_Unauthorized() {
	commentID := "comment-123"
	req := UpdateCommentRequest{
		Content: "Updated content",
	}
	
	c, w := testutils.CreateTestContext("PUT", "/api/comments/"+commentID, req, "", models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: commentID}}
	suite.handler.UpdateComment(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "User not authenticated", response["error"])
}

func (suite *CommentHandlerTestSuite) TestUpdateComment_InvalidJSON() {
	userID := "user-123"
	commentID := "comment-123"
	
	c, w := testutils.CreateTestContext("PUT", "/api/comments/"+commentID, "invalid json", userID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: commentID}}
	suite.handler.UpdateComment(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Invalid request body", response["error"])
}

func (suite *CommentHandlerTestSuite) TestUpdateComment_ValidationFailed_EmptyContent() {
	userID := "user-123"
	commentID := "comment-123"
	req := UpdateCommentRequest{
		Content: "", // Empty content
	}
	
	c, w := testutils.CreateTestContext("PUT", "/api/comments/"+commentID, req, userID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: commentID}}
	suite.handler.UpdateComment(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Validation failed", response["error"])
}

func (suite *CommentHandlerTestSuite) TestUpdateComment_CommentNotFound() {
	userID := "user-123"
	commentID := "nonexistent"
	req := UpdateCommentRequest{
		Content: "Updated content",
	}
	
	suite.mockCommentService.On("CanEditOrDeleteComment", userID, commentID).Return(services.ErrTargetNotFound)
	
	c, w := testutils.CreateTestContext("PUT", "/api/comments/"+commentID, req, userID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: commentID}}
	suite.handler.UpdateComment(c)
	
	assert.Equal(suite.T(), http.StatusNotFound, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Comment not found", response["error"])
	
	suite.mockCommentService.AssertExpectations(suite.T())
}

func (suite *CommentHandlerTestSuite) TestUpdateComment_NotAuthor() {
	userID := "user-123"
	commentID := "comment-123"
	req := UpdateCommentRequest{
		Content: "Updated content",
	}
	
	suite.mockCommentService.On("CanEditOrDeleteComment", userID, commentID).Return(services.ErrNotAuthor)
	
	c, w := testutils.CreateTestContext("PUT", "/api/comments/"+commentID, req, userID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: commentID}}
	suite.handler.UpdateComment(c)
	
	assert.Equal(suite.T(), http.StatusForbidden, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Only the comment author can edit it", response["error"])
	
	suite.mockCommentService.AssertExpectations(suite.T())
}

func (suite *CommentHandlerTestSuite) TestUpdateComment_RepositoryError() {
	userID := "user-123"
	commentID := "comment-123"
	req := UpdateCommentRequest{
		Content: "Updated content",
	}
	
	comment := testutils.CreateTestComment(commentID, models.TargetTypeWorkout, "workout-123", userID, models.AuthorRoleAthlete, "Original content")
	
	suite.mockCommentService.On("CanEditOrDeleteComment", userID, commentID).Return(nil)
	suite.mockCommentRepo.On("GetByID", commentID).Return(comment, nil)
	suite.mockCommentRepo.On("Update", mock.AnythingOfType("*models.Comment")).Return(errors.New("database error"))
	
	c, w := testutils.CreateTestContext("PUT", "/api/comments/"+commentID, req, userID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: commentID}}
	suite.handler.UpdateComment(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Failed to update comment", response["error"])
	
	suite.mockCommentService.AssertExpectations(suite.T())
	suite.mockCommentRepo.AssertExpectations(suite.T())
}

// DeleteComment Tests
func (suite *CommentHandlerTestSuite) TestDeleteComment_Success() {
	userID := "user-123"
	commentID := "comment-123"
	
	suite.mockCommentService.On("CanEditOrDeleteComment", userID, commentID).Return(nil)
	suite.mockCommentRepo.On("Delete", commentID).Return(nil)
	
	c, w := testutils.CreateTestContext("DELETE", "/api/comments/"+commentID, nil, userID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: commentID}}
	suite.handler.DeleteComment(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Comment deleted", response["message"])
	
	suite.mockCommentService.AssertExpectations(suite.T())
	suite.mockCommentRepo.AssertExpectations(suite.T())
}

func (suite *CommentHandlerTestSuite) TestDeleteComment_Unauthorized() {
	commentID := "comment-123"
	
	c, w := testutils.CreateTestContext("DELETE", "/api/comments/"+commentID, nil, "", models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: commentID}}
	suite.handler.DeleteComment(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "User not authenticated", response["error"])
}

func (suite *CommentHandlerTestSuite) TestDeleteComment_CommentNotFound() {
	userID := "user-123"
	commentID := "nonexistent"
	
	suite.mockCommentService.On("CanEditOrDeleteComment", userID, commentID).Return(services.ErrTargetNotFound)
	
	c, w := testutils.CreateTestContext("DELETE", "/api/comments/"+commentID, nil, userID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: commentID}}
	suite.handler.DeleteComment(c)
	
	assert.Equal(suite.T(), http.StatusNotFound, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Comment not found", response["error"])
	
	suite.mockCommentService.AssertExpectations(suite.T())
}

func (suite *CommentHandlerTestSuite) TestDeleteComment_NotAuthor() {
	userID := "user-123"
	commentID := "comment-123"
	
	suite.mockCommentService.On("CanEditOrDeleteComment", userID, commentID).Return(services.ErrNotAuthor)
	
	c, w := testutils.CreateTestContext("DELETE", "/api/comments/"+commentID, nil, userID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: commentID}}
	suite.handler.DeleteComment(c)
	
	assert.Equal(suite.T(), http.StatusForbidden, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Only the comment author can delete it", response["error"])
	
	suite.mockCommentService.AssertExpectations(suite.T())
}

func (suite *CommentHandlerTestSuite) TestDeleteComment_RepositoryError() {
	userID := "user-123"
	commentID := "comment-123"
	
	suite.mockCommentService.On("CanEditOrDeleteComment", userID, commentID).Return(nil)
	suite.mockCommentRepo.On("Delete", commentID).Return(errors.New("database error"))
	
	c, w := testutils.CreateTestContext("DELETE", "/api/comments/"+commentID, nil, userID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: commentID}}
	suite.handler.DeleteComment(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Failed to delete comment", response["error"])
	
	suite.mockCommentService.AssertExpectations(suite.T())
	suite.mockCommentRepo.AssertExpectations(suite.T())
}

// Test runner
func TestCommentHandlerSuite(t *testing.T) {
	suite.Run(t, new(CommentHandlerTestSuite))
}
