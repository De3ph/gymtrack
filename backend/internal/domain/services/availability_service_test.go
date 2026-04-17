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

// MockAvailabilityRepository is a mock implementation of AvailabilityRepository
type MockAvailabilityRepository struct {
	mock.Mock
}

func (m *MockAvailabilityRepository) UpsertAvailability(ctx context.Context, slot *models.TrainerAvailability) error {
	args := m.Called(ctx, slot)
	return args.Error(0)
}

func (m *MockAvailabilityRepository) GetByTrainerID(ctx context.Context, trainerID string) ([]models.TrainerAvailability, error) {
	args := m.Called(ctx, trainerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.TrainerAvailability), args.Error(1)
}

func (m *MockAvailabilityRepository) GetAvailableSlots(ctx context.Context, trainerID string, dayOfWeek int) ([]models.TrainerAvailability, error) {
	args := m.Called(ctx, trainerID, dayOfWeek)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.TrainerAvailability), args.Error(1)
}

func (m *MockAvailabilityRepository) GetBySlotID(ctx context.Context, slotID string) (*models.TrainerAvailability, error) {
	args := m.Called(ctx, slotID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.TrainerAvailability), args.Error(1)
}

func (m *MockAvailabilityRepository) DeleteAvailability(ctx context.Context, slotID string) error {
	args := m.Called(ctx, slotID)
	return args.Error(0)
}

// AvailabilityServiceTestSuite is the test suite for AvailabilityService
type AvailabilityServiceTestSuite struct {
	suite.Suite
	service                 *AvailabilityService
	mockAvailabilityRepo    *MockAvailabilityRepository
}

func (suite *AvailabilityServiceTestSuite) SetupTest() {
	suite.mockAvailabilityRepo = new(MockAvailabilityRepository)
	suite.service = NewAvailabilityService(suite.mockAvailabilityRepo)
}

// Test data factory functions
func createTestAvailabilitySlot(slotID, trainerID string, day models.WeekDay, startTime, endTime time.Time) models.TrainerAvailability {
	return models.TrainerAvailability{
		AvailabilityID: slotID,
		TrainerID:      trainerID,
		Day:            day,
		StartTime:      startTime,
		EndTime:        endTime,
		IsBooked:       false,
		CreatedAt:      time.Now().UTC(),
		UpdatedAt:      time.Now().UTC(),
	}
}

func createTestAvailabilitySlotWithoutID(trainerID string, day models.WeekDay, startTime, endTime time.Time) models.TrainerAvailability {
	return models.TrainerAvailability{
		TrainerID: trainerID,
		Day:       day,
		StartTime: startTime,
		EndTime:   endTime,
		IsBooked:  false,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
}

// SetAvailability Tests
func (suite *AvailabilityServiceTestSuite) TestSetAvailability_Success_NewSlots() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	slots := []models.TrainerAvailability{
		createTestAvailabilitySlotWithoutID(trainerID, models.WeekDayMonday, 
			time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 17, 0, 0, 0, time.UTC)),
		createTestAvailabilitySlotWithoutID(trainerID, models.WeekDayWednesday,
			time.Date(0, 0, 0, 10, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 14, 0, 0, 0, time.UTC)),
	}
	
	// Expect calls with trainerID set and UUID generated
	for i := range slots {
		expectedSlot := slots[i]
		expectedSlot.TrainerID = trainerID
		expectedSlot.AvailabilityID = mock.AnythingOfType("string") // UUID will be generated
		
		suite.mockAvailabilityRepo.On("UpsertAvailability", ctx, mock.MatchedBy(func(slot *models.TrainerAvailability) bool {
			return slot.TrainerID == trainerID && slot.AvailabilityID != ""
		})).Return(nil).Once()
	}
	
	err := suite.service.SetAvailability(ctx, trainerID, slots)
	
	assert.NoError(suite.T(), err)
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestSetAvailability_Success_ExistingSlots() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	slots := []models.TrainerAvailability{
		createTestAvailabilitySlot("slot-1", trainerID, models.WeekDayMonday,
			time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 17, 0, 0, 0, time.UTC)),
	}
	
	suite.mockAvailabilityRepo.On("UpsertAvailability", ctx, &slots[0]).Return(nil)
	
	err := suite.service.SetAvailability(ctx, trainerID, slots)
	
	assert.NoError(suite.T(), err)
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestSetAvailability_RepositoryError() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	slots := []models.TrainerAvailability{
		createTestAvailabilitySlotWithoutID(trainerID, models.WeekDayMonday,
			time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 17, 0, 0, 0, time.UTC)),
	}
	
	suite.mockAvailabilityRepo.On("UpsertAvailability", ctx, mock.AnythingOfType("*models.TrainerAvailability")).Return(errors.New("database error"))
	
	err := suite.service.SetAvailability(ctx, trainerID, slots)
	
	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "failed to upsert availability slot")
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestSetAvailability_EmptySlots() {
	ctx := context.Background()
	trainerID := "trainer-123"
	slots := []models.TrainerAvailability{}
	
	err := suite.service.SetAvailability(ctx, trainerID, slots)
	
	assert.NoError(suite.T(), err)
}

