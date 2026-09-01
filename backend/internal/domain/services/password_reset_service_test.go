package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/utils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

// ---------------------------------------------------------------------------
// Test fakes
// ---------------------------------------------------------------------------

// fakePasswordResetTokenRepo is an in-memory PasswordResetTokenRepository.
type fakePasswordResetTokenRepo struct {
	mu     sync.Mutex
	tokens map[int]*models.PasswordResetToken
	nextID int
	clock  *utils.FakeClock
}

var _ repositories.PasswordResetTokenRepository = (*fakePasswordResetTokenRepo)(nil)

func newFakeTokenRepo(clock *utils.FakeClock) *fakePasswordResetTokenRepo {
	return &fakePasswordResetTokenRepo{
		tokens: make(map[int]*models.PasswordResetToken),
		clock:  clock,
	}
}

func (f *fakePasswordResetTokenRepo) CreateToken(_ context.Context, token *models.PasswordResetToken) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.nextID++
	token.ID = f.nextID
	token.CreatedAt = f.clock.Now()
	clone := *token
	f.tokens[token.ID] = &clone
	return nil
}

func (f *fakePasswordResetTokenRepo) GetValidTokenByHash(_ context.Context, tokenHash string) (*models.PasswordResetToken, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, t := range f.tokens {
		if t.TokenHash == tokenHash && t.UsedAt == nil && t.ExpiresAt.After(f.clock.Now()) {
			clone := *t
			return &clone, nil
		}
	}
	return nil, domainerrors.ErrNotFound
}

func (f *fakePasswordResetTokenRepo) GetValidTokenByUserID(_ context.Context, userID int) (*models.PasswordResetToken, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var newest *models.PasswordResetToken
	for _, t := range f.tokens {
		if t.UserID == userID && t.UsedAt == nil && t.ExpiresAt.After(f.clock.Now()) {
			if newest == nil || t.CreatedAt.After(newest.CreatedAt) {
				newest = t
			}
		}
	}
	if newest == nil {
		return nil, domainerrors.ErrNotFound
	}
	clone := *newest
	return &clone, nil
}

func (f *fakePasswordResetTokenRepo) MarkTokenUsed(_ context.Context, tokenID int) (bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	t, ok := f.tokens[tokenID]
	if !ok {
		return false, domainerrors.ErrNotFound
	}
	if t.UsedAt != nil {
		// Already consumed — return false (race-guard semantics).
		return false, nil
	}
	now := f.clock.Now()
	t.UsedAt = &now
	return true, nil
}

// count returns the number of stored tokens (test helper).
func (f *fakePasswordResetTokenRepo) count() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.tokens)
}

// ---------------------------------------------------------------------------

// fakeEmailSender records every email sent and can be configured to fail.
type fakeEmailSender struct {
	mu    sync.Mutex
	calls []struct{ to, url string }
	err   error // if non-nil, SendPasswordResetEmail returns this error
}

var _ EmailSender = (*fakeEmailSender)(nil)

func (f *fakeEmailSender) SendPasswordResetEmail(_ context.Context, to, resetURL string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.err != nil {
		return f.err
	}
	f.calls = append(f.calls, struct{ to, url string }{to, resetURL})
	return nil
}

func (f *fakeEmailSender) emailCount() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.calls)
}

func (f *fakeEmailSender) lastURL() string {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.calls) == 0 {
		return ""
	}
	return f.calls[len(f.calls)-1].url
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testFrontendURL = "https://app.example.com"

// makeSyncSendAsync overrides the package-level sendAsync to run synchronously
// and restores the original on test cleanup.
func makeSyncSendAsync(t *testing.T) {
	t.Helper()
	orig := sendAsync
	sendAsync = func(fn func()) { fn() }
	t.Cleanup(func() { sendAsync = orig })
}

// newTestPasswordResetService wires up a PasswordResetService with fakes.
func newTestPasswordResetService(
	repo *fakeUserRepo,
	tokenRepo *fakePasswordResetTokenRepo,
	mailer *fakeEmailSender,
	clock *utils.FakeClock,
) *PasswordResetService {
	return NewPasswordResetService(repo, tokenRepo, mailer, testFrontendURL, clock)
}

// extractRawToken parses the reset URL and returns the token query parameter.
func extractRawToken(t *testing.T, resetURL string) string {
	t.Helper()
	u, err := url.Parse(resetURL)
	require.NoError(t, err)
	raw := u.Query().Get("token")
	require.NotEmpty(t, raw, "reset URL missing token query param: %s", resetURL)
	return raw
}

