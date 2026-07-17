package repositories

import (
	"context"

	"gymtrack-backend/internal/domain/models"
)

// EquipmentRepository defines data access for equipment definitions.
type EquipmentRepository interface {
	GetAllEquipment(ctx context.Context) ([]models.EquipmentDefinition, error)
	GetEquipmentByID(ctx context.Context, id int) (*models.EquipmentDefinition, error)
}
