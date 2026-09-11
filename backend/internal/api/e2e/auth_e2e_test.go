package e2e

import (
	"net/http"
	"testing"
)

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
