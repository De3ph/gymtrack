package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresMealRepository implements MealRepository using PostgreSQL.
type PostgresMealRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresMealRepository creates a new PostgreSQL-backed meal repository.
func NewPostgresMealRepository(pool *pgxpool.Pool) *PostgresMealRepository {
	return &PostgresMealRepository{pool: pool}
}

func (r *PostgresMealRepository) Create(ctx context.Context, meal *models.Meal) error {
	now := time.Now()
	meal.CreatedAt = now
	meal.UpdatedAt = now

	itemsJSON, err := MarshalMealItems(meal.Items)
	if err != nil {
		return fmt.Errorf("failed to marshal meal items: %w", err)
	}

	query := `INSERT INTO meals (athlete_id, date, meal_type, items, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`
	err = r.pool.QueryRow(ctx, query,
		meal.AthleteID, meal.Date, string(meal.MealType), itemsJSON, meal.CreatedAt, meal.UpdatedAt,
	).Scan(&meal.MealID)
	if err != nil {
		return mapWriteError(err, "failed to create meal")
	}
	meal.Type = "meal"
	return nil
}

func (r *PostgresMealRepository) GetByID(ctx context.Context, mealID int) (*models.Meal, error) {
	query := `SELECT id, athlete_id, date, meal_type, items, created_at, updated_at FROM meals WHERE id = $1`
	meal := &models.Meal{}
	var itemsRaw []byte
	err := r.pool.QueryRow(ctx, query, mealID).Scan(
		&meal.MealID, &meal.AthleteID, &meal.Date, &meal.MealType, &itemsRaw, &meal.CreatedAt, &meal.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get meal: %w", err)
	}
	if err := UnmarshalMealItems(itemsRaw, &meal.Items); err != nil {
		return nil, fmt.Errorf("failed to unmarshal meal items: %w", err)
	}
	meal.Type = "meal"
	return meal, nil
}

func (r *PostgresMealRepository) GetByAthleteID(ctx context.Context, athleteID int, limit, offset int) ([]*models.Meal, error) {
	query := `SELECT id, athlete_id, date, meal_type, items, created_at, updated_at FROM meals WHERE athlete_id = $1 ORDER BY date DESC LIMIT $2 OFFSET $3`
	rows, err := r.pool.Query(ctx, query, athleteID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query meals: %w", err)
	}
	defer rows.Close()
	return r.scanRows(rows)
}

func (r *PostgresMealRepository) GetByAthleteDateRange(ctx context.Context, athleteID int, startDate, endDate time.Time) ([]*models.Meal, error) {
	query := `SELECT id, athlete_id, date, meal_type, items, created_at, updated_at FROM meals WHERE athlete_id = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC`
	rows, err := r.pool.Query(ctx, query, athleteID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query meals by date range: %w", err)
	}
	defer rows.Close()
	return r.scanRows(rows)
}

func (r *PostgresMealRepository) scanRows(rows pgx.Rows) ([]*models.Meal, error) {
	meals := make([]*models.Meal, 0)
	for rows.Next() {
		meal := &models.Meal{}
		var itemsRaw []byte
		if err := rows.Scan(&meal.MealID, &meal.AthleteID, &meal.Date, &meal.MealType, &itemsRaw, &meal.CreatedAt, &meal.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan meal row: %w", err)
		}
		if err := UnmarshalMealItems(itemsRaw, &meal.Items); err != nil {
			return nil, fmt.Errorf("failed to unmarshal meal items: %w", err)
		}
		meal.Type = "meal"
		meals = append(meals, meal)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return meals, nil
}

func (r *PostgresMealRepository) CountAll(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM meals").Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count meals: %w", err)
	}
	return count, nil
}

// Compile-time interface compliance check.
var _ repositories.MealRepository = (*PostgresMealRepository)(nil)
