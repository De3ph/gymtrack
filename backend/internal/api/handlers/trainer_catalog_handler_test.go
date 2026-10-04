package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"
)

// newTrainerCtx builds a request context whose path params come from the URL
// pattern, plus optional JSON body. Path params are set separately by tests
// that exercise :id handlers.
func newTrainerCtx(method, path, body string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	var reader *strings.Reader
	if body != "" {
		reader = strings.NewReader(body)
	} else {
		reader = strings.NewReader("")
	}
	c.Request = httptest.NewRequest(method, path, reader)
	c.Request.Header.Set("Content-Type", "application/json")
	return c, w
}

func TestTrainerCatalogHandler_GetTrainers(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{
		publicTrainers: []models.TrainerWithProfile{{
			User:           models.User{UserID: 1, Username: "coach", Role: models.RoleTrainer},
			TrainerProfile: models.TrainerProfile{Bio: "yoga"},
			AverageRating:  4,
			ReviewCount:    2,
		}},
		count: 1,
	}
	reviewRepo := &fakeReviewRepo{byTrainer: []models.TrainerReview{
		{ReviewID: 1, TrainerID: 1, AthleteID: 9, Rating: 4},
		{ReviewID: 2, TrainerID: 1, AthleteID: 10, Rating: 4},
	}}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, reviewRepo))

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers", "")
	handler.GetTrainers(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body struct {
		Total    int                         `json:"total"`
		Limit    int                         `json:"limit"`
		Offset   int                         `json:"offset"`
		Trainers []models.TrainerWithProfile `json:"trainers"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, 1, body.Total)
	assert.Equal(t, 20, body.Limit, "default page size is 20")
	assert.Equal(t, 0, body.Offset)
	require.Len(t, body.Trainers, 1)
	assert.Equal(t, "coach", body.Trainers[0].Username)
	assert.Equal(t, 4.0, body.Trainers[0].AverageRating)
	assert.Equal(t, 2, body.Trainers[0].ReviewCount)
}

func TestTrainerCatalogHandler_GetTrainers_ParsesFilters(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{count: 3}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers?specialization=strength&location=Berlin&minRating=4.5&availableForNewClients=true&limit=5&offset=10", "")
	handler.GetTrainers(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	require.NotNil(t, profileRepo.countSeen, "an explicit filter must reach the repository")
	assert.Equal(t, "strength", profileRepo.countSeen.Specialization)
	assert.Equal(t, "Berlin", profileRepo.countSeen.Location)
	assert.Equal(t, 4.5, profileRepo.countSeen.MinRating)
	require.NotNil(t, profileRepo.countSeen.AvailableForNewClients)
	assert.True(t, *profileRepo.countSeen.AvailableForNewClients)

	var body struct {
		Limit  int `json:"limit"`
		Offset int `json:"offset"`
		Total  int `json:"total"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, 5, body.Limit)
	assert.Equal(t, 10, body.Offset)
	assert.Equal(t, 3, body.Total)
}

