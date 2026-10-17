package services

import (
	"context"
	"testing"
	"time"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/utils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testJWTSecret = "test-secret-must-be-at-least-32-chars-long"

func newTestAuthService(repo *fakeUserRepo, clock utils.Clock) *AuthService {
	return NewAuthService(repo, testJWTSecret, clock)
}

// --- AuthService.Login tests ---

func TestAuthService_Login_DeletedUser(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	svc := newTestAuthService(repo, clock)
	ctx := context.Background()

	user := seedUser(t, repo, "deletedlogin", "deletedlogin@example.com", "password123", models.RoleAthlete)
	// Simulate soft-delete.
	require.NoError(t, repo.SoftDeleteUser(ctx, user.UserID))

	_, err := svc.Login(ctx, LoginRequest{
		Identifier: "deletedlogin@example.com",
		Password:   "password123",
	})
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "ACCOUNT_DELETED", svcErr.Code)
}

func TestAuthService_Login_SuspendedUser(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	svc := newTestAuthService(repo, clock)
	ctx := context.Background()

	user := seedUser(t, repo, "suspended", "suspended@example.com", "password123", models.RoleAthlete)
	// Manually set status to suspended.
	user.Status = models.UserStatusSuspended
	require.NoError(t, repo.UpdateUser(ctx, user))

	_, err := svc.Login(ctx, LoginRequest{
		Identifier: "suspended@example.com",
		Password:   "password123",
	})
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "ACCOUNT_INACTIVE", svcErr.Code)
}

func TestAuthService_Login_BannedUser(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	svc := newTestAuthService(repo, clock)
	ctx := context.Background()

	user := seedUser(t, repo, "banned", "banned@example.com", "password123", models.RoleAthlete)
	user.Status = models.UserStatusBanned
	require.NoError(t, repo.UpdateUser(ctx, user))

	_, err := svc.Login(ctx, LoginRequest{
		Identifier: "banned@example.com",
		Password:   "password123",
	})
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "ACCOUNT_INACTIVE", svcErr.Code)
}

func TestAuthService_Login_ActiveUser_Success(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	svc := newTestAuthService(repo, clock)
	ctx := context.Background()

	seedUser(t, repo, "activeuser", "active@example.com", "password123", models.RoleAthlete)

	resp, err := svc.Login(ctx, LoginRequest{
		Identifier: "active@example.com",
		Password:   "password123",
	})
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.NotEmpty(t, resp.AccessToken)
	assert.NotEmpty(t, resp.RefreshToken)
	assert.Equal(t, "activeuser", resp.User.Username)
}

func TestAuthService_Login_WrongPassword(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	svc := newTestAuthService(repo, clock)
	ctx := context.Background()

	seedUser(t, repo, "wrongpw", "wrongpw@example.com", "realpassword", models.RoleAthlete)

	_, err := svc.Login(ctx, LoginRequest{
		Identifier: "wrongpw@example.com",
		Password:   "wrongpassword",
	})
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "INVALID_CREDENTIALS", svcErr.Code)
}

func TestAuthService_Login_ByUsername(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	svc := newTestAuthService(repo, clock)
	ctx := context.Background()

	seedUser(t, repo, "byusername", "byusername@example.com", "password123", models.RoleTrainer)

	resp, err := svc.Login(ctx, LoginRequest{
		Identifier: "byusername",
		Password:   "password123",
	})
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.Equal(t, "byusername", resp.User.Username)
}

// --- AuthService.RefreshToken tests ---
// Regression tests for security audit finding 3: the refresh token must be
// treated as an authenticator only — role, status, and token version are
// re-read from the database on every refresh.

