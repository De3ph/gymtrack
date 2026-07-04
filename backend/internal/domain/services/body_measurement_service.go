package services

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/go-playground/validator/v10"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

type BodyMeasurementService struct {
	measurementRepo  repositories.BodyMeasurementRepository
	relationshipRepo repositories.RelationshipRepository
	userRepo         repositories.UserRepository
	validator        *validator.Validate
}

func NewBodyMeasurementService(
	measurementRepo repositories.BodyMeasurementRepository,
	relationshipRepo repositories.RelationshipRepository,
	userRepo repositories.UserRepository,
) *BodyMeasurementService {
	return &BodyMeasurementService{
		measurementRepo:  measurementRepo,
		relationshipRepo: relationshipRepo,
		userRepo:         userRepo,
		validator:        validator.New(),
	}
}

type CreateBodyMeasurementInput struct {
	AthleteID  string
	Date       time.Time
	Weight     float64
	WeightUnit models.WeightUnit
	BodyFatPct float64
	Parts      map[string]models.BodyMeasurementPart
	Notes      string
	UserRole   models.UserRole
}

func (s *BodyMeasurementService) CreateBodyMeasurement(ctx context.Context, input CreateBodyMeasurementInput) (*models.BodyMeasurement, error) {
	if input.UserRole != models.RoleAthlete {
		return nil, NewServiceError("Only athletes can log body measurements", "FORBIDDEN")
	}

	if err := s.validator.Struct(input); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	if input.Weight <= 0 {
		return nil, NewServiceError("Weight must be greater than 0", "VALIDATION")
	}

	measurement := models.NewBodyMeasurement(
		input.AthleteID,
		input.Date,
		input.Weight,
		input.WeightUnit,
		input.BodyFatPct,
		input.Parts,
		input.Notes,
	)

	if err := s.measurementRepo.Create(ctx, measurement); err != nil {
		return nil, fmt.Errorf("failed to create body measurement: %w", err)
	}

	return measurement, nil
}

type GetBodyMeasurementInput struct {
	MeasurementID string
	RequesterID   string
	RequesterRole models.UserRole
}

func (s *BodyMeasurementService) GetBodyMeasurement(ctx context.Context, input GetBodyMeasurementInput) (*models.BodyMeasurement, error) {
	measurement, err := s.measurementRepo.GetByID(ctx, input.MeasurementID)
	if err != nil {
		return nil, ErrBodyMeasurementNotFound
	}

	if input.RequesterRole == models.RoleAthlete {
		if measurement.AthleteID != input.RequesterID {
			return nil, NewServiceError("Access denied", "FORBIDDEN")
		}
	} else if input.RequesterRole == models.RoleTrainer {
		hasActive, err := s.relationshipRepo.HasActiveRelationship(ctx, input.RequesterID, measurement.AthleteID)
		if err != nil {
			return nil, fmt.Errorf("failed to verify relationship: %w", err)
		}
		if !hasActive {
			return nil, NewServiceError("You don't have an active relationship with this athlete", "FORBIDDEN")
		}
	}

	return measurement, nil
}

type GetBodyMeasurementsInput struct {
	AthleteID string
	UserRole  models.UserRole
	Limit     int
	Offset    int
	StartDate *time.Time
	EndDate   *time.Time
}

type GetBodyMeasurementsOutput struct {
	Measurements []*models.BodyMeasurement
	Count        int
}

func (s *BodyMeasurementService) GetBodyMeasurements(ctx context.Context, input GetBodyMeasurementsInput) (*GetBodyMeasurementsOutput, error) {
	if input.UserRole != models.RoleAthlete {
		return nil, NewServiceError("Only athletes can list their body measurements", "FORBIDDEN")
	}

	var measurements []*models.BodyMeasurement
	var err error

	if input.StartDate != nil && input.EndDate != nil {
		measurements, err = s.measurementRepo.GetByAthleteDateRange(ctx, input.AthleteID, *input.StartDate, *input.EndDate)
	} else {
		measurements, err = s.measurementRepo.GetByAthleteID(ctx, input.AthleteID, input.Limit, input.Offset)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve body measurements: %w", err)
	}

	return &GetBodyMeasurementsOutput{
		Measurements: measurements,
		Count:        len(measurements),
	}, nil
}

type UpdateBodyMeasurementInput struct {
	MeasurementID string
	AthleteID     string
	Date          time.Time
	Weight        float64
	WeightUnit    models.WeightUnit
	BodyFatPct    float64
	Parts         map[string]models.BodyMeasurementPart
	Notes         string
}

