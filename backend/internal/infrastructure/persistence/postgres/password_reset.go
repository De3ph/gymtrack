package postgres

import (
	"context"
	"errors"
	"fmt"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/utils"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresPasswordResetTokenRepository implements repositories.PasswordResetTokenRepository
// using PostgreSQL. Expiry checks are evaluated against the injected Clock so
// tests can control token validity.
type PostgresPasswordResetTokenRepository struct {
	pool  *pgxpool.Pool
	clock utils.Clock
}

// NewPostgresPasswordResetTokenRepository creates a new PostgreSQL-backed token repository.
func NewPostgresPasswordResetTokenRepository(pool *pgxpool.Pool, clock utils.Clock) *PostgresPasswordResetTokenRepository {
	if clock == nil {
		clock = utils.RealClock{}
	}
	return &PostgresPasswordResetTokenRepository{pool: pool, clock: clock}
}

func (r *PostgresPasswordResetTokenRepository) CreateToken(ctx context.Context, token *models.PasswordResetToken) error {
	now := r.clock.Now()
	token.CreatedAt = now

	query := `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id`

	err := r.pool.QueryRow(ctx, query,
		token.UserID,
		token.TokenHash,
		token.ExpiresAt,
		token.CreatedAt,
	).Scan(&token.ID)
	if err != nil {
		return mapWriteError(err, "failed to create password reset token")
	}

	return nil
}

func (r *PostgresPasswordResetTokenRepository) GetValidTokenByHash(ctx context.Context, tokenHash string) (*models.PasswordResetToken, error) {
	query := `
		SELECT id, user_id, token_hash, expires_at, used_at, created_at
		FROM password_reset_tokens
		WHERE token_hash = $1 AND used_at IS NULL AND expires_at > $2
		LIMIT 1`

	tok := &models.PasswordResetToken{}

	err := r.pool.QueryRow(ctx, query, tokenHash, r.clock.Now()).Scan(
		&tok.ID,
		&tok.UserID,
		&tok.TokenHash,
		&tok.ExpiresAt,
		&tok.UsedAt,
		&tok.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to query password reset token: %w", err)
	}

	return tok, nil
}

func (r *PostgresPasswordResetTokenRepository) GetValidTokenByUserID(ctx context.Context, userID int) (*models.PasswordResetToken, error) {
	query := `
		SELECT id, user_id, token_hash, expires_at, used_at, created_at
		FROM password_reset_tokens
		WHERE user_id = $1 AND used_at IS NULL AND expires_at > $2
		ORDER BY created_at DESC
		LIMIT 1`

	tok := &models.PasswordResetToken{}

	err := r.pool.QueryRow(ctx, query, userID, r.clock.Now()).Scan(
		&tok.ID,
		&tok.UserID,
		&tok.TokenHash,
		&tok.ExpiresAt,
		&tok.UsedAt,
		&tok.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to query password reset token by user: %w", err)
	}

	return tok, nil
}

func (r *PostgresPasswordResetTokenRepository) MarkTokenUsed(ctx context.Context, tokenID int) (bool, error) {
	query := `
		UPDATE password_reset_tokens
		SET used_at = $1
		WHERE id = $2 AND used_at IS NULL`

	tag, err := r.pool.Exec(ctx, query, r.clock.Now(), tokenID)
	if err != nil {
		return false, fmt.Errorf("failed to mark password reset token as used: %w", err)
	}

	return tag.RowsAffected() > 0, nil
}

// Compile-time check that PostgresPasswordResetTokenRepository implements the interface.
var _ repositories.PasswordResetTokenRepository = (*PostgresPasswordResetTokenRepository)(nil)