func TestAuthService_RefreshToken_UsesFreshRoleFromDB(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	svc := newTestAuthService(repo, clock)
	ctx := context.Background()

	// Admin logs in; tokens are minted with the admin role.
	user := seedUser(t, repo, "demoted", "demoted@example.com", "password123", models.RoleAdmin)
	login, err := svc.Login(ctx, LoginRequest{Identifier: "demoted@example.com", Password: "password123"})
	require.NoError(t, err)

	// Admin demotes the user afterwards.
	user.Role = models.RoleAthlete
	require.NoError(t, repo.UpdateUser(ctx, user))

	// The old refresh token must mint an access token with the DB role,
	// not the stale admin role embedded in the token.
	resp, err := svc.RefreshToken(ctx, login.RefreshToken)
	require.NoError(t, err)
	claims, err := svc.ValidateToken(ctx, resp.AccessToken)
	require.NoError(t, err)
	assert.Equal(t, models.RoleAthlete, claims.Role, "refreshed access token must carry the current DB role")
}

func TestAuthService_RefreshToken_RejectedWhenRoleChanged(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	svc := newTestAuthService(repo, clock)
	ctx := context.Background()

	// A role change (AdminService.UpdateUserRole) bumps the token version,
	// which must kill outstanding refresh tokens outright.
	user := seedUser(t, repo, "rolechange", "rolechange@example.com", "password123", models.RoleAdmin)
	login, err := svc.Login(ctx, LoginRequest{Identifier: "rolechange@example.com", Password: "password123"})
	require.NoError(t, err)

	_, err = repo.BumpTokenVersion(ctx, user.UserID)
	require.NoError(t, err)

	_, err = svc.RefreshToken(ctx, login.RefreshToken)
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "TOKEN_REVOKED", svcErr.Code)
}

func TestAuthService_RefreshToken_SuspendedUser(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	svc := newTestAuthService(repo, clock)
	ctx := context.Background()

	user := seedUser(t, repo, "suspendedrefresh", "suspendedrefresh@example.com", "password123", models.RoleAthlete)
	login, err := svc.Login(ctx, LoginRequest{Identifier: "suspendedrefresh@example.com", Password: "password123"})
	require.NoError(t, err)

	// Suspended after login: the refresh token must stop working.
	user.Status = models.UserStatusSuspended
	require.NoError(t, repo.UpdateUser(ctx, user))

	_, err = svc.RefreshToken(ctx, login.RefreshToken)
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "ACCOUNT_INACTIVE", svcErr.Code)
}

func TestAuthService_RefreshToken_DeletedUser(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	svc := newTestAuthService(repo, clock)
	ctx := context.Background()

	user := seedUser(t, repo, "deletedrefresh", "deletedrefresh@example.com", "password123", models.RoleAthlete)
	login, err := svc.Login(ctx, LoginRequest{Identifier: "deletedrefresh@example.com", Password: "password123"})
	require.NoError(t, err)

	require.NoError(t, repo.SoftDeleteUser(ctx, user.UserID))

	_, err = svc.RefreshToken(ctx, login.RefreshToken)
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "ACCOUNT_DELETED", svcErr.Code)
}

func TestAuthService_RefreshToken_PasswordChangeRevokesTokens(t *testing.T) {
	repo := newFakeUserRepo()
	clock := utils.NewFakeClock(time.Now().UTC())
	svc := newTestAuthService(repo, clock)
	ctx := context.Background()

	user := seedUser(t, repo, "pwchange", "pwchange@example.com", "oldpassword1", models.RoleAthlete)
	login, err := svc.Login(ctx, LoginRequest{Identifier: "pwchange@example.com", Password: "oldpassword1"})
	require.NoError(t, err)

	// Password change/reset bumps the token version — the stolen refresh
	// token must be dead from that point on.
	_, err = repo.BumpTokenVersion(ctx, user.UserID)
	require.NoError(t, err)

	_, err = svc.RefreshToken(ctx, login.RefreshToken)
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "TOKEN_REVOKED", svcErr.Code)

	// Logging in again with the new password yields a working token pair.
	login2, err := svc.Login(ctx, LoginRequest{Identifier: "pwchange@example.com", Password: "oldpassword1"})
	require.NoError(t, err)
	resp, err := svc.RefreshToken(ctx, login2.RefreshToken)
	require.NoError(t, err)
	assert.NotEmpty(t, resp.AccessToken)
}

// --- AuthService.RestoreAccount tests ---

