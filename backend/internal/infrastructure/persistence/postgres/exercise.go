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

// PostgresExerciseRepository implements ExerciseRepository using PostgreSQL.
type PostgresExerciseRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresExerciseRepository creates a new PostgreSQL-backed exercise repository.
func NewPostgresExerciseRepository(pool *pgxpool.Pool) *PostgresExerciseRepository {
	return &PostgresExerciseRepository{pool: pool}
}

func (r *PostgresExerciseRepository) CreateExercise(ctx context.Context, ex *models.Exercise) error {
	ex.CreatedAt = time.Now()

	var createdBy any
	if ex.CreatedBy != 0 {
		createdBy = ex.CreatedBy
	}

	query := `INSERT INTO exercises (name, category, muscle_group_id, equipment_id, instructions, created_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`
	err := r.pool.QueryRow(ctx, query,
		ex.Name, ex.Category, ex.MuscleGroupID, ex.EquipmentID, ex.Instructions, createdBy, ex.CreatedAt,
	).Scan(&ex.ExerciseID)
	if err != nil {
		return fmt.Errorf("failed to create exercise: %w", err)
	}
	return nil
}

const exCols = `id, name, category, muscle_group_id, equipment_id, instructions, created_by, is_verified, created_at`

func (r *PostgresExerciseRepository) scanExercise(row pgx.Row) (*models.Exercise, error) {
	ex := &models.Exercise{}
	var createdBy *int
	var instructions *string
	err := row.Scan(&ex.ExerciseID, &ex.Name, &ex.Category, &ex.MuscleGroupID, &ex.EquipmentID, &instructions, &createdBy, &ex.IsVerified, &ex.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to scan exercise: %w", err)
	}
	if createdBy != nil {
		ex.CreatedBy = *createdBy
	}
	if instructions != nil {
		ex.Instructions = *instructions
	}
	return ex, nil
}

func (r *PostgresExerciseRepository) GetExerciseByID(ctx context.Context, exerciseID int) (*models.Exercise, error) {
	// scanExercise translates pgx.ErrNoRows to domainerrors.ErrNotFound (see scanExercise).
	// Callers must check for ErrNotFound to distinguish "not found" from success.
	return r.scanExercise(r.pool.QueryRow(ctx, `SELECT `+exCols+` FROM exercises WHERE id = $1`, exerciseID))
}

func (r *PostgresExerciseRepository) scanExercises(rows pgx.Rows) ([]models.Exercise, error) {
	exercises := make([]models.Exercise, 0)
	for rows.Next() {
		ex := models.Exercise{}
		var createdBy *int
		var instructions *string
		if err := rows.Scan(&ex.ExerciseID, &ex.Name, &ex.Category, &ex.MuscleGroupID, &ex.EquipmentID, &instructions, &createdBy, &ex.IsVerified, &ex.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan exercise row: %w", err)
		}
		if createdBy != nil {
			ex.CreatedBy = *createdBy
		}
		if instructions != nil {
			ex.Instructions = *instructions
		}
		exercises = append(exercises, ex)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return exercises, nil
}

func (r *PostgresExerciseRepository) GetAllExercises(ctx context.Context) ([]models.Exercise, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+exCols+` FROM exercises ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("failed to query exercises: %w", err)
	}
	defer rows.Close()
	return r.scanExercises(rows)
}

func (r *PostgresExerciseRepository) GetExercisesByMuscleGroup(ctx context.Context, muscleGroupID int) ([]models.Exercise, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+exCols+` FROM exercises WHERE muscle_group_id = $1 ORDER BY name`, muscleGroupID)
	if err != nil {
		return nil, fmt.Errorf("failed to query exercises by muscle group: %w", err)
	}
	defer rows.Close()
	return r.scanExercises(rows)
}

func (r *PostgresExerciseRepository) GetExercisesByEquipment(ctx context.Context, equipmentID int) ([]models.Exercise, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+exCols+` FROM exercises WHERE equipment_id = $1 ORDER BY name`, equipmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to query exercises by equipment: %w", err)
	}
	defer rows.Close()
	return r.scanExercises(rows)
}

func (r *PostgresExerciseRepository) SearchExercises(ctx context.Context, query string, muscleGroupID *int, equipmentID *int) ([]models.Exercise, error) {
	sql := `SELECT ` + exCols + ` FROM exercises WHERE name ILIKE '%' || $1 || '%'`
	args := []any{query}
	argIdx := 2

	if muscleGroupID != nil {
		sql += fmt.Sprintf(` AND muscle_group_id = $%d`, argIdx)
		args = append(args, *muscleGroupID)
		argIdx++
	}
	if equipmentID != nil {
		sql += fmt.Sprintf(` AND equipment_id = $%d`, argIdx)
		args = append(args, *equipmentID)
		argIdx++
	}
	sql += ` ORDER BY name`

	rows, err := r.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to search exercises: %w", err)
	}
	defer rows.Close()
	return r.scanExercises(rows)
}

// Compile-time interface compliance check.
var _ repositories.ExerciseRepository = (*PostgresExerciseRepository)(nil)

func (r *PostgresExerciseRepository) UpdateExercise(ctx context.Context, exercise *models.Exercise) error {
	query := `UPDATE exercises SET name=$1, category=$2, muscle_group_id=$3, equipment_id=$4, instructions=$5, is_verified=$6 WHERE id=$7`
	tag, err := r.pool.Exec(ctx, query,
		exercise.Name, exercise.Category, exercise.MuscleGroupID, exercise.EquipmentID,
		exercise.Instructions, exercise.IsVerified, exercise.ExerciseID,
	)
	if err != nil {
		return fmt.Errorf("failed to update exercise: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *PostgresExerciseRepository) DeleteExercise(ctx context.Context, exerciseID int) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM exercises WHERE id = $1`, exerciseID)
	if err != nil {
		return fmt.Errorf("failed to delete exercise: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

var _ repositories.ExerciseRepository = (*PostgresExerciseRepository)(nil)


