package services

import (
	"context"
	"sync"
	"testing"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeInvitationMethod models the claim/release protocol of the PostgreSQL
// adapter: a code can be claimed exactly once, and only the holder of a live
// claim can release it.
type fakeInvitationMethod struct {
	mu       sync.Mutex
	codes    map[string]*models.Invitation
	released int
}

func newFakeInvitationMethod(codes ...*models.Invitation) *fakeInvitationMethod {
	m := &fakeInvitationMethod{codes: make(map[string]*models.Invitation, len(codes))}
	for _, c := range codes {
		m.codes[c.Code] = c
	}
	return m
}

func (f *fakeInvitationMethod) GenerateInvitation(context.Context, int, int) (*models.Invitation, error) {
	panic("not used in these tests")
}

func (f *fakeInvitationMethod) ClaimInvitation(_ context.Context, code string) (*models.Invitation, error) {
	if code == "" {
		return nil, domainerrors.ErrInvitationCodeEmpty
	}

	f.mu.Lock()
	defer f.mu.Unlock()

	inv, ok := f.codes[code]
	if !ok {
		return nil, domainerrors.ErrInvalidInvitationCode
	}
	if inv.Status != "pending" {
		return nil, domainerrors.ErrInvitationAlreadyUsed
	}
	if !time.Now().Before(inv.ExpiresAt) {
		return nil, domainerrors.ErrInvitationExpired
	}

	inv.Status = "used"
	inv.UsedAt = time.Now()
	claimed := *inv
	return &claimed, nil
}

func (f *fakeInvitationMethod) ReleaseClaim(_ context.Context, inv *models.Invitation) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	stored, ok := f.codes[inv.Code]
	if !ok || stored.Status != "used" || !stored.UsedAt.Equal(inv.UsedAt) {
		return nil // guard rejected: not the claim we made
	}
	stored.Status = "pending"
	stored.UsedAt = time.Time{}
	f.released++
	return nil
}

type stubRelationshipRepo struct {
	mu              sync.Mutex
	existing        *models.Relationship
	byID            *models.Relationship
	byPair          *models.Relationship
	createErr       error
	updateErr       error
	createdTrainers []int
	updated         []*models.Relationship
	deleted         []int
}

func (s *stubRelationshipRepo) Create(_ context.Context, rel *models.Relationship) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.createErr != nil {
		return s.createErr
	}
	s.createdTrainers = append(s.createdTrainers, rel.TrainerID)
	rel.RelationshipID = len(s.createdTrainers)
	return nil
}

func (s *stubRelationshipRepo) GetByID(context.Context, int) (*models.Relationship, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.byID == nil {
		return nil, domainerrors.ErrNotFound
	}
	return s.byID, nil
}
func (s *stubRelationshipRepo) GetByTrainerID(context.Context, int) ([]*models.Relationship, error) {
	return nil, nil
}
func (s *stubRelationshipRepo) GetByTrainerAndAthlete(context.Context, int, int) (*models.Relationship, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.byPair == nil {
		return nil, domainerrors.ErrNotFound
	}
	return s.byPair, nil
}
func (s *stubRelationshipRepo) GetActiveByTrainerID(context.Context, int) ([]*models.Relationship, error) {
	return nil, nil
}
func (s *stubRelationshipRepo) GetActiveByAthleteID(context.Context, int) (*models.Relationship, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.existing == nil || !s.existing.IsActive() {
		return nil, domainerrors.ErrNotFound
	}
	return s.existing, nil
}
func (s *stubRelationshipRepo) GetPendingByAthleteID(context.Context, int) ([]*models.Relationship, error) {
	return nil, nil
}
func (s *stubRelationshipRepo) HasActiveRelationship(context.Context, int, int) (bool, error) {
	return false, nil
}
func (s *stubRelationshipRepo) Update(_ context.Context, rel *models.Relationship) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.updateErr != nil {
		return s.updateErr
	}
	s.updated = append(s.updated, rel)
	return nil
}
func (s *stubRelationshipRepo) Delete(_ context.Context, relationshipID int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.deleted = append(s.deleted, relationshipID)
	return nil
}

type stubUserRepo struct {
	user      *models.User
	updateErr error
}

