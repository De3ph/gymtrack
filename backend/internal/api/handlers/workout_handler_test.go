package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

// MockWorkoutRepository for testing
type MockWorkoutRepository struct {
	mock.Mock
}

func (m *MockWorkoutRepository) GetByID(id string) (*models.Workout, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Workout), args.Error(1)
}

func (m *MockWorkoutRepository) GetByAthleteID(athleteID string, limit, offset int) ([]*models.Workout, error) {
	args := m.Called(athleteID, limit, offset)
	return args.Get(0).([]*models.Workout), args.Error(1)
}

func (m *MockWorkoutRepository) GetByAthleteDateRange(athleteID string, startDate, endDate time.Time) ([]*models.Workout, error) {
	args := m.Called(athleteID, startDate, endDate)
	return args.Get(0).([]*models.Workout), args.Error(1)
}

func (m *MockWorkoutRepository) Create(workout *models.Workout) error {
	args := m.Called(workout)
	return args.Error(0)
}

func (m *MockWorkoutRepository) Update(workout *models.Workout) error {
	args := m.Called(workout)
	return args.Error(0)
}

func (m *MockWorkoutRepository) Delete(id string) error {
	args := m.Called(id)
	return args.Error(0)
}

// MockRelationshipRepository for testing
type MockRelationshipRepository struct {
	mock.Mock
}

func (m *MockRelationshipRepository) GetByTrainerID(trainerID string) ([]*models.Relationship, error) {
	args := m.Called(trainerID)
	return args.Get(0).([]*models.Relationship), args.Error(1)
}

func (m *MockRelationshipRepository) GetByAthleteID(athleteID string) (*models.Relationship, error) {
	args := m.Called(athleteID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Relationship), args.Error(1)
}

func (m *MockRelationshipRepository) Create(rel *models.Relationship) error {
	args := m.Called(rel)
	return args.Error(0)
}

func (m *MockRelationshipRepository) Update(rel *models.Relationship) error {
	args := m.Called(rel)
	return args.Error(0)
}

func (m *MockRelationshipRepository) Delete(id string) error {
	args := m.Called(id)
	return args.Error(0)
}

func (m *MockRelationshipRepository) GetByID(id string) (*models.Relationship, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Relationship), args.Error(1)
}