// sha256Hex returns the hex-encoded SHA-256 of s.
func sha256Hex(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

func TestPasswordResetService_RequestPasswordReset_ExistingUser_CreatesTokenAndSendsEmail(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	tokenRepo := newFakeTokenRepo(clock)
	mailer := &fakeEmailSender{}
	svc := newTestPasswordResetService(repo, tokenRepo, mailer, clock)
	ctx := context.Background()

	makeSyncSendAsync(t)

	seedUser(t, repo, "resetme", "resetme@example.com", "oldpassword", models.RoleAthlete)

	err := svc.RequestPasswordReset(ctx, "resetme@example.com")
	require.NoError(t, err)

	// Exactly one token stored.
	assert.Equal(t, 1, tokenRepo.count())

	// Exactly one email sent.
	assert.Equal(t, 1, mailer.emailCount())

	// Extract raw token from the URL.
	resetURL := mailer.lastURL()
	assert.True(t, strings.HasPrefix(resetURL, testFrontendURL+"/reset-password?token="))
	rawToken := extractRawToken(t, resetURL)

	// Raw token is 64 hex chars (32 bytes).
	assert.Len(t, rawToken, 64)

	// Stored hash matches SHA-256 of raw token.
	tokenRepo.mu.Lock()
	var stored *models.PasswordResetToken
	for _, tok := range tokenRepo.tokens {
		stored = tok
		break
	}
	tokenRepo.mu.Unlock()

	require.NotNil(t, stored)
	assert.Equal(t, sha256Hex(rawToken), stored.TokenHash)

	// Raw token is NOT stored directly (hash != raw).
	assert.NotEqual(t, rawToken, stored.TokenHash)
}

func TestPasswordResetService_RequestPasswordReset_UnknownEmail_GenericNoop(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	tokenRepo := newFakeTokenRepo(clock)
	mailer := &fakeEmailSender{}
	svc := newTestPasswordResetService(repo, tokenRepo, mailer, clock)
	ctx := context.Background()

	makeSyncSendAsync(t)

	err := svc.RequestPasswordReset(ctx, "nobody@example.com")
	require.NoError(t, err)
	assert.Equal(t, 0, tokenRepo.count())
	assert.Equal(t, 0, mailer.emailCount())
}

func TestPasswordResetService_RequestPasswordReset_InactiveUser_Noop(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	tokenRepo := newFakeTokenRepo(clock)
	mailer := &fakeEmailSender{}
	svc := newTestPasswordResetService(repo, tokenRepo, mailer, clock)
	ctx := context.Background()

	makeSyncSendAsync(t)

	user := seedUser(t, repo, "inactive", "inactive@example.com", "password123", models.RoleAthlete)

	// Set status to deleted.
	user.Status = models.UserStatusDeleted
	require.NoError(t, repo.UpdateUser(ctx, user))

	err := svc.RequestPasswordReset(ctx, "inactive@example.com")
	require.NoError(t, err)
	assert.Equal(t, 0, tokenRepo.count())
	assert.Equal(t, 0, mailer.emailCount())

	// Also test suspended.
	user2 := seedUser(t, repo, "suspended2", "suspended2@example.com", "password123", models.RoleAthlete)
	user2.Status = models.UserStatusSuspended
	require.NoError(t, repo.UpdateUser(ctx, user2))

	err = svc.RequestPasswordReset(ctx, "suspended2@example.com")
	require.NoError(t, err)
	assert.Equal(t, 0, tokenRepo.count())
	assert.Equal(t, 0, mailer.emailCount())
}

func TestPasswordResetService_RequestPasswordReset_MailFailureStillSucceeds(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	tokenRepo := newFakeTokenRepo(clock)
	mailer := &fakeEmailSender{err: assert.AnError}
	svc := newTestPasswordResetService(repo, tokenRepo, mailer, clock)
	ctx := context.Background()

	makeSyncSendAsync(t)

	seedUser(t, repo, "mailfail", "mailfail@example.com", "password123", models.RoleAthlete)

	err := svc.RequestPasswordReset(ctx, "mailfail@example.com")
	require.NoError(t, err)

	// Token was still stored even though email failed.
	assert.Equal(t, 1, tokenRepo.count())
}

func TestPasswordResetService_ConfirmPasswordReset_ValidToken_UpdatesPasswordAndConsumes(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	tokenRepo := newFakeTokenRepo(clock)
	mailer := &fakeEmailSender{}
	svc := newTestPasswordResetService(repo, tokenRepo, mailer, clock)
	ctx := context.Background()

	makeSyncSendAsync(t)

	seedUser(t, repo, "confirmok", "confirmok@example.com", "oldpassword", models.RoleAthlete)

	// Step 1: Request reset.
	require.NoError(t, svc.RequestPasswordReset(ctx, "confirmok@example.com"))
	require.Equal(t, 1, mailer.emailCount())

	rawToken := extractRawToken(t, mailer.lastURL())

	// Step 2: Confirm with new password.
	err := svc.ConfirmPasswordReset(ctx, rawToken, "newpassword")
	require.NoError(t, err)

	// Step 3: Verify password changed.
	updated, err := repo.GetUserByEmail(ctx, "confirmok@example.com")
	require.NoError(t, err)

	err = bcrypt.CompareHashAndPassword([]byte(updated.PasswordHash), []byte("newpassword"))
	assert.NoError(t, err, "new password should verify")

	err = bcrypt.CompareHashAndPassword([]byte(updated.PasswordHash), []byte("oldpassword"))
	assert.Error(t, err, "old password should NOT verify")

	// Step 4: Token is consumed.
	tokenRepo.mu.Lock()
	var stored *models.PasswordResetToken
	for _, tok := range tokenRepo.tokens {
		stored = tok
		break
	}
	tokenRepo.mu.Unlock()
	require.NotNil(t, stored)
	assert.NotNil(t, stored.UsedAt)
}

func TestPasswordResetService_ConfirmPasswordReset_ExpiredToken_Rejected(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	tokenRepo := newFakeTokenRepo(clock)
	mailer := &fakeEmailSender{}
	svc := newTestPasswordResetService(repo, tokenRepo, mailer, clock)
	ctx := context.Background()

	makeSyncSendAsync(t)

	seedUser(t, repo, "expired", "expired@example.com", "oldpassword", models.RoleAthlete)

	// Request reset.
	require.NoError(t, svc.RequestPasswordReset(ctx, "expired@example.com"))
	rawToken := extractRawToken(t, mailer.lastURL())

	// Advance clock past TTL (1 hour).
	clock.Add(2 * time.Hour)

	// Confirm should fail.
	err := svc.ConfirmPasswordReset(ctx, rawToken, "newpassword")
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "INVALID_RESET_TOKEN", svcErr.Code)

	// Password unchanged.
	user, err := repo.GetUserByEmail(ctx, "expired@example.com")
	require.NoError(t, err)
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte("oldpassword"))
	assert.NoError(t, err, "old password should still verify")
}

