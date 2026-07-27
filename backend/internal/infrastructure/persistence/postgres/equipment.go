package postgres

import (
	"context"
	"errors"
	"fmt"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresEquipmentRepository implements the EquipmentRepository interface using PostgreSQL.
type PostgresEquipmentRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresEquipmentRepository creates a new PostgreSQL-backed equipment repository.
func NewPostgresEquipmentRepository(pool *pgxpool.Pool) *PostgresEquipmentRepository {
	return &PostgresEquipmentRepository{pool: pool}
}

func (r *PostgresEquipmentRepository) GetAllEquipment(ctx context.Context) ([]models.EquipmentDefinition, error) {
	rows, err := r.pool.Query(ctx, "SELECT id, code, description FROM equipment_definitions ORDER BY id")
	if err != nil {
		return nil, fmt.Errorf("failed to query equipment: %w", err)
	}
	defer rows.Close()

	equipment := make([]models.EquipmentDefinition, 0)
	for rows.Next() {
		var eq models.EquipmentDefinition
		if err := rows.Scan(&eq.ID, &eq.Code, &eq.Description); err != nil {
			return nil, fmt.Errorf("failed to scan equipment: %w", err)
		}
		equipment = append(equipment, eq)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return equipment, nil
}

func (r *PostgresEquipmentRepository) GetEquipmentByID(ctx context.Context, id int) (*models.EquipmentDefinition, error) {
	var eq models.EquipmentDefinition
	err := r.pool.QueryRow(ctx, "SELECT id, code, description FROM equipment_definitions WHERE id = $1", id).
		Scan(&eq.ID, &eq.Code, &eq.Description)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get equipment: %w", err)
	}
	return &eq, nil
}
