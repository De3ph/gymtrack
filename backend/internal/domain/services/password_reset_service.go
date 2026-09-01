package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/utils"
)

// EmailSender abstracts outbound email so the domain layer stays free of
// provider SDKs. See infrastructure/email for the Resend implementation.
// Follows the same "interface defined in services, implemented in
// infrastructure" pattern as InvitationMethod.
type EmailSender interface {
	SendPasswordResetEmail(ctx context.Context, to, resetURL string) error
}

const (
	// passwordResetTokenTTL is how long a reset link stays valid.
	passwordResetTokenTTL = time.Hour
	// passwordResetEmailTimeout bounds the async send after the request ends.
	passwordResetEmailTimeout = 10 * time.Second
)

// sendAsync schedules work to run outside the request lifecycle.
// Package-level var so tests can run it synchronously; mirrors the
// overridable-var pattern in postgres/invitation.go.
// TODO: replace with a persistent job queue when one exists — a fire-and-forget
// goroutine loses pending emails on process restart.
var sendAsync = func(fn func()) { go fn() }

// PasswordResetService implements the email-based password reset flow.
type PasswordResetService struct {
	userRepo    repositories.UserRepository
	tokenRepo   repositories.PasswordResetTokenRepository
	mailer      EmailSender
	clock       utils.Clock
	frontendURL string
}

// NewPasswordResetService creates a new PasswordResetService.
func NewPasswordResetService(
	userRepo repositories.UserRepository,
	tokenRepo repositories.PasswordResetTokenRepository,
	mailer EmailSender,
	frontendURL string,
	clock utils.Clock,
) *PasswordResetService {
	if clock == nil {
		clock = utils.RealClock{}
	}
	return &PasswordResetService{
		userRepo:    userRepo,
		tokenRepo:   tokenRepo,
		mailer:      mailer,
		clock:       clock,
		frontendURL: frontendURL,
	}
}

// RequestPasswordReset creates a single-use reset token for the account with
// the given email and emails the reset link asynchronously.
//
// It intentionally returns nil for unknown emails and non-active accounts so
// the API response cannot be used to enumerate registered addresses.
func (s *PasswordResetService) RequestPasswordReset(ctx context.Context, email string) error {
	user, err := s.userRepo.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			// Unknown email: same outcome as success, no token, no email.
			return nil
		}
		return fmt.Errorf("failed to look up user by email: %w", err)
	}

	// Soft-deleted / suspended / banned accounts must not gain a new password
	// through the reset flow; that would bypass the restore and status checks
	// enforced at login. Silently no-op to preserve the generic response.
	if user.Status != models.UserStatusActive {
		return nil
	}

	existing, err := s.tokenRepo.GetValidTokenByUserID(ctx, user.UserID)
	if err != nil && !errors.Is(err, domainerrors.ErrNotFound) {
		return fmt.Errorf("failed to check existing reset token: %w", err)
	}
	if existing != nil {
		return nil
	}

	rawToken, err := generateResetToken()
	if err != nil {
		return err
	}

	now := s.clock.Now()
	token := &models.PasswordResetToken{
		UserID:    user.UserID,
		TokenHash: hashResetToken(rawToken),
		ExpiresAt: now.Add(passwordResetTokenTTL),
	}
	if err := s.tokenRepo.CreateToken(ctx, token); err != nil {
		return fmt.Errorf("failed to store password reset token: %w", err)
	}

	resetURL := fmt.Sprintf("%s/reset-password?token=%s", s.frontendURL, rawToken)

	// Detach from the request context so the send survives the response, with
	// its own deadline; the request ctx is cancelled right after the handler
	// returns. Send failures are logged only and never surface to the client.
	// TODO: rate-limit per email address; the route only has the per-IP
	// AuthLimiter today.
	sendCtx := context.WithoutCancel(ctx)
	userEmail := user.Email
	sendAsync(func() {
		callCtx, cancel := context.WithTimeout(sendCtx, passwordResetEmailTimeout)
		defer cancel()
		if err := s.mailer.SendPasswordResetEmail(callCtx, userEmail, resetURL); err != nil {
			zap.L().Error("failed to send password reset email",
				zap.Int("userId", user.UserID),
				zap.Error(err),
			)
		}
	})

	return nil
}

// ConfirmPasswordReset redeems a raw reset token and sets a new password.
// All failure modes (unknown, expired, already-used) collapse into the single
// ErrInvalidResetToken so no reason is leaked.
func (s *PasswordResetService) ConfirmPasswordReset(ctx context.Context, rawToken, newPassword string) error {
	token, err := s.tokenRepo.GetValidTokenByHash(ctx, hashResetToken(rawToken))
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return ErrInvalidResetToken
		}
		return fmt.Errorf("failed to look up reset token: %w", err)
	}

	// Atomically consume the token; false means a concurrent request won the race.
	consumed, err := s.tokenRepo.MarkTokenUsed(ctx, token.ID)
	if err != nil {
		return fmt.Errorf("failed to consume reset token: %w", err)
	}
	if !consumed {
		return ErrInvalidResetToken
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Read-modify-write via UpdateUser matches the existing profile-edit
	// pattern (see UserService); last write wins on concurrent profile edits.
	user, err := s.userRepo.GetUserByID(ctx, token.UserID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return ErrInvalidResetToken
		}
		return fmt.Errorf("failed to load user for reset: %w", err)
	}

	user.PasswordHash = string(passwordHash)
	if err := s.userRepo.UpdateUser(ctx, user); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

// generateResetToken produces a 32-byte crypto-random hex token (64 chars).
func generateResetToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate reset token: %w", err)
	}
	return hex.EncodeToString(b), nil
}

// hashResetToken returns the hex-encoded SHA-256 of a raw token — the only
// form ever persisted.
func hashResetToken(rawToken string) string {
	sum := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(sum[:])
}
