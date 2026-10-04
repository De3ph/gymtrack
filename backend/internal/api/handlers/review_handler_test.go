package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"
	"gymtrack-backend/internal/utils"
)

func newReviewHandler(reviews *fakeReviewRepo, rel *fakeRelationshipRepo) *ReviewHandler {
	return NewReviewHandler(services.NewReviewService(reviews, rel, utils.NewFakeClock(testClockNow)))
}

func TestReviewHandler_CreateReview_RequiresSession(t *testing.T) {
	reviews := &fakeReviewRepo{}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{active: true})

	ctx, w := newTrainerCtx(http.MethodPost, "/api/trainers/5/reviews", `{"rating":5}`)
	handler.CreateReview(ctx)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Nil(t, reviews.created)
}

func TestReviewHandler_CreateReview_ForbiddenForNonAthlete(t *testing.T) {
	reviews := &fakeReviewRepo{}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{active: true})

	ctx, w := newTrainerCtx(http.MethodPost, "/api/trainers/5/reviews", `{"rating":5}`)
	ctx.Set("userID", "9")
	ctx.Set("userRole", models.RoleTrainer)
	handler.CreateReview(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Nil(t, reviews.created)
}

func TestReviewHandler_CreateReview_InvalidTrainerID(t *testing.T) {
	reviews := &fakeReviewRepo{}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{active: true})

	ctx, w := newTrainerCtx(http.MethodPost, "/api/trainers/abc/reviews", `{"rating":5}`)
	ctx.Set("userID", "9")
	ctx.Set("userRole", models.RoleAthlete)
	ctx.Params = gin.Params{{Key: "id", Value: "abc"}}
	handler.CreateReview(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Nil(t, reviews.created)
}

func TestReviewHandler_CreateReview_RatingBoundsAreEnforced(t *testing.T) {
	// 0 and 6 both fail the binding tag before the service is consulted.
	for _, body := range []string{`{"rating":0}`, `{"rating":6}`, `{}`, `{"rating":"five"}`} {
		reviews := &fakeReviewRepo{}
		handler := newReviewHandler(reviews, &fakeRelationshipRepo{active: true})

		ctx, w := newTrainerCtx(http.MethodPost, "/api/trainers/5/reviews", body)
		ctx.Set("userID", "9")
		ctx.Set("userRole", models.RoleAthlete)
		ctx.Params = gin.Params{{Key: "id", Value: "5"}}
		handler.CreateReview(ctx)

		assert.Equal(t, http.StatusBadRequest, w.Code, "body %s must be rejected", body)
		assert.Nil(t, reviews.created)
	}
}

func TestReviewHandler_CreateReview_RequiresActiveRelationship(t *testing.T) {
	reviews := &fakeReviewRepo{}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{active: false})

	ctx, w := newTrainerCtx(http.MethodPost, "/api/trainers/5/reviews", `{"rating":4,"comment":"ok"}`)
	ctx.Set("userID", "9")
	ctx.Set("userRole", models.RoleAthlete)
	ctx.Params = gin.Params{{Key: "id", Value: "5"}}
	handler.CreateReview(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Equal(t, services.ErrReviewRequiresActiveRelationship.Error(), responseError(t, w))
	assert.Nil(t, reviews.created)
}

func TestReviewHandler_CreateReview_DuplicateIsConflict(t *testing.T) {
	// The athlete already has a review, so GetByAthleteID returns it and the
	// service raises the duplicate sentinel.
	reviews := &fakeReviewRepo{byTrainer: []models.TrainerReview{
		{ReviewID: 1, TrainerID: 5, AthleteID: 9, Rating: 4},
	}}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{active: true})

	ctx, w := newTrainerCtx(http.MethodPost, "/api/trainers/5/reviews", `{"rating":5}`)
	ctx.Set("userID", "9")
	ctx.Set("userRole", models.RoleAthlete)
	ctx.Params = gin.Params{{Key: "id", Value: "5"}}
	handler.CreateReview(ctx)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Equal(t, services.ErrAlreadyReviewedTrainer.Error(), responseError(t, w))
	assert.Nil(t, reviews.created)
}

func TestReviewHandler_CreateReview_RejectsNonNumericSessionID(t *testing.T) {
	reviews := &fakeReviewRepo{}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{active: true})

	ctx, w := newTrainerCtx(http.MethodPost, "/api/trainers/5/reviews", `{"rating":5}`)
	ctx.Set("userID", "abc")
	ctx.Set("userRole", models.RoleAthlete)
	ctx.Params = gin.Params{{Key: "id", Value: "5"}}
	handler.CreateReview(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Nil(t, reviews.created)
}