func TestPasswordResetService_ConfirmPasswordReset_UsedToken_Rejected(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	tokenRepo := newFakeTokenRepo(clock)
	mailer := &fakeEmailSender{}
	svc := newTestPasswordResetService(repo, tokenRepo, mailer, clock)
	ctx := context.Background()

	makeSyncSendAsync(t)

	seedUser(t, repo, "reuse", "reuse@example.com", "oldpassword", models.RoleAthlete)

	// Request and confirm once.
	require.NoError(t, svc.RequestPasswordReset(ctx, "reuse@example.com"))
	rawToken := extractRawToken(t, mailer.lastURL())

	err := svc.ConfirmPasswordReset(ctx, rawToken, "first-new-pw")
	require.NoError(t, err)

	// Second confirm with same token should fail.
	err = svc.ConfirmPasswordReset(ctx, rawToken, "second-new-pw")
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "INVALID_RESET_TOKEN", svcErr.Code)

	// Password is the first new one, not the second.
	user, err := repo.GetUserByEmail(ctx, "reuse@example.com")
	require.NoError(t, err)
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte("first-new-pw"))
	assert.NoError(t, err, "first new password should verify")
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte("second-new-pw"))
	assert.Error(t, err, "second new password should NOT verify")
}

func TestPasswordResetService_ConfirmPasswordReset_UnknownToken_Rejected(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	tokenRepo := newFakeTokenRepo(clock)
	mailer := &fakeEmailSender{}
	svc := newTestPasswordResetService(repo, tokenRepo, mailer, clock)
	ctx := context.Background()

	fakeRawToken := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	assert.Len(t, fakeRawToken, 64)

	err := svc.ConfirmPasswordReset(ctx, fakeRawToken, "anypassword")
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "INVALID_RESET_TOKEN", svcErr.Code)
}

func TestPasswordResetService_RequestPasswordReset_ExistingValidToken_NoNewTokenOrEmail(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	tokenRepo := newFakeTokenRepo(clock)
	mailer := &fakeEmailSender{}
	svc := newTestPasswordResetService(repo, tokenRepo, mailer, clock)
	ctx := context.Background()

	makeSyncSendAsync(t)

	seedUser(t, repo, "ratelimit", "ratelimit@example.com", "password123", models.RoleAthlete)

	require.NoError(t, svc.RequestPasswordReset(ctx, "ratelimit@example.com"))
	initialCount := tokenRepo.count()
	initialEmailCount := mailer.emailCount()
	require.Equal(t, 1, initialCount, "first request should create a token")
	require.Equal(t, 1, initialEmailCount, "first request should send an email")

	err := svc.RequestPasswordReset(ctx, "ratelimit@example.com")
	require.NoError(t, err)
	assert.Equal(t, initialCount, tokenRepo.count(), "second request should NOT create a new token")
	assert.Equal(t, initialEmailCount, mailer.emailCount(), "second request should NOT send a new email")
}

func TestPasswordResetService_RequestPasswordReset_ExpiredToken_NewTokenCreated(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	tokenRepo := newFakeTokenRepo(clock)
	mailer := &fakeEmailSender{}
	svc := newTestPasswordResetService(repo, tokenRepo, mailer, clock)
	ctx := context.Background()

	makeSyncSendAsync(t)

	seedUser(t, repo, "reuseexpired", "reuseexpired@example.com", "password123", models.RoleAthlete)

	require.NoError(t, svc.RequestPasswordReset(ctx, "reuseexpired@example.com"))
	firstEmailCount := mailer.emailCount()

	clock.Add(2 * time.Hour)

	require.NoError(t, svc.RequestPasswordReset(ctx, "reuseexpired@example.com"))
	assert.Equal(t, firstEmailCount+1, mailer.emailCount(), "after expiry, a new token should be created and email sent")
}