func (suite *AvailabilityServiceTestSuite) TestSetAvailability_MultipleSlots() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	slots := []models.TrainerAvailability{
		createTestAvailabilitySlotWithoutID(trainerID, models.WeekDayMonday,
			time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 12, 0, 0, 0, time.UTC)),
		createTestAvailabilitySlot("existing-slot", trainerID, models.WeekDayWednesday,
			time.Date(0, 0, 0, 14, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 18, 0, 0, 0, time.UTC)),
		createTestAvailabilitySlotWithoutID(trainerID, models.WeekDayFriday,
			time.Date(0, 0, 0, 10, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 16, 0, 0, 0, time.UTC)),
	}
	
	// First slot (new) - should get UUID generated
	suite.mockAvailabilityRepo.On("UpsertAvailability", ctx, mock.MatchedBy(func(slot *models.TrainerAvailability) bool {
		return slot.TrainerID == trainerID && slot.AvailabilityID != ""
	})).Return(nil).Once()
	
	// Second slot (existing) - should keep existing ID
	suite.mockAvailabilityRepo.On("UpsertAvailability", ctx, &slots[1]).Return(nil).Once()
	
	// Third slot (new) - should get UUID generated
	suite.mockAvailabilityRepo.On("UpsertAvailability", ctx, mock.MatchedBy(func(slot *models.TrainerAvailability) bool {
		return slot.TrainerID == trainerID && slot.AvailabilityID != ""
	})).Return(nil).Once()
	
	err := suite.service.SetAvailability(ctx, trainerID, slots)
	
	assert.NoError(suite.T(), err)
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

// GetAvailability Tests
func (suite *AvailabilityServiceTestSuite) TestGetAvailability_Success() {
	ctx := context.Background()
	trainerID := "trainer-123"
	expectedSlots := []models.TrainerAvailability{
		createTestAvailabilitySlot("slot-1", trainerID, models.WeekDayMonday,
			time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 17, 0, 0, 0, time.UTC)),
	}
	
	suite.mockAvailabilityRepo.On("GetByTrainerID", ctx, trainerID).Return(expectedSlots, nil)
	
	slots, err := suite.service.GetAvailability(ctx, trainerID)
	
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), expectedSlots, slots)
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestGetAvailability_RepositoryError() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	suite.mockAvailabilityRepo.On("GetByTrainerID", ctx, trainerID).Return(nil, errors.New("database error"))
	
	slots, err := suite.service.GetAvailability(ctx, trainerID)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), slots)
	assert.Contains(suite.T(), err.Error(), "failed to get availability")
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestGetAvailability_EmptySlots() {
	ctx := context.Background()
	trainerID := "trainer-123"
	expectedSlots := []models.TrainerAvailability{}
	
	suite.mockAvailabilityRepo.On("GetByTrainerID", ctx, trainerID).Return(expectedSlots, nil)
	
	slots, err := suite.service.GetAvailability(ctx, trainerID)
	
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), expectedSlots, slots)
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