func (s *stubUserRepo) CreateUser(context.Context, *models.User) error { return nil }
func (s *stubUserRepo) GetUserByID(_ context.Context, id int) (*models.User, error) {
	u := *s.user
	u.UserID = id
	return &u, nil
}
func (s *stubUserRepo) GetUsersByIDs(_ context.Context, ids []int) (map[int]*models.User, error) {
	users := make(map[int]*models.User, len(ids))
	for _, id := range ids {
		if s.user == nil {
			continue
		}
		u := *s.user
		u.UserID = id
		users[id] = &u
	}
	return users, nil
}
func (s *stubUserRepo) GetUserByEmail(context.Context, string) (*models.User, error) {
	return nil, domainerrors.ErrNotFound
}
func (s *stubUserRepo) GetUserByUsername(context.Context, string) (*models.User, error) {
	return nil, domainerrors.ErrNotFound
}
func (s *stubUserRepo) GetAllUsers(context.Context) ([]*models.User, error) { return nil, nil }
func (s *stubUserRepo) UpdateUser(_ context.Context, u *models.User) error {
	if s.updateErr != nil {
		return s.updateErr
	}
	s.user = u
	return nil
}
func (s *stubUserRepo) GetAllUsersFiltered(context.Context, string, string, int, int) ([]*models.User, error) {
	return nil, nil
}
func (s *stubUserRepo) CountUsers(context.Context, string, string) (int, error) { return 0, nil }
func (s *stubUserRepo) BumpTokenVersion(context.Context, int) (int, error)      { return 0, nil }
func (s *stubUserRepo) SoftDeleteUser(context.Context, int) error               { return nil }
func (s *stubUserRepo) RestoreUser(context.Context, int) error                  { return nil }
func (s *stubUserRepo) GetUsersReadyForHardDelete(context.Context, time.Time) ([]int, error) {
	return nil, nil
}
func (s *stubUserRepo) HardDeleteUser(context.Context, int) error { return nil }

func pendingCode(code string, trainerID int) *models.Invitation {
	return &models.Invitation{
		InvitationID: 1,
		TrainerID:    trainerID,
		Code:         code,
		Status:       "pending",
		ExpiresAt:    time.Now().Add(time.Hour),
	}
}

// Two athletes redeeming the same code concurrently must not both succeed.
// Validation and consumption must be one operation, otherwise both callers
// observe "pending" and both go on to create a relationship.
func TestAcceptInvitation_ConcurrentAcceptsOfSameCode_OnlyOneWins(t *testing.T) {
	method := newFakeInvitationMethod(pendingCode("abc123", 42))
	rels := &stubRelationshipRepo{}
	users := &stubUserRepo{user: &models.User{UserID: 1, Role: models.RoleAthlete}}
	svc := NewInvitationService(method, NewRelationshipService(rels, users, nil))

	const racers = 8
	var wg sync.WaitGroup
	errs := make([]error, racers)

	start := make(chan struct{})
	for i := 0; i < racers; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-start // release together to maximise contention
			_, errs[i] = svc.AcceptInvitation(context.Background(), "abc123", 100+i)
		}(i)
	}
	close(start)
	wg.Wait()

	succeeded := 0
	for _, err := range errs {
		if err == nil {
			succeeded++
			continue
		}
		assert.ErrorIs(t, err, domainerrors.ErrInvitationAlreadyUsed,
			"losers must be told the code was already used")
	}

	assert.Equal(t, 1, succeeded, "exactly one accept may succeed")
	rels.mu.Lock()
	defer rels.mu.Unlock()
	assert.Len(t, rels.createdTrainers, 1, "exactly one relationship may be created")
}

