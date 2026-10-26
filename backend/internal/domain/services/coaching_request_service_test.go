package services

import (
	"context"
	"testing"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// batchCoachingRequestRepo records how the coaching request service reads
// lists, so the tests can prove enrichment is one batched query instead of a
// user lookup per request.
type batchCoachingRequestRepo struct {
	requests []*models.CoachingRequest

	pendingBetween bool

	athletePageCalls int
	trainerPageCalls int
	pendingPageCalls int

	// closeCalls records the establish-time supersede: the athleteID per
	// call, in order.
	closeCalls []int
	closeErr   error
}

func (r *batchCoachingRequestRepo) Create(_ context.Context, req *models.CoachingRequest) error {
	r.requests = append(r.requests, req)
	req.RequestID = len(r.requests)
	return nil
}
func (r *batchCoachingRequestRepo) GetByID(_ context.Context, id int) (*models.CoachingRequest, error) {
	for _, req := range r.requests {
		if req.RequestID == id {
			return req, nil
		}
	}
	return nil, domainerrors.ErrNotFound
}
func (r *batchCoachingRequestRepo) GetByAthleteID(context.Context, int, int, int) ([]*models.CoachingRequest, error) {
	r.athletePageCalls++
	return r.requests, nil
}
func (r *batchCoachingRequestRepo) CountByAthleteID(context.Context, int) (int, error) {
	return len(r.requests), nil
}
func (r *batchCoachingRequestRepo) GetByTrainerID(context.Context, int, int, int) ([]*models.CoachingRequest, error) {
	r.trainerPageCalls++
	return r.requests, nil
}
func (r *batchCoachingRequestRepo) CountByTrainerID(context.Context, int) (int, error) {
	return len(r.requests), nil
}
func (r *batchCoachingRequestRepo) Update(context.Context, *models.CoachingRequest) error { return nil }
func (r *batchCoachingRequestRepo) UpdateStatus(_ context.Context, id int, from models.CoachingRequestStatus, to models.CoachingRequestStatus, _ time.Time) (bool, error) {
	for _, req := range r.requests {
		if req.RequestID == id {
			if req.Status != from {
				return false, nil
			}
			req.Status = to
			return true, nil
		}
	}
	return false, nil
}
func (r *batchCoachingRequestRepo) Delete(context.Context, int) error { return nil }
func (r *batchCoachingRequestRepo) GetPendingByTrainerID(context.Context, int, int, int) ([]*models.CoachingRequest, error) {
	r.pendingPageCalls++
	pending := make([]*models.CoachingRequest, 0)
	for _, req := range r.requests {
		if req.Status == models.CoachingRequestStatusPending {
			pending = append(pending, req)
		}
	}
	return pending, nil
}
func (r *batchCoachingRequestRepo) CountPendingByTrainerID(context.Context, int) (int, error) {
	total := 0
	for _, req := range r.requests {
		if req.Status == models.CoachingRequestStatusPending {
			total++
		}
	}
	return total, nil
}
func (r *batchCoachingRequestRepo) HasPendingRequestBetween(context.Context, int, int) (bool, error) {
	return r.pendingBetween, nil
}

func (r *batchCoachingRequestRepo) ClosePendingForAthlete(_ context.Context, athleteID int) (int, error) {
	if r.closeErr != nil {
		return 0, r.closeErr
	}
	r.closeCalls = append(r.closeCalls, athleteID)
	closed := 0
	for _, req := range r.requests {
		if req.AthleteID == athleteID && req.Status == models.CoachingRequestStatusPending {
			req.Status = models.CoachingRequestStatusSuperseded
			closed++
		}
	}
	return closed, nil
}

// compile-time guard
var _ repositories.CoachingRequestRepository = (*batchCoachingRequestRepo)(nil)

func TestCoachingRequestService_CreateCoachingRequest(t *testing.T) {
	requestRepo := &batchCoachingRequestRepo{pendingBetween: false}
	userRepo := &stubUserRepo{user: &models.User{Role: "trainer"}}
	relationships := NewRelationshipService(&stubRelationshipRepo{}, userRepo, nil, nil, nil)
	svc := NewCoachingRequestService(requestRepo, userRepo, relationships, nil, nil)

	ctx := context.Background()

	t.Run("creates a pending request for a trainer", func(t *testing.T) {
		req, err := svc.CreateCoachingRequest(ctx, 11, 20, "train me")
		require.NoError(t, err)
		assert.Equal(t, models.CoachingRequestStatusPending, req.Status)
		assert.Equal(t, 20, req.TrainerID)
	})

	t.Run("rejects a duplicate pending request", func(t *testing.T) {
		dup := &batchCoachingRequestRepo{pendingBetween: true}
		dupUser := &stubUserRepo{user: &models.User{Role: "trainer"}}
		dupRels := NewRelationshipService(&stubRelationshipRepo{}, dupUser, nil, nil, nil)
		svc := NewCoachingRequestService(dup, dupUser, dupRels, nil, nil)
		_, err := svc.CreateCoachingRequest(ctx, 11, 20, "again")
		assert.ErrorIs(t, err, ErrPendingCoachingRequestExists)
	})
}

func TestCoachingRequestService_AcceptCoachingRequest_ResolvedRequestIsNotAcceptable(t *testing.T) {
	requestRepo := &batchCoachingRequestRepo{requests: []*models.CoachingRequest{
		// The athlete connected with another trainer; establish superseded
		// this request. The trainer must be told it was resolved, not have
		// the accept fail late with "already has a trainer".
		{RequestID: 1, AthleteID: 11, TrainerID: 20, Status: models.CoachingRequestStatusSuperseded},
	}}
	userRepo := &stubUserRepo{user: &models.User{Role: "trainer"}}
	relationships := NewRelationshipService(&stubRelationshipRepo{}, userRepo, requestRepo, nil, nil)
	svc := NewCoachingRequestService(requestRepo, userRepo, relationships, nil, nil)

	_, err := svc.AcceptCoachingRequest(context.Background(), 1, 20)

	var resolved *CoachingRequestResolvedError
	require.ErrorAs(t, err, &resolved)
	assert.Equal(t, "superseded", resolved.Status)
}

func TestCoachingRequestService_GetMyRequests_EnrichesInBatch(t *testing.T) {
	requestRepo := &batchCoachingRequestRepo{requests: []*models.CoachingRequest{
		{RequestID: 1, AthleteID: 11, TrainerID: 20, Status: models.CoachingRequestStatusPending},
		{RequestID: 2, AthleteID: 12, TrainerID: 20, Status: models.CoachingRequestStatusAccepted},
	}}
	userRepo := &stubUserRepo{user: &models.User{Role: "athlete"}}
	svc := NewCoachingRequestService(requestRepo, userRepo, nil, nil, nil)

	ctx := context.Background()

	page, err := svc.GetMyRequests(ctx, 11, string(models.RoleAthlete), 50, 0)
	require.NoError(t, err)

	// Count is the total for the athlete, not the page size.
	assert.Equal(t, 2, page.Count)
	require.Len(t, page.Requests, 2)
	assert.Equal(t, 11, page.Requests[0].Athlete.UserID)
	assert.Equal(t, 20, page.Requests[0].Trainer.UserID)

	// Both requests enriched with exactly one batched user query — the per
	// request enrich loop used to issue two GetUserByID calls each.
	assert.Equal(t, 1, userRepo.batchCalls, "user details must be batched in one query")
}

func TestCoachingRequestService_GetPendingRequestsForTrainer(t *testing.T) {
	requestRepo := &batchCoachingRequestRepo{requests: []*models.CoachingRequest{
		{RequestID: 1, AthleteID: 11, TrainerID: 20, Status: models.CoachingRequestStatusPending},
		{RequestID: 2, AthleteID: 13, TrainerID: 20, Status: models.CoachingRequestStatusRejected},
		{RequestID: 3, AthleteID: 12, TrainerID: 21, Status: models.CoachingRequestStatusPending},
	}}
	userRepo := &stubUserRepo{user: &models.User{Role: "athlete"}}
	svc := NewCoachingRequestService(requestRepo, userRepo, nil, nil, nil)

	page, err := svc.GetPendingRequestsForTrainer(context.Background(), 20, 50, 0)
	require.NoError(t, err)

	// Only pending rows returned, and Count is the pending total so the client
	// can size the result set.
	assert.Equal(t, 2, page.Count)
	require.Len(t, page.Requests, 2)
	assert.Equal(t, 1, page.Requests[0].RequestID)
	assert.Equal(t, 3, page.Requests[1].RequestID)

	// Enrichment is a single batched read even when nothing is returned.
	assert.Equal(t, 1, userRepo.batchCalls)
}
