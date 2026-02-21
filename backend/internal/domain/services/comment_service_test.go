package services_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/domain/services"
)

// MockCommentRepository for testing
type MockCommentRepository struct {
	mock.Mock
}

func (m *MockCommentRepository) GetByID(id string) (*models.Comment, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Comment), args.Error(1)
}

func (m *MockCommentRepository) GetByTarget(targetType models.TargetType, targetID string) ([]models.Comment, error) {
	args := m.Called(targetType, targetID)
	return args.Get(0).([]models.Comment), args.Error(1)
}

func (m *MockCommentRepository) Create(comment *models.Comment) error {
	args := m.Called(comment)
	return args.Error(0)
}

func (m *MockCommentRepository) Update(comment *models.Comment) error {
	args := m.Called(comment)
	return args.Error(0)
}

func (m *MockCommentRepository) Delete(id string) error {
	args := m.Called(id)
	return args.Error(0)
}

// MockRelationshipRepository for testing
type MockRelationshipRepository struct {
	mock.Mock
}

func (m *MockRelationshipRepository) GetByTrainerID(trainerID string) ([]models.Relationship, error) {
	args := m.Called(trainerID)
	return args.Get(0).([]models.Relationship), args.Error(1)
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

func (m *MockWorkoutRepository) GetByAthleteID(athleteID string, startDate, endDate string) ([]models.Workout, error) {
	args := m.Called(athleteID, startDate, endDate)
	return args.Get(0).([]models.Workout), args.Error(1)
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

// MockMealRepository for testing
type MockMealRepository struct {
	mock.Mock
}

func (m *MockMealRepository) GetByID(id string) (*models.Meal, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Meal), args.Error(1)
}

func (m *MockMealRepository) GetByAthleteID(athleteID string, startDate, endDate string) ([]models.Meal, error) {
	args := m.Called(athleteID, startDate, endDate)
	return args.Get(0).([]models.Meal), args.Error(1)
}

func (m *MockMealRepository) Create(meal *models.Meal) error {
	args := m.Called(meal)
	return args.Error(0)
}

func (m *MockMealRepository) Update(meal *models.Meal) error {
	args := m.Called(meal)
	return args.Error(0)
}

func (m *MockMealRepository) Delete(id string) error {
	args := m.Called(id)
	return args.Error(0)
}

// Test CommentService ResolveTargetAthlete

func TestCommentService_ResolveTargetAthlete_Workout(t *testing.T) {
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockMealRepo := new(MockMealRepository)
	mockCommentRepo := new(MockCommentRepository)
	mockRelRepo := new(MockRelationshipRepository)

	svc := services.NewCommentService(mockCommentRepo, mockRelRepo, mockWorkoutRepo, mockMealRepo)

	// Setup expectation
	mockWorkoutRepo.On("GetByID", "w1").Return(&models.Workout{
		WorkoutID: "w1",
		AthleteID: "athlete1",
	}, nil)

	// Execute
	athleteID, err := svc.ResolveTargetAthlete(models.TargetTypeWorkout, "w1")

	// Assert
	require.NoError(t, err)
	assert.Equal(t, "athlete1", athleteID)
	mockWorkoutRepo.AssertExpectations(t)
}

func TestCommentService_ResolveTargetAthlete_Meal(t *testing.T) {
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockMealRepo := new(MockMealRepository)
	mockCommentRepo := new(MockCommentRepository)
	mockRelRepo := new(MockRelationshipRepository)

	svc := services.NewCommentService(mockCommentRepo, mockRelRepo, mockWorkoutRepo, mockMealRepo)

	// Setup expectation
	mockMealRepo.On("GetByID", "m1").Return(&models.Meal{
		MealID:    "m1",
		AthleteID: "athlete1",
	}, nil)

	// Execute
	athleteID, err := svc.ResolveTargetAthlete(models.TargetTypeMeal, "m1")

	// Assert
	require.NoError(t, err)
	assert.Equal(t, "athlete1", athleteID)
	mockMealRepo.AssertExpectations(t)
}

func TestCommentService_ResolveTargetAthlete_NotFound(t *testing.T) {
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockMealRepo := new(MockMealRepository)
	mockCommentRepo := new(MockCommentRepository)
	mockRelRepo := new(MockRelationshipRepository)

	svc := services.NewCommentService(mockCommentRepo, mockRelRepo, mockWorkoutRepo, mockMealRepo)

	// Setup expectation
	mockWorkoutRepo.On("GetByID", "nonexistent").Return(nil, nil)

	// Execute
	athleteID, err := svc.ResolveTargetAthlete(models.TargetTypeWorkout, "nonexistent")

	// Assert
	assert.Error(t, err)
	assert.Equal(t, services.ErrTargetNotFound, err)
	assert.Empty(t, athleteID)
}

func TestCommentService_ResolveTargetAthlete_InvalidTargetType(t *testing.T) {
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockMealRepo := new(MockMealRepository)
	mockCommentRepo := new(MockCommentRepository)
	mockRelRepo := new(MockRelationshipRepository)

	svc := services.NewCommentService(mockCommentRepo, mockRelRepo, mockWorkoutRepo, mockMealRepo)

	// Execute
	athleteID, err := svc.ResolveTargetAthlete(models.TargetType("invalid"), "w1")

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid target type")
	assert.Empty(t, athleteID)
}

// Test CommentService CanAccessComments

func TestCommentService_CanAccessComments_AthleteOnOwnWorkout(t *testing.T) {
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockMealRepo := new(MockMealRepository)
	mockCommentRepo := new(MockCommentRepository)
	mockRelRepo := new(MockRelationshipRepository)

	svc := services.NewCommentService(mockCommentRepo, mockRelRepo, mockWorkoutRepo, mockMealRepo)

	// Setup expectation
	mockWorkoutRepo.On("GetByID", "w1").Return(&models.Workout{
		WorkoutID: "w1",
		AthleteID: "athlete1",
	}, nil)

	// Execute - athlete accessing their own workout
	err := svc.CanAccessComments("athlete1", models.RoleAthlete, models.TargetTypeWorkout, "w1")

	// Assert
	require.NoError(t, err)
}

func TestCommentService_CanAccessComments_AthleteOnOtherWorkout(t *testing.T) {
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockMealRepo := new(MockMealRepository)
	mockCommentRepo := new(MockCommentRepository)
	mockRelRepo := new(MockRelationshipRepository)

	svc := services.NewCommentService(mockCommentRepo, mockRelRepo, mockWorkoutRepo, mockMealRepo)

	// Setup expectation
	mockWorkoutRepo.On("GetByID", "w1").Return(&models.Workout{
		WorkoutID: "w1",
		AthleteID: "athlete1",
	}, nil)

	// Execute - different athlete accessing
	err := svc.CanAccessComments("athlete2", models.RoleAthlete, models.TargetTypeWorkout, "w1")

	// Assert
	assert.Error(t, err)
	assert.Equal(t, services.ErrAccessDenied, err)
}

func TestCommentService_CanAccessComments_TrainerOnClientWorkout(t *testing.T) {
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockMealRepo := new(MockMealRepository)
	mockCommentRepo := new(MockCommentRepository)
	mockRelRepo := new(MockRelationshipRepository)

	svc := services.NewCommentService(mockCommentRepo, mockRelRepo, mockWorkoutRepo, mockMealRepo)

	// Setup expectations
	mockWorkoutRepo.On("GetByID", "w1").Return(&models.Workout{
		WorkoutID: "w1",
		AthleteID: "athlete1",
	}, nil)

	mockRelRepo.On("GetByTrainerID", "trainer1").Return([]models.Relationship{
		{
			RelationshipID: "r1",
			TrainerID:      "trainer1",
			AthleteID:      "athlete1",
			Status:         "active",
		},
	}, nil)

	// Execute - trainer accessing client's workout
	err := svc.CanAccessComments("trainer1", models.RoleTrainer, models.TargetTypeWorkout, "w1")

	// Assert
	require.NoError(t, err)
}

func TestCommentService_CanAccessComments_TrainerOnNonClientWorkout(t *testing.T) {
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockMealRepo := new(MockMealRepository)
	mockCommentRepo := new(MockCommentRepository)
	mockRelRepo := new(MockRelationshipRepository)

	svc := services.NewCommentService(mockCommentRepo, mockRelRepo, mockWorkoutRepo, mockMealRepo)

	// Setup expectations
	mockWorkoutRepo.On("GetByID", "w1").Return(&models.Workout{
		WorkoutID: "w1",
		AthleteID: "athlete1",
	}, nil)

	mockRelRepo.On("GetByTrainerID", "trainer1").Return([]models.Relationship{
		{
			RelationshipID: "r1",
			TrainerID:      "trainer1",
			AthleteID:      "other-athlete",
			Status:         "active",
		},
	}, nil)

	// Execute - trainer accessing non-client's workout
	err := svc.CanAccessComments("trainer1", models.RoleTrainer, models.TargetTypeWorkout, "w1")

	// Assert
	assert.Error(t, err)
	assert.Equal(t, services.ErrAccessDenied, err)
}

func TestCommentService_CanAccessComments_TrainerOnInactiveRelationship(t *testing.T) {
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockMealRepo := new(MockMealRepository)
	mockCommentRepo := new(MockCommentRepository)
	mockRelRepo := new(MockRelationshipRepository)

	svc := services.NewCommentService(mockCommentRepo, mockRelRepo, mockWorkoutRepo, mockMealRepo)

	// Setup expectations
	mockWorkoutRepo.On("GetByID", "w1").Return(&models.Workout{
		WorkoutID: "w1",
		AthleteID: "athlete1",
	}, nil)

	mockRelRepo.On("GetByTrainerID", "trainer1").Return([]models.Relationship{
		{
			RelationshipID: "r1",
			TrainerID:      "trainer1",
			AthleteID:      "athlete1",
			Status:         "terminated",
		},
	}, nil)

	// Execute - trainer accessing with terminated relationship
	err := svc.CanAccessComments("trainer1", models.RoleTrainer, models.TargetTypeWorkout, "w1")

	// Assert
	assert.Error(t, err)
	assert.Equal(t, services.ErrAccessDenied, err)
}

func TestCommentService_CanAccessComments_TargetNotFound(t *testing.T) {
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockMealRepo := new(MockMealRepository)
	mockCommentRepo := new(MockCommentRepository)
	mockRelRepo := new(MockRelationshipRepository)

	svc := services.NewCommentService(mockCommentRepo, mockRelRepo, mockWorkoutRepo, mockMealRepo)

	// Setup expectation
	mockWorkoutRepo.On("GetByID", "nonexistent").Return(nil, nil)

	// Execute
	err := svc.CanAccessComments("athlete1", models.RoleAthlete, models.TargetTypeWorkout, "nonexistent")

	// Assert
	assert.Error(t, err)
	assert.Equal(t, services.ErrTargetNotFound, err)
}

// Test CommentService CanCreateComment

func TestCommentService_CanCreateComment_AthleteOnOwnMeal(t *testing.T) {
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockMealRepo := new(MockMealRepository)
	mockCommentRepo := new(MockCommentRepository)
	mockRelRepo := new(MockRelationshipRepository)

	svc := services.NewCommentService(mockCommentRepo, mockRelRepo, mockWorkoutRepo, mockMealRepo)

	// Setup expectation
	mockMealRepo.On("GetByID", "m1").Return(&models.Meal{
		MealID:    "m1",
		AthleteID: "athlete1",
	}, nil)

	// Execute - athlete creating comment on own meal
	err := svc.CanCreateComment("athlete1", models.RoleAthlete, models.TargetTypeMeal, "m1", nil)

	// Assert
	require.NoError(t, err)
}

func TestCommentService_CanCreateComment_TrainerReplyToClientComment(t *testing.T) {
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockMealRepo := new(MockMealRepository)
	mockCommentRepo := new(MockCommentRepository)
	mockRelRepo := new(MockRelationshipRepository)

	svc := services.NewCommentService(mockCommentRepo, mockRelRepo, mockWorkoutRepo, mockMealRepo)

	// Setup expectations
	mockWorkoutRepo.On("GetByID", "w1").Return(&models.Workout{
		WorkoutID: "w1",
		AthleteID: "athlete1",
	}, nil)

	mockRelRepo.On("GetByTrainerID", "trainer1").Return([]models.Relationship{
		{
			RelationshipID: "r1",
			TrainerID:      "trainer1",
			AthleteID:      "athlete1",
			Status:         "active",
		},
	}, nil)

	// Execute - trainer replying to comment on client's workout
	parentID := "parent-comment-id"
	err := svc.CanCreateComment("trainer1", models.RoleTrainer, models.TargetTypeWorkout, "w1", &parentID)

	// Assert
	require.NoError(t, err)
}

// Test CommentService CanEditOrDeleteComment

func TestCommentService_CanEditOrDeleteComment_Author(t *testing.T) {
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockMealRepo := new(MockMealRepository)
	mockCommentRepo := new(MockCommentRepository)
	mockRelRepo := new(MockRelationshipRepository)

	svc := services.NewCommentService(mockCommentRepo, mockRelRepo, mockWorkoutRepo, mockMealRepo)

	// Setup expectation
	mockCommentRepo.On("GetByID", "c1").Return(&models.Comment{
		CommentID: "c1",
		AuthorID:  "user1",
	}, nil)

	// Execute - author editing their own comment
	err := svc.CanEditOrDeleteComment("user1", "c1")

	// Assert
	require.NoError(t, err)
}

func TestCommentService_CanEditOrDeleteComment_NonAuthor(t *testing.T) {
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockMealRepo := new(MockMealRepository)
	mockCommentRepo := new(MockCommentRepository)
	mockRelRepo := new(MockRelationshipRepository)

	svc := services.NewCommentService(mockCommentRepo, mockRelRepo, mockWorkoutRepo, mockMealRepo)

	// Setup expectation
	mockCommentRepo.On("GetByID", "c1").Return(&models.Comment{
		CommentID: "c1",
		AuthorID:  "user1",
	}, nil)

	// Execute - different user trying to edit
	err := svc.CanEditOrDeleteComment("user2", "c1")

	// Assert
	assert.Error(t, err)
	assert.Equal(t, services.ErrNotAuthor, err)
}

func TestCommentService_CanEditOrDeleteComment_CommentNotFound(t *testing.T) {
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockMealRepo := new(MockMealRepository)
	mockCommentRepo := new(MockCommentRepository)
	mockRelRepo := new(MockRelationshipRepository)

	svc := services.NewCommentService(mockCommentRepo, mockRelRepo, mockWorkoutRepo, mockMealRepo)

	// Setup expectation
	mockCommentRepo.On("GetByID", "nonexistent").Return(nil, nil)

	// Execute
	err := svc.CanEditOrDeleteComment("user1", "nonexistent")

	// Assert
	assert.Error(t, err)
	assert.Equal(t, services.ErrTargetNotFound, err)
}

// Additional edge case tests

func TestCommentService_CanAccessComments_InvalidUserRole(t *testing.T) {
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockMealRepo := new(MockMealRepository)
	mockCommentRepo := new(MockCommentRepository)
	mockRelRepo := new(MockRelationshipRepository)

	svc := services.NewCommentService(mockCommentRepo, mockRelRepo, mockWorkoutRepo, mockMealRepo)

	// Setup expectation
	mockWorkoutRepo.On("GetByID", "w1").Return(&models.Workout{
		WorkoutID: "w1",
		AthleteID: "athlete1",
	}, nil)

	// Execute - invalid role
	err := svc.CanAccessComments("user1", models.UserRole("invalid"), models.TargetTypeWorkout, "w1")

	// Assert
	assert.Error(t, err)
	assert.Equal(t, services.ErrAccessDenied, err)
}

func TestCommentService_CanAccessComments_TrainerWithNoRelationships(t *testing.T) {
	mockWorkoutRepo := new(MockWorkoutRepository)
	mockMealRepo := new(MockMealRepository)
	mockCommentRepo := new(MockCommentRepository)
	mockRelRepo := new(MockRelationshipRepository)

	svc := services.NewCommentService(mockCommentRepo, mockRelRepo, mockWorkoutRepo, mockMealRepo)

	// Setup expectations
	mockWorkoutRepo.On("GetByID", "w1").Return(&models.Workout{
		WorkoutID: "w1",
		AthleteID: "athlete1",
	}, nil)

	mockRelRepo.On("GetByTrainerID", "trainer1").Return([]models.Relationship{}, nil)

	// Execute - trainer with no clients
	err := svc.CanAccessComments("trainer1", models.RoleTrainer, models.TargetTypeWorkout, "w1")

	// Assert
	assert.Error(t, err)
	assert.Equal(t, services.ErrAccessDenied, err)
}
