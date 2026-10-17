package migrate_test

import (
	"context"
	"testing"

	"gymtrack-backend/internal/testutils"
)

// expectedSeedExercises pins the number of rows seeded by 003_seed_catalog.
// If a seed row is dropped (e.g. a typo'd FK code) the migration still succeeds
// but the catalog ends up short; this test turns that into a failure.
const expectedSeedExercises = 58

func TestSeedCatalogMigration(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	ctx := context.Background()

	var exercises int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM exercises`).Scan(&exercises); err != nil {
		t.Fatalf("count exercises: %v", err)
	}
	if exercises != expectedSeedExercises {
		t.Fatalf("seeded exercises = %d, want %d", exercises, expectedSeedExercises)
	}

	var unresolved int
	if err := pool.QueryRow(ctx,
		`SELECT count(*) FROM exercises WHERE muscle_group_id IS NULL OR equipment_id IS NULL`,
	).Scan(&unresolved); err != nil {
		t.Fatalf("count unresolved exercises: %v", err)
	}
	if unresolved != 0 {
		t.Fatalf("exercises with unresolved muscle_group_id/equipment_id = %d, want 0", unresolved)
	}

	// Every seed exercise must resolve to an existing lookup row.
	var brokenFKs int
	if err := pool.QueryRow(ctx, `
		SELECT count(*)
		FROM exercises e
		LEFT JOIN muscle_groups mg ON mg.id = e.muscle_group_id
		LEFT JOIN equipment_definitions eq ON eq.id = e.equipment_id
		WHERE mg.id IS NULL OR eq.id IS NULL
	`).Scan(&brokenFKs); err != nil {
		t.Fatalf("count broken FKs: %v", err)
	}
	if brokenFKs != 0 {
		t.Fatalf("exercises with dangling lookup FKs = %d, want 0", brokenFKs)
	}
}