func (s *BodyMeasurementService) UpdateBodyMeasurement(ctx context.Context, input UpdateBodyMeasurementInput) (*models.BodyMeasurement, error) {
	measurement, err := s.measurementRepo.GetByID(ctx, input.MeasurementID)
	if err != nil {
		return nil, ErrBodyMeasurementNotFound
	}

	if measurement.AthleteID != input.AthleteID {
		return nil, NewServiceError("Access denied", "FORBIDDEN")
	}

	if !measurement.CanEdit() {
		return nil, NewServiceError("Cannot edit body measurement after 24 hours", "FORBIDDEN")
	}

	if input.Weight <= 0 {
		return nil, NewServiceError("Weight must be greater than 0", "VALIDATION")
	}

	measurement.Date = input.Date
	measurement.Weight = input.Weight
	measurement.WeightUnit = input.WeightUnit
	measurement.BodyFatPct = input.BodyFatPct
	measurement.Parts = input.Parts
	measurement.Notes = input.Notes

	if err := s.measurementRepo.Update(ctx, measurement); err != nil {
		return nil, fmt.Errorf("failed to update body measurement: %w", err)
	}

	return measurement, nil
}

func (s *BodyMeasurementService) DeleteBodyMeasurement(ctx context.Context, measurementID, athleteID string) error {
	measurement, err := s.measurementRepo.GetByID(ctx, measurementID)
	if err != nil {
		return ErrBodyMeasurementNotFound
	}

	if measurement.AthleteID != athleteID {
		return NewServiceError("Access denied", "FORBIDDEN")
	}

	if !measurement.CanEdit() {
		return NewServiceError("Cannot delete body measurement after 24 hours", "FORBIDDEN")
	}

	if err := s.measurementRepo.Delete(ctx, measurementID); err != nil {
		return fmt.Errorf("failed to delete body measurement: %w", err)
	}

	return nil
}

type GetClientBodyMeasurementsInput struct {
	TrainerID string
	ClientID  string
	Limit     int
	Offset    int
	StartDate *time.Time
	EndDate   *time.Time
}

func (s *BodyMeasurementService) GetClientBodyMeasurements(ctx context.Context, input GetClientBodyMeasurementsInput) (*GetBodyMeasurementsOutput, error) {
	hasActive, err := s.relationshipRepo.HasActiveRelationship(ctx, input.TrainerID, input.ClientID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify relationship: %w", err)
	}

	if !hasActive {
		return nil, NewServiceError("You don't have an active relationship with this client", "FORBIDDEN")
	}

	var measurements []*models.BodyMeasurement
	if input.StartDate != nil && input.EndDate != nil {
		measurements, err = s.measurementRepo.GetByAthleteDateRange(ctx, input.ClientID, *input.StartDate, *input.EndDate)
	} else {
		measurements, err = s.measurementRepo.GetByAthleteID(ctx, input.ClientID, input.Limit, input.Offset)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve client body measurements: %w", err)
	}

	return &GetBodyMeasurementsOutput{
		Measurements: measurements,
		Count:        len(measurements),
	}, nil
}

type GetLatestBodyMeasurementInput struct {
	AthleteID     string
	RequesterID   string
	RequesterRole models.UserRole
}

func (s *BodyMeasurementService) GetLatestBodyMeasurement(ctx context.Context, input GetLatestBodyMeasurementInput) (*models.BodyMeasurement, error) {
	if input.RequesterRole == models.RoleAthlete {
		if input.AthleteID != input.RequesterID {
			return nil, NewServiceError("Access denied", "FORBIDDEN")
		}
	} else if input.RequesterRole == models.RoleTrainer {
		hasActive, err := s.relationshipRepo.HasActiveRelationship(ctx, input.RequesterID, input.AthleteID)
		if err != nil {
			return nil, fmt.Errorf("failed to verify relationship: %w", err)
		}
		if !hasActive {
			return nil, NewServiceError("You don't have an active relationship with this athlete", "FORBIDDEN")
		}
	}

	measurement, err := s.measurementRepo.GetLatestByAthleteID(ctx, input.AthleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve latest body measurement: %w", err)
	}
	return measurement, nil
}

func ParseBodyMeasurementQueryParams(c interface {
	DefaultQuery(key, def string) string
	Query(key string) string
}) (limit, offset int, startDate, endDate *time.Time, err error) {
	limit, _ = strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ = strconv.Atoi(c.DefaultQuery("offset", "0"))

	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")

	if startDateStr != "" && endDateStr != "" {
		start, err1 := time.Parse(time.RFC3339, startDateStr)
		end, err2 := time.Parse(time.RFC3339, endDateStr)
		if err1 != nil || err2 != nil {
			return 0, 0, nil, nil, NewServiceError("Invalid date format. Use RFC3339 format", "INVALID_DATE")
		}
		startDate = &start
		endDate = &end
	}

	return limit, offset, startDate, endDate, nil
}