// GetAvailableSlots Tests
func (suite *AvailabilityServiceTestSuite) TestGetAvailableSlots_Success() {
	ctx := context.Background()
	trainerID := "trainer-123"
	dayOfWeek := 1 // Monday
	expectedSlots := []models.TrainerAvailability{
		createTestAvailabilitySlot("slot-1", trainerID, models.WeekDayMonday,
			time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 17, 0, 0, 0, time.UTC)),
	}
	
	suite.mockAvailabilityRepo.On("GetAvailableSlots", ctx, trainerID, dayOfWeek).Return(expectedSlots, nil)
	
	slots, err := suite.service.GetAvailableSlots(ctx, trainerID, dayOfWeek)
	
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), expectedSlots, slots)
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestGetAvailableSlots_RepositoryError() {
	ctx := context.Background()
	trainerID := "trainer-123"
	dayOfWeek := 1
	
	suite.mockAvailabilityRepo.On("GetAvailableSlots", ctx, trainerID, dayOfWeek).Return(nil, errors.New("database error"))
	
	slots, err := suite.service.GetAvailableSlots(ctx, trainerID, dayOfWeek)
	
	assert.Error(suite.T(), err)
	assert.Nil(suite.T(), slots)
	assert.Contains(suite.T(), err.Error(), "failed to get available slots")
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestGetAvailableSlots_EmptySlots() {
	ctx := context.Background()
	trainerID := "trainer-123"
	dayOfWeek := 5 // Friday
	expectedSlots := []models.TrainerAvailability{}
	
	suite.mockAvailabilityRepo.On("GetAvailableSlots", ctx, trainerID, dayOfWeek).Return(expectedSlots, nil)
	
	slots, err := suite.service.GetAvailableSlots(ctx, trainerID, dayOfWeek)
	
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), expectedSlots, slots)
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestGetAvailableSlots_AllDaysOfWeek() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	// Test all days of the week (0-6, where 0 is Sunday)
	for dayOfWeek := 0; dayOfWeek <= 6; dayOfWeek++ {
		expectedSlots := []models.TrainerAvailability{
			createTestAvailabilitySlot("slot-1", trainerID, models.WeekDay(dayOfWeek),
				time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 17, 0, 0, 0, time.UTC)),
		}
		
		suite.mockAvailabilityRepo.On("GetAvailableSlots", ctx, trainerID, dayOfWeek).Return(expectedSlots, nil).Once()
		
		slots, err := suite.service.GetAvailableSlots(ctx, trainerID, dayOfWeek)
		
		assert.NoError(suite.T(), err)
		assert.Equal(suite.T(), expectedSlots, slots)
	}
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

