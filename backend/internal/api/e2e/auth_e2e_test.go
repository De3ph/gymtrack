package e2e

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"testing"
	"time"
)

// resetTokenHash mirrors services.hashResetToken — the only form ever
// persisted in password_reset_tokens.token_hash (hex of SHA-256 of the raw
// 64-char token that normally only exists in the emailed reset link).
func resetTokenHash(rawToken string) string {
	sum := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(sum[:])
}

func TestE2E_Register_Login_Protected(t *testing.T) {
	env := SetupTestEnv(t)

	// Register an athlete
	username, email, _ := env.RegisterUser(t, "alice", "alice@e2e.test", "Password123!", "athlete")

	// Login with email
	w := env.DoRequest(http.MethodPost, "/api/auth/login", map[string]any{
		"identifier": email, "password": "Password123!",
	}, nil)
	RequireStatus(t, w, http.StatusOK)
	var login struct {
		AccessToken  string `json:"accessToken"`
		RefreshToken string `json:"refreshToken"`
	}
	ParseJSON(t, w.Body.Bytes(), &login)
	if login.AccessToken == "" || login.RefreshToken == "" {
		t.Fatal("expected non-empty tokens")
	}

	// Access a protected route with the token
	w = env.DoAuthRequest(http.MethodGet, "/api/users/me", nil, login.AccessToken)
	RequireStatus(t, w, http.StatusOK)
	var me struct {
		Username string `json:"username"`
	}
	ParseJSON(t, w.Body.Bytes(), &me)
	if me.Username != username {
		t.Fatalf("expected username %q, got %q", username, me.Username)
	}
}

func TestE2E_Register_DuplicateEmailAndUsername(t *testing.T) {
	env := SetupTestEnv(t)

	username, email, _ := env.RegisterUser(t, "dup1", "dup@e2e.test", "Password123!", "athlete")

	// Same email
	w := env.DoRequest(http.MethodPost, "/api/auth/register", map[string]any{
		"username": UniqueName("dup2"), "email": email, "password": "Password123!", "role": "athlete",
	}, nil)
	RequireStatus(t, w, http.StatusConflict)

	// Same username
	w = env.DoRequest(http.MethodPost, "/api/auth/register", map[string]any{
		"username": username, "email": UniqueName("other") + "@e2e.test", "password": "Password123!", "role": "athlete",
	}, nil)
	RequireStatus(t, w, http.StatusConflict)
}

func TestE2E_Register_InvalidRole(t *testing.T) {
	env := SetupTestEnv(t)
	w := env.DoRequest(http.MethodPost, "/api/auth/register", map[string]any{
		"username": "admintry", "email": "admintry@e2e.test", "password": "Password123!", "role": "admin",
	}, nil)
	RequireStatus(t, w, http.StatusBadRequest)
}

func TestE2E_Login_WrongPassword(t *testing.T) {
	env := SetupTestEnv(t)
	_, email, _ := env.RegisterUser(t, "wrongpw", "wrongpw@e2e.test", "Password123!", "athlete")

	w := env.DoRequest(http.MethodPost, "/api/auth/login", map[string]any{
		"identifier": email, "password": "WrongPass1!",
	}, nil)
	RequireStatus(t, w, http.StatusUnauthorized)
}

func TestE2E_Login_ByUsername(t *testing.T) {
	env := SetupTestEnv(t)
	username, _, _ := env.RegisterUser(t, "loginbyname", "loginbyname@e2e.test", "Password123!", "athlete")

	w := env.DoRequest(http.MethodPost, "/api/auth/login", map[string]any{
		"identifier": username, "password": "Password123!",
	}, nil)
	RequireStatus(t, w, http.StatusOK)
}

func TestE2E_ProtectedRoute_MissingAndInvalidToken(t *testing.T) {
	env := SetupTestEnv(t)

	// Missing token
	w := env.DoRequest(http.MethodGet, "/api/users/me", nil, nil)
	RequireStatus(t, w, http.StatusUnauthorized)

	// Invalid token
	w = env.DoRequest(http.MethodGet, "/api/users/me", nil, map[string]string{
		"Authorization": "Bearer not.a.valid.token",
	})
	RequireStatus(t, w, http.StatusUnauthorized)

	// Malformed header
	w = env.DoRequest(http.MethodGet, "/api/users/me", nil, map[string]string{
		"Authorization": "Basic abc",
	})
	RequireStatus(t, w, http.StatusUnauthorized)
}

