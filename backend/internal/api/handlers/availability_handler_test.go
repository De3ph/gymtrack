package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"
	"gymtrack-backend/internal/utils"
)

func newAvailabilityHandler(repo *fakeAvailabilityRepo) *AvailabilityHandler {
	return NewAvailabilityHandler(services.NewAvailabilityService(repo, utils.NewFakeClock(testClockNow)))
}

func TestAvailabilityHandler_GetMyAvailability_RequiresSession(t *testing.T) {
	repo := &fakeAvailabilityRepo{slots: map[int][]models.TrainerAvailability{1: {{AvailabilityID: 1, TrainerID: 1}}}}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/me/availability", "")
	handler.GetMyAvailability(ctx)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAvailabilityHandler_GetMyAvailability_RejectsNonNumericSessionID(t *testing.T) {
	repo := &fakeAvailabilityRepo{slots: map[int][]models.TrainerAvailability{}}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/me/availability", "")
	ctx.Set("userID", "abc")
	handler.GetMyAvailability(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestAvailabilityHandler_GetMyAvailability_Success(t *testing.T) {
	repo := &fakeAvailabilityRepo{slots: map[int][]models.TrainerAvailability{
		5: {
			{AvailabilityID: 11, TrainerID: 5, DayOfWeek: 1, StartTime: "09:00", EndTime: "17:00"},
			{AvailabilityID: 12, TrainerID: 5, DayOfWeek: 2, StartTime: "10:00", EndTime: "16:00", IsBooked: true},
		},
	}}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/me/availability", "")
	ctx.Set("userID", "5")
	handler.GetMyAvailability(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body struct {
		Slots []models.TrainerAvailability `json:"slots"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Len(t, body.Slots, 2)
	assert.Equal(t, "09:00", body.Slots[0].StartTime)
	assert.True(t, body.Slots[1].IsBooked)
}

func TestAvailabilityHandler_GetMyAvailability_NoSlotsIsEmptyArray(t *testing.T) {
	// A trainer who published nothing yields [] rather than null so clients can
	// iterate without a nil check.
	repo := &fakeAvailabilityRepo{slots: map[int][]models.TrainerAvailability{5: {}}}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/me/availability", "")
	ctx.Set("userID", "5")
	handler.GetMyAvailability(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"slots":[]`)
}

func TestAvailabilityHandler_GetMyAvailability_RepositoryFailureIsGeneric500(t *testing.T) {
	repo := &fakeAvailabilityRepo{listErr: errors.New("relation does not exist")}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/me/availability", "")
	ctx.Set("userID", "5")
	handler.GetMyAvailability(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "relation")
}

func TestAvailabilityHandler_SetMyAvailability_RequiresSession(t *testing.T) {
	repo := &fakeAvailabilityRepo{}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodPut, "/api/trainers/me/availability", `[{"dayOfWeek":1,"startTime":"09:00","endTime":"17:00"}]`)
	handler.SetMyAvailability(ctx)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Empty(t, repo.upserted)
}

func TestAvailabilityHandler_SetMyAvailability_RejectsBadJSON(t *testing.T) {
	repo := &fakeAvailabilityRepo{}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodPut, "/api/trainers/me/availability", `{"not":"an array"}`)
	ctx.Set("userID", "5")
	handler.SetMyAvailability(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Empty(t, repo.upserted)
}

func TestAvailabilityHandler_SetMyAvailability_RejectsNonNumericSessionID(t *testing.T) {
	repo := &fakeAvailabilityRepo{}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodPut, "/api/trainers/me/availability", `[]`)
	ctx.Set("userID", "abc")
	handler.SetMyAvailability(ctx)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Empty(t, repo.upserted)
}

func TestAvailabilityHandler_SetMyAvailability_StampsTrainerIDOnEverySlot(t *testing.T) {
	// The service stamps the session's trainer ID, so a client cannot write
	// slots onto another trainer's schedule.
	repo := &fakeAvailabilityRepo{}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodPut, "/api/trainers/me/availability", `[{"trainerId":999,"dayOfWeek":1,"startTime":"09:00","endTime":"17:00"},{"dayOfWeek":3,"startTime":"08:00","endTime":"12:00"}]`)
	ctx.Set("userID", "5")
	handler.SetMyAvailability(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "availability updated successfully", jsonField(t, w, "message"))
	require.Len(t, repo.upserted, 2)
	for _, slot := range repo.upserted {
		assert.Equal(t, 5, slot.TrainerID, "client-supplied trainerId must be overwritten")
	}
	assert.Equal(t, 1, repo.upserted[0].DayOfWeek)
	assert.Equal(t, 3, repo.upserted[1].DayOfWeek)
}

func TestAvailabilityHandler_SetMyAvailability_EmptyArrayIsAccepted(t *testing.T) {
	// The handler does not enforce minItems, so clearing the schedule is
	// reachable. Pinned as the current contract.
	repo := &fakeAvailabilityRepo{}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodPut, "/api/trainers/me/availability", `[]`)
	ctx.Set("userID", "5")
	handler.SetMyAvailability(ctx)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Empty(t, repo.upserted)
}