// Test data factories
func newTestWorkout(athleteID string) *models.Workout {
	return &models.Workout{
		WorkoutID: uuid.New().String(),
		AthleteID: athleteID,
		Date:      time.Now(),
		Exercises: []models.Exercise{
			{
				ExerciseID: uuid.New().String(),
				Name:       "Bench Press",
				Weight:     100,
				WeightUnit: "kg",
				Sets:       3,
				Reps:       []int{10, 10, 10},
				RestTime:   60,
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

func newTestWorkoutOld(athleteID string) *models.Workout {
	workout := newTestWorkout(athleteID)
	// Make it 48 hours old to test 24-hour edit window
	workout.CreatedAt = time.Now().Add(-48 * time.Hour)
	workout.UpdatedAt = time.Now().Add(-48 * time.Hour)
	return workout
}

func newTestRelationship(trainerID, athleteID string) *models.Relationship {
	return &models.Relationship{
		RelationshipID: uuid.New().String(),
		TrainerID:      trainerID,
		AthleteID:      athleteID,
		Status:         "active",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
}

// Test CreateWorkout
func TestCreateWorkout_ValidData(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	athleteID := "athlete-123"
	workout := newTestWorkout(athleteID)
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockWorkoutRepo.On("Create", mock.AnythingOfType("*models.Workout")).Return(nil)
	
	requestData := CreateWorkoutRequest{
		Date:      workout.Date,
		Exercises: workout.Exercises,
	}
	
	jsonData, _ := json.Marshal(requestData)
	req, _ := http.NewRequest("POST", "/api/workouts", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)
	c.Request = req
	
	handler.CreateWorkout(c)
	
	assert.Equal(t, http.StatusCreated, w.Code)
	mockWorkoutRepo.AssertExpectations(t)
}

func TestCreateWorkout_InvalidDate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	athleteID := "athlete-123"
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	requestData := map[string]interface{}{
		"date": "invalid-date",
		"exercises": []map[string]interface{}{
			{"name": "Bench Press", "weight": 100, "sets": 3, "reps": []int{10, 10, 10}},
		},
	}
	
	jsonData, _ := json.Marshal(requestData)
	req, _ := http.NewRequest("POST", "/api/workouts", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)
	c.Request = req
	
	handler.CreateWorkout(c)
	
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateWorkout_EmptyExercises(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	athleteID := "athlete-123"
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	requestData := CreateWorkoutRequest{
		Date:      time.Now(),
		Exercises: []models.Exercise{},
	}
	
	jsonData, _ := json.Marshal(requestData)
	req, _ := http.NewRequest("POST", "/api/workouts", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)
	c.Request = req
	
	handler.CreateWorkout(c)
	
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateWorkout_TrainerRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	trainerID := "trainer-123"
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	requestData := CreateWorkoutRequest{
		Date: time.Now(),
		Exercises: []models.Exercise{
			{Name: "Bench Press", Weight: 100, Sets: 3, Reps: []int{10, 10, 10}},
		},
	}
	
	jsonData, _ := json.Marshal(requestData)
	req, _ := http.NewRequest("POST", "/api/workouts", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", trainerID)
	c.Set("userRole", models.RoleTrainer)
	c.Request = req
	
	handler.CreateWorkout(c)
	
	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestCreateWorkout_Unauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	requestData := CreateWorkoutRequest{
		Date: time.Now(),
		Exercises: []models.Exercise{
			{Name: "Bench Press", Weight: 100, Sets: 3, Reps: []int{10, 10, 10}},
		},
	}
	
	jsonData, _ := json.Marshal(requestData)
	req, _ := http.NewRequest("POST", "/api/workouts", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	
	handler.CreateWorkout(c)
	
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// Test GetWorkout
func TestGetWorkout_ValidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	athleteID := "athlete-123"
	workout := newTestWorkout(athleteID)
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockWorkoutRepo.On("GetByID", workout.WorkoutID).Return(workout, nil)
	
	req, _ := http.NewRequest("GET", "/api/workouts/"+workout.WorkoutID, nil)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: workout.WorkoutID}}
	
	handler.GetWorkout(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockWorkoutRepo.AssertExpectations(t)
}

func TestGetWorkout_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	athleteID := "athlete-123"
	workoutID := "nonexistent-workout"
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockWorkoutRepo.On("GetByID", workoutID).Return(nil, assert.AnError)
	
	req, _ := http.NewRequest("GET", "/api/workouts/"+workoutID, nil)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: workoutID}}
	
	handler.GetWorkout(c)
	
	assert.Equal(t, http.StatusNotFound, w.Code)
	mockWorkoutRepo.AssertExpectations(t)
}

func TestGetWorkout_TrainerAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	trainerID := "trainer-123"
	athleteID := "athlete-123"
	workout := newTestWorkout(athleteID)
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockWorkoutRepo.On("GetByID", workout.WorkoutID).Return(workout, nil)
	
	req, _ := http.NewRequest("GET", "/api/workouts/"+workout.WorkoutID, nil)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", trainerID)
	c.Set("userRole", models.RoleTrainer)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: workout.WorkoutID}}
	
	handler.GetWorkout(c)
	
	// Trainers can access any workout
	assert.Equal(t, http.StatusOK, w.Code)
	mockWorkoutRepo.AssertExpectations(t)
}

func TestGetWorkout_UnauthorizedAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	otherAthleteID := "other-athlete-123"
	workout := newTestWorkout("athlete-123")
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockWorkoutRepo.On("GetByID", workout.WorkoutID).Return(workout, nil)
	
	req, _ := http.NewRequest("GET", "/api/workouts/"+workout.WorkoutID, nil)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", otherAthleteID)
	c.Set("userRole", models.RoleAthlete)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: workout.WorkoutID}}
	
	handler.GetWorkout(c)
	
	assert.Equal(t, http.StatusForbidden, w.Code)
	mockWorkoutRepo.AssertExpectations(t)
}

// Test GetWorkouts
func TestGetWorkouts_Pagination(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	athleteID := "athlete-123"
	workouts := []*models.Workout{newTestWorkout(athleteID), newTestWorkout(athleteID)}
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockWorkoutRepo.On("GetByAthleteID", athleteID, 10, 0).Return(workouts, nil)
	
	req, _ := http.NewRequest("GET", "/api/workouts?limit=10&offset=0", nil)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)
	c.Request = req
	
	handler.GetWorkouts(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockWorkoutRepo.AssertExpectations(t)
}

func TestGetWorkouts_DateFilter(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	athleteID := "athlete-123"
	workouts := []*models.Workout{newTestWorkout(athleteID)}
	startDate := time.Now().AddDate(0, -1, 0)
	endDate := time.Now()
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockWorkoutRepo.On("GetByAthleteDateRange", athleteID, startDate, endDate).Return(workouts, nil)
	
	req, _ := http.NewRequest("GET", "/api/workouts?startDate="+startDate.Format(time.RFC3339)+"&endDate="+endDate.Format(time.RFC3339), nil)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)
	c.Request = req
	
	handler.GetWorkouts(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockWorkoutRepo.AssertExpectations(t)
}