func TestE2E_RefreshToken(t *testing.T) {
	env := SetupTestEnv(t)
	_, email, _ := env.RegisterUser(t, "refresher", "refresher@e2e.test", "Password123!", "athlete")

	w := env.DoRequest(http.MethodPost, "/api/auth/login", map[string]any{
		"identifier": email, "password": "Password123!",
	}, nil)
	RequireStatus(t, w, http.StatusOK)
	var login struct {
		RefreshToken string `json:"refreshToken"`
	}
	ParseJSON(t, w.Body.Bytes(), &login)

	// Use the refresh token to obtain a new access token
	w = env.DoRequest(http.MethodPost, "/api/auth/refresh", map[string]any{
		"refreshToken": login.RefreshToken,
	}, nil)
	RequireStatus(t, w, http.StatusOK)
	var refresh struct {
		AccessToken string `json:"accessToken"`
	}
	ParseJSON(t, w.Body.Bytes(), &refresh)
	if refresh.AccessToken == "" {
		t.Fatal("expected non-empty access token from refresh")
	}

	// The new access token must work on a protected route
	w = env.DoAuthRequest(http.MethodGet, "/api/users/me", nil, refresh.AccessToken)
	RequireStatus(t, w, http.StatusOK)

	// An access token used as a refresh token must be rejected
	w = env.DoRequest(http.MethodPost, "/api/auth/refresh", map[string]any{
		"refreshToken": refresh.AccessToken,
	}, nil)
	RequireStatus(t, w, http.StatusUnauthorized)
}

func TestE2E_DeleteAndRestoreAccount(t *testing.T) {
	env := SetupTestEnv(t)
	_, email, _ := env.RegisterUser(t, "restorer", "restorer@e2e.test", "Password123!", "athlete")
	token, _ := env.Login(t, email, "Password123!")

	// Soft-delete the account
	w := env.DoAuthRequest(http.MethodDelete, "/api/users/me", map[string]any{
		"password": "Password123!",
	}, token)
	RequireStatus(t, w, http.StatusOK)

	// Login must now be rejected
	w = env.DoRequest(http.MethodPost, "/api/auth/login", map[string]any{
		"identifier": email, "password": "Password123!",
	}, nil)
	RequireStatus(t, w, http.StatusForbidden)

	// Restore the account
	w = env.DoRequest(http.MethodPost, "/api/auth/restore", map[string]any{
		"identifier": email, "password": "Password123!",
	}, nil)
	RequireStatus(t, w, http.StatusOK)
	var restored struct {
		AccessToken string `json:"accessToken"`
	}
	ParseJSON(t, w.Body.Bytes(), &restored)

	// Restored account can access protected routes again
	w = env.DoAuthRequest(http.MethodGet, "/api/users/me", nil, restored.AccessToken)
	RequireStatus(t, w, http.StatusOK)
}

func TestE2E_DeleteAccount_WrongPassword(t *testing.T) {
	env := SetupTestEnv(t)
	_, email, _ := env.RegisterUser(t, "delpw", "delpw@e2e.test", "Password123!", "athlete")
	token, _ := env.Login(t, email, "Password123!")

	w := env.DoAuthRequest(http.MethodDelete, "/api/users/me", map[string]any{
		"password": "WrongPass1!",
	}, token)
	RequireStatus(t, w, http.StatusUnauthorized)
}

func TestE2E_RateLimiter_AllowsNormalTraffic(t *testing.T) {
	env := SetupTestEnv(t)

	// A handful of sequential register attempts must not hit the rate limit
	// (AuthLimiter allows 5 req/s with burst 10). Names must be unique AND
	// alphanum-only (registration validates alphanum) — use the helper.
	for _, p := range []string{"rla", "rlb", "rlc", "rld", "rle"} {
		username, email, _ := env.RegisterUser(t, p, p+"@e2e.test", "Password123!", "athlete")
		_ = username
		_ = email
	}
}

