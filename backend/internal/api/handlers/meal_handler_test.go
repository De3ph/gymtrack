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
	"gymtrack-backend/internal/testutils"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
)

// MealHandlerTestSuite is the test suite for MealHandler
type MealHandlerTestSuite struct {
	suite.Suite
	handler          *MealHandler
	mockMealRepo     *testutils.MockMealRepository
	mockRelationRepo *testutils.MockRelationshipRepository
	validator        *validator.Validate
}

func (suite *MealHandlerTestSuite) SetupTest() {
	gin.SetMode(gin.TestMode)
	suite.mockMealRepo = new(testutils.MockMealRepository)
	suite.mockRelationRepo = new(testutils.MockRelationshipRepository)
	suite.validator = validator.New()

	suite.handler = NewMealHandler(
		suite.mockMealRepo,
		suite.mockRelationRepo,
		suite.validator,
	)
}

// Test data factory functions using proper model structures
func createTestMealRequest(mealType string, items []map[string]interface{}) map[string]interface{} {
	return map[string]interface{}{
		"date":     time.Now().Format(time.RFC3339),
		"mealType": mealType,
		"items":    items,
	}
}

func createTestFoodItemMap(food, quantity string, calories float64, macros map[string]float64) map[string]interface{} {
	item := map[string]interface{}{
		"food":     food,
		"quantity": quantity,
		"calories": calories,
	}
	if macros != nil {
		item["macros"] = macros
	}
	return item
}

// CreateMeal Tests
func (suite *MealHandlerTestSuite) TestCreateMeal_Success() {
	athleteID := "athlete-123"
	mealID := "meal-123"

	foodItem := testutils.CreateTestFoodItem("Chicken", "200g", 300, 35.0, 0.0, 15.0)
	meal := testutils.CreateTestMeal(mealID, athleteID, time.Now(), models.MealTypeLunch, []models.FoodItem{foodItem})

	requestBody := createTestMealRequest("lunch", []map[string]interface{}{
		createTestFoodItemMap("Chicken", "200g", 300, map[string]float64{"protein": 35.0, "carbs": 0.0, "fats": 15.0}),
	})

	body, _ := json.Marshal(requestBody)
	req := httptest.NewRequest("POST", "/api/meals", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	// Mock relationship check
	suite.mockRelationRepo.On("GetByAthleteID", athleteID).Return(testutils.CreateTestRelationship("rel-123", "trainer-123", athleteID, models.RelationshipStatusActive), nil)

	// Mock meal creation
	suite.mockMealRepo.On("Create", mock.AnythingOfType("*models.Meal")).Return(nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)

	suite.handler.CreateMeal(c)

	assert.Equal(suite.T(), http.StatusCreated, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "success", response["status"])

	suite.mockRelationRepo.AssertExpectations(suite.T())
	suite.mockMealRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestCreateMeal_ValidationError() {
	athleteID := "athlete-123"

	// Invalid request - missing mealType
	requestBody := map[string]interface{}{
		"date":  time.Now().Format(time.RFC3339),
		"items": []map[string]interface{}{},
	}

	body, _ := json.Marshal(requestBody)
	req := httptest.NewRequest("POST", "/api/meals", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)

	suite.handler.CreateMeal(c)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "error", response["status"])
}

func (suite *MealHandlerTestSuite) TestCreateMeal_NoActiveRelationship() {
	athleteID := "athlete-123"

	requestBody := createTestMealRequest("lunch", []map[string]interface{}{
		createTestFoodItemMap("Chicken", "200g", 300, map[string]float64{"protein": 35.0, "carbs": 0.0, "fats": 15.0}),
	})

	body, _ := json.Marshal(requestBody)
	req := httptest.NewRequest("POST", "/api/meals", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	// Mock no relationship
	suite.mockRelationRepo.On("GetByAthleteID", athleteID).Return(nil, errors.New("not found"))

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)

	suite.handler.CreateMeal(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	suite.mockRelationRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestCreateMeal_RepositoryError() {
	athleteID := "athlete-123"

	requestBody := createTestMealRequest("lunch", []map[string]interface{}{
		createTestFoodItemMap("Chicken", "200g", 300, map[string]float64{"protein": 35.0, "carbs": 0.0, "fats": 15.0}),
	})

	body, _ := json.Marshal(requestBody)
	req := httptest.NewRequest("POST", "/api/meals", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	// Mock relationship check
	suite.mockRelationRepo.On("GetByAthleteID", athleteID).Return(testutils.CreateTestRelationship("rel-123", "trainer-123", athleteID, models.RelationshipStatusActive), nil)

	// Mock repository error
	suite.mockMealRepo.On("Create", mock.AnythingOfType("*models.Meal")).Return(errors.New("database error"))

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)

	suite.handler.CreateMeal(c)

	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)

	suite.mockRelationRepo.AssertExpectations(suite.T())
	suite.mockMealRepo.AssertExpectations(suite.T())
}

// GetMeal Tests
func (suite *MealHandlerTestSuite) TestGetMeal_Success() {
	athleteID := "athlete-123"
	mealID := "meal-123"

	foodItem := testutils.CreateTestFoodItem("Chicken", "200g", 300, 35.0, 0.0, 15.0)
	meal := testutils.CreateTestMeal(mealID, athleteID, time.Now(), models.MealTypeLunch, []models.FoodItem{foodItem})

	req := httptest.NewRequest("GET", "/api/meals/"+mealID, nil)

	// Mock meal retrieval
	suite.mockMealRepo.On("GetByID", mealID).Return(meal, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: mealID}}
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)

	suite.handler.GetMeal(c)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "success", response["status"])

	suite.mockMealRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestGetMeal_NotFound() {
	athleteID := "athlete-123"
	mealID := "nonexistent"

	req := httptest.NewRequest("GET", "/api/meals/"+mealID, nil)

	// Mock meal not found
	suite.mockMealRepo.On("GetByID", mealID).Return(nil, errors.New("not found"))

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: mealID}}
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)

	suite.handler.GetMeal(c)

	assert.Equal(suite.T(), http.StatusNotFound, w.Code)

	suite.mockMealRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestGetMeal_Unauthorized() {
	athleteID := "athlete-123"
	otherAthleteID := "athlete-456"
	mealID := "meal-123"

	foodItem := testutils.CreateTestFoodItem("Chicken", "200g", 300, 35.0, 0.0, 15.0)
	meal := testutils.CreateTestMeal(mealID, otherAthleteID, time.Now(), models.MealTypeLunch, []models.FoodItem{foodItem})

	req := httptest.NewRequest("GET", "/api/meals/"+mealID, nil)

	// Mock meal retrieval (belongs to different athlete)
	suite.mockMealRepo.On("GetByID", mealID).Return(meal, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: mealID}}
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)

	suite.handler.GetMeal(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	suite.mockMealRepo.AssertExpectations(suite.T())
}

