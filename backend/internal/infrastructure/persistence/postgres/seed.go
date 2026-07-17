package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// SeedLookupTables inserts the canonical muscle_groups and equipment_definitions rows.
// Uses explicit IDs so exercise foreign keys remain stable. Safe to run multiple times.
func SeedLookupTables(ctx context.Context, pool *pgxpool.Pool) error {
	muscleGroups := []struct {
		id          int
		code        string
		description string
	}{
		{1, "chest", "Chest"},
		{2, "back", "Back"},
		{3, "shoulders", "Shoulders"},
		{4, "arms", "Arms"},
		{5, "legs", "Legs"},
		{6, "core", "Core"},
		{7, "full-body", "Full Body"},
	}

	for _, mg := range muscleGroups {
		_, err := pool.Exec(ctx,
			"INSERT INTO muscle_groups (id, code, description) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
			mg.id, mg.code, mg.description,
		)
		if err != nil {
			return fmt.Errorf("seed muscle_groups id=%d: %w", mg.id, err)
		}
	}

	equipment := []struct {
		id          int
		code        string
		description string
	}{
		{1, "barbell", "Barbell"},
		{2, "dumbbell", "Dumbbell"},
		{3, "machine", "Machine"},
		{4, "cable", "Cable"},
		{5, "bodyweight", "Bodyweight"},
		{6, "kettlebell", "Kettlebell"},
		{7, "resistance-band", "Resistance Band"},
		{8, "other", "Other"},
	}

	for _, eq := range equipment {
		_, err := pool.Exec(ctx,
			"INSERT INTO equipment_definitions (id, code, description) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
			eq.id, eq.code, eq.description,
		)
		if err != nil {
			return fmt.Errorf("seed equipment_definitions id=%d: %w", eq.id, err)
		}
	}

	return nil
}
