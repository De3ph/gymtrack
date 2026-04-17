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

// MockAvailabilityService is a mock implementation of AvailabilityService
type MockAvailabilityService struct {
	mock.Mock
}

func (m *MockAvailabilityService) GetAvailability(ctx context.Context, trainerID string) ([]models.TrainerAvailability, error) {
	args := m.Called(ctx, trainerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.TrainerAvailability), args.Error(1)
}

func (m *MockAvailabilityService) SetAvailability(ctx context.Context, trainerID string, slots []models.TrainerAvailability) error {
	args := m.Called(ctx, trainerID, slots)
	return args.Error(0)
}

func (m *MockAvailabilityService) DeleteSlot(ctx context.Context, slotID string) error {
	args := m.Called(ctx, slotID)
	return args.Error(0)
}

// AvailabilityHandlerTestSuite is the test suite for AvailabilityHandler
type AvailabilityHandlerTestSuite struct {
	suite.Suite
	handler               *AvailabilityHandler
	mockAvailabilityService *MockAvailabilityService
}

func (suite *AvailabilityHandlerTestSuite) SetupTest() {
	suite.mockAvailabilityService = new(MockAvailabilityService)
	suite.handler = NewAvailabilityHandler(suite.mockAvailabilityService)
}

// Test data factory functions
func createTestAvailabilitySlot(id, trainerID string, day models.WeekDay, startTime, endTime time.Time) models.TrainerAvailability {
	return models.TrainerAvailability{
		ID:        id,
		TrainerID: trainerID,
		Day:       day,
		StartTime: startTime,
		EndTime:   endTime,
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

// GetMyAvailability Tests
func (suite *AvailabilityHandlerTestSuite) TestGetMyAvailability_Success() {
	trainerID := "trainer-123"
	slots := []models.TrainerAvailability{
		createTestAvailabilitySlot("slot-1", trainerID, models.WeekDayMonday, 
			time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 17, 0, 0, 0, time.UTC)),
		createTestAvailabilitySlot("slot-2", trainerID, models.WeekDayWednesday,
			time.Date(0, 0, 0, 10, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 14, 0, 0, 0, time.UTC)),
	}
	
	suite.mockAvailabilityService.On("GetAvailability", mock.AnythingOfType("*gin.Context"), trainerID).Return(slots, nil)
	
	c, w := createTestContext("GET", "/api/trainers/me/availability", nil, trainerID, models.RoleTrainer)
	suite.handler.GetMyAvailability(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response["slots"])
	
	suite.mockAvailabilityService.AssertExpectations(suite.T())
}

func (suite *AvailabilityHandlerTestSuite) TestGetMyAvailability_Unauthorized() {
	c, w := createTestContext("GET", "/api/trainers/me/availability", nil, "", models.RoleTrainer)
	suite.handler.GetMyAvailability(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "unauthorized", response["error"])
}

func (suite *AvailabilityHandlerTestSuite) TestGetMyAvailability_ServiceError() {
	trainerID := "trainer-123"
	
	suite.mockAvailabilityService.On("GetAvailability", mock.AnythingOfType("*gin.Context"), trainerID).Return(nil, errors.New("service error"))
	
	c, w := createTestContext("GET", "/api/trainers/me/availability", nil, trainerID, models.RoleTrainer)
	suite.handler.GetMyAvailability(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "service error", response["error"])
	
	suite.mockAvailabilityService.AssertExpectations(suite.T())
}

func (suite *AvailabilityHandlerTestSuite) TestGetMyAvailability_EmptySlots() {
	trainerID := "trainer-123"
	slots := []models.TrainerAvailability{}
	
	suite.mockAvailabilityService.On("GetAvailability", mock.AnythingOfType("*gin.Context"), trainerID).Return(slots, nil)
	
	c, w := createTestContext("GET", "/api/trainers/me/availability", nil, trainerID, models.RoleTrainer)
	suite.handler.GetMyAvailability(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response["slots"])
	
	suite.mockAvailabilityService.AssertExpectations(suite.T())
}

// SetMyAvailability Tests
func (suite *AvailabilityHandlerTestSuite) TestSetMyAvailability_Success() {
	trainerID := "trainer-123"
	slots := []models.TrainerAvailability{
		createTestAvailabilitySlot("slot-1", trainerID, models.WeekDayMonday,
			time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 17, 0, 0, 0, time.UTC)),
	}
	
	suite.mockAvailabilityService.On("SetAvailability", mock.AnythingOfType("*gin.Context"), trainerID, slots).Return(nil)
	
	c, w := createTestContext("PUT", "/api/trainers/me/availability", slots, trainerID, models.RoleTrainer)
	suite.handler.SetMyAvailability(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "availability updated successfully", response["message"])
	
	suite.mockAvailabilityService.AssertExpectations(suite.T())
}

