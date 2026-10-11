package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/services"
)

func newTestCtx() (*gin.Context, *httptest.ResponseRecorder) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/coaching-requests", nil)
	return c, w
}

func responseError(t *testing.T, w *httptest.ResponseRecorder) string {
	t.Helper()
	var body map[string]string
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	msg, ok := body["error"]
	require.True(t, ok, "response has no error field: %s", w.Body.String())
	return msg
}

// TestHandleBusinessError_InternalErrorsAreNotLeaked is the regression guard for
// the P0 defect: internal failures used to be string-matched, so a wrapped
// infrastructure error fell through to a 400 carrying the raw message, and was
// never logged.
func TestHandleBusinessError_InternalErrorsAreNotLeaked(t *testing.T) {
	tests := []struct {
		name string
		err  error
	}{
		{
			name: "wrapped database failure",
			err:  fmt.Errorf("failed to create coaching request: %w", fmt.Errorf(`ERROR: relation "coaching_requests" does not exist (SQLSTATE 42P01)`)),
		},
		{
			name: "unrecognised business error",
			err:  fmt.Errorf("some failure nobody anticipated"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, w := newTestCtx()
			handleBusinessError(c, tt.err)

			assert.Equal(t, http.StatusInternalServerError, w.Code)
			msg := responseError(t, w)
			assert.Equal(t, "Something went wrong while processing your request. Please try again later", msg)
			assert.NotContains(t, msg, "SQLSTATE")
			assert.NotContains(t, msg, "does not exist")
			assert.NotContains(t, msg, "failed to create")
		})
	}
}

func TestHandleBusinessError_KnownSentinelsMapToExpectedStatus(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
	}{
		{"generic not found", domainerrors.ErrNotFound, http.StatusNotFound},
		{"coach target not found", services.ErrCoachTargetNotFound, http.StatusNotFound},
		{"coaching request not found", services.ErrCoachingRequestNotFound, http.StatusNotFound},
		{"review not found", services.ErrReviewNotFound, http.StatusNotFound},
		{"invalid invitation code", domainerrors.ErrInvalidInvitationCode, http.StatusNotFound},

		{"not request owner", services.ErrNotCoachingRequestOwner, http.StatusForbidden},
		{"review needs relationship", services.ErrReviewRequiresActiveRelationship, http.StatusForbidden},
		{"cannot edit review", services.ErrCannotEditReview, http.StatusForbidden},
		{"cannot delete review", services.ErrCannotDeleteReview, http.StatusForbidden},

		{"already has trainer", services.ErrAlreadyHasActiveTrainer, http.StatusConflict},
		{"pending request exists", services.ErrPendingCoachingRequestExists, http.StatusConflict},
		{"athlete already has trainer", services.ErrAthleteAlreadyHasActiveTrainer, http.StatusConflict},
		{"already reviewed", services.ErrAlreadyReviewedTrainer, http.StatusConflict},
		{"request already resolved", &services.CoachingRequestResolvedError{Status: "accepted"}, http.StatusConflict},
		{"invitation already used", domainerrors.ErrInvitationAlreadyUsed, http.StatusConflict},

		{"target not a trainer", services.ErrCoachTargetNotTrainer, http.StatusBadRequest},
		{"empty invitation code", domainerrors.ErrInvitationCodeEmpty, http.StatusBadRequest},
		{"invitation expired", domainerrors.ErrInvitationExpired, http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, w := newTestCtx()
			handleBusinessError(c, tt.err)

			assert.Equal(t, tt.wantStatus, w.Code)
			assert.Equal(t, tt.err.Error(), responseError(t, w))
		})
	}
}

// TestHandleBusinessError_SentinelsSurviveWrapping confirms handlers still match
// a sentinel after an intervening wrap, and that the wrap prefix never reaches
// the client — the response body must be the sentinel's own text.
func TestHandleBusinessError_SentinelsSurviveWrapping(t *testing.T) {
	c, w := newTestCtx()
	handleBusinessError(c, fmt.Errorf("service layer: %w", services.ErrNotCoachingRequestOwner))

	assert.Equal(t, http.StatusForbidden, w.Code)
	msg := responseError(t, w)
	assert.Equal(t, services.ErrNotCoachingRequestOwner.Error(), msg)
	assert.NotContains(t, msg, "service layer")
}