// UpdateMeal Tests
func (suite *MealHandlerTestSuite) TestUpdateMeal_Success() {
	athleteID := "athlete-123"
	mealID := "meal-123"

	updatedItems := []models.FoodItem{
		createTestFoodItem("Beef", "250g", 400, createTestMacros(75, 0, 15)),
	}
	req := UpdateMealRequest{
		Date:     time.Now().Add(time.Hour),
		MealType: models.MealTypeDinner,
		Items:    updatedItems,
	}

	suite.mockMealRepo.On("GetByID", meal.ID).Return(meal, nil)
	suite.mockMealRepo.On("Update", mock.AnythingOfType("*models.Meal")).Return(nil)

	c, w := createTestContext("PUT", "/api/meals/"+meal.ID, req, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: meal.ID}}
	suite.handler.UpdateMeal(c)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response models.Meal
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), meal.ID, response.ID)
	assert.Equal(suite.T(), models.MealTypeDinner, response.MealType)

	suite.mockMealRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestUpdateMeal_NotFound() {
	athleteID := "athlete-123"
	mealID := "nonexistent-meal"
	req := UpdateMealRequest{
		Date:     time.Now(),
		MealType: models.MealTypeLunch,
		Items:    []models.FoodItem{},
	}

	suite.mockMealRepo.On("GetByID", mealID).Return(nil, errors.New("not found"))

	c, w := createTestContext("PUT", "/api/meals/"+mealID, req, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: mealID}}
	suite.handler.UpdateMeal(c)

	assert.Equal(suite.T(), http.StatusNotFound, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Meal not found", response["error"])

	suite.mockMealRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestUpdateMeal_Forbidden_OtherAthlete() {
	athleteID := "athlete-123"
	otherAthleteID := "athlete-456"
	date := time.Now().UTC()
	items := []models.FoodItem{
		createTestFoodItem("Chicken", "200g", 330, createTestMacros(62, 0, 7)),
	}
	meal := createTestMeal(otherAthleteID, date, models.MealTypeLunch, items)

	req := UpdateMealRequest{
		Date:     time.Now(),
		MealType: models.MealTypeDinner,
		Items:    items,
	}

	suite.mockMealRepo.On("GetByID", meal.ID).Return(meal, nil)

	c, w := createTestContext("PUT", "/api/meals/"+meal.ID, req, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: meal.ID}}
	suite.handler.UpdateMeal(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Access denied", response["error"])

	suite.mockMealRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestUpdateMeal_Forbidden_OldMeal() {
	athleteID := "athlete-123"
	date := time.Now().Add(-48 * time.Hour) // 48 hours ago
	items := []models.FoodItem{
		createTestFoodItem("Chicken", "200g", 330, createTestMacros(62, 0, 7)),
	}
	meal := createTestMeal(athleteID, date, models.MealTypeLunch, items)
	meal.CreatedAt = date // Set created time to 48 hours ago

	req := UpdateMealRequest{
		Date:     time.Now(),
		MealType: models.MealTypeDinner,
		Items:    items,
	}

	suite.mockMealRepo.On("GetByID", meal.ID).Return(meal, nil)

	c, w := createTestContext("PUT", "/api/meals/"+meal.ID, req, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: meal.ID}}
	suite.handler.UpdateMeal(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Cannot edit meal after 24 hours", response["error"])

	suite.mockMealRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestUpdateMeal_InvalidJSON() {
	athleteID := "athlete-123"
	mealID := "meal-123"

	c, w := createTestContext("PUT", "/api/meals/"+mealID, "invalid json", athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: mealID}}
	suite.handler.UpdateMeal(c)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Invalid request body", response["error"])
}

func (suite *MealHandlerTestSuite) TestUpdateMeal_DatabaseError() {
	athleteID := "athlete-123"
	date := time.Now().UTC()
	items := []models.FoodItem{
		createTestFoodItem("Chicken", "200g", 330, createTestMacros(62, 0, 7)),
	}
	meal := createTestMeal(athleteID, date, models.MealTypeLunch, items)

	req := UpdateMealRequest{
		Date:     time.Now(),
		MealType: models.MealTypeDinner,
		Items:    items,
	}

	suite.mockMealRepo.On("GetByID", meal.ID).Return(meal, nil)
	suite.mockMealRepo.On("Update", mock.AnythingOfType("*models.Meal")).Return(errors.New("database error"))

	c, w := createTestContext("PUT", "/api/meals/"+meal.ID, req, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: meal.ID}}
	suite.handler.UpdateMeal(c)

	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Failed to update meal", response["error"])

	suite.mockMealRepo.AssertExpectations(suite.T())
}

// DeleteMeal Tests
func (suite *MealHandlerTestSuite) TestDeleteMeal_Success() {
	athleteID := "athlete-123"
	date := time.Now().UTC()
	items := []models.FoodItem{
		createTestFoodItem("Chicken", "200g", 330, createTestMacros(62, 0, 7)),
	}
	meal := createTestMeal(athleteID, date, models.MealTypeLunch, items)

	suite.mockMealRepo.On("GetByID", meal.ID).Return(meal, nil)
	suite.mockMealRepo.On("Delete", meal.ID).Return(nil)

	c, w := createTestContext("DELETE", "/api/meals/"+meal.ID, nil, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: meal.ID}}
	suite.handler.DeleteMeal(c)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Meal deleted successfully", response["message"])

	suite.mockMealRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestDeleteMeal_NotFound() {
	athleteID := "athlete-123"
	mealID := "nonexistent-meal"

	suite.mockMealRepo.On("GetByID", mealID).Return(nil, errors.New("not found"))

	c, w := createTestContext("DELETE", "/api/meals/"+mealID, nil, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: mealID}}
	suite.handler.DeleteMeal(c)

	assert.Equal(suite.T(), http.StatusNotFound, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Meal not found", response["error"])

	suite.mockMealRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestDeleteMeal_Forbidden_OtherAthlete() {
	athleteID := "athlete-123"
	otherAthleteID := "athlete-456"
	date := time.Now().UTC()
	items := []models.FoodItem{
		createTestFoodItem("Chicken", "200g", 330, createTestMacros(62, 0, 7)),
	}
	meal := createTestMeal(otherAthleteID, date, models.MealTypeLunch, items)

	suite.mockMealRepo.On("GetByID", meal.ID).Return(meal, nil)

	c, w := createTestContext("DELETE", "/api/meals/"+meal.ID, nil, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: meal.ID}}
	suite.handler.DeleteMeal(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Access denied", response["error"])

	suite.mockMealRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestDeleteMeal_Forbidden_OldMeal() {
	athleteID := "athlete-123"
	date := time.Now().Add(-48 * time.Hour) // 48 hours ago
	items := []models.FoodItem{
		createTestFoodItem("Chicken", "200g", 330, createTestMacros(62, 0, 7)),
	}
	meal := createTestMeal(athleteID, date, models.MealTypeLunch, items)
	meal.CreatedAt = date // Set created time to 48 hours ago

	suite.mockMealRepo.On("GetByID", meal.ID).Return(meal, nil)

	c, w := createTestContext("DELETE", "/api/meals/"+meal.ID, nil, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: meal.ID}}
	suite.handler.DeleteMeal(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Cannot delete meal after 24 hours", response["error"])

	suite.mockMealRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestDeleteMeal_DatabaseError() {
	athleteID := "athlete-123"
	date := time.Now().UTC()
	items := []models.FoodItem{
		createTestFoodItem("Chicken", "200g", 330, createTestMacros(62, 0, 7)),
	}
	meal := createTestMeal(athleteID, date, models.MealTypeLunch, items)

	suite.mockMealRepo.On("GetByID", meal.ID).Return(meal, nil)
	suite.mockMealRepo.On("Delete", meal.ID).Return(errors.New("database error"))

	c, w := createTestContext("DELETE", "/api/meals/"+meal.ID, nil, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: meal.ID}}
	suite.handler.DeleteMeal(c)

	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Failed to delete meal", response["error"])

	suite.mockMealRepo.AssertExpectations(suite.T())
}

// GetClientMeals Tests
func (suite *MealHandlerTestSuite) TestGetClientMeals_Success() {
	trainerID := "trainer-123"
	clientID := "athlete-123"
	date := time.Now().UTC()
	items := []models.FoodItem{
		createTestFoodItem("Chicken", "200g", 330, createTestMacros(62, 0, 7)),
	}
	meals := []*models.Meal{
		createTestMeal(clientID, date, models.MealTypeLunch, items),
	}

	relationship := &models.Relationship{
		ID:        "rel-123",
		TrainerID: trainerID,
		AthleteID: clientID,
		Status:    models.RelationshipStatusActive,
		CreatedAt: time.Now().UTC(),
	}

	suite.mockRelationRepo.On("GetByTrainerID", trainerID).Return([]*models.Relationship{relationship}, nil)
	suite.mockMealRepo.On("GetByAthleteID", clientID, 50, 0).Return(meals, nil)

	c, w := createTestContext("GET", "/api/clients/"+clientID+"/meals", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientMeals(c)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), float64(1), response["count"])
	assert.NotNil(suite.T(), response["meals"])

	suite.mockRelationRepo.AssertExpectations(suite.T())
	suite.mockMealRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestGetClientMeals_Success_WithMealTypeFilter() {
	trainerID := "trainer-123"
	clientID := "athlete-123"
	date := time.Now().UTC()
	items := []models.FoodItem{
		createTestFoodItem("Chicken", "200g", 330, createTestMacros(62, 0, 7)),
	}
	meals := []*models.Meal{
		createTestMeal(clientID, date, models.MealTypeLunch, items),
		createTestMeal(clientID, date, models.MealTypeBreakfast, items),
	}

	relationship := &models.Relationship{
		ID:        "rel-123",
		TrainerID: trainerID,
		AthleteID: clientID,
		Status:    models.RelationshipStatusActive,
		CreatedAt: time.Now().UTC(),
	}

	suite.mockRelationRepo.On("GetByTrainerID", trainerID).Return([]*models.Relationship{relationship}, nil)
	suite.mockMealRepo.On("GetByAthleteID", clientID, 50, 0).Return(meals, nil)

	c, w := createTestContext("GET", "/api/clients/"+clientID+"/meals?mealType=lunch", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientMeals(c)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), float64(1), response["count"]) // Only lunch meals

	suite.mockRelationRepo.AssertExpectations(suite.T())
	suite.mockMealRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestGetClientMeals_Forbidden_Athlete() {
	athleteID := "athlete-123"
	clientID := "athlete-456"

	c, w := createTestContext("GET", "/api/clients/"+clientID+"/meals", nil, athleteID, models.RoleAthlete)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientMeals(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Only trainers can view client meals", response["error"])
}

func (suite *MealHandlerTestSuite) TestGetClientMeals_Forbidden_NoRelationship() {
	trainerID := "trainer-123"
	clientID := "athlete-123"

	suite.mockRelationRepo.On("GetByTrainerID", trainerID).Return([]*models.Relationship{}, nil)

	c, w := createTestContext("GET", "/api/clients/"+clientID+"/meals", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientMeals(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "You don't have an active relationship with this client", response["error"])

	suite.mockRelationRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestGetClientMeals_Forbidden_InactiveRelationship() {
	trainerID := "trainer-123"
	clientID := "athlete-123"

	relationship := &models.Relationship{
		ID:        "rel-123",
		TrainerID: trainerID,
		AthleteID: clientID,
		Status:    models.RelationshipStatusTerminated,
		CreatedAt: time.Now().UTC(),
	}

	suite.mockRelationRepo.On("GetByTrainerID", trainerID).Return([]*models.Relationship{relationship}, nil)

	c, w := createTestContext("GET", "/api/clients/"+clientID+"/meals", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientMeals(c)

	assert.Equal(suite.T(), http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "You don't have an active relationship with this client", response["error"])

	suite.mockRelationRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestGetClientMeals_RelationshipError() {
	trainerID := "trainer-123"
	clientID := "athlete-123"

	suite.mockRelationRepo.On("GetByTrainerID", trainerID).Return(nil, errors.New("database error"))

	c, w := createTestContext("GET", "/api/clients/"+clientID+"/meals", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientMeals(c)

	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Failed to verify relationship", response["error"])

	suite.mockRelationRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestGetClientMeals_InvalidDateFormat() {
	trainerID := "trainer-123"
	clientID := "athlete-123"

	relationship := &models.Relationship{
		ID:        "rel-123",
		TrainerID: trainerID,
		AthleteID: clientID,
		Status:    models.RelationshipStatusActive,
		CreatedAt: time.Now().UTC(),
	}

	suite.mockRelationRepo.On("GetByTrainerID", trainerID).Return([]*models.Relationship{relationship}, nil)

	c, w := createTestContext("GET", "/api/clients/"+clientID+"/meals?startDate=invalid", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientMeals(c)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Invalid date format. Use RFC3339 format", response["error"])

	suite.mockRelationRepo.AssertExpectations(suite.T())
}

func (suite *MealHandlerTestSuite) TestGetClientMeals_DatabaseError() {
	trainerID := "trainer-123"
	clientID := "athlete-123"

	relationship := &models.Relationship{
		ID:        "rel-123",
		TrainerID: trainerID,
		AthleteID: clientID,
		Status:    models.RelationshipStatusActive,
		CreatedAt: time.Now().UTC(),
	}

	suite.mockRelationRepo.On("GetByTrainerID", trainerID).Return([]*models.Relationship{relationship}, nil)
	suite.mockMealRepo.On("GetByAthleteID", clientID, 50, 0).Return(nil, errors.New("database error"))

	c, w := createTestContext("GET", "/api/clients/"+clientID+"/meals", nil, trainerID, models.RoleTrainer)
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	suite.handler.GetClientMeals(c)

	assert.Equal(suite.T(), http.StatusInternalServerError, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "Failed to retrieve meals", response["error"])

	suite.mockRelationRepo.AssertExpectations(suite.T())
	suite.mockMealRepo.AssertExpectations(suite.T())
}

// Test runner
func TestMealHandlerSuite(t *testing.T) {
	suite.Run(t, new(MealHandlerTestSuite))
}