func (suite *AvailabilityHandlerTestSuite) TestSetMyAvailability_Unauthorized() {
	slots := []models.TrainerAvailability{}
	
	c, w := createTestContext("PUT", "/api/trainers/me/availability", slots, "", models.RoleTrainer)
	suite.handler.SetMyAvailability(c)
	
	assert.Equal(suite.T(), http.StatusUnauthorized, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "unauthorized", response["error"])
}

func (suite *AvailabilityHandlerTestSuite) TestSetMyAvailability_InvalidJSON() {
	trainerID := "trainer-123"
	
	c, w := createTestContext("PUT", "/api/trainers/me/availability", "invalid json", trainerID, models.RoleTrainer)
	suite.handler.SetMyAvailability(c)
	
	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Contains(suite.T(), response["error"], "invalid character")
}

func (suite *AvailabilityHandlerTestSuite) TestSetMyAvailability_EmptySlots() {
	trainerID := "trainer-123"
	slots := []models.TrainerAvailability{}
	
	suite.mockAvailabilityService.On("SetAvailability", mock.AnythingOfType("*gin.Context"), trainerID, slots).Return(nil)
	
	c, w := createTestContext("PUT", "/api/trainers/me/availability", slots, trainerID, models.RoleTrainer)
	suite.handler.SetMyAvailability(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "availability updated successfully", response["message"])
	
	suite.mockAvailabilityService.AssertExpectations(suite.T())
}

func (suite *AvailabilityHandlerTestSuite) TestSetMyAvailability_ServiceError() {
	trainerID := "trainer-123"
	slots := []models.TrainerAvailability{
		createTestAvailabilitySlot("slot-1", trainerID, models.WeekDayMonday,
			time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 17, 0, 0, 0, time.UTC)),
	}
	
	suite.mockAvailabilityService.On("SetAvailability", mock.AnythingOfType("*gin.Context"), trainerID, slots).Return(errors.New("validation error"))
	
	c, w := createTestContext("PUT", "/api/trainers/me/availability", slots, trainerID, models.RoleTrainer)
	suite.handler.SetMyAvailability(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "validation error", response["error"])
	
	suite.mockAvailabilityService.AssertExpectations(suite.T())
}

func (suite *AvailabilityHandlerTestSuite) TestSetMyAvailability_MultipleSlots() {
	trainerID := "trainer-123"
	slots := []models.TrainerAvailability{
		createTestAvailabilitySlot("slot-1", trainerID, models.WeekDayMonday,
			time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 12, 0, 0, 0, time.UTC)),
		createTestAvailabilitySlot("slot-2", trainerID, models.WeekDayWednesday,
			time.Date(0, 0, 0, 14, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 18, 0, 0, 0, time.UTC)),
		createTestAvailabilitySlot("slot-3", trainerID, models.WeekDayFriday,
			time.Date(0, 0, 0, 10, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 16, 0, 0, 0, time.UTC)),
	}
	
	suite.mockAvailabilityService.On("SetAvailability", mock.AnythingOfType("*gin.Context"), trainerID, slots).Return(nil)
	
	c, w := createTestContext("PUT", "/api/trainers/me/availability", slots, trainerID, models.RoleTrainer)
	suite.handler.SetMyAvailability(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "availability updated successfully", response["message"])
	
	suite.mockAvailabilityService.AssertExpectations(suite.T())
}

// GetTrainerAvailability Tests
func (suite *AvailabilityHandlerTestSuite) TestGetTrainerAvailability_Success() {
	trainerID := "trainer-123"
	slots := []models.TrainerAvailability{
		createTestAvailabilitySlot("slot-1", trainerID, models.WeekDayMonday,
			time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 17, 0, 0, 0, time.UTC)),
	}
	
	suite.mockAvailabilityService.On("GetAvailability", mock.AnythingOfType("*gin.Context"), trainerID).Return(slots, nil)
	
	c, w := createTestContext("GET", "/api/trainers/"+trainerID+"/availability", nil, "", models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.GetTrainerAvailability(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response["slots"])
	
	suite.mockAvailabilityService.AssertExpectations(suite.T())
}