func TestE2E_Register_InvalidPayloads(t *testing.T) {
	env := SetupTestEnv(t)

	valid := map[string]any{
		"username": "regval", "email": "regval@e2e.test",
		"password": "Password123!", "role": "athlete",
	}
	with := func(patch map[string]any) map[string]any {
		body := make(map[string]any, len(valid)+len(patch))
		for k, v := range valid {
			body[k] = v
		}
		for k, v := range patch {
			body[k] = v
		}
		return body
	}

	// Missing required fields entirely
	w := env.DoRequest(http.MethodPost, "/api/auth/register", map[string]any{}, nil)
	RequireStatus(t, w, http.StatusBadRequest)

	// Weak password (< min=8) — validator-stage message
	w = env.DoRequest(http.MethodPost, "/api/auth/register",
		with(map[string]any{"password": "short"}), nil)
	RequireJSONError(t, w, http.StatusBadRequest,
		"Invalid registration data. Please check the highlighted fields and try again")

	// Username too short (min 3) and non-alphanum
	w = env.DoRequest(http.MethodPost, "/api/auth/register",
		with(map[string]any{"username": "ab"}), nil)
	RequireStatus(t, w, http.StatusBadRequest)
	w = env.DoRequest(http.MethodPost, "/api/auth/register",
		with(map[string]any{"username": "bad-name"}), nil)
	RequireStatus(t, w, http.StatusBadRequest)

	// Invalid email
	w = env.DoRequest(http.MethodPost, "/api/auth/register",
		with(map[string]any{"email": "not-an-email"}), nil)
	RequireStatus(t, w, http.StatusBadRequest)

	// Not a JSON object at all
	w = env.DoRequest(http.MethodPost, "/api/auth/register", "not-an-object", nil)
	RequireStatus(t, w, http.StatusBadRequest)
}

func TestE2E_RefreshToken_InvalidInput(t *testing.T) {
	env := SetupTestEnv(t)

	// Missing body → 400 (ShouldBindJSON fails)
	w := env.DoRequest(http.MethodPost, "/api/auth/refresh", map[string]any{}, nil)
	RequireStatus(t, w, http.StatusBadRequest)

	// Garbage refresh token → 401 (invalid/expired/type all map to 401)
	w = env.DoRequest(http.MethodPost, "/api/auth/refresh",
		map[string]any{"refreshToken": "not-a-jwt"}, nil)
	RequireStatus(t, w, http.StatusUnauthorized)

	// Not a JSON object → 400
	w = env.DoRequest(http.MethodPost, "/api/auth/refresh", "not-an-object", nil)
	RequireStatus(t, w, http.StatusBadRequest)
}

func TestE2E_Logout(t *testing.T) {
	env := SetupTestEnv(t)

	// The logout route has no JWT middleware — it must succeed unauthenticated
	// (the handler returns a static confirmation; clients clear local tokens).
	// Note: the swagger doc claims @Failure 401 but it is unreachable today.
	w := env.DoRequest(http.MethodPost, "/api/auth/logout", map[string]any{}, nil)
	RequireStatus(t, w, http.StatusOK)
	var msg struct {
		Message string `json:"message"`
	}
	ParseJSON(t, w.Body.Bytes(), &msg)
	if msg.Message != "Logout successful" {
		t.Fatalf("unexpected message: %q", msg.Message)
	}

	// Same contract when called with a valid token
	_, email, _ := env.RegisterUser(t, "logoutr", "logoutr@e2e.test", "Password123!", "athlete")
	token, _ := env.Login(t, email, "Password123!")
	w = env.DoAuthRequest(http.MethodPost, "/api/auth/logout", nil, token)
	RequireStatus(t, w, http.StatusOK)
	ParseJSON(t, w.Body.Bytes(), &msg)
	if msg.Message != "Logout successful" {
		t.Fatalf("unexpected message: %q", msg.Message)
	}
}

func TestE2E_Restore_EdgeCases(t *testing.T) {
	env := SetupTestEnv(t)

	// (a) Restoring a non-deleted account → 403 ACCOUNT_NOT_DELETED
	_, emailA, _ := env.RegisterUser(t, "rsta", "rsta@e2e.test", "Password123!", "athlete")
	w := env.DoRequest(http.MethodPost, "/api/auth/restore", map[string]any{
		"identifier": emailA, "password": "Password123!",
	}, nil)
	RequireJSONError(t, w, http.StatusForbidden,
		"This account is not deleted, so there's nothing to restore. Please log in normally")

	// (b) Unknown identifier → 401 (generic credentials message)
	w = env.DoRequest(http.MethodPost, "/api/auth/restore", map[string]any{
		"identifier": "ghost@e2e.test", "password": "Password123!",
	}, nil)
	RequireJSONError(t, w, http.StatusUnauthorized,
		"Incorrect email/username or password. Please check your credentials and try again.")

	// (c) Wrong password on a deleted account → 401 (password checked first)
	_, emailB, idB := env.RegisterUser(t, "rstb", "rstb@e2e.test", "Password123!", "athlete")
	tokenB, _ := env.Login(t, emailB, "Password123!")
	w = env.DoAuthRequest(http.MethodDelete, "/api/users/me",
		map[string]any{"password": "Password123!"}, tokenB)
	RequireStatus(t, w, http.StatusOK)
	w = env.DoRequest(http.MethodPost, "/api/auth/restore", map[string]any{
		"identifier": emailB, "password": "WrongPass1!",
	}, nil)
	RequireJSONError(t, w, http.StatusUnauthorized,
		"Incorrect email/username or password. Please check your credentials and try again.")

	// (d) Restore window is 30 days from soft deletion — backdate past it → 403
	if _, err := env.DB.Exec(context.Background(),
		`UPDATE users SET deleted_at = NOW() - INTERVAL '31 days' WHERE user_id = $1`, idB); err != nil {
		t.Fatalf("failed to backdate deleted_at: %v", err)
	}
	w = env.DoRequest(http.MethodPost, "/api/auth/restore", map[string]any{
		"identifier": emailB, "password": "Password123!",
	}, nil)
	RequireJSONError(t, w, http.StatusForbidden,
		"The 30-day restore period has expired, so this account can no longer be restored. Please create a new account")

	// (e) Missing fields → 400
	w = env.DoRequest(http.MethodPost, "/api/auth/restore", map[string]any{}, nil)
	RequireStatus(t, w, http.StatusBadRequest)
}

