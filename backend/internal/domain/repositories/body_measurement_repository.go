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
	Create(ctx context.Context, measurement *models.BodyMeasurement) error
	GetByID(ctx context.Context, measurementID string) (*models.BodyMeasurement, error)
	GetByAthleteID(ctx context.Context, athleteID string, limit, offset int) ([]*models.BodyMeasurement, error)
	GetByAthleteDateRange(ctx context.Context, athleteID string, startDate, endDate time.Time) ([]*models.BodyMeasurement, error)
	GetLatestByAthleteID(ctx context.Context, athleteID string) (*models.BodyMeasurement, error)
	Update(ctx context.Context, measurement *models.BodyMeasurement) error
	Delete(ctx context.Context, measurementID string) error
}

type CouchbaseBodyMeasurementRepository struct {
	cluster *gocb.Cluster
	bucket  *gocb.Bucket
}

func NewBodyMeasurementRepository(cluster *gocb.Cluster, bucket *gocb.Bucket) *CouchbaseBodyMeasurementRepository {
	return &CouchbaseBodyMeasurementRepository{
		cluster: cluster,
		bucket:  bucket,
	}
}

// Create inserts a new body measurement into the database
func (r *CouchbaseBodyMeasurementRepository) Create(ctx context.Context, measurement *models.BodyMeasurement) error {
	collection := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionBodyMeasurements)
	_, err := collection.Insert(measurement.MeasurementID, measurement, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create body measurement: %w", err)
	}

	return nil
}

// GetByID retrieves a body measurement by its ID
func (r *CouchbaseBodyMeasurementRepository) GetByID(ctx context.Context, measurementID string) (*models.BodyMeasurement, error) {
	collection := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionBodyMeasurements)
	result, err := collection.Get(measurementID, &gocb.GetOptions{
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
func (r *CouchbaseBodyMeasurementRepository) GetByAthleteID(ctx context.Context, athleteID string, limit, offset int) ([]*models.BodyMeasurement, error) {
	query := fmt.Sprintf("SELECT m.* FROM `%s`.`%s`.`%s` m WHERE m.type = 'body_measurement' AND m.athleteId = $1 ORDER BY m.date DESC LIMIT $2 OFFSET $3",
		r.bucket.Name(), config.ScopeDefault, config.CollectionBodyMeasurements)

	result, err := r.cluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID, limit, offset},
		Context:              ctx,
		Timeout:              config.DefaultQueryTimeout,
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
func (r *CouchbaseBodyMeasurementRepository) GetByAthleteDateRange(ctx context.Context, athleteID string, startDate, endDate time.Time) ([]*models.BodyMeasurement, error) {
	query := fmt.Sprintf("SELECT m.* FROM `%s`.`%s`.`%s` m WHERE m.type = 'body_measurement' AND m.athleteId = $1 AND m.date >= $2 AND m.date <= $3 ORDER BY m.date DESC",
		r.bucket.Name(), config.ScopeDefault, config.CollectionBodyMeasurements)

	result, err := r.cluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID, startDate.Format(time.RFC3339), endDate.Format(time.RFC3339)},
		Context:              ctx,
		Timeout:              config.DefaultQueryTimeout,
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
func (r *CouchbaseBodyMeasurementRepository) GetLatestByAthleteID(ctx context.Context, athleteID string) (*models.BodyMeasurement, error) {
	query := fmt.Sprintf("SELECT m.* FROM `%s`.`%s`.`%s` m WHERE m.type = 'body_measurement' AND m.athleteId = $1 ORDER BY m.date DESC LIMIT 1",
		r.bucket.Name(), config.ScopeDefault, config.CollectionBodyMeasurements)

	result, err := r.cluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID},
		Context:              ctx,
		Timeout:              config.DefaultQueryTimeout,
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
func (r *CouchbaseBodyMeasurementRepository) Update(ctx context.Context, measurement *models.BodyMeasurement) error {
	measurement.UpdatedAt = time.Now()

	collection := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionBodyMeasurements)
	_, err := collection.Replace(measurement.MeasurementID, measurement, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to update body measurement: %w", err)
	}

	return nil
}

// Delete removes a body measurement from the database
func (r *CouchbaseBodyMeasurementRepository) Delete(ctx context.Context, measurementID string) error {
	collection := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionBodyMeasurements)
	_, err := collection.Remove(measurementID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete body measurement: %w", err)
	}

	return nil
}