func (suite *AvailabilityHandlerTestSuite) TestGetTrainerAvailability_NotFound() {
	trainerID := "nonexistent-trainer"
	
	suite.mockAvailabilityService.On("GetAvailability", mock.AnythingOfType("*gin.Context"), trainerID).Return(nil, errors.New("trainer not found"))
	
	c, w := createTestContext("GET", "/api/trainers/"+trainerID+"/availability", nil, "", models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.GetTrainerAvailability(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "trainer not found", response["error"])
	
	suite.mockAvailabilityService.AssertExpectations(suite.T())
}

func (suite *AvailabilityHandlerTestSuite) TestGetTrainerAvailability_EmptySlots() {
	trainerID := "trainer-123"
	slots := []models.TrainerAvailability{}
	
	suite.mockAvailabilityService.On("GetAvailability", mock.AnythingOfType("*gin.Context"), trainerID).Return(slots, nil)
	
	c, w := createTestContext("GET", "/api/trainers/"+trainerID+"/availability", nil, "", models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.GetTrainerAvailability(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.NotNil(suite.T(), response["slots"])
	
	suite.mockAvailabilityService.AssertExpectations(suite.T())
}

func (suite *AvailabilityHandlerTestSuite) TestGetTrainerAvailability_ServiceError() {
	trainerID := "trainer-123"
	
	suite.mockAvailabilityService.On("GetAvailability", mock.AnythingOfType("*gin.Context"), trainerID).Return(nil, errors.New("database error"))
	
	c, w := createTestContext("GET", "/api/trainers/"+trainerID+"/availability", nil, "", models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: trainerID}}
	suite.handler.GetTrainerAvailability(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "database error", response["error"])
	
	suite.mockAvailabilityService.AssertExpectations(suite.T())
}

func (suite *AvailabilityHandlerTestSuite) TestGetTrainerAvailability_InvalidTrainerID() {
	// Test with empty trainer ID
	c, w := createTestContext("GET", "/api/trainers//availability", nil, "", models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: ""}}
	suite.handler.GetTrainerAvailability(c)
	
	// The handler should still call the service with empty string, service should handle validation
	suite.mockAvailabilityService.On("GetAvailability", mock.AnythingOfType("*gin.Context"), "").Return(nil, errors.New("invalid trainer ID"))
	suite.handler.GetTrainerAvailability(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	suite.mockAvailabilityService.AssertExpectations(suite.T())
}

// DeleteSlot Tests
func (suite *AvailabilityHandlerTestSuite) TestDeleteSlot_Success() {
	slotID := "slot-123"
	
	suite.mockAvailabilityService.On("DeleteSlot", mock.AnythingOfType("*gin.Context"), slotID).Return(nil)
	
	c, w := createTestContext("DELETE", "/api/trainers/availability/"+slotID, nil, "trainer-123", models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "slotId", Value: slotID}}
	suite.handler.DeleteSlot(c)
	
	assert.Equal(suite.T(), http.StatusOK, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "slot deleted successfully", response["message"])
	
	suite.mockAvailabilityService.AssertExpectations(suite.T())
}

func (suite *AvailabilityHandlerTestSuite) TestDeleteSlot_NotFound() {
	slotID := "nonexistent-slot"
	
	suite.mockAvailabilityService.On("DeleteSlot", mock.AnythingOfType("*gin.Context"), slotID).Return(errors.New("slot not found"))
	
	c, w := createTestContext("DELETE", "/api/trainers/availability/"+slotID, nil, "trainer-123", models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "slotId", Value: slotID}}
	suite.handler.DeleteSlot(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "slot not found", response["error"])
	
	suite.mockAvailabilityService.AssertExpectations(suite.T())
}

func (suite *AvailabilityHandlerTestSuite) TestDeleteSlot_Forbidden() {
	slotID := "slot-123"
	
	suite.mockAvailabilityService.On("DeleteSlot", mock.AnythingOfType("*gin.Context"), slotID).Return(errors.New("not your slot"))
	
	c, w := createTestContext("DELETE", "/api/trainers/availability/"+slotID, nil, "trainer-123", models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "slotId", Value: slotID}}
	suite.handler.DeleteSlot(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "not your slot", response["error"])
	
	suite.mockAvailabilityService.AssertExpectations(suite.T())
}

func (suite *AvailabilityHandlerTestSuite) TestDeleteSlot_ServiceError() {
	slotID := "slot-123"
	
	suite.mockAvailabilityService.On("DeleteSlot", mock.AnythingOfType("*gin.Context"), slotID).Return(errors.New("database error"))
	
	c, w := createTestContext("DELETE", "/api/trainers/availability/"+slotID, nil, "trainer-123", models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "slotId", Value: slotID}}
	suite.handler.DeleteSlot(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "database error", response["error"])
	
	suite.mockAvailabilityService.AssertExpectations(suite.T())
}

func (suite *AvailabilityHandlerTestSuite) TestDeleteSlot_EmptySlotID() {
	// Test with empty slot ID
	c, w := createTestContext("DELETE", "/api/trainers/availability/", nil, "trainer-123", models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "slotId", Value: ""}}
	
	suite.mockAvailabilityService.On("DeleteSlot", mock.AnythingOfType("*gin.Context"), "").Return(errors.New("invalid slot ID"))
	suite.handler.DeleteSlot(c)
	
	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)
	
	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "invalid slot ID", response["error"])
	
	suite.mockAvailabilityService.AssertExpectations(suite.T())
}

// Test runner
func TestAvailabilityHandlerSuite(t *testing.T) {
	suite.Run(t, new(AvailabilityHandlerTestSuite))
}
