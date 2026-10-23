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

// mealTotals_cte reduces each meal to one row of item totals. The aggregate
// over the lateral join emits exactly one row per meal, so meals with no items
// (or only zero-valued items) still appear with zero totals and keep counting
// toward the per-meal averages, matching the legacy Go arithmetic:
//
//	value counts only when strictly positive; macros count only when any of
//	them is positive (see services/client_stats_service.go history).
const mealTotalsCTE = `
	WITH meal_totals AS (
		SELECT
			m.id,
			m.date,
			SUM(CASE WHEN COALESCE((i.item ->> 'calories')::double precision, 0) > 0
				THEN COALESCE((i.item ->> 'calories')::double precision, 0) ELSE 0 END) AS calories,
			SUM(CASE WHEN COALESCE((i.item -> 'macros' ->> 'protein')::double precision, 0) > 0
				OR COALESCE((i.item -> 'macros' ->> 'carbs')::double precision, 0) > 0
				OR COALESCE((i.item -> 'macros' ->> 'fats')::double precision, 0) > 0
				THEN COALESCE((i.item -> 'macros' ->> 'protein')::double precision, 0) ELSE 0 END) AS protein,
			SUM(CASE WHEN COALESCE((i.item -> 'macros' ->> 'protein')::double precision, 0) > 0
				OR COALESCE((i.item -> 'macros' ->> 'carbs')::double precision, 0) > 0
				OR COALESCE((i.item -> 'macros' ->> 'fats')::double precision, 0) > 0
				THEN COALESCE((i.item -> 'macros' ->> 'carbs')::double precision, 0) ELSE 0 END) AS carbs,
			SUM(CASE WHEN COALESCE((i.item -> 'macros' ->> 'protein')::double precision, 0) > 0
				OR COALESCE((i.item -> 'macros' ->> 'carbs')::double precision, 0) > 0
				OR COALESCE((i.item -> 'macros' ->> 'fats')::double precision, 0) > 0
				THEN COALESCE((i.item -> 'macros' ->> 'fats')::double precision, 0) ELSE 0 END) AS fats
		FROM meals m
		CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m.items, '[]'::jsonb)) AS i(item)
		WHERE m.athlete_id = $1
		GROUP BY m.id, m.date
	)`

// NutritionAverages aggregates the athlete's nutrition averages in SQL: item
// totals divided by the meal count, as the legacy Go aggregation divided them.
func (r *PostgresMealRepository) NutritionAverages(ctx context.Context, athleteID int) (*repositories.NutritionAveragesRow, error) {
	query := mealTotalsCTE + `
		SELECT COUNT(*)::int AS meals,
		       COALESCE(SUM(calories) / COUNT(*), 0) AS calories,
		       COALESCE(SUM(protein) / COUNT(*), 0) AS protein,
		       COALESCE(SUM(carbs) / COUNT(*), 0) AS carbs,
		       COALESCE(SUM(fats) / COUNT(*), 0) AS fats
		FROM meal_totals`

	row := &repositories.NutritionAveragesRow{}
	err := r.pool.QueryRow(ctx, query, athleteID).Scan(
		&row.Meals, &row.Calories, &row.Protein, &row.Carbs, &row.Fats,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate meal nutrition: %w", err)
	}
	return row, nil
}

// WeeklyNutrition aggregates per-week nutrition in SQL, ordered by ISO week key
// ascending so the response body is deterministic.
func (r *PostgresMealRepository) WeeklyNutrition(ctx context.Context, athleteID int) ([]repositories.WeeklyNutritionRow, error) {
	query := mealTotalsCTE + `
	 SELECT to_char(date, 'IYYY-"W"IW') AS week,
	        SUM(calories) / COUNT(*) AS calories,
	        SUM(protein) / COUNT(*) AS protein,
	        SUM(carbs) / COUNT(*) AS carbs,
	        SUM(fats) / COUNT(*) AS fats
	 FROM meal_totals
	 GROUP BY 1
	 ORDER BY 1 ASC`

	rows, err := r.pool.Query(ctx, query, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate weekly nutrition: %w", err)
	}
	defer rows.Close()

	weeks := make([]repositories.WeeklyNutritionRow, 0)
	for rows.Next() {
		row := repositories.WeeklyNutritionRow{}
		if err := rows.Scan(&row.Week, &row.Calories, &row.Protein, &row.Carbs, &row.Fats); err != nil {
			return nil, fmt.Errorf("failed to scan weekly nutrition row: %w", err)
		}
		weeks = append(weeks, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return weeks, nil
}

// MealTypeCounts counts meals per type, ordered by type ascending.
func (r *PostgresMealRepository) MealTypeCounts(ctx context.Context, athleteID int) ([]repositories.MealTypeCountRow, error) {
	query := `
		SELECT meal_type, COUNT(*)::int
		FROM meals
		WHERE athlete_id = $1
		GROUP BY 1
		ORDER BY 1 ASC`

	rows, err := r.pool.Query(ctx, query, athleteID)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate meal types: %w", err)
	}
	defer rows.Close()

	counts := make([]repositories.MealTypeCountRow, 0)
	for rows.Next() {
		row := repositories.MealTypeCountRow{}
		if err := rows.Scan(&row.MealType, &row.Count); err != nil {
			return nil, fmt.Errorf("failed to scan meal type row: %w", err)
		}
		counts = append(counts, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return counts, nil
}

// CountByAthleteSince counts meals strictly after "since", matching the legacy
// weekStart comparisons in Go (date.After(weekStart)).
func (r *PostgresMealRepository) CountByAthleteSince(ctx context.Context, athleteID int, since time.Time) (int, error) {
	var count int
	if err := r.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM meals WHERE athlete_id = $1 AND date > $2",
		athleteID, since,
	).Scan(&count); err != nil {
		return 0, fmt.Errorf("failed to count meals since: %w", err)
	}
	return count, nil
}

// Compile-time interface compliance check.
var _ repositories.MealRepository = (*PostgresMealRepository)(nil)
