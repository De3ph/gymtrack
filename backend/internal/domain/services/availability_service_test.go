package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"gymtrack-backend/internal/domain/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
	"gymtrack-backend/internal/testutils"
)

type AvailabilityServiceTestSuite struct {
	suite.Suite
	service              *AvailabilityService
	mockAvailabilityRepo *testutils.MockAvailabilityRepository
}

func (suite *AvailabilityServiceTestSuite) SetupTest() {
	suite.mockAvailabilityRepo = new(testutils.MockAvailabilityRepository)
	suite.service = NewAvailabilityService(suite.mockAvailabilityRepo)
}

func createTestSlot(slotID, trainerID string, dayOfWeek int, startTime, endTime string) models.TrainerAvailability {
	return models.TrainerAvailability{
		AvailabilityID: slotID,
		TrainerID:      trainerID,
		DayOfWeek:      dayOfWeek,
		StartTime:      startTime,
		EndTime:        endTime,
		IsBooked:       false,
		CreatedAt:      time.Now().UTC(),
		UpdatedAt:      time.Now().UTC(),
	}
}

func createTestSlotWithoutID(trainerID string, dayOfWeek int, startTime, endTime string) models.TrainerAvailability {
	return models.TrainerAvailability{
		TrainerID: trainerID,
		DayOfWeek: dayOfWeek,
		StartTime: startTime,
		EndTime:   endTime,
		IsBooked:  false,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
}

func (suite *AvailabilityServiceTestSuite) TestSetAvailability_Success_NewSlots() {
	ctx := context.Background()
	trainerID := "trainer-123"
	slots := []models.TrainerAvailability{
		createTestSlotWithoutID(trainerID, 1, "09:00", "17:00"),
		createTestSlotWithoutID(trainerID, 3, "10:00", "14:00"),
	}

	for i := range slots {
		expectedSlot := slots[i]
		expectedSlot.TrainerID = trainerID
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
		createTestSlot("slot-1", trainerID, 1, "09:00", "17:00"),
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
		createTestSlotWithoutID(trainerID, 1, "09:00", "17:00"),
	}

	suite.mockAvailabilityRepo.On("UpsertAvailability", ctx, mock.AnythingOfType("*models.TrainerAvailability")).Return(errors.New("database error"))

	err := suite.service.SetAvailability(ctx, trainerID, slots)

	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "failed to upsert availability slot")

	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestGetAvailability_Success() {
	ctx := context.Background()
	trainerID := "trainer-123"
	expectedSlots := []models.TrainerAvailability{
		createTestSlot("slot-1", trainerID, 1, "09:00", "17:00"),
	}

	suite.mockAvailabilityRepo.On("GetByTrainerID", ctx, trainerID).Return(expectedSlots, nil)

	gotSlots, err := suite.service.GetAvailability(ctx, trainerID)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), expectedSlots, gotSlots)

	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestGetAvailability_RepositoryError() {
	ctx := context.Background()
	trainerID := "trainer-123"

	suite.mockAvailabilityRepo.On("GetByTrainerID", ctx, trainerID).Return(nil, errors.New("database error"))

	_, err := suite.service.GetAvailability(ctx, trainerID)

	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "failed to get availability")

	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestGetAvailableSlots_Success() {
	ctx := context.Background()
	trainerID := "trainer-123"
	dayOfWeek := 1
	expectedSlots := []models.TrainerAvailability{
		createTestSlot("slot-1", trainerID, dayOfWeek, "09:00", "17:00"),
	}

	suite.mockAvailabilityRepo.On("GetAvailableSlots", ctx, trainerID, dayOfWeek).Return(expectedSlots, nil)

	gotSlots, err := suite.service.GetAvailableSlots(ctx, trainerID, dayOfWeek)

	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), expectedSlots, gotSlots)

	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestBookSlot_Success() {
	ctx := context.Background()
	slotID := "slot-123"
	slot := createTestSlot(slotID, "trainer-123", 1, "09:00", "17:00")

	suite.mockAvailabilityRepo.On("GetBySlotID", ctx, slotID).Return(&slot, nil)
	suite.mockAvailabilityRepo.On("BookSlotAtomic", ctx, slotID).Return(nil)

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
	assert.Contains(suite.T(), err.Error(), "availability slot not found")

	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestBookSlot_AlreadyBooked() {
	ctx := context.Background()
	slotID := "slot-123"
	slot := createTestSlot(slotID, "trainer-123", 1, "09:00", "17:00")
	slot.IsBooked = true

	suite.mockAvailabilityRepo.On("GetBySlotID", ctx, slotID).Return(&slot, nil)

	err := suite.service.BookSlot(ctx, slotID)

	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "slot already booked")

	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestBookSlot_AtomicError() {
	ctx := context.Background()
	slotID := "slot-123"
	slot := createTestSlot(slotID, "trainer-123", 1, "09:00", "17:00")

	suite.mockAvailabilityRepo.On("GetBySlotID", ctx, slotID).Return(&slot, nil)
	suite.mockAvailabilityRepo.On("BookSlotAtomic", ctx, slotID).Return(errors.New("concurrent modification"))

	err := suite.service.BookSlot(ctx, slotID)

	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "concurrent modification")

	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestClearBookedSlots_Success() {
	ctx := context.Background()
	trainerID := "trainer-123"

	oldSlot := createTestSlot("slot-1", trainerID, 1, "09:00", "17:00")
	oldSlot.IsBooked = true
	oldSlot.CreatedAt = time.Now().AddDate(0, 0, -10)

	newSlot := createTestSlot("slot-2", trainerID, 2, "10:00", "14:00")
	newSlot.IsBooked = true
	newSlot.CreatedAt = time.Now()

	allSlots := []models.TrainerAvailability{oldSlot, newSlot}

	suite.mockAvailabilityRepo.On("GetByTrainerID", ctx, trainerID).Return(allSlots, nil)
	suite.mockAvailabilityRepo.On("DeleteAvailability", ctx, "slot-1").Return(nil)

	err := suite.service.ClearBookedSlots(ctx, trainerID, 7)

	assert.NoError(suite.T(), err)
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestClearBookedSlots_NoOldBookedSlots() {
	ctx := context.Background()
	trainerID := "trainer-123"

	recentSlot := createTestSlot("slot-1", trainerID, 1, "09:00", "17:00")
	recentSlot.IsBooked = true
	recentSlot.CreatedAt = time.Now()

	slots := []models.TrainerAvailability{recentSlot}

	suite.mockAvailabilityRepo.On("GetByTrainerID", ctx, trainerID).Return(slots, nil)

	err := suite.service.ClearBookedSlots(ctx, trainerID, 7)

	assert.NoError(suite.T(), err)
	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

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
	assert.Contains(suite.T(), err.Error(), "database error")

	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func (suite *AvailabilityServiceTestSuite) TestCleanupExpiredSlots_Success() {
	ctx := context.Background()
	retentionDays := 30

	suite.mockAvailabilityRepo.On("CleanupExpiredSlots", ctx, retentionDays).Return(nil)

	err := suite.service.CleanupExpiredSlots(ctx, retentionDays)

	assert.NoError(suite.T(), err)

	suite.mockAvailabilityRepo.AssertExpectations(suite.T())
}

func TestAvailabilityServiceSuite(t *testing.T) {
	suite.Run(t, new(AvailabilityServiceTestSuite))
}