func TestTrainerCatalogHandler_GetTrainers_UnparseableNumbersAreIgnored(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	// strconv failures are dropped, so the request still succeeds and the
	// response echoes the zero values the handler settled on.
	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers?minRating=high&limit=abc&offset=xyz", "")
	handler.GetTrainers(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	if profileRepo.countSeen != nil {
		assert.Zero(t, profileRepo.countSeen.MinRating)
	}
	assert.Contains(t, w.Body.String(), `"limit":0`)
}

func TestTrainerCatalogHandler_GetTrainers_RepositoryFailureIsGeneric500(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{publicErr: errors.New(`relation "trainers" does not exist (SQLSTATE 42P01)`)}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers", "")
	handler.GetTrainers(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	msg := responseError(t, w)
	assert.NotContains(t, msg, "SQLSTATE")
	assert.NotContains(t, msg, "does not exist")
}

func TestTrainerCatalogHandler_GetTrainerByID_InvalidID(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{byID: map[int]*models.TrainerWithProfile{}}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/abc", "")
	ctx.Params = gin.Params{{Key: "id", Value: "abc"}}
	handler.GetTrainerByID(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.False(t, profileRepo.getByIDHit, "an unparseable ID must not reach the repository")
}

func TestTrainerCatalogHandler_GetTrainerByID_NotFound(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{byID: map[int]*models.TrainerWithProfile{}}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/42", "")
	ctx.Params = gin.Params{{Key: "id", Value: "42"}}
	handler.GetTrainerByID(ctx)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.True(t, profileRepo.getByIDHit)
}

func TestTrainerCatalogHandler_GetTrainerByID_Success(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{byID: map[int]*models.TrainerWithProfile{
		7: {User: models.User{UserID: 7, Username: "coach7", Role: models.RoleTrainer}},
	}}
	reviewRepo := &fakeReviewRepo{byTrainer: []models.TrainerReview{
		{ReviewID: 1, TrainerID: 7, AthleteID: 9, Rating: 5},
		{ReviewID: 2, TrainerID: 7, AthleteID: 10, Rating: 4},
	}}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, reviewRepo))

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/7", "")
	ctx.Params = gin.Params{{Key: "id", Value: "7"}}
	handler.GetTrainerByID(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body models.TrainerWithProfile
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, 7, body.UserID)
	assert.Equal(t, "coach7", body.Username)
	assert.Equal(t, 4.5, body.AverageRating)
	assert.Equal(t, 2, body.ReviewCount)
}

func TestTrainerCatalogHandler_GetTrainerByID_RepositoryFailureIsGeneric500(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{getByIDErr: errors.New("connection reset by peer")}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/7", "")
	ctx.Params = gin.Params{{Key: "id", Value: "7"}}
	handler.GetTrainerByID(ctx)

	// A repository fault must not be reported as the 404 the nil-profile path
	// produces, and its text must not reach the client.
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection reset")
}

// jsonField reads a single string field from a JSON response body.
func jsonField(t *testing.T, w *httptest.ResponseRecorder, key string) string {
	t.Helper()
	var body map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	value, ok := body[key].(string)
	require.True(t, ok, "field %q missing from %s", key, w.Body.String())
	return value
}

func TestTrainerCatalogHandler_UpdateMyProfile_RequiresSession(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	ctx, w := newTrainerCtx(http.MethodPut, "/api/trainers/me/profile", `{"bio":"x"}`)
	handler.UpdateMyProfile(ctx)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Nil(t, profileRepo.updateSeen, "no repository write without a session")
}

func TestTrainerCatalogHandler_UpdateMyProfile_RejectsBadJSON(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	ctx, w := newTrainerCtx(http.MethodPut, "/api/trainers/me/profile", `{"bio":`)
	ctx.Set("userID", "1")
	handler.UpdateMyProfile(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Nil(t, profileRepo.updateSeen)
}

func TestTrainerCatalogHandler_UpdateMyProfile_RejectsNonNumericSessionID(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	ctx, w := newTrainerCtx(http.MethodPut, "/api/trainers/me/profile", `{"bio":"x"}`)
	ctx.Set("userID", "not-a-number")
	handler.UpdateMyProfile(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Nil(t, profileRepo.updateSeen)
}

func TestTrainerCatalogHandler_UpdateMyProfile_Success(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	ctx, w := newTrainerCtx(http.MethodPut, "/api/trainers/me/profile", `{"bio":"strong & conditioning","hourlyRate":75,"yearsOfExperience":8,"isAvailableForNewClients":true}`)
	ctx.Set("userID", "5")
	handler.UpdateMyProfile(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "profile updated successfully", jsonField(t, w, "message"))
	require.NotNil(t, profileRepo.updateSeen)
	assert.Equal(t, 5, profileRepo.updateSeenID)
	assert.Equal(t, "strong & conditioning", profileRepo.updateSeen.Bio)
	assert.Equal(t, 75.0, profileRepo.updateSeen.HourlyRate)
	assert.Equal(t, 8, profileRepo.updateSeen.YearsOfExperience)
	assert.True(t, profileRepo.updateSeen.IsAvailableForNewClients)
}

func TestTrainerCatalogHandler_UpdateMyProfile_NegativeRateRejected(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	ctx, w := newTrainerCtx(http.MethodPut, "/api/trainers/me/profile", `{"hourlyRate":-10}`)
	ctx.Set("userID", "5")
	handler.UpdateMyProfile(ctx)

	// The service rejects the value, but the handler routes every service error
	// to a generic 500. Pinned because a validation rule surfacing as 500 is a
	// client-visible contract, and changing it must be deliberate.
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Nil(t, profileRepo.updateSeen)
}

func TestTrainerCatalogHandler_UpdateMyProfile_RepositoryFailureIsGeneric500(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{updateErr: errors.New(`duplicate key value violates unique constraint "users_pkey"`)}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	ctx, w := newTrainerCtx(http.MethodPut, "/api/trainers/me/profile", `{"bio":"x"}`)
	ctx.Set("userID", "5")
	handler.UpdateMyProfile(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "duplicate key")
}

func TestTrainerCatalogHandler_GetMyProfile_RequiresSession(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{byID: map[int]*models.TrainerWithProfile{}}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/me/profile", "")
	handler.GetMyProfile(ctx)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.False(t, profileRepo.getByIDHit)
}

func TestTrainerCatalogHandler_GetMyProfile_ForbiddenForNonTrainer(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{byID: map[int]*models.TrainerWithProfile{}}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/me/profile", "")
	ctx.Set("userID", "3")
	ctx.Set("userRole", models.RoleAthlete)
	handler.GetMyProfile(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.False(t, profileRepo.getByIDHit)
}

func TestTrainerCatalogHandler_GetMyProfile_ForbiddenWhenRoleMissing(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{byID: map[int]*models.TrainerWithProfile{}}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/me/profile", "")
	ctx.Set("userID", "3")
	handler.GetMyProfile(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestTrainerCatalogHandler_GetMyProfile_NotFound(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{byID: map[int]*models.TrainerWithProfile{}}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/me/profile", "")
	ctx.Set("userID", "3")
	ctx.Set("userRole", models.RoleTrainer)
	handler.GetMyProfile(ctx)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestTrainerCatalogHandler_GetMyProfile_Success(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{byID: map[int]*models.TrainerWithProfile{
		3: {User: models.User{UserID: 3, Username: "coach3", Role: models.RoleTrainer}},
	}}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/me/profile", "")
	ctx.Set("userID", "3")
	ctx.Set("userRole", models.RoleTrainer)
	handler.GetMyProfile(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body models.TrainerWithProfile
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, "coach3", body.Username)
}

func TestTrainerCatalogHandler_GetMyProfile_RepositoryFailureIsGeneric500(t *testing.T) {
	profileRepo := &fakeTrainerProfileRepo{getByIDErr: errors.New("i/o timeout")}
	handler := NewTrainerCatalogHandler(services.NewTrainerCatalogService(profileRepo, &fakeReviewRepo{}))

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/me/profile", "")
	ctx.Set("userID", "3")
	ctx.Set("userRole", models.RoleTrainer)
	handler.GetMyProfile(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "i/o timeout")
}