func TestReviewHandler_CreateReview_Success(t *testing.T) {
	reviews := &fakeReviewRepo{}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{active: true})

	ctx, w := newTrainerCtx(http.MethodPost, "/api/trainers/5/reviews", `{"rating":5,"comment":"great coach"}`)
	ctx.Set("userID", "9")
	ctx.Set("userRole", models.RoleAthlete)
	ctx.Params = gin.Params{{Key: "id", Value: "5"}}
	handler.CreateReview(ctx)

	require.Equal(t, http.StatusCreated, w.Code)

	var body models.TrainerReview
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, 5, body.TrainerID)
	assert.Equal(t, 9, body.AthleteID)
	assert.Equal(t, 5, body.Rating)
	assert.Equal(t, "great coach", body.Comment)
	assert.Equal(t, testClockNow, body.CreatedAt, "timestamps come from the injected clock")

	require.NotNil(t, reviews.created)
	assert.Equal(t, "review", reviews.created.Type)
}

func TestReviewHandler_CreateReview_RelationshipCheckFailureIsGeneric500(t *testing.T) {
	reviews := &fakeReviewRepo{}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{err: errors.New("connection refused")})

	ctx, w := newTrainerCtx(http.MethodPost, "/api/trainers/5/reviews", `{"rating":5}`)
	ctx.Set("userID", "9")
	ctx.Set("userRole", models.RoleAthlete)
	ctx.Params = gin.Params{{Key: "id", Value: "5"}}
	handler.CreateReview(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "connection refused")
}

