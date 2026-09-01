package postgres

import (
	"context"
	"testing"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/testutils"
	"gymtrack-backend/internal/utils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPostgresPasswordResetTokenRepository(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	userRepo := NewPostgresUserRepository(pool)
	ctx := context.Background()

	// helper: create a user and return its ID.
	createUser := func(t *testing.T, username, email string) int {
		t.Helper()
		u := &models.User{
			Username:     username,
			Email:        email,
			PasswordHash: "hash",
			Role:         models.RoleAthlete,
			Status:       models.UserStatusActive,
			Profile:      models.UserProfile{Name: username},
		}
		require.NoError(t, userRepo.CreateUser(ctx, u))
		return u.UserID
	}

	fakeNow := time.Date(2026, 1, 15, 12, 0, 0, 0, time.UTC)
	clock := utils.NewFakeClock(fakeNow)
	repo := NewPostgresPasswordResetTokenRepository(pool, clock)

	t.Run("CreateToken_PopulatesIDAndCreatedAt", func(t *testing.T) {
		uid := createUser(t, "prt_create", "prt_create@example.com")

		tok := &models.PasswordResetToken{
			UserID:    uid,
			TokenHash: "a0a1a2a3a4a5a6a7a8a9b0b1b2b3b4b5c0c1c2c3c4c5c6c7c8c9d0d1d2d3d4d5",
			ExpiresAt: fakeNow.Add(1 * time.Hour),
		}

		err := repo.CreateToken(ctx, tok)
		require.NoError(t, err)
		assert.NotZero(t, tok.ID, "ID should be populated after insert")
		assert.Equal(t, fakeNow, tok.CreatedAt, "CreatedAt should equal fake-clock now")
	})

	t.Run("GetValidTokenByHash_RoundTrip", func(t *testing.T) {
		uid := createUser(t, "prt_roundtrip", "prt_roundtrip@example.com")
		hash := "b0b1b2b3b4b5b6b7b8b9c0c1c2c3c4c5d0d1d2d3d4d5d6d7d8d9e0e1e2e3e4e5"

		tok := &models.PasswordResetToken{
			UserID:    uid,
			TokenHash: hash,
			ExpiresAt: fakeNow.Add(2 * time.Hour),
		}
		require.NoError(t, repo.CreateToken(ctx, tok))

		fetched, err := repo.GetValidTokenByHash(ctx, hash)
		require.NoError(t, err)
		assert.Equal(t, tok.ID, fetched.ID)
		assert.Equal(t, uid, fetched.UserID)
		// TIMESTAMPTZ round-trips as the server-local zone; compare instants,
		// not wall-clock representations.
		assert.True(t, tok.ExpiresAt.Equal(fetched.ExpiresAt),
			"expires_at instants differ: %v vs %v", tok.ExpiresAt, fetched.ExpiresAt)
		assert.Equal(t, hash, fetched.TokenHash)

		// Uniqueness: inserting the same token_hash twice must error.
		dup := &models.PasswordResetToken{
			UserID:    uid,
			TokenHash: hash,
			ExpiresAt: fakeNow.Add(3 * time.Hour),
		}
		err = repo.CreateToken(ctx, dup)
		require.Error(t, err, "duplicate token_hash must violate UNIQUE constraint")
	})

	t.Run("GetValidTokenByHash_WrongHash_NotFound", func(t *testing.T) {
		_, err := repo.GetValidTokenByHash(ctx, "0000000000000000000000000000000000000000000000000000000000000000")
		require.Error(t, err)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetValidTokenByHash_Expired_NotFound", func(t *testing.T) {
		uid := createUser(t, "prt_expired", "prt_expired@example.com")
		hash := "c0c1c2c3c4c5c6c7c8c9d0d1d2d3d4d5e0e1e2e3e4e5e6e7e8e9f0f1f2f3f4f5"
		expiresAt := fakeNow.Add(1 * time.Hour)

		tok := &models.PasswordResetToken{
			UserID:    uid,
			TokenHash: hash,
			ExpiresAt: expiresAt,
		}
		require.NoError(t, repo.CreateToken(ctx, tok))

		// Advance clock past expiry.
		clock.Add(2 * time.Hour)

		_, err := repo.GetValidTokenByHash(ctx, hash)
		require.Error(t, err)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)

		// Reset clock for subsequent tests.
		clock.Set(fakeNow)
	})

	t.Run("GetValidTokenByHash_Used_NotFound", func(t *testing.T) {
		uid := createUser(t, "prt_used", "prt_used@example.com")
		hash := "d0d1d2d3d4d5d6d7d8d9e0e1e2e3e4e5f0f1f2f3f4f5f6f7f8f9a0a1a2a3a4a5"

		tok := &models.PasswordResetToken{
			UserID:    uid,
			TokenHash: hash,
			ExpiresAt: fakeNow.Add(1 * time.Hour),
		}
		require.NoError(t, repo.CreateToken(ctx, tok))

		consumed, err := repo.MarkTokenUsed(ctx, tok.ID)
		require.NoError(t, err)
		require.True(t, consumed)

		_, err = repo.GetValidTokenByHash(ctx, hash)
		require.Error(t, err)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("MarkTokenUsed_SingleUse", func(t *testing.T) {
		uid := createUser(t, "prt_singleuse", "prt_singleuse@example.com")
		hash := "e0e1e2e3e4e5e6e7e8e9f0f1f2f3f4f5a0a1a2a3a4a5a6a7a8a9b0b1b2b3b4b5"

		tok := &models.PasswordResetToken{
			UserID:    uid,
			TokenHash: hash,
			ExpiresAt: fakeNow.Add(1 * time.Hour),
		}
		require.NoError(t, repo.CreateToken(ctx, tok))

		// First call: should consume.
		consumed, err := repo.MarkTokenUsed(ctx, tok.ID)
		require.NoError(t, err)
		assert.True(t, consumed, "first MarkTokenUsed should return true")

		// Second call: already consumed, returns false (not an error).
		consumed, err = repo.MarkTokenUsed(ctx, tok.ID)
		require.NoError(t, err)
		assert.False(t, consumed, "second MarkTokenUsed should return false (race signal)")
	})

	t.Run("MarkTokenUsed_UnknownID", func(t *testing.T) {
		consumed, err := repo.MarkTokenUsed(ctx, 999999)
		require.NoError(t, err)
		assert.False(t, consumed, "unknown ID should return false, not error")
	})

	t.Run("CascadeDelete", func(t *testing.T) {
		uid := createUser(t, "prt_cascade", "prt_cascade@example.com")
		hash := "f0f1f2f3f4f5f6f7f8f9a0a1a2a3a4a5b0b1b2b3b4b5b6b7b8b9c0c1c2c3c4c5"

		tok := &models.PasswordResetToken{
			UserID:    uid,
			TokenHash: hash,
			ExpiresAt: fakeNow.Add(1 * time.Hour),
		}
		require.NoError(t, repo.CreateToken(ctx, tok))

		require.NoError(t, userRepo.HardDeleteUser(ctx, uid))

		_, err := repo.GetValidTokenByHash(ctx, hash)
		require.Error(t, err)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)

		var count int
		err = pool.QueryRow(ctx,
			"SELECT COUNT(*) FROM password_reset_tokens WHERE user_id = $1", uid,
		).Scan(&count)
		require.NoError(t, err)
		assert.Zero(t, count, "cascade delete should remove all token rows for the user")
	})

	t.Run("GetValidTokenByUserID_ReturnsMostRecentValid", func(t *testing.T) {
		uid := createUser(t, "prt_recent", "prt_recent@example.com")

		tok1 := &models.PasswordResetToken{
			UserID:    uid,
			TokenHash: "aa11aa11aa11aa11aa11aa11aa11aa11aa11aa11aa11aa11aa11aa11aa11aa",
			ExpiresAt: fakeNow.Add(1 * time.Hour),
		}
		require.NoError(t, repo.CreateToken(ctx, tok1))

		clock.Add(1 * time.Minute)

		tok2 := &models.PasswordResetToken{
			UserID:    uid,
			TokenHash: "bb22bb22bb22bb22bb22bb22bb22bb22bb22bb22bb22bb22bb22bb22bb22bb",
			ExpiresAt: fakeNow.Add(1 * time.Hour),
		}
		require.NoError(t, repo.CreateToken(ctx, tok2))

		fetched, err := repo.GetValidTokenByUserID(ctx, uid)
		require.NoError(t, err)
		assert.Equal(t, tok2.ID, fetched.ID, "should return the most recent valid token")
		assert.Equal(t, uid, fetched.UserID)
	})

	t.Run("GetValidTokenByUserID_NoValidToken_NotFound", func(t *testing.T) {
		uid := createUser(t, "prt_novalid", "prt_novalid@example.com")

		tok := &models.PasswordResetToken{
			UserID:    uid,
			TokenHash: "cc33cc33cc33cc33cc33cc33cc33cc33cc33cc33cc33cc33cc33cc33cc33cc",
			ExpiresAt: fakeNow.Add(1 * time.Hour),
		}
		require.NoError(t, repo.CreateToken(ctx, tok))

		consumed, err := repo.MarkTokenUsed(ctx, tok.ID)
		require.NoError(t, err)
		require.True(t, consumed)

		_, err = repo.GetValidTokenByUserID(ctx, uid)
		require.Error(t, err)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetValidTokenByUserID_ExpiredToken_NotFound", func(t *testing.T) {
		uid := createUser(t, "prt_expireduid", "prt_expireduid@example.com")

		tok := &models.PasswordResetToken{
			UserID:    uid,
			TokenHash: "dd44dd44dd44dd44dd44dd44dd44dd44dd44dd44dd44dd44dd44dd44dd44dd",
			ExpiresAt: fakeNow.Add(1 * time.Hour),
		}
		require.NoError(t, repo.CreateToken(ctx, tok))

		clock.Add(2 * time.Hour)

		_, err := repo.GetValidTokenByUserID(ctx, uid)
		require.Error(t, err)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)

		clock.Set(fakeNow)
	})

}