func TestHandleBusinessError_WrappedResolvedRequestKeepsStatus(t *testing.T) {
	c, w := newTestCtx()
	handleBusinessError(c, fmt.Errorf("accept: %w", &services.CoachingRequestResolvedError{Status: "rejected"}))

	assert.Equal(t, http.StatusConflict, w.Code)
	msg := responseError(t, w)
	assert.Contains(t, msg, "rejected")
	assert.NotContains(t, msg, "accept:")
}

// TestCoachingRequestResolvedError_MessageIsStable guards against the status
// being formatted into a template that changes shape, which would fragment log
// grouping.
// TestHandleInternalError_HonoursWriteViolations covers the gap that made the
// repository-layer SQLSTATE mapping ineffective: most handlers report failures
// through handleInternalError, not handleBusinessError, so a constraint
// violation classified by the repository was still rendered as a 500.
//
// Simulates what postgres.mapWriteError produces — a wrapped *pgconn.PgError
// alongside the sentinel — arriving at a handler's generic error path.
func TestHandleInternalError_HonoursWriteViolations(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
	}{
		{
			name: "duplicate key surfaces as conflict",
			err: fmt.Errorf("failed to create user: %w [constraint users_email_key]: %w",
				domainerrors.ErrConflict, &pgconn.PgError{Code: "23505", ConstraintName: "users_email_key"}),
			wantStatus: http.StatusConflict,
		},
		{
			name: "failed check surfaces as bad request",
			err: fmt.Errorf("failed to create comment: %w [constraint comments_content_check]: %w",
				domainerrors.ErrInvalidInput, &pgconn.PgError{Code: "23514", ConstraintName: "comments_content_check"}),
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "bare sentinel is still honoured",
			err:        domainerrors.ErrConflict,
			wantStatus: http.StatusConflict,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, w := newTestCtx()
			handleInternalError(c, tt.err, "failed to write")

			assert.Equal(t, tt.wantStatus, w.Code)
			msg := responseError(t, w)
			// The sentinel's own text, never the wrap: constraint names and
			// driver detail stay in the logs.
			assert.NotContains(t, msg, "constraint")
			assert.NotContains(t, msg, "failed to create")
			assert.NotContains(t, msg, "23505")
		})
	}
}

// TestHandleInternalError_OtherSentinelsStayInternal pins the blast radius of
// the change above. Only write violations were reclassified; every other
// unrecognised error must still be a generic 500, so GET handlers that surface
// ErrNotFound keep their existing behaviour.
func TestHandleInternalError_OtherErrorsRemainInternal(t *testing.T) {
	tests := []struct {
		name string
		err  error
	}{
		{"bare not found on a read path", domainerrors.ErrNotFound},
		{"unrecognised failure", fmt.Errorf("some failure nobody anticipated")},
		{"infrastructure failure", fmt.Errorf("connection refused")},
		{"unauthorized", domainerrors.ErrUnauthorized},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, w := newTestCtx()
			handleInternalError(c, tt.err, "failed")

			assert.Equal(t, http.StatusInternalServerError, w.Code)
			assert.Equal(t, "Something went wrong while processing your request. Please try again later", responseError(t, w))
		})
	}
}

func TestCoachingRequestResolvedError_MessageIsStable(t *testing.T) {
	pending := &services.CoachingRequestResolvedError{Status: "accepted"}
	other := &services.CoachingRequestResolvedError{Status: "rejected"}

	assert.Contains(t, pending.Error(), "accepted")
	assert.NotContains(t, pending.Error(), "%s")
	assert.NotEqual(t, pending.Error(), other.Error())
	assert.ErrorIs(t, pending, services.ErrCoachingRequestAlreadyResolved)
	assert.ErrorIs(t, other, services.ErrCoachingRequestAlreadyResolved)
}