func TestReviewHandler_GetTrainerReviews_InvalidTrainerID(t *testing.T) {
	handler := newReviewHandler(&fakeReviewRepo{}, &fakeRelationshipRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/abc/reviews", "")
	ctx.Params = gin.Params{{Key: "id", Value: "abc"}}
	handler.GetTrainerReviews(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestReviewHandler_GetTrainerReviews_PublicAndRoleAgnostic(t *testing.T) {
	// The route is public, so no session is set here on purpose.
	reviews := &fakeReviewRepo{byTrainer: []models.TrainerReview{
		{ReviewID: 1, TrainerID: 5, AthleteID: 9, Rating: 5, Comment: "great"},
		{ReviewID: 2, TrainerID: 5, AthleteID: 10, Rating: 3},
	}}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/5/reviews", "")
	ctx.Params = gin.Params{{Key: "id", Value: "5"}}
	handler.GetTrainerReviews(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body struct {
		Reviews []models.TrainerReview `json:"reviews"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Len(t, body.Reviews, 2)
	assert.Equal(t, 1, body.Reviews[0].ReviewID)
	assert.Equal(t, 3, body.Reviews[1].Rating)
}

func TestReviewHandler_GetTrainerReviews_RepositoryFailureIsGeneric500(t *testing.T) {
	handler := newReviewHandler(&fakeReviewRepo{listErr: errors.New("lock timeout")}, &fakeRelationshipRepo{})

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/5/reviews", "")
	ctx.Params = gin.Params{{Key: "id", Value: "5"}}
	handler.GetTrainerReviews(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "lock timeout")
}

func TestReviewHandler_UpdateReview_RequiresSession(t *testing.T) {
	reviews := &fakeReviewRepo{byID: map[int]*models.TrainerReview{
		1: {ReviewID: 1, TrainerID: 5, AthleteID: 9, Rating: 4},
	}}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{})

	ctx, w := newTrainerCtx(http.MethodPut, "/api/reviews/1", `{"rating":5}`)
	handler.UpdateReview(ctx)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Nil(t, reviews.updated)
}

func TestReviewHandler_UpdateReview_InvalidReviewID(t *testing.T) {
	reviews := &fakeReviewRepo{}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{})

	ctx, w := newTrainerCtx(http.MethodPut, "/api/reviews/abc", `{"rating":5}`)
	ctx.Set("userID", "9")
	ctx.Params = gin.Params{{Key: "id", Value: "abc"}}
	handler.UpdateReview(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestReviewHandler_UpdateReview_RatingBoundsAreEnforced(t *testing.T) {
	reviews := &fakeReviewRepo{byID: map[int]*models.TrainerReview{
		1: {ReviewID: 1, TrainerID: 5, AthleteID: 9, Rating: 4},
	}}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{})

	ctx, w := newTrainerCtx(http.MethodPut, "/api/reviews/1", `{"rating":9}`)
	ctx.Set("userID", "9")
	ctx.Params = gin.Params{{Key: "id", Value: "1"}}
	handler.UpdateReview(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Nil(t, reviews.updated)
}

func TestReviewHandler_UpdateReview_UnknownReviewIs404(t *testing.T) {
	handler := newReviewHandler(&fakeReviewRepo{byID: map[int]*models.TrainerReview{}}, &fakeRelationshipRepo{})

	ctx, w := newTrainerCtx(http.MethodPut, "/api/reviews/404", `{"rating":5}`)
	ctx.Set("userID", "9")
	ctx.Params = gin.Params{{Key: "id", Value: "404"}}
	handler.UpdateReview(ctx)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, services.ErrReviewNotFound.Error(), responseError(t, w))
}

func TestReviewHandler_UpdateReview_NonAuthorIsForbidden(t *testing.T) {
	reviews := &fakeReviewRepo{byID: map[int]*models.TrainerReview{
		1: {ReviewID: 1, TrainerID: 5, AthleteID: 9, Rating: 4},
	}}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{})

	ctx, w := newTrainerCtx(http.MethodPut, "/api/reviews/1", `{"rating":5}`)
	ctx.Set("userID", "10")
	ctx.Params = gin.Params{{Key: "id", Value: "1"}}
	handler.UpdateReview(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Equal(t, services.ErrCannotEditReview.Error(), responseError(t, w))
	assert.Nil(t, reviews.updated, "a rejected edit must not be persisted")
}

func TestReviewHandler_UpdateReview_Success(t *testing.T) {
	reviews := &fakeReviewRepo{byID: map[int]*models.TrainerReview{
		1: {ReviewID: 1, TrainerID: 5, AthleteID: 9, Rating: 4, Comment: "old"},
	}}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{})

	ctx, w := newTrainerCtx(http.MethodPut, "/api/reviews/1", `{"rating":5,"comment":"new"}`)
	ctx.Set("userID", "9")
	ctx.Params = gin.Params{{Key: "id", Value: "1"}}
	handler.UpdateReview(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "review updated successfully", jsonField(t, w, "message"))
	require.NotNil(t, reviews.updated)
	assert.Equal(t, 5, reviews.updated.Rating)
	assert.Equal(t, "new", reviews.updated.Comment)
	assert.Equal(t, testClockNow, reviews.updated.UpdatedAt)
}

func TestReviewHandler_DeleteReview_RequiresSession(t *testing.T) {
	reviews := &fakeReviewRepo{byID: map[int]*models.TrainerReview{
		1: {ReviewID: 1, TrainerID: 5, AthleteID: 9, Rating: 4},
	}}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{})

	ctx, w := newTrainerCtx(http.MethodDelete, "/api/reviews/1", "")
	handler.DeleteReview(ctx)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Empty(t, reviews.deleted)
}

func TestReviewHandler_DeleteReview_InvalidReviewID(t *testing.T) {
	reviews := &fakeReviewRepo{}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{})

	ctx, w := newTrainerCtx(http.MethodDelete, "/api/reviews/abc", "")
	ctx.Set("userID", "9")
	ctx.Params = gin.Params{{Key: "id", Value: "abc"}}
	handler.DeleteReview(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Empty(t, reviews.deleted)
}

func TestReviewHandler_DeleteReview_UnknownReviewIs404(t *testing.T) {
	handler := newReviewHandler(&fakeReviewRepo{byID: map[int]*models.TrainerReview{}}, &fakeRelationshipRepo{})

	ctx, w := newTrainerCtx(http.MethodDelete, "/api/reviews/404", "")
	ctx.Set("userID", "9")
	ctx.Params = gin.Params{{Key: "id", Value: "404"}}
	handler.DeleteReview(ctx)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Equal(t, services.ErrReviewNotFound.Error(), responseError(t, w))
}

func TestReviewHandler_DeleteReview_NonAuthorIsForbidden(t *testing.T) {
	reviews := &fakeReviewRepo{byID: map[int]*models.TrainerReview{
		1: {ReviewID: 1, TrainerID: 5, AthleteID: 9, Rating: 4},
	}}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{})

	ctx, w := newTrainerCtx(http.MethodDelete, "/api/reviews/1", "")
	ctx.Set("userID", "10")
	ctx.Params = gin.Params{{Key: "id", Value: "1"}}
	handler.DeleteReview(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Equal(t, services.ErrCannotDeleteReview.Error(), responseError(t, w))
	assert.Empty(t, reviews.deleted)
}

func TestReviewHandler_DeleteReview_Success(t *testing.T) {
	reviews := &fakeReviewRepo{byID: map[int]*models.TrainerReview{
		1: {ReviewID: 1, TrainerID: 5, AthleteID: 9, Rating: 4},
	}}
	handler := newReviewHandler(reviews, &fakeRelationshipRepo{})

	ctx, w := newTrainerCtx(http.MethodDelete, "/api/reviews/1", "")
	ctx.Set("userID", "9")
	ctx.Params = gin.Params{{Key: "id", Value: "1"}}
	handler.DeleteReview(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "review deleted successfully", jsonField(t, w, "message"))
	assert.Equal(t, []int{1}, reviews.deleted)
}