// BookSlot Tests
func (suite *AvailabilityServiceTestSuite) TestBookSlot_Success() {
	ctx := context.Background()
	slotID := "slot-123"
	slot := createTestAvailabilitySlot(slotID, "trainer-123", models.WeekDayMonday,
		time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 17, 0, 0, 0, time.UTC))
	
	suite.mockAvailabilityRepo.On("GetBySlotID", ctx, slotID).Return(&slot, nil)
	suite.mockAvailabilityRepo.On("UpsertAvailability", ctx, mock.MatchedBy(func(s *models.TrainerAvailability) bool {
		return s.IsBooked == true
	})).Return(nil)
	
	err := suite.service.BookSlot(ctx, slotID)
	
	assert.NoError(suite.T(), err)
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestBookSlot_SlotNotFound() {
	ctx := context.Background()
	slotID := "nonexistent"
	
	suite.mockAvailabilityRepo.On("GetBySlotID", ctx, slotID).Return(nil, nil)
	
	err := suite.service.BookSlot(ctx, slotID)
	
	assert.Error(suite.T(), err)
	assert.Equal(suite.T(), "availability slot not found", err.Error())
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestBookSlot_RepositoryError_GetSlot() {
	ctx := context.Background()
	slotID := "slot-123"
	
	suite.mockAvailabilityRepo.On("GetBySlotID", ctx, slotID).Return(nil, errors.New("database error"))
	
	err := suite.service.BookSlot(ctx, slotID)
	
	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "failed to get availability slot")
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestBookSlot_RepositoryError_UpdateSlot() {
	ctx := context.Background()
	slotID := "slot-123"
	slot := createTestAvailabilitySlot(slotID, "trainer-123", models.WeekDayMonday,
		time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 17, 0, 0, 0, time.UTC))
	
	suite.mockAvailabilityRepo.On("GetBySlotID", ctx, slotID).Return(&slot, nil)
	suite.mockAvailabilityRepo.On("UpsertAvailability", ctx, mock.AnythingOfType("*models.TrainerAvailability")).Return(errors.New("database error"))
	
	err := suite.service.BookSlot(ctx, slotID)
	
	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "failed to book availability slot")
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestBookSlot_AlreadyBooked() {
	ctx := context.Background()
	slotID := "slot-123"
	slot := createTestAvailabilitySlot(slotID, "trainer-123", models.WeekDayMonday,
		time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 17, 0, 0, 0, time.UTC))
	slot.IsBooked = true // Already booked
	
	suite.mockAvailabilityRepo.On("GetBySlotID", ctx, slotID).Return(&slot, nil)
	suite.mockAvailabilityRepo.On("UpsertAvailability", ctx, mock.AnythingOfType("*models.TrainerAvailability")).Return(nil)
	
	err := suite.service.BookSlot(ctx, slotID)
	
	assert.NoError(suite.T(), err) // Should still succeed, just updates the timestamp
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