func TestAuthService_RestoreAccount_Success(t *testing.T) {
	repo := newFakeUserRepo()
	now := time.Now().UTC()
	clock := utils.NewFakeClock(now)
	svc := newTestAuthService(repo, clock)
	ctx := context.Background()

	user := seedUser(t, repo, "restoreme", "restoreme@example.com", "mypassword", models.RoleAthlete)

	// Soft-delete the user.
	require.NoError(t, repo.SoftDeleteUser(ctx, user.UserID))

	// Verify deleted.
	got, err := repo.GetUserByID(ctx, user.UserID)
	require.NoError(t, err)
	assert.Equal(t, models.UserStatusDeleted, got.Status)

	// Restore within 30-day window (10 days after deletion).
	clock.Set(now.Add(10 * 24 * time.Hour))

	resp, err := svc.RestoreAccount(ctx, "restoreme@example.com", "mypassword")
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.NotEmpty(t, resp.AccessToken)
	assert.NotEmpty(t, resp.RefreshToken)

	// Verify user is active again.
	restored, err := repo.GetUserByID(ctx, user.UserID)
	require.NoError(t, err)
	assert.Equal(t, models.UserStatusActive, restored.Status)
	assert.Nil(t, restored.DeletedAt)
}

func TestAuthService_RestoreAccount_Expired(t *testing.T) {
	repo := newFakeUserRepo()
	now := time.Now().UTC()
	clock := utils.NewFakeClock(now)
	svc := newTestAuthService(repo, clock)
	ctx := context.Background()

	user := seedUser(t, repo, "expiredrestore", "expired@example.com", "mypassword", models.RoleAthlete)

	// Soft-delete the user.
	require.NoError(t, repo.SoftDeleteUser(ctx, user.UserID))

	// Advance clock past 30-day grace period.
	clock.Set(now.Add(31 * 24 * time.Hour))

	_, err := svc.RestoreAccount(ctx, "expired@example.com", "mypassword")
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "RESTORE_EXPIRED", svcErr.Code)
}

func TestAuthService_RestoreAccount_WrongPassword(t *testing.T) {
	repo := newFakeUserRepo()
	now := time.Now().UTC()
	clock := utils.NewFakeClock(now)
	svc := newTestAuthService(repo, clock)
	ctx := context.Background()

	user := seedUser(t, repo, "restorewrongpw", "restorewrongpw@example.com", "realpassword", models.RoleAthlete)
	require.NoError(t, repo.SoftDeleteUser(ctx, user.UserID))

	clock.Set(now.Add(5 * 24 * time.Hour))

	_, err := svc.RestoreAccount(ctx, "restorewrongpw@example.com", "wrongpassword")
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "INVALID_CREDENTIALS", svcErr.Code)
}

func TestAuthService_RestoreAccount_NotDeleted(t *testing.T) {
	repo := newFakeUserRepo()
	now := time.Now().UTC()
	clock := utils.NewFakeClock(now)
	svc := newTestAuthService(repo, clock)
	ctx := context.Background()

	seedUser(t, repo, "notdeleted", "notdeleted@example.com", "password123", models.RoleAthlete)

	_, err := svc.RestoreAccount(ctx, "notdeleted@example.com", "password123")
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected *ServiceError, got %T", err)
	assert.Equal(t, "ACCOUNT_NOT_DELETED", svcErr.Code)
}

func TestAuthService_RestoreAccount_ByUsername(t *testing.T) {
	repo := newFakeUserRepo()
	now := time.Now().UTC()
	clock := utils.NewFakeClock(now)
	svc := newTestAuthService(repo, clock)
	ctx := context.Background()

	user := seedUser(t, repo, "restorebyuser", "restorebyuser@example.com", "mypassword", models.RoleAthlete)
	require.NoError(t, repo.SoftDeleteUser(ctx, user.UserID))

	clock.Set(now.Add(5 * 24 * time.Hour))

	resp, err := svc.RestoreAccount(ctx, "restorebyuser", "mypassword")
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.Equal(t, "restorebyuser", resp.User.Username)
}
