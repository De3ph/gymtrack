package e2e

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// DoRequest executes an HTTP request against the test environment router.
func (e *TestEnv) DoRequest(method, path string, body any, headers map[string]string) *httptest.ResponseRecorder {
	var reqBody *bytes.Buffer
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			panic(fmt.Sprintf("marshal body: %v", err))
		}
		reqBody = bytes.NewBuffer(b)
	} else {
		reqBody = bytes.NewBuffer(nil)
	}
	req := httptest.NewRequest(method, path, reqBody)
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	e.Router.ServeHTTP(w, req)
	return w
}

// DoAuthRequest executes an authenticated request with a Bearer token.
func (e *TestEnv) DoAuthRequest(method, path string, body any, token string) *httptest.ResponseRecorder {
	return e.DoRequest(method, path, body, map[string]string{"Authorization": "Bearer " + token})
}

// nameSeq hands out process-unique suffixes (atomic: safe if tests ever run
// t.Parallel, and unique across SetupTestEnv instances).
var nameSeq atomic.Uint64

// UniqueName returns an alphanum-safe unique name with the given prefix.
func UniqueName(prefix string) string {
	return fmt.Sprintf("%s%x", prefix, nameSeq.Add(1)+uint64(time.Now().UnixNano()%997))
}

// RegisterUser registers a user via the HTTP API and returns the username,
// email and user ID. Names are made unique per call so parallel
// SetupTestEnv instances (isolated DBs) never collide.
func (e *TestEnv) RegisterUser(t testing.TB, username, email, password, role string) (string, string, int) {
	t.Helper()
	uniq := fmt.Sprintf("%x", nameSeq.Add(1)+uint64(time.Now().UnixNano()%997))
	makeUnique := func(s string) string {
		at := -1
		for i := len(s) - 1; i >= 0; i-- {
			if s[i] == '@' {
				at = i
				break
			}
		}
		if at >= 0 {
			return s[:at] + uniq + s[at:]
		}
		return s + uniq
	}
	username = makeUnique(username)
	email = makeUnique(email)
	w := e.DoRequest(http.MethodPost, "/api/auth/register", map[string]any{
		"username": username, "email": email, "password": password, "role": role,
	}, nil)
	RequireStatus(t, w, http.StatusCreated)
	var resp struct {
		UserID int `json:"userId"`
	}
	ParseJSON(t, w.Body.Bytes(), &resp)
	return username, email, resp.UserID
}

// Login authenticates via the HTTP API and returns the access token and user ID.
func (e *TestEnv) Login(t testing.TB, identifier, password string) (token string, userID int) {
	t.Helper()
	w := e.DoRequest(http.MethodPost, "/api/auth/login", map[string]any{
		"identifier": identifier, "password": password,
	}, nil)
	RequireStatus(t, w, http.StatusOK)
	var resp struct {
		AccessToken string `json:"accessToken"`
		User        struct {
			UserID int `json:"userId"`
		} `json:"user"`
	}
	ParseJSON(t, w.Body.Bytes(), &resp)
	return resp.AccessToken, resp.User.UserID
}

// RegisterAthlete is a convenience for athlete registration + login.
// Usernames are alphanum-only (registration validates alphanum).
func (e *TestEnv) RegisterAthlete(t testing.TB, suffix string) (token string, userID int) {
	t.Helper()
	_, email, _ := e.RegisterUser(t, "ath"+suffix, "ath"+suffix+"@e2e.test", "Password123!", "athlete")
	return e.Login(t, email, "Password123!")
}

// RegisterTrainer is a convenience for trainer registration + login.
func (e *TestEnv) RegisterTrainer(t testing.TB, suffix string) (token string, userID int) {
	t.Helper()
	_, email, _ := e.RegisterUser(t, "trn"+suffix, "trn"+suffix+"@e2e.test", "Password123!", "trainer")
	return e.Login(t, email, "Password123!")
}

// ParseJSON decodes a response body into v, failing the test on error.
func ParseJSON(t testing.TB, body []byte, v any) {
	t.Helper()
	require.NoError(t, json.Unmarshal(body, v), "body: %s", string(body))
}

// RequireStatus fails the test if the HTTP status code does not match.
func RequireStatus(t testing.TB, w *httptest.ResponseRecorder, want int) {
	t.Helper()
	if w.Code != want {
		t.Fatalf("status mismatch: want %d, got %d, body: %s", want, w.Code, w.Body.String())
	}
}

// RequireJSONError asserts the status code and the "error" field of the response.
func RequireJSONError(t testing.TB, w *httptest.ResponseRecorder, wantStatus int, wantError string) {
	t.Helper()
	RequireStatus(t, w, wantStatus)
	var resp map[string]any
	ParseJSON(t, w.Body.Bytes(), &resp)
	errVal, ok := resp["error"]
	if !ok {
		t.Fatalf("expected 'error' key, got: %s", w.Body.String())
	}
	assert.Equal(t, wantError, errVal, "error message mismatch")
}

// ClearAllData deletes all rows for test isolation.
func (e *TestEnv) ClearAllData(t testing.TB) {
	t.Helper()
	ctx := context.Background()
	tables := []string{
		"workout_plan_assignments", "workout_plans", "trainer_reviews",
		"trainer_availabilities", "coaching_requests", "invitations",
		"comments", "body_measurements", "meals", "workouts",
		"relationships", "password_reset_tokens", "users",
	}
	for _, table := range tables {
		_, _ = e.DB.Exec(ctx, "DELETE FROM "+table)
	}
}
