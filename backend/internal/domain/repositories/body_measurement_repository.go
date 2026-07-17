package repositories

import (
	"context"
	"time"

	"gymtrack-backend/internal/domain/models"
)

// BodyMeasurementRepository defines data access for body measurements.
type BodyMeasurementRepository interface {
	Create(ctx context.Context, measurement *models.BodyMeasurement) error
	GetByID(ctx context.Context, measurementID int) (*models.BodyMeasurement, error)
	GetByAthleteID(ctx context.Context, athleteID int, limit, offset int) ([]*models.BodyMeasurement, error)
	GetByAthleteDateRange(ctx context.Context, athleteID int, startDate, endDate time.Time) ([]*models.BodyMeasurement, error)
	GetLatestByAthleteID(ctx context.Context, athleteID int) (*models.BodyMeasurement, error)
	Update(ctx context.Context, measurement *models.BodyMeasurement) error
	Delete(ctx context.Context, measurementID int) error
}
