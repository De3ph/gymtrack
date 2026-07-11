package main

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

func migrationPath() string {
	_, file, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(file), "..", "..", "migrations", "001_initial_schema.up.sql")
}

func setupTestPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	ctx := context.Background()

	if dsn := os.Getenv("TEST_POSTGRES_DSN"); dsn != "" {
		pool, err := pgxpool.New(ctx, dsn)
		require.NoError(t, err, "connect to TEST_POSTGRES_DSN")
		sql, err := os.ReadFile(migrationPath())
		require.NoError(t, err, "read migration")
		_, err = pool.Exec(ctx, string(sql))
		require.NoError(t, err, "apply schema")
		return pool
	}

	container, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("test"),
		postgres.WithPassword("test"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	if err != nil {
		t.Skipf("postgres container unavailable: %v", err)
		return nil
	}
	defer func() { _ = container.Terminate(ctx) }()

	dsn, err := container.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err, "get connection string")

	pool, err := pgxpool.New(ctx, dsn)
	require.NoError(t, err, "create pool")

	sql, err := os.ReadFile(migrationPath())
	require.NoError(t, err, "read migration")
	_, err = pool.Exec(ctx, string(sql))
	require.NoError(t, err, "apply schema")

	return pool
}

type fixtureLoader struct {
	data map[string][]map[string]interface{}
}

func (f *fixtureLoader) load(ctx context.Context, collection string) ([]map[string]interface{}, error) {
	return f.data[collection], nil
}

func (f *fixtureLoader) loadByType(ctx context.Context, collection, docType string) ([]map[string]interface{}, error) {
	var out []map[string]interface{}
	for _, doc := range f.data[collection] {
		if doc["type"] == docType {
			out = append(out, doc)
		}
	}
	return out, nil
}

func TestRewriteExercisesJSONB(t *testing.T) {
	idMap := map[string]int{"ex-old": 42}
	input := []interface{}{map[string]interface{}{"exerciseId": "ex-old", "name": "Press"}}
	out, err := rewriteExercisesJSONB(input, idMap)
	require.NoError(t, err)
	var arr []map[string]interface{}
	require.NoError(t, json.Unmarshal(out, &arr))
	require.Len(t, arr, 1)
	require.Equal(t, float64(42), arr[0]["exerciseId"])
	require.Equal(t, "Press", arr[0]["name"])
}
