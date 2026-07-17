package postgres

import (
	"context"
	"testing"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/testutils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPostgresBodyMeasurementRepository(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	repo := NewPostgresBodyMeasurementRepository(pool)
	ctx := context.Background()

	createBMUser := func(t *testing.T, username string) *models.User {
		t.Helper()
		var userID int
		err := pool.QueryRow(ctx,
			`INSERT INTO users (username, email, password_hash, role, profile) VALUES ($1,$2,$3,$4,$5) RETURNING user_id`,
			username, username+"@test.com", "hash", "athlete", `{"name":"`+username+`"}`,
		).Scan(&userID)
		require.NoError(t, err)
		return &models.User{UserID: userID, Username: username, Role: models.RoleAthlete}
	}

	athlete := createBMUser(t, "bm_athlete")

	makeParts := func(chest, waist float64) map[string]models.BodyMeasurementPart {
		return map[string]models.BodyMeasurementPart{
			"chest": {Value: chest}, "waist": {Value: waist},
		}
	}

	t.Run("Create", func(t *testing.T) {
		m := &models.BodyMeasurement{
			AthleteID: athlete.UserID, Date: time.Now(), Weight: 80.5, WeightUnit: models.WeightUnitKg,
			BodyFatPct: 15.2, Parts: makeParts(100, 82), Notes: "First measurement",
		}
		err := repo.Create(ctx, m)
		require.NoError(t, err)
		assert.NotZero(t, m.MeasurementID)
		assert.Equal(t, "body_measurement", m.Type)
	})

	t.Run("GetByID", func(t *testing.T) {
		m := &models.BodyMeasurement{
			AthleteID: athlete.UserID, Date: time.Now(), Weight: 75, WeightUnit: models.WeightUnitLbs,
			Parts: makeParts(95, 78),
		}
		require.NoError(t, repo.Create(ctx, m))

		fetched, err := repo.GetByID(ctx, m.MeasurementID)
		require.NoError(t, err)
		assert.Equal(t, m.MeasurementID, fetched.MeasurementID)
		assert.Equal(t, 75.0, fetched.Weight)
		assert.Equal(t, models.WeightUnitLbs, fetched.WeightUnit)
		assert.Equal(t, 95.0, fetched.Parts["chest"].Value)
	})

	t.Run("GetByID_NotFound", func(t *testing.T) {
		_, err := repo.GetByID(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetLatestByAthleteID", func(t *testing.T) {
		latest := &models.BodyMeasurement{
			AthleteID: athlete.UserID, Date: time.Now(), Weight: 78, WeightUnit: models.WeightUnitKg,
			Parts: makeParts(102, 80), Notes: "Latest",
		}
		require.NoError(t, repo.Create(ctx, latest))

		fetched, err := repo.GetLatestByAthleteID(ctx, athlete.UserID)
		require.NoError(t, err)
		require.NotNil(t, fetched)
		assert.Equal(t, 78.0, fetched.Weight)
	})

	t.Run("GetLatestByAthleteID_Empty", func(t *testing.T) {
		fetched, err := repo.GetLatestByAthleteID(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
		assert.Nil(t, fetched)
	})

	t.Run("GetByAthleteID", func(t *testing.T) {
		measurements, err := repo.GetByAthleteID(ctx, athlete.UserID, 10, 0)
		require.NoError(t, err)
		assert.NotEmpty(t, measurements)
	})

	t.Run("GetByAthleteDateRange", func(t *testing.T) {
		now := time.Now()
		measurements, err := repo.GetByAthleteDateRange(ctx, athlete.UserID, now.AddDate(0, -1, 0), now.AddDate(0, 0, 1))
		require.NoError(t, err)
		assert.NotEmpty(t, measurements)
	})

	t.Run("Update", func(t *testing.T) {
		m := &models.BodyMeasurement{
			AthleteID: athlete.UserID, Date: time.Now(), Weight: 82, WeightUnit: models.WeightUnitKg,
			Parts: makeParts(100, 82),
		}
		require.NoError(t, repo.Create(ctx, m))

		m.Weight = 81.0
		m.Parts = makeParts(101, 81)
		err := repo.Update(ctx, m)
		require.NoError(t, err)

		fetched, err := repo.GetByID(ctx, m.MeasurementID)
		require.NoError(t, err)
		assert.Equal(t, 81.0, fetched.Weight)
		assert.Equal(t, 101.0, fetched.Parts["chest"].Value)
	})

	t.Run("Update_NotFound", func(t *testing.T) {
		m := &models.BodyMeasurement{
			MeasurementID: 999999, AthleteID: athlete.UserID, Date: time.Now(),
			Weight: 80, WeightUnit: models.WeightUnitKg,
		}
		err := repo.Update(ctx, m)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("Delete", func(t *testing.T) {
		m := &models.BodyMeasurement{
			AthleteID: athlete.UserID, Date: time.Now(), Weight: 79, WeightUnit: models.WeightUnitKg,
			Parts: makeParts(99, 80),
		}
		require.NoError(t, repo.Create(ctx, m))
		require.NoError(t, repo.Delete(ctx, m.MeasurementID))
		_, err := repo.GetByID(ctx, m.MeasurementID)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("Delete_NotFound", func(t *testing.T) {
		err := repo.Delete(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})
}