func TestE2E_PasswordReset_RequestValidation(t *testing.T) {
	env := SetupTestEnv(t)

	// Missing / invalid email → 400 (binding + validator share the message)
	wantMsg := "Invalid request. Please check the email address and try again"
	w := env.DoRequest(http.MethodPost, "/api/auth/password-reset/request", map[string]any{}, nil)
	RequireJSONError(t, w, http.StatusBadRequest, wantMsg)
	w = env.DoRequest(http.MethodPost, "/api/auth/password-reset/request",
		map[string]any{"email": "not-an-email"}, nil)
	RequireJSONError(t, w, http.StatusBadRequest, wantMsg)
	w = env.DoRequest(http.MethodPost, "/api/auth/password-reset/request", "not-an-object", nil)
	RequireJSONError(t, w, http.StatusBadRequest, wantMsg)

	// Unknown email → same generic 200 as a known one (no enumeration) and
	// no reset token row is created.
	w = env.DoRequest(http.MethodPost, "/api/auth/password-reset/request",
		map[string]any{"email": "nobody-here@e2e.test"}, nil)
	RequireJSONMessage(t, w, http.StatusOK,
		"If an account with that email exists, a password reset link has been sent")
	var n int
	if err := env.DB.QueryRow(context.Background(),
		`SELECT count(*) FROM password_reset_tokens`).Scan(&n); err != nil {
		t.Fatalf("count password_reset_tokens: %v", err)
	}
	if n != 0 {
		t.Fatalf("expected no token rows for unknown email, got %d", n)
	}

	// Confirm-side validation
	w = env.DoRequest(http.MethodPost, "/api/auth/password-reset/confirm", map[string]any{}, nil)
	RequireJSONError(t, w, http.StatusBadRequest,
		"Invalid request. Please check the email address and try again")
	w = env.DoRequest(http.MethodPost, "/api/auth/password-reset/confirm",
		map[string]any{"token": "abc", "newPassword": "short"}, nil)
	RequireJSONError(t, w, http.StatusBadRequest,
		"Invalid request. Please check the email address and try again")
	w = env.DoRequest(http.MethodPost, "/api/auth/password-reset/confirm", "not-an-object", nil)
	RequireJSONError(t, w, http.StatusBadRequest,
		"Invalid request. Please check the email address and try again")

	// Unknown token → 400 with the generic invalid-link message (all failure
	// modes collapse into ErrInvalidResetToken so no reason is leaked).
	w = env.DoRequest(http.MethodPost, "/api/auth/password-reset/confirm",
		map[string]any{"token": "deadbeef", "newPassword": "ResetPass456!"}, nil)
	RequireJSONError(t, w, http.StatusBadRequest,
		"This password reset link is invalid or has expired. Please request a new one.")
}

