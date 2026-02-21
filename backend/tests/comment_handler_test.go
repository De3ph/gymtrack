package handlers_test

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/google/uuid"

	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/domain/services"
	"gymtrack-backend/internal/domain/types"
)

// Mock dependencies
type MockCommentRepository struct {
	mock.Mock
}

type MockCommentService struct {
	mock.Mock
}

type mockValidator struct {
}

func (v *mockValidator) RegisterValidation(name string, validator validator.StructValidator) {
}

func (v *mockValidator) Has("message") bool {
	return true
}

func (v *mockValidator) ValidateStruct(obj interface{}) error {
	return nil
}

func (v *mockValidator) ValidateField(slice interface{}, fields ...string) error {
	return nil
}

func (v *mockValidator) ValidateInterface(i interface{}, prefix string, opts ...string) error {
	return nil
}

func (v *mockValidator) Validate(req interface{}) error {
	return nil
}

// Test CreateComment_Handles_SuccessfulCreate
func TestCommentHandler_CreateComment_Success(t *testing.T) {
	// Setup mocks
	repo := new(MockCommentRepository)
	svc := new(MockCommentService)
	val := &mockValidator{}

	// Expect canCreateComment to succeed
	svc.On("CanCreateComment", "userID", models.RoleTrainer, models.TargetTypeWorkout, "w1", nil).
		Return(nil)

	// Expect comment creation to succeed
	repo.On("Create", mock.AnythingOfType("*models.Comment")).Return(nil)

	// Handler initialization
	handler := handlers.NewCommentHandler(repo, svc, val)

	// Mock Gin context
	r := httptest.NewRecorder()
	c, _ := gin.CreateMockContext(r)
	c.Params = []gin.Param{{Key: "userID", Value: "user123"}, {Key: "userRole", Value: "trainer"}}
	c.Request, _ = http.NewRequest("POST", "/api/comments?targetType=workout&targetId=w1&parentCommentId=", nil)
	c.Writer = r

	// Set BindJSON
	var req models.CreateCommentRequest
	req.TargetType = models.TargetTypeWorkout
	req.TargetID = "w1"
	req.Content = "Great workout!"
	req.ParentCommentID = nil

	c.ShouldBindJSON(&req)

	// Mock JSON binding
	c.Request.Body = dummyBody(&req)

	// Execute handler
	err := handler.CreateComment(c)

	// Assertions
	assert.NoError(t, err)
	assert.Equal(t, http.StatusCreated, c.Writer.Status())
}

// Test CreateComment_Handles_InvalidTargetType
func TestCommentHandler_CreateComment_InvalidTargetType(t *testing.T) {
	// Setup mocks
	repo := new(MockCommentRepository)
	svc := new(MockCommentService)
	val := &mockValidator{}

	handler := handlers.NewCommentHandler(repo, svc, val)

	// Mock Gin context
	r := httptest.NewRecorder()
	c, _ := gin.CreateMockContext(r)
	c.Params = []gin.Param{{Key: "userID", Value: "user123"}, {Key: "userRole", Value: "trainer"}}
	c.Request, _ = http.NewRequest("POST", "/api/comments?targetType=invalid&targetId=w1", nil)
	c.Writer = r

	// Mock JSON parsing
	c.Request.Body = dummyBody(&models.CreateCommentRequest{
		TargetType: "invalid",
		TargetID:   "w1",
		Content:    "Test",
	})

	// Execute handler
	err := handler.CreateComment(c)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, c.Writer.Status())
}

// Test CreateComment_Handles_MissingParentComment
func TestCommentHandler_CreateComment_ParentCommentNotFound(t *testing.T) {
	// Setup mocks
	repo := new(MockCommentRepository)
	svc := new(MockCommentService)
	val := &mockValidator{}

	// Expect cannotCreateComment access denied
	svc.On("CanCreateComment", "userID", models.RoleTrainer, models.TargetTypeWorkout, "w1", nil).
		Return(services.ErrAccessDenied)

	// Handler initialization
	handler := handlers.NewCommentHandler(repo, svc, val)

	// Mock Gin context
	r := httptest.NewRecorder()
	c, _ := gin.CreateMockContext(r)
	c.Params = []gin.Param{{Key: "userID", Value: "user123"}, {Key: "userRole", Value: "trainer"}}
	c.Request, _ = http.NewRequest("POST", "/api/comments?targetType=workout&targetId=w1", nil)
	c.Writer = r

	c.Request.Body = dummyBody(&models.CreateCommentRequest{
		TargetType: models.TargetTypeWorkout,
		TargetID:   "w1",
		Content:    "Test",
		ParentCommentID: &string{},
	})

	// Execute handler
	err := handler.CreateComment(c)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, c.Writer.Status())
}

