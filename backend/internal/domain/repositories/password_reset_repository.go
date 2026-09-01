package repositories

import (
	"context"

	"gymtrack-backend/internal/domain/models"
)

// PasswordResetTokenRepository defines data access for password reset tokens.
type PasswordResetTokenRepository interface {
	// CreateToken stores a new token row and populates its ID.
	CreateToken(ctx context.Context, token *models.PasswordResetToken) error

	// GetValidTokenByHash returns the unused, unexpired token for the given
	// SHA-256 hash, or domainerrors.ErrNotFound.
	GetValidTokenByHash(ctx context.Context, tokenHash string) (*models.PasswordResetToken, error)

	// GetValidTokenByUserID returns the most-recent unused, unexpired token
	// for the given user ID, or domainerrors.ErrNotFound when none exists.
	// Used by the service to enforce the one-active-token-per-user rate limit.
	GetValidTokenByUserID(ctx context.Context, userID int) (*models.PasswordResetToken, error)

	// MarkTokenUsed atomically marks a token as used. It returns false (no
	// error) when the token was already consumed by a concurrent redemption.
	MarkTokenUsed(ctx context.Context, tokenID int) (bool, error)
}