// ClearBookedSlots Tests
func (suite *AvailabilityServiceTestSuite) TestClearBookedSlots_Success() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	slots := []models.TrainerAvailability{
		createTestAvailabilitySlot("slot-1", trainerID, models.WeekDayMonday,
			time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 17, 0, 0, 0, time.UTC)),
		createTestAvailabilitySlot("slot-2", trainerID, models.WeekDayWednesday,
			time.Date(0, 0, 0, 10, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 14, 0, 0, 0, time.UTC)),
	}
	slots[0].IsBooked = true
	slots[1].IsBooked = false
	
	suite.mockAvailabilityRepo.On("GetByTrainerID", ctx, trainerID).Return(slots, nil)
	suite.mockAvailabilityRepo.On("DeleteAvailability", ctx, "slot-1").Return(nil)
	
	err := suite.service.ClearBookedSlots(ctx, trainerID)
	
	assert.NoError(suite.T(), err)
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestClearBookedSlots_NoBookedSlots() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	slots := []models.TrainerAvailability{
		createTestAvailabilitySlot("slot-1", trainerID, models.WeekDayMonday,
			time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 17, 0, 0, 0, time.UTC)),
	}
	slots[0].IsBooked = false
	
	suite.mockAvailabilityRepo.On("GetByTrainerID", ctx, trainerID).Return(slots, nil)
	
	err := suite.service.ClearBookedSlots(ctx, trainerID)
	
	assert.NoError(suite.T(), err)
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestClearBookedSlots_EmptySlots() {
	ctx := context.Background()
	trainerID := "trainer-123"
	slots := []models.TrainerAvailability{}
	
	suite.mockAvailabilityRepo.On("GetByTrainerID", ctx, trainerID).Return(slots, nil)
	
	err := suite.service.ClearBookedSlots(ctx, trainerID)
	
	assert.NoError(suite.T(), err)
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestClearBookedSlots_RepositoryError_GetSlots() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	suite.mockAvailabilityRepo.On("GetByTrainerID", ctx, trainerID).Return(nil, errors.New("database error"))
	
	err := suite.service.ClearBookedSlots(ctx, trainerID)
	
	assert.Error(suite.T(), err)
	assert.Equal(suite.T(), "database error", err.Error())
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestClearBookedSlots_RepositoryError_Delete() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	slots := []models.TrainerAvailability{
		createTestAvailabilitySlot("slot-1", trainerID, models.WeekDayMonday,
			time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 17, 0, 0, 0, time.UTC)),
	}
	slots[0].IsBooked = true
	
	suite.mockAvailabilityRepo.On("GetByTrainerID", ctx, trainerID).Return(slots, nil)
	suite.mockAvailabilityRepo.On("DeleteAvailability", ctx, "slot-1").Return(errors.New("delete error"))
	
	err := suite.service.ClearBookedSlots(ctx, trainerID)
	
	assert.Error(suite.T(), err)
	assert.Equal(suite.T(), "delete error", err.Error())
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestClearBookedSlots_MultipleBookedSlots() {
	ctx := context.Background()
	trainerID := "trainer-123"
	
	slots := []models.TrainerAvailability{
		createTestAvailabilitySlot("slot-1", trainerID, models.WeekDayMonday,
			time.Date(0, 0, 0, 9, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 12, 0, 0, 0, time.UTC)),
		createTestAvailabilitySlot("slot-2", trainerID, models.WeekDayWednesday,
			time.Date(0, 0, 0, 14, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 18, 0, 0, 0, time.UTC)),
		createTestAvailabilitySlot("slot-3", trainerID, models.WeekDayFriday,
			time.Date(0, 0, 0, 10, 0, 0, 0, time.UTC), time.Date(0, 0, 0, 16, 0, 0, 0, time.UTC)),
	}
	slots[0].IsBooked = true
	slots[1].IsBooked = true
	slots[2].IsBooked = false
	
	suite.mockAvailabilityRepo.On("GetByTrainerID", ctx, trainerID).Return(slots, nil)
	suite.mockAvailabilityRepo.On("DeleteAvailability", ctx, "slot-1").Return(nil)
	suite.mockAvailabilityRepo.On("DeleteAvailability", ctx, "slot-2").Return(nil)
	
	err := suite.service.ClearBookedSlots(ctx, trainerID)
	
	assert.NoError(suite.T(), err)
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

// DeleteSlot Tests
func (suite *AvailabilityServiceTestSuite) TestDeleteSlot_Success() {
	ctx := context.Background()
	slotID := "slot-123"
	
	suite.mockAvailabilityRepo.On("DeleteAvailability", ctx, slotID).Return(nil)
	
	err := suite.service.DeleteSlot(ctx, slotID)
	
	assert.NoError(suite.T(), err)
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestDeleteSlot_RepositoryError() {
	ctx := context.Background()
	slotID := "slot-123"
	
	suite.mockAvailabilityRepo.On("DeleteAvailability", ctx, slotID).Return(errors.New("database error"))
	
	err := suite.service.DeleteSlot(ctx, slotID)
	
	assert.Error(suite.T(), err)
	assert.Equal(suite.T(), "database error", err.Error())
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestDeleteSlot_EmptySlotID() {
	ctx := context.Background()
	slotID := ""
	
	suite.mockAvailabilityRepo.On("DeleteAvailability", ctx, slotID).Return(errors.New("invalid slot ID"))
	
	err := suite.service.DeleteSlot(ctx, slotID)
	
	assert.Error(suite.T(), err)
	assert.Equal(suite.T(), "invalid slot ID", err.Error())
	
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

// Test runner
func TestAvailabilityServiceSuite(t *testing.T) {
	suite.Run(t, new(AvailabilityServiceTestSuite))
}
