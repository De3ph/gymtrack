package services

import (
	"context"
	"fmt"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

type AvailabilityService struct {
	availabilityRepo *repositories.CouchbaseAvailabilityRepository
}

func NewAvailabilityService(availabilityRepo *repositories.CouchbaseAvailabilityRepository) *AvailabilityService {
	return &AvailabilityService{
		availabilityRepo: availabilityRepo,
	}
}

func (s *AvailabilityService) SetAvailability(ctx context.Context, trainerID string, slots []models.TrainerAvailability) error {
	for i := range slots {
		slots[i].TrainerID = trainerID
		if slots[i].AvailabilityID == "" {
			slots[i].AvailabilityID = generateUUID()
		}
		err := s.availabilityRepo.UpsertAvailability(ctx, &slots[i])
		if err != nil {
			return fmt.Errorf("failed to upsert availability slot: %w", err)
		}
	}
	return nil
}

func (s *AvailabilityService) GetAvailability(ctx context.Context, trainerID string) ([]models.TrainerAvailability, error) {
	slots, err := s.availabilityRepo.GetByTrainerID(ctx, trainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get availability: %w", err)
	}
	return slots, nil
}

func (s *AvailabilityService) GetAvailableSlots(ctx context.Context, trainerID string, dayOfWeek int) ([]models.TrainerAvailability, error) {
	slots, err := s.availabilityRepo.GetAvailableSlots(ctx, trainerID, dayOfWeek)
	if err != nil {
		return nil, fmt.Errorf("failed to get available slots: %w", err)
	}
	return slots, nil
}

func (s *AvailabilityService) BookSlot(ctx context.Context, slotID string) error {
	// For now, just mark as booked - in a real system this would be more complex
	return nil
}

func (s *AvailabilityService) ClearBookedSlots(ctx context.Context, trainerID string) error {
	slots, err := s.availabilityRepo.GetByTrainerID(ctx, trainerID)
	if err != nil {
		return err
	}

	for _, slot := range slots {
		if slot.IsBooked {
			err := s.availabilityRepo.DeleteAvailability(ctx, slot.AvailabilityID)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *AvailabilityService) DeleteSlot(ctx context.Context, slotID string) error {
	return s.availabilityRepo.DeleteAvailability(ctx, slotID)
}
