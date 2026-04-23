package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/testutils"
)

type UserHandlerTestSuite struct {
	suite.Suite
	router       *gin.Engine
	mockUserRepo *testutils.MockUserRepository
}

func (suite *UserHandlerTestSuite) SetupTest() {
	gin.SetMode(gin.TestMode)
	suite.mockUserRepo = new(testutils.MockUserRepository)
	userHandler := NewUserHandler(suite.mockUserRepo)

	suite.router = gin.New()
	suite.router.GET("/api/users/me", func(c *gin.Context) {
		c.Set("userID", "test-user-123")
		userHandler.GetCurrentUser(c)
	})
	suite.router.PUT("/api/users/me", func(c *gin.Context) {
		c.Set("userID", "test-user-123")
		userHandler.UpdateCurrentUser(c)
	})
}

func (suite *UserHandlerTestSuite) TestGetCurrentUser_Success() {
	testUser := &models.User{
		UserID:    "test-user-123",
		Email:     "user@example.com",
		Role:      models.RoleAthlete,
		Profile:   models.UserProfile{Name: "Test User", Age: 25},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	suite.mockUserRepo.On("GetUserByID", mock.AnythingOfType("context.backgroundCtx"), "test-user-123").Return(testUser, nil)

	req, _ := http.NewRequest("GET", "/api/users/me", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "test-user-123", response["userId"])
	assert.Equal(suite.T(), "user@example.com", response["email"])
	assert.Equal(suite.T(), "athlete", response["role"])
	assert.NotContains(suite.T(), response, "passwordHash")
}

func (suite *UserHandlerTestSuite) TestGetCurrentUser_NotFound() {
	req, _ := http.NewRequest("GET", "/api/users/me", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusNotFound, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Contains(suite.T(), response, "error")
}

func (suite *UserHandlerTestSuite) TestGetCurrentUser_UnauthorizedWhenNoUserID() {
	userHandler := NewUserHandler(suite.mockUserRepo)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/api/users/me", nil)
	// Do not set userID in context

	userHandler.GetCurrentUser(c)

	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	var response map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &response)
	assert.Contains(suite.T(), response, "error")
}

func (suite *UserHandlerTestSuite) TestUpdateCurrentUser_Success() {
	suite.mockUserRepo.users["test-user-123"] = &models.User{
		UserID:    "test-user-123",
		Email:     "user@example.com",
		Role:      models.RoleAthlete,
		Profile:   models.UserProfile{Name: "Old Name", Age: 25},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	updateData := map[string]interface{}{
		"profile": map[string]interface{}{
			"name": "Updated Name",
			"age":  30,
		},
	}
	jsonData, _ := json.Marshal(updateData)
	req, _ := http.NewRequest("PUT", "/api/users/me", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Updated Name", response["profile"].(map[string]interface{})["name"])
}

func (suite *UserHandlerTestSuite) TestUpdateCurrentUser_InvalidJSON() {
	req, _ := http.NewRequest("PUT", "/api/users/me", bytes.NewBufferString("invalid json"))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
}

func TestUserHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(UserHandlerTestSuite))
}