// Test CreateComment_Handles_ValidationFailure
func TestCommentHandler_CreateComment_ValidationFailure(t *testing.T) {
	// Setup mocks
	repo := new(MockCommentRepository)
	svc := new(MockCommentService)
	val := &mockValidator{}

	handler := handlers.NewCommentHandler(repo, svc, val)

	// Mock Gin context
	r := httptest.NewRecorder()
	c, _ := gin.CreateMockContext(r)
	c.Params = []gin.Param{{Key: "userID", Value: "user123"}, {Key: "userRole", Value: "trainer"}}
	c.Request, _ = http.NewRequest("POST", "/api/comments", nil)
	c.Writer = r

	// Mock JSON binding
	c.Request.Body = dummyBody(&models.CreateCommentRequest{
		TargetType: "",
		TargetID:   "",
		Content:    "",
	})
	c.ShouldBindJSON(&models.CreateCommentRequest{})

	// Execute handler
	err := handler.CreateComment(c)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, c.Writer.Status())
}

// Test CreateComment_Handles_RequestBodyParsingError
func TestCommentHandler_CreateComment_ParsingError(t *testing.T) {
	// Setup mocks
	repo := new(MockCommentRepository)
	svc := new(MockCommentService)
	val := &mockValidator{}

	handler := handlers.NewCommentHandler(repo, svc, val)

	// Mock Gin context
	r := httptest.NewRecorder()
	c, _ := gin.CreateMockContext(r)
	c.Params = []gin.Param{{Key: "userID", Value: "user123"}, {Key: "userRole", Value: "trainer"}}
	c.Request, _ = http.NewRequest("POST", "/api/comments", nil)
	c.Writer = r

	// Set invalid body
	c.Request.Body = nil

	// Execute handler
	err := handler.CreateComment(c)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, c.Writer.Status())
}

// Test GetComments_WithInvalidParameters
func TestCommentHandler_GetComments_MissingParameters(t *testing.T) {
	// Setup mocks
	repo := new(MockCommentRepository)
	svc := new(MockCommentService)
	val := &mockValidator{}

	handler := handlers.NewCommentHandler(repo, svc, val)

	// Mock Gin context
	r := httptest.NewRecorder()
	c, _ := gin.CreateMockContext(r)
	c.Params = []gin.Param{{Key: "userID", Value: "user123"}, {Key: "userRole", Value: "trainer"}}
	c.Request, _ = http.NewRequest("GET", "/api/comments", nil)
	c.Writer = r

	// Execute handler
	err := handler.GetComments(c)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, c.Writer.Status())
}

// Test GetComments_WithInvalidTargetType
func TestCommentHandler_GetComments_InvalidTargetType(t *testing.T) {
	// Setup mocks
	repo := new(MockCommentRepository)
	svc := new(MockCommentService)
	val := &mockValidator{}

	handler := handlers.NewCommentHandler(repo, svc, val)

	// Mock Gin context
	r := httptest.NewRecorder()
	c, _ := gin.CreateMockContext(r)
	c.Params = []gin.Param{{Key: "userID", Value: "user123"}, {Key: "userRole", Value: "trainer"}}
	c.Request, _ = http.NewRequest("GET", "/api/comments?targetType=invalid&targetId=w1", nil)
	c.Writer = r

	// Execute handler
	err := handler.GetComments(c)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, c.Writer.Status())
}

// Test UpdateComment_ValidUpdate
func TestCommentHandler_UpdateComment_Success(t *testing.T) {
	// Setup mocks
	repo := new(MockCommentRepository)
	svc := new(MockCommentService)
	val := &mockValidator{}

	// Mock GetByID
	repo.On("GetByID", "commentId").Return(&models.Comment{CommentID: "c1", Content: "Old"})
	// Mock validation of update
	_ := models.UpdateCommentRequest{Content: "New"}.Validate()

	// Expect edit
	repo.On("Update", mock.AnythingOfType("*models.Comment")).Return(nil)

	// Handler initialization
	handler := handlers.NewCommentHandler(repo, svc, val)

	// Mock Gin context
	r := httptest.NewRecorder()
	c, _ := gin.CreateMockContext(r)
	c.Params = []gin.Param{{Key: "userID", Value: "user123"}, {Key: "id", Value: "c1"}}
	c.Writer = r

	// Mock JSON binding
	var req models.UpdateCommentRequest
	req.Content = "New"
	c.ShouldBindJSON(&req)

	// Execute handler
	err := handler.UpdateComment(c)

	// Assertions
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, c.Writer.Status())
}

// Test DeleteComment_Success
func TestCommentHandler_DeleteComment_Success(t *testing.T) {
	// Setup mocks
	repo := new(MockCommentRepository)
	svc := new(MockCommentService)
	val := &mockValidator{}

	// Expect CanEditOrDeleteComment to succeed
	svc.On("CanEditOrDeleteComment", "userID", "commentId").Return(nil)
	// Expect Delete call
	repo.On("Delete", "commentId").Return(nil)

	// Handler initialization
	handler := handlers.NewCommentHandler(repo, svc, val)

	// Mock Gin context
	r := httptest.NewRecorder()
	c, _ := gin.CreateMockContext(r)
	c.Params = []gin.Param{{Key: "userID", Value: "user123"}, {Key: "id", Value: "commentId"}}
	c.Writer = r

	// Execute handler
	err := handler.DeleteComment(c)

	// Assertions
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, c.Writer.Status())
}

// Helper function to create a dummy request body
func dummyBody(obj interface{}) *bytes.Buffer {
	b, _ := json.Marshal(obj)
	return bytes.NewBuffer(b)
}