func TestAvailabilityHandler_GetTrainerAvailability_InvalidID(t *testing.T) {
	repo := &fakeAvailabilityRepo{}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/abc/availability", "")
	ctx.Params = gin.Params{{Key: "id", Value: "abc"}}
	handler.GetTrainerAvailability(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAvailabilityHandler_GetTrainerAvailability_PubliclyReachable(t *testing.T) {
	// This route carries no auth middleware, so the test asserts the handler
	// itself needs no session.
	repo := &fakeAvailabilityRepo{slots: map[int][]models.TrainerAvailability{
		5: {{AvailabilityID: 11, TrainerID: 5, DayOfWeek: 1, StartTime: "09:00", EndTime: "17:00"}},
	}}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/5/availability", "")
	ctx.Params = gin.Params{{Key: "id", Value: "5"}}
	handler.GetTrainerAvailability(ctx)

	require.Equal(t, http.StatusOK, w.Code)

	var body struct {
		Slots []models.TrainerAvailability `json:"slots"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Len(t, body.Slots, 1)
	assert.Equal(t, 11, body.Slots[0].AvailabilityID)
}

func TestAvailabilityHandler_GetTrainerAvailability_RepositoryFailureIsGeneric500(t *testing.T) {
	repo := &fakeAvailabilityRepo{listErr: errors.New("deadlock detected")}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodGet, "/api/trainers/5/availability", "")
	ctx.Params = gin.Params{{Key: "id", Value: "5"}}
	handler.GetTrainerAvailability(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "deadlock")
}

func TestAvailabilityHandler_DeleteSlot_InvalidID(t *testing.T) {
	repo := &fakeAvailabilityRepo{}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodDelete, "/api/trainers/me/availability/abc", "")
	ctx.Set("userID", "5")
	ctx.Set("userRole", models.RoleTrainer)
	ctx.Params = gin.Params{{Key: "slotId", Value: "abc"}}
	handler.DeleteSlot(ctx)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Empty(t, repo.deleted)
}

func TestAvailabilityHandler_DeleteSlot_RequiresSession(t *testing.T) {
	repo := &fakeAvailabilityRepo{}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodDelete, "/api/trainers/me/availability/11", "")
	ctx.Params = gin.Params{{Key: "slotId", Value: "11"}}
	handler.DeleteSlot(ctx)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Empty(t, repo.deleted)
}

func TestAvailabilityHandler_DeleteSlot_RejectsNonTrainer(t *testing.T) {
	// Regression test for the availability IDOR: athletes must not be able to
	// delete any trainer's slots.
	repo := &fakeAvailabilityRepo{}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodDelete, "/api/trainers/me/availability/11", "")
	ctx.Set("userID", "9")
	ctx.Set("userRole", models.RoleAthlete)
	ctx.Params = gin.Params{{Key: "slotId", Value: "11"}}
	handler.DeleteSlot(ctx)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Empty(t, repo.deleted)
}

func TestAvailabilityHandler_DeleteSlot_Success(t *testing.T) {
	repo := &fakeAvailabilityRepo{}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodDelete, "/api/trainers/me/availability/11", "")
	ctx.Set("userID", "5")
	ctx.Set("userRole", models.RoleTrainer)
	ctx.Params = gin.Params{{Key: "slotId", Value: "11"}}
	handler.DeleteSlot(ctx)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "slot deleted successfully", jsonField(t, w, "message"))
	assert.Equal(t, []int{11}, repo.deleted)
	// The caller's own ID must reach the repository, which scopes the DELETE
	// with `AND trainer_id = $2`.
	assert.Equal(t, []int{5}, repo.deletedTrainerIDs)
}

func TestAvailabilityHandler_DeleteSlot_OtherTrainersSlotIs404(t *testing.T) {
	// The SQL predicate is `id = $1 AND trainer_id = $2`, so another trainer's
	// slot is indistinguishable from a missing one: zero rows affected.
	repo := &fakeAvailabilityRepo{deleteErr: domainerrors.ErrNotFound}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodDelete, "/api/trainers/me/availability/11", "")
	ctx.Set("userID", "5")
	ctx.Set("userRole", models.RoleTrainer)
	ctx.Params = gin.Params{{Key: "slotId", Value: "11"}}
	handler.DeleteSlot(ctx)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestAvailabilityHandler_DeleteSlot_RepositoryFailureIsGeneric500(t *testing.T) {
	repo := &fakeAvailabilityRepo{deleteErr: errors.New("violates foreign key constraint")}
	handler := newAvailabilityHandler(repo)

	ctx, w := newTrainerCtx(http.MethodDelete, "/api/trainers/me/availability/11", "")
	ctx.Set("userID", "5")
	ctx.Set("userRole", models.RoleTrainer)
	ctx.Params = gin.Params{{Key: "slotId", Value: "11"}}
	handler.DeleteSlot(ctx)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	assert.NotContains(t, responseError(t, w), "foreign key")
}