func TestE2E_PasswordReset_FullFlow(t *testing.T) {
	env := SetupTestEnv(t)
	ctx := context.Background()
	_, email, userID := env.RegisterUser(t, "pwrst", "pwrst@e2e.test", "Password123!", "athlete")

	countValid := func() int {
		t.Helper()
		var n int
		if err := env.DB.QueryRow(ctx,
			`SELECT count(*) FROM password_reset_tokens
			 WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()`,
			userID).Scan(&n); err != nil {
			t.Fatalf("count valid reset tokens: %v", err)
		}
		return n
	}

	// 1) Request creates exactly one valid token for a known account
	w := env.DoRequest(http.MethodPost, "/api/auth/password-reset/request",
		map[string]any{"email": email}, nil)
	RequireJSONMessage(t, w, http.StatusOK,
		"If an account with that email exists, a password reset link has been sent")
	if got := countValid(); got != 1 {
		t.Fatalf("expected 1 valid token after request, got %d", got)
	}

	// 2) A second request while a valid token exists must NOT mint a duplicate
	w = env.DoRequest(http.MethodPost, "/api/auth/password-reset/request",
		map[string]any{"email": email}, nil)
	RequireStatus(t, w, http.StatusOK)
	if got := countValid(); got != 1 {
		t.Fatalf("expected still 1 valid token after duplicate request, got %d", got)
	}

	// 3) Swap the stored hash for one derived from a token we know — the raw
	//    token normally only exists in the emailed link, so an e2e test cannot
	//    observe it (the service persists SHA-256 only).
	rawToken := UniqueName("e2e-reset-token-0123456789abcdef")
	if _, err := env.DB.Exec(ctx,
		`UPDATE password_reset_tokens SET token_hash = $2 WHERE user_id = $1`,
		userID, resetTokenHash(rawToken)); err != nil {
		t.Fatalf("failed to swap token hash: %v", err)
	}

	// 4) Confirm with the raw token → 200
	w = env.DoRequest(http.MethodPost, "/api/auth/password-reset/confirm",
		map[string]any{"token": rawToken, "newPassword": "ResetPass456!"}, nil)
	RequireJSONMessage(t, w, http.StatusOK, "Password has been reset successfully")

	// 5) Token is single-use: it was consumed
	if got := countValid(); got != 0 {
		t.Fatalf("expected token consumed after confirm, got %d valid", got)
	}

	// 6) Old password rejected, new password works
	w = env.DoRequest(http.MethodPost, "/api/auth/login",
		map[string]any{"identifier": email, "password": "Password123!"}, nil)
	RequireJSONError(t, w, http.StatusUnauthorized,
		"Incorrect email/username or password. Please check your credentials and try again.")
	w = env.DoRequest(http.MethodPost, "/api/auth/login",
		map[string]any{"identifier": email, "password": "ResetPass456!"}, nil)
	RequireStatus(t, w, http.StatusOK)

	// 7) Replaying the consumed token → 400 (generic invalid-link message)
	w = env.DoRequest(http.MethodPost, "/api/auth/password-reset/confirm",
		map[string]any{"token": rawToken, "newPassword": "AnotherPass789!"}, nil)
	RequireJSONError(t, w, http.StatusBadRequest,
		"This password reset link is invalid or has expired. Please request a new one.")

	// 8) Expired token → same generic 400 (GetValidTokenByHash filters expires_at)
	rawToken2 := rawToken + "-2"
	if _, err := env.DB.Exec(ctx,
		`UPDATE password_reset_tokens
		 SET token_hash = $2, used_at = NULL, expires_at = NOW() - INTERVAL '1 hour'
		 WHERE user_id = $1`,
		userID, resetTokenHash(rawToken2)); err != nil {
		t.Fatalf("failed to seed expired token: %v", err)
	}
	w = env.DoRequest(http.MethodPost, "/api/auth/password-reset/confirm",
		map[string]any{"token": rawToken2, "newPassword": "AnotherPass789!"}, nil)
	RequireJSONError(t, w, http.StatusBadRequest,
		"This password reset link is invalid or has expired. Please request a new one.")
}

func TestE2E_RateLimiter_TooManyRequests(t *testing.T) {
	env := SetupTestEnv(t)

	// AuthLimiter = 5 req/s, burst 10. Invalid login bodies are rejected by
	// binding/validation before any bcrypt/DB work, so the bucket is drained
	// deterministically without depending on crypto timing.
	w := env.DoRequest(http.MethodPost, "/api/auth/login", map[string]any{}, nil)
	RequireStatus(t, w, http.StatusBadRequest) // fresh bucket allows the first request

	saw429 := false
	for i := 0; i < 30 && !saw429; i++ {
		w = env.DoRequest(http.MethodPost, "/api/auth/login", map[string]any{}, nil)
		if w.Code == http.StatusTooManyRequests {
			RequireJSONError(t, w, http.StatusTooManyRequests,
				"too many requests, please try again later")
			saw429 = true
		}
	}
	if !saw429 {
		t.Fatalf("expected at least one 429 after exceeding burst (10) — limiter did not trip")
	}

	// The bucket refills at 5/s — after 1s the client may proceed again.
	time.Sleep(time.Second)
	w = env.DoRequest(http.MethodPost, "/api/auth/login", map[string]any{}, nil)
	RequireStatus(t, w, http.StatusBadRequest)
}