func TestGetWorkouts_TrainerRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	trainerID := "trainer-123"
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	req, _ := http.NewRequest("GET", "/api/workouts", nil)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", trainerID)
	c.Set("userRole", models.RoleTrainer)
	c.Request = req
	
	handler.GetWorkouts(c)
	
	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestGetWorkouts_InvalidDateFormat(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	athleteID := "athlete-123"
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	req, _ := http.NewRequest("GET", "/api/workouts?startDate=invalid&endDate=invalid", nil)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)
	c.Request = req
	
	handler.GetWorkouts(c)
	
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// Test UpdateWorkout
func TestUpdateWorkout_ValidData(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	athleteID := "athlete-123"
	workout := newTestWorkout(athleteID)
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockWorkoutRepo.On("GetByID", workout.WorkoutID).Return(workout, nil)
	mockWorkoutRepo.On("Update", mock.AnythingOfType("*models.Workout")).Return(nil)
	
	requestData := UpdateWorkoutRequest{
		Date: time.Now(),
		Exercises: []models.Exercise{
			{Name: "Squat", Weight: 120, Sets: 4, Reps: []int{8, 8, 8, 8}},
		},
	}
	
	jsonData, _ := json.Marshal(requestData)
	req, _ := http.NewRequest("PUT", "/api/workouts/"+workout.WorkoutID, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: workout.WorkoutID}}
	
	handler.UpdateWorkout(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockWorkoutRepo.AssertExpectations(t)
}

func TestUpdateWorkout_NotOwner(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	otherAthleteID := "other-athlete-123"
	workout := newTestWorkout("athlete-123")
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockWorkoutRepo.On("GetByID", workout.WorkoutID).Return(workout, nil)
	
	requestData := UpdateWorkoutRequest{
		Date: time.Now(),
		Exercises: []models.Exercise{
			{Name: "Squat", Weight: 120, Sets: 4, Reps: []int{8, 8, 8, 8}},
		},
	}
	
	jsonData, _ := json.Marshal(requestData)
	req, _ := http.NewRequest("PUT", "/api/workouts/"+workout.WorkoutID, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", otherAthleteID)
	c.Set("userRole", models.RoleAthlete)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: workout.WorkoutID}}
	
	handler.UpdateWorkout(c)
	
	assert.Equal(t, http.StatusForbidden, w.Code)
	mockWorkoutRepo.AssertExpectations(t)
}

func TestUpdateWorkout_After24h(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	athleteID := "athlete-123"
	workout := newTestWorkoutOld(athleteID)
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockWorkoutRepo.On("GetByID", workout.WorkoutID).Return(workout, nil)
	
	requestData := UpdateWorkoutRequest{
		Date: time.Now(),
		Exercises: []models.Exercise{
			{Name: "Squat", Weight: 120, Sets: 4, Reps: []int{8, 8, 8, 8}},
		},
	}
	
	jsonData, _ := json.Marshal(requestData)
	req, _ := http.NewRequest("PUT", "/api/workouts/"+workout.WorkoutID, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: workout.WorkoutID}}
	
	handler.UpdateWorkout(c)
	
	assert.Equal(t, http.StatusForbidden, w.Code)
	mockWorkoutRepo.AssertExpectations(t)
}

func TestUpdateWorkout_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	athleteID := "athlete-123"
	workoutID := "nonexistent-workout"
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockWorkoutRepo.On("GetByID", workoutID).Return(nil, assert.AnError)
	
	requestData := UpdateWorkoutRequest{
		Date: time.Now(),
		Exercises: []models.Exercise{
			{Name: "Squat", Weight: 120, Sets: 4, Reps: []int{8, 8, 8, 8}},
		},
	}
	
	jsonData, _ := json.Marshal(requestData)
	req, _ := http.NewRequest("PUT", "/api/workouts/"+workoutID, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: workoutID}}
	
	handler.UpdateWorkout(c)
	
	assert.Equal(t, http.StatusNotFound, w.Code)
	mockWorkoutRepo.AssertExpectations(t)
}

// Test DeleteWorkout
func TestDeleteWorkout_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	athleteID := "athlete-123"
	workout := newTestWorkout(athleteID)
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockWorkoutRepo.On("GetByID", workout.WorkoutID).Return(workout, nil)
	mockWorkoutRepo.On("Delete", workout.WorkoutID).Return(nil)
	
	req, _ := http.NewRequest("DELETE", "/api/workouts/"+workout.WorkoutID, nil)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: workout.WorkoutID}}
	
	handler.DeleteWorkout(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockWorkoutRepo.AssertExpectations(t)
}

