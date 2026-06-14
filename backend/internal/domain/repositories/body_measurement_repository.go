package repositories

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type BodyMeasurementRepository interface {
	Create(measurement *models.BodyMeasurement) error
	GetByID(measurementID string) (*models.BodyMeasurement, error)
	GetByAthleteID(athleteID string, limit, offset int) ([]*models.BodyMeasurement, error)
	GetByAthleteDateRange(athleteID string, startDate, endDate time.Time) ([]*models.BodyMeasurement, error)
	GetLatestByAthleteID(athleteID string) (*models.BodyMeasurement, error)
	Update(measurement *models.BodyMeasurement) error
	Delete(measurementID string) error
}

type CouchbaseBodyMeasurementRepository struct {
	collection *gocb.Collection
}

func NewBodyMeasurementRepository(collection *gocb.Collection) *CouchbaseBodyMeasurementRepository {
	return &CouchbaseBodyMeasurementRepository{
		collection: collection,
	}
}

// Create inserts a new body measurement into the database
func (r *CouchbaseBodyMeasurementRepository) Create(measurement *models.BodyMeasurement) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.Insert(measurement.MeasurementID, measurement, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create body measurement: %w", err)
	}

	return nil
}

// GetByID retrieves a body measurement by its ID
func (r *CouchbaseBodyMeasurementRepository) GetByID(measurementID string) (*models.BodyMeasurement, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := r.collection.Get(measurementID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get body measurement: %w", err)
	}

	var measurement models.BodyMeasurement
	if err := result.Content(&measurement); err != nil {
		return nil, fmt.Errorf("failed to decode body measurement: %w", err)
	}

	return &measurement, nil
}

// GetByAthleteID retrieves body measurements for a specific athlete with pagination
func (r *CouchbaseBodyMeasurementRepository) GetByAthleteID(athleteID string, limit, offset int) ([]*models.BodyMeasurement, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT m.* FROM `%s`.`%s`.`%s` m WHERE m.type = 'body_measurement' AND m.athleteId = $1 ORDER BY m.date DESC LIMIT $2 OFFSET $3",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionBodyMeasurements)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID, limit, offset},
		Context:              ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query body measurements: %w", err)
	}
	defer result.Close()

	var measurements []*models.BodyMeasurement
	for result.Next() {
		var measurement models.BodyMeasurement
		if err := result.Row(&measurement); err != nil {
			return nil, fmt.Errorf("failed to decode body measurement row: %w", err)
		}
		measurements = append(measurements, &measurement)
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("query iteration error: %w", err)
	}

	return measurements, nil
}

// GetByAthleteDateRange retrieves body measurements for a specific athlete within a date range
func (r *CouchbaseBodyMeasurementRepository) GetByAthleteDateRange(athleteID string, startDate, endDate time.Time) ([]*models.BodyMeasurement, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT m.* FROM `%s`.`%s`.`%s` m WHERE m.type = 'body_measurement' AND m.athleteId = $1 AND m.date >= $2 AND m.date <= $3 ORDER BY m.date DESC",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionBodyMeasurements)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID, startDate.Format(time.RFC3339), endDate.Format(time.RFC3339)},
		Context:              ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query body measurements by date range: %w", err)
	}
	defer result.Close()

	var measurements []*models.BodyMeasurement
	for result.Next() {
		var measurement models.BodyMeasurement
		if err := result.Row(&measurement); err != nil {
			return nil, fmt.Errorf("failed to decode body measurement row: %w", err)
		}
		measurements = append(measurements, &measurement)
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("query iteration error: %w", err)
	}

	return measurements, nil
}

// GetLatestByAthleteID returns the most recent body measurement for an athlete (by date).
func (r *CouchbaseBodyMeasurementRepository) GetLatestByAthleteID(athleteID string) (*models.BodyMeasurement, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT m.* FROM `%s`.`%s`.`%s` m WHERE m.type = 'body_measurement' AND m.athleteId = $1 ORDER BY m.date DESC LIMIT 1",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionBodyMeasurements)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID},
		Context:              ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query latest body measurement: %w", err)
	}
	defer result.Close()

	if result.Next() {
		var measurement models.BodyMeasurement
		if err := result.Row(&measurement); err != nil {
			return nil, fmt.Errorf("failed to decode latest body measurement: %w", err)
		}
		return &measurement, nil
	}

	return nil, nil
}

// Update updates an existing body measurement
func (r *CouchbaseBodyMeasurementRepository) Update(measurement *models.BodyMeasurement) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	measurement.UpdatedAt = time.Now()

	_, err := r.collection.Replace(measurement.MeasurementID, measurement, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to update body measurement: %w", err)
	}

	return nil
}

// Delete removes a body measurement from the database
func (r *CouchbaseBodyMeasurementRepository) Delete(measurementID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.Remove(measurementID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete body measurement: %w", err)
	}

	return nil
}
