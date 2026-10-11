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

// PostgresAvailabilityRepository implements the AvailabilityRepository interface using PostgreSQL.
type PostgresAvailabilityRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresAvailabilityRepository creates a new PostgreSQL-backed availability repository.
func NewPostgresAvailabilityRepository(pool *pgxpool.Pool) *PostgresAvailabilityRepository {
	return &PostgresAvailabilityRepository{pool: pool}
}

// clockLayout is the wire format for availability times. It matches the
// documented contract on models.TrainerAvailability ("HH:MM", 24-hour).
const clockLayout = "15:04"

// formatClock renders a SQL TIME value as HH:MM.
//
// PostgreSQL TIME carries no date component, so pgx materialises it into a
// time.Time anchored to year 0. The value must be formatted explicitly rather
// than left to the driver's default text rendering, which is the full
// "09:00:00.000000" — a different string shape from what the frontend sends
// and what models.TrainerAvailability documents.
func formatClock(t time.Time) string {
	return t.Format(clockLayout)
}

func (r *PostgresAvailabilityRepository) GetByTrainerID(ctx context.Context, trainerID int) ([]models.TrainerAvailability, error) {
	rows, err := r.pool.Query(ctx,
		"SELECT id, trainer_id, day_of_week, start_time, end_time, is_booked, created_at, updated_at FROM trainer_availabilities WHERE trainer_id = $1",
		trainerID)
	if err != nil {
		return nil, fmt.Errorf("failed to query availability: %w", err)
	}
	defer rows.Close()

	slots := make([]models.TrainerAvailability, 0)
	for rows.Next() {
		slot, err := scanAvailability(rows)
		if err != nil {
			return nil, err
		}
		slots = append(slots, slot)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return slots, nil
}

func (r *PostgresAvailabilityRepository) GetBySlotID(ctx context.Context, slotID int) (*models.TrainerAvailability, error) {
	row := r.pool.QueryRow(ctx,
		"SELECT id, trainer_id, day_of_week, start_time, end_time, is_booked, created_at, updated_at FROM trainer_availabilities WHERE id = $1",
		slotID)

	var startTime, endTime time.Time
	var slot models.TrainerAvailability
	err := row.Scan(&slot.AvailabilityID, &slot.TrainerID, &slot.DayOfWeek, &startTime, &endTime, &slot.IsBooked, &slot.CreatedAt, &slot.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get availability slot: %w", err)
	}
	slot.StartTime = formatClock(startTime)
	slot.EndTime = formatClock(endTime)

	return &slot, nil
}

func (r *PostgresAvailabilityRepository) UpsertAvailability(ctx context.Context, slot *models.TrainerAvailability) error {
	if slot.CreatedAt.IsZero() {
		slot.CreatedAt = time.Now()
	}
	slot.UpdatedAt = time.Now()

	if slot.AvailabilityID == 0 {
		// INSERT new
		err := r.pool.QueryRow(ctx,
			`INSERT INTO trainer_availabilities (trainer_id, day_of_week, start_time, end_time, is_booked, created_at, updated_at)
			 VALUES ($1, $2, $3::time, $4::time, $5, $6, $7)
			 RETURNING id`,
			slot.TrainerID, slot.DayOfWeek, slot.StartTime, slot.EndTime, slot.IsBooked, slot.CreatedAt, slot.UpdatedAt,
		).Scan(&slot.AvailabilityID)
		if err != nil {
			return mapWriteError(err, "failed to insert availability")
		}
	} else {
		// UPDATE existing
		tag, err := r.pool.Exec(ctx,
			`UPDATE trainer_availabilities
			 SET trainer_id = $1, day_of_week = $2, start_time = $3::time, end_time = $4::time, is_booked = $5, updated_at = $6
			 WHERE id = $7`,
			slot.TrainerID, slot.DayOfWeek, slot.StartTime, slot.EndTime, slot.IsBooked, slot.UpdatedAt, slot.AvailabilityID,
		)
		if err != nil {
			return mapWriteError(err, "failed to update availability")
		}
		if tag.RowsAffected() == 0 {
			return domainerrors.ErrNotFound
		}
	}

	return nil
}

func (r *PostgresAvailabilityRepository) DeleteAvailability(ctx context.Context, trainerID int, slotID int) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM trainer_availabilities WHERE id = $1 AND trainer_id = $2", slotID, trainerID)
	if err != nil {
		return mapWriteError(err, "failed to delete availability")
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *PostgresAvailabilityRepository) GetAvailableSlots(ctx context.Context, trainerID int, dayOfWeek int) ([]models.TrainerAvailability, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, trainer_id, day_of_week, start_time, end_time, is_booked, created_at, updated_at
		 FROM trainer_availabilities
		 WHERE trainer_id = $1 AND day_of_week = $2 AND is_booked = false`,
		trainerID, dayOfWeek)
	if err != nil {
		return nil, fmt.Errorf("failed to query available slots: %w", err)
	}
	defer rows.Close()

	slots := make([]models.TrainerAvailability, 0)
	for rows.Next() {
		slot, err := scanAvailability(rows)
		if err != nil {
			return nil, err
		}
		slots = append(slots, slot)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return slots, nil
}

func (r *PostgresAvailabilityRepository) BookSlotAtomic(ctx context.Context, slotID int) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE trainer_availabilities
		 SET is_booked = true, updated_at = NOW()
		 WHERE id = $1 AND is_booked = false`,
		slotID)
	if err != nil {
		return fmt.Errorf("failed to book slot: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("slot %d already booked or not found", slotID)
	}
	return nil
}

func (r *PostgresAvailabilityRepository) CleanupExpiredSlots(ctx context.Context, retentionDays int) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM trainer_availabilities
		 WHERE created_at < NOW() - make_interval(days => $1)
		   AND is_booked = false`,
		retentionDays)
	if err != nil {
		return fmt.Errorf("failed to cleanup expired slots: %w", err)
	}
	return nil
}

// scanAvailability scans a row into a TrainerAvailability model.
func scanAvailability(rows pgx.Rows) (models.TrainerAvailability, error) {
	var slot models.TrainerAvailability
	var startTime, endTime time.Time
	err := rows.Scan(&slot.AvailabilityID, &slot.TrainerID, &slot.DayOfWeek, &startTime, &endTime, &slot.IsBooked, &slot.CreatedAt, &slot.UpdatedAt)
	if err != nil {
		return slot, fmt.Errorf("failed to scan availability: %w", err)
	}
	slot.StartTime = formatClock(startTime)
	slot.EndTime = formatClock(endTime)
	return slot, nil
}