// A failure after the claim must hand the code back, so a transient database
// error does not permanently invalidate a code the athlete never used.
func TestAcceptInvitation_FailureAfterClaim_ReleasesCodeForRetry(t *testing.T) {
	method := newFakeInvitationMethod(pendingCode("retry1", 42))
	rels := &stubRelationshipRepo{createErr: assert.AnError}
	users := &stubUserRepo{user: &models.User{UserID: 1, Role: models.RoleAthlete}}
	svc := NewInvitationService(method, NewRelationshipService(rels, users, nil))

	_, err := svc.AcceptInvitation(context.Background(), "retry1", 7)
	require.Error(t, err)

	method.mu.Lock()
	assert.Equal(t, "pending", method.codes["retry1"].Status, "code must be released")
	assert.Equal(t, 1, method.released)
	method.mu.Unlock()

	// The retry must now succeed, proving the code was genuinely reusable.
	rels.createErr = nil
	rel, err := svc.AcceptInvitation(context.Background(), "retry1", 7)
	require.NoError(t, err)
	assert.Equal(t, 42, rel.TrainerID)
}

// An athlete who already has an active trainer must never claim the code at
// all. Claiming it would mark the code used for the duration of this request,
// and a third party redeeming the same code in that window would be told it was
// already used when it is not.
func TestAcceptInvitation_AlreadyHasTrainer_DoesNotClaimCode(t *testing.T) {
	method := newFakeInvitationMethod(pendingCode("taken1", 42))
	rels := &stubRelationshipRepo{existing: &models.Relationship{Status: "active"}}
	users := &stubUserRepo{user: &models.User{UserID: 1, Role: models.RoleAthlete}}
	svc := NewInvitationService(method, NewRelationshipService(rels, users, nil))

	_, err := svc.AcceptInvitation(context.Background(), "taken1", 7)
	require.ErrorIs(t, err, ErrAlreadyHasActiveTrainer)

	method.mu.Lock()
	defer method.mu.Unlock()
	assert.Equal(t, "pending", method.codes["taken1"].Status, "code must be untouched")
	assert.Equal(t, 0, method.released, "a code that was never claimed cannot be released")
}

// The release is the compensating action for a failed accept, and the failure
// most likely to reach it is the request context being cancelled. Releasing on
// that same dead context would fail instantly and burn the code anyway, so the
// release must run detached with its own deadline.
func TestAcceptInvitation_ReleaseSurvivesCancelledRequestContext(t *testing.T) {
	method := newFakeInvitationMethod(pendingCode("cancel1", 42))

	rels := &stubRelationshipRepo{createErr: context.Canceled}
	// A cancelled parent context is the realistic trigger: the client
	// disconnected while the relationship insert was in flight.
	ctx, cancel := context.WithCancel(context.Background())
	users := &stubUserRepo{user: &models.User{UserID: 1, Role: models.RoleAthlete}}
	svc := NewInvitationService(method, NewRelationshipService(rels, users, nil))

	// Cancel before the accept so every repository call sees a dead context.
	_, err := svc.AcceptInvitation(ctx, "cancel1", 7)
	cancel()
	require.Error(t, err)

	method.mu.Lock()
	defer method.mu.Unlock()
	assert.Equal(t, "pending", method.codes["cancel1"].Status,
		"a cancelled request must not burn the code")
	assert.Equal(t, 1, method.released)
}

func TestAcceptInvitation_EmptyCode(t *testing.T) {
	svc := NewInvitationService(newFakeInvitationMethod(), NewRelationshipService(&stubRelationshipRepo{}, &stubUserRepo{}, nil))

	_, err := svc.AcceptInvitation(context.Background(), "", 7)
	assert.ErrorIs(t, err, domainerrors.ErrInvitationCodeEmpty)
}

func TestAcceptInvitation_UnknownCode(t *testing.T) {
	svc := NewInvitationService(newFakeInvitationMethod(), NewRelationshipService(&stubRelationshipRepo{}, &stubUserRepo{}, nil))

	_, err := svc.AcceptInvitation(context.Background(), "nope", 7)
	assert.ErrorIs(t, err, domainerrors.ErrInvalidInvitationCode)
}

func TestAcceptInvitation_ExpiredCode(t *testing.T) {
	expired := pendingCode("old123", 42)
	expired.ExpiresAt = time.Now().Add(-time.Hour)
	method := newFakeInvitationMethod(expired)
	svc := NewInvitationService(method, NewRelationshipService(&stubRelationshipRepo{}, &stubUserRepo{}, nil))

	_, err := svc.AcceptInvitation(context.Background(), "old123", 7)
	assert.ErrorIs(t, err, domainerrors.ErrInvitationExpired)
}