func TestDeleteWorkout_NotOwner(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	otherAthleteID := "other-athlete-123"
	workout := newTestWorkout("athlete-123")
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockWorkoutRepo.On("GetByID", workout.WorkoutID).Return(workout, nil)
	
	req, _ := http.NewRequest("DELETE", "/api/workouts/"+workout.WorkoutID, nil)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", otherAthleteID)
	c.Set("userRole", models.RoleAthlete)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: workout.WorkoutID}}
	
	handler.DeleteWorkout(c)
	
	assert.Equal(t, http.StatusForbidden, w.Code)
	mockWorkoutRepo.AssertExpectations(t)
}

func TestDeleteWorkout_After24h(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	athleteID := "athlete-123"
	workout := newTestWorkoutOld(athleteID)
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockWorkoutRepo.On("GetByID", workout.WorkoutID).Return(workout, nil)
	
	req, _ := http.NewRequest("DELETE", "/api/workouts/"+workout.WorkoutID, nil)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: workout.WorkoutID}}
	
	handler.DeleteWorkout(c)
	
	assert.Equal(t, http.StatusForbidden, w.Code)
	mockWorkoutRepo.AssertExpectations(t)
}

// Test GetClientWorkouts
func TestGetClientWorkouts_Trainer(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	trainerID := "trainer-123"
	clientID := "client-123"
	workouts := []*models.Workout{newTestWorkout(clientID)}
	relationship := newTestRelationship(trainerID, clientID)
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockRelationshipRepo.On("GetByTrainerID", trainerID).Return([]*models.Relationship{relationship}, nil)
	mockWorkoutRepo.On("GetByAthleteID", clientID, 50, 0).Return(workouts, nil)
	
	req, _ := http.NewRequest("GET", "/api/clients/"+clientID+"/workouts", nil)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", trainerID)
	c.Set("userRole", models.RoleTrainer)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	
	handler.GetClientWorkouts(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockWorkoutRepo.AssertExpectations(t)
	mockRelationshipRepo.AssertExpectations(t)
}

func TestGetClientWorkouts_InvalidClient(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	trainerID := "trainer-123"
	clientID := "client-123"
	otherClientID := "other-client-123"
	relationship := newTestRelationship(trainerID, otherClientID)
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockRelationshipRepo.On("GetByTrainerID", trainerID).Return([]*models.Relationship{relationship}, nil)
	
	req, _ := http.NewRequest("GET", "/api/clients/"+clientID+"/workouts", nil)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", trainerID)
	c.Set("userRole", models.RoleTrainer)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	
	handler.GetClientWorkouts(c)
	
	assert.Equal(t, http.StatusForbidden, w.Code)
	mockRelationshipRepo.AssertExpectations(t)
}

func TestGetClientWorkouts_AthleteRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	athleteID := "athlete-123"
	clientID := "client-123"
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	req, _ := http.NewRequest("GET", "/api/clients/"+clientID+"/workouts", nil)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", athleteID)
	c.Set("userRole", models.RoleAthlete)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	
	handler.GetClientWorkouts(c)
	
	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestGetClientWorkouts_NoRelationship(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	trainerID := "trainer-123"
	clientID := "client-123"
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockRelationshipRepo.On("GetByTrainerID", trainerID).Return([]*models.Relationship{}, nil)
	
	req, _ := http.NewRequest("GET", "/api/clients/"+clientID+"/workouts", nil)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", trainerID)
	c.Set("userRole", models.RoleTrainer)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	
	handler.GetClientWorkouts(c)
	
	assert.Equal(t, http.StatusForbidden, w.Code)
	mockRelationshipRepo.AssertExpectations(t)
}

func TestGetClientWorkouts_WithExerciseFilter(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	trainerID := "trainer-123"
	clientID := "client-123"
	workouts := []*models.Workout{newTestWorkout(clientID)}
	relationship := newTestRelationship(trainerID, clientID)
	
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockRelationshipRepo := new(MockRelationshipRepository)
	handler := NewWorkoutHandler(mockWorkoutRepo, mockRelationshipRepo)
	
	mockRelationshipRepo.On("GetByTrainerID", trainerID).Return([]*models.Relationship{relationship}, nil)
	mockWorkoutRepo.On("GetByAthleteID", clientID, 50, 0).Return(workouts, nil)
	
	req, _ := http.NewRequest("GET", "/api/clients/"+clientID+"/workouts?exerciseType=Bench", nil)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", trainerID)
	c.Set("userRole", models.RoleTrainer)
	c.Request = req
	c.Params = gin.Params{gin.Param{Key: "id", Value: clientID}}
	
	handler.GetClientWorkouts(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockWorkoutRepo.AssertExpectations(t)
	mockRelationshipRepo.AssertExpectations(t)
}
