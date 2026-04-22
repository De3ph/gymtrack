package services

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

type AvailabilityService struct {
	availabilityRepo repositories.AvailabilityRepository
}

func NewAvailabilityService(availabilityRepo repositories.AvailabilityRepository) *AvailabilityService {
	return &AvailabilityService{
		availabilityRepo: availabilityRepo,
	}
}

func (s *AvailabilityService) SetAvailability(ctx context.Context, trainerID string, slots []models.TrainerAvailability) error {
	for i := range slots {
		slots[i].TrainerID = trainerID
		if slots[i].AvailabilityID == "" {
			id, err := generateUUIDSafe(ctx)
			if err != nil {
				return fmt.Errorf("failed to generate availability UUID: %w", err)
			}
			slots[i].AvailabilityID = id
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
	slot, err := s.availabilityRepo.GetBySlotID(ctx, slotID)
	if err != nil {
		return fmt.Errorf("failed to get availability slot: %w", err)
	}
	if slot == nil {
		return fmt.Errorf("availability slot not found")
	}
	if slot.IsBooked {
		return fmt.Errorf("slot already booked")
	}

	return s.availabilityRepo.BookSlotAtomic(ctx, slotID)
}

func (s *AvailabilityService) ClearBookedSlots(ctx context.Context, trainerID string, olderThanDays int) error {
	slots, err := s.availabilityRepo.GetByTrainerID(ctx, trainerID)
	if err != nil {
		return err
	}

	cutoff := time.Now().AddDate(0, 0, -olderThanDays)
	for _, slot := range slots {
		if slot.IsBooked && slot.CreatedAt.Before(cutoff) {
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

func (s *AvailabilityService) CleanupExpiredSlots(ctx context.Context, retentionDays int) error {
	return s.availabilityRepo.CleanupExpiredSlots(ctx, retentionDays)
}
