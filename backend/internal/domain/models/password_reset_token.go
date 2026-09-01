package models

import "time"

// PasswordResetToken represents a single-use password reset token.
// Only the SHA-256 hash (hex-encoded) of the raw token is ever persisted;
// the raw token lives only inside the emailed reset link.
type PasswordResetToken struct {
	ID        int
	UserID    int
	TokenHash string
	ExpiresAt time.Time
	UsedAt    *time.Time
	CreatedAt time.Time
}
