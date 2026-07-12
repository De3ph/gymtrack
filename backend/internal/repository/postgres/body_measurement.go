package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresBodyMeasurementRepository implements BodyMeasurementRepository using PostgreSQL.
type PostgresBodyMeasurementRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresBodyMeasurementRepository creates a new PostgreSQL-backed body measurement repository.
func NewPostgresBodyMeasurementRepository(pool *pgxpool.Pool) *PostgresBodyMeasurementRepository {
	return &PostgresBodyMeasurementRepository{pool: pool}
}

func (r *PostgresBodyMeasurementRepository) Create(ctx context.Context, m *models.BodyMeasurement) error {
	now := time.Now()
	m.CreatedAt = now
	m.UpdatedAt = now

	partsJSON, err := MarshalToJSONB(m.Parts)
	if err != nil {
		return fmt.Errorf("failed to marshal parts: %w", err)
	}

	query := `INSERT INTO body_measurements (athlete_id, date, weight, weight_unit, body_fat_pct, parts, notes, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`
	var notes *string
	if m.Notes != "" {
		notes = &m.Notes
	}
	var bfPct *float64
	if m.BodyFatPct > 0 {
		bfPct = &m.BodyFatPct
	}
	err = r.pool.QueryRow(ctx, query,
		m.AthleteID, m.Date, m.Weight, string(m.WeightUnit), bfPct, partsJSON, notes, m.CreatedAt, m.UpdatedAt,
	).Scan(&m.MeasurementID)
	if err != nil {
		return fmt.Errorf("failed to create body measurement: %w", err)
	}
	m.Type = "body_measurement"
	return nil
}

func (r *PostgresBodyMeasurementRepository) scanOne(row pgx.Row) (*models.BodyMeasurement, error) {
	m := &models.BodyMeasurement{}
	var partsRaw []byte
	var notes *string
	var bfPct *float64
	err := row.Scan(
		&m.MeasurementID, &m.AthleteID, &m.Date, &m.Weight, &m.WeightUnit, &bfPct, &partsRaw, &notes, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to scan body measurement: %w", err)
	}
	if bfPct != nil {
		m.BodyFatPct = *bfPct
	}
	if notes != nil {
		m.Notes = *notes
	}
	if err := UnmarshalFromJSONB(partsRaw, &m.Parts); err != nil {
		return nil, fmt.Errorf("failed to unmarshal parts: %w", err)
	}
	m.Type = "body_measurement"
	return m, nil
}

const bmCols = `id, athlete_id, date, weight, weight_unit, body_fat_pct, parts, notes, created_at, updated_at`

func (r *PostgresBodyMeasurementRepository) GetByID(ctx context.Context, id int) (*models.BodyMeasurement, error) {
	return r.scanOne(r.pool.QueryRow(ctx, `SELECT `+bmCols+` FROM body_measurements WHERE id = $1`, id))
}

func (r *PostgresBodyMeasurementRepository) GetByAthleteID(ctx context.Context, athleteID int, limit, offset int) ([]*models.BodyMeasurement, error) {
	query := `SELECT ` + bmCols + ` FROM body_measurements WHERE athlete_id = $1 ORDER BY date DESC LIMIT $2 OFFSET $3`
	rows, err := r.pool.Query(ctx, query, athleteID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query body measurements: %w", err)
	}
	defer rows.Close()
	return r.scanRows(rows)
}

func (r *PostgresBodyMeasurementRepository) GetByAthleteDateRange(ctx context.Context, athleteID int, startDate, endDate time.Time) ([]*models.BodyMeasurement, error) {
	query := `SELECT ` + bmCols + ` FROM body_measurements WHERE athlete_id = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC`
	rows, err := r.pool.Query(ctx, query, athleteID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query body measurements by date range: %w", err)
	}
	defer rows.Close()
	return r.scanRows(rows)
}

func (r *PostgresBodyMeasurementRepository) GetLatestByAthleteID(ctx context.Context, athleteID int) (*models.BodyMeasurement, error) {
	query := `SELECT ` + bmCols + ` FROM body_measurements WHERE athlete_id = $1 ORDER BY date DESC LIMIT 1`
	m, err := r.scanOne(r.pool.QueryRow(ctx, query, athleteID))
	if errors.Is(err, domainerrors.ErrNotFound) {
		return nil, nil
	}
	return m, err
}

func (r *PostgresBodyMeasurementRepository) Update(ctx context.Context, m *models.BodyMeasurement) error {
	m.UpdatedAt = time.Now()
	partsJSON, err := MarshalToJSONB(m.Parts)
	if err != nil {
		return fmt.Errorf("failed to marshal parts: %w", err)
	}
	var notes *string
	if m.Notes != "" {
		notes = &m.Notes
	}
	var bfPct *float64
	if m.BodyFatPct > 0 {
		bfPct = &m.BodyFatPct
	}
	query := `UPDATE body_measurements SET athlete_id=$1, date=$2, weight=$3, weight_unit=$4, body_fat_pct=$5, parts=$6, notes=$7, updated_at=$8 WHERE id=$9`
	tag, err := r.pool.Exec(ctx, query,
		m.AthleteID, m.Date, m.Weight, string(m.WeightUnit), bfPct, partsJSON, notes, m.UpdatedAt, m.MeasurementID,
	)
	if err != nil {
		return fmt.Errorf("failed to update body measurement: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *PostgresBodyMeasurementRepository) Delete(ctx context.Context, id int) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM body_measurements WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete body measurement: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *PostgresBodyMeasurementRepository) scanRows(rows pgx.Rows) ([]*models.BodyMeasurement, error) {
	var results []*models.BodyMeasurement
	for rows.Next() {
		m := &models.BodyMeasurement{}
		var partsRaw []byte
		var notes *string
		var bfPct *float64
		if err := rows.Scan(&m.MeasurementID, &m.AthleteID, &m.Date, &m.Weight, &m.WeightUnit, &bfPct, &partsRaw, &notes, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan body measurement row: %w", err)
		}
		if bfPct != nil {
			m.BodyFatPct = *bfPct
		}
		if notes != nil {
			m.Notes = *notes
		}
		if err := UnmarshalFromJSONB(partsRaw, &m.Parts); err != nil {
			return nil, fmt.Errorf("failed to unmarshal parts: %w", err)
		}
		m.Type = "body_measurement"
		results = append(results, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return results, nil
}

// Compile-time interface compliance check.
var _ interface {
	Create(ctx context.Context, measurement *models.BodyMeasurement) error
	GetByID(ctx context.Context, measurementID int) (*models.BodyMeasurement, error)
	GetByAthleteID(ctx context.Context, athleteID int, limit, offset int) ([]*models.BodyMeasurement, error)
	GetByAthleteDateRange(ctx context.Context, athleteID int, startDate, endDate time.Time) ([]*models.BodyMeasurement, error)
	GetLatestByAthleteID(ctx context.Context, athleteID int) (*models.BodyMeasurement, error)
	Update(ctx context.Context, measurement *models.BodyMeasurement) error
	Delete(ctx context.Context, measurementID int) error
} = (*PostgresBodyMeasurementRepository)(nil)
