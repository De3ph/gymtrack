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

// fakeInvitationMethod models the claim protocol of the PostgreSQL adapter: a
// code can be claimed exactly once. Rolling the claim back is the transaction's
// job, so the fake marks the code used and lets the caller's transaction (or a
// missing one, in these tests) decide what survives.
type fakeInvitationMethod struct {
	mu    sync.Mutex
	codes map[string]*models.Invitation
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

func (f *fakeInvitationMethod) ClaimInvitation(ctx context.Context, code string) (*models.Invitation, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
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
func (s *stubRelationshipRepo) GetActiveByTrainerID(context.Context, int, int, int) ([]*models.Relationship, error) {
	return nil, nil
}
func (s *stubRelationshipRepo) CountActiveByTrainerID(context.Context, int) (int, error) {
	return 0, nil
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

	// batchCalls counts GetUsersByIDs invocations so enrichment tests can
	// prove user details load in one batched query.
	batchCalls int
}

func (s *stubUserRepo) CreateUser(context.Context, *models.User) error { return nil }
func (s *stubUserRepo) GetUserByID(_ context.Context, id int) (*models.User, error) {
	u := *s.user
	u.UserID = id
	return &u, nil
}
func (s *stubUserRepo) GetUsersByIDs(_ context.Context, ids []int) (map[int]*models.User, error) {
	s.batchCalls++
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
func (s *stubUserRepo) SetTrainerAssignment(_ context.Context, _ int, trainerID int) error {
	if s.updateErr != nil {
		return s.updateErr
	}
	if s.user != nil {
		s.user.Profile.TrainerAssignment = trainerID
	}
	return nil
}
func (s *stubUserRepo) ClearTrainerAssignment(_ context.Context, _ int, trainerID int) error {
	if s.updateErr != nil {
		return s.updateErr
	}
	if s.user != nil && s.user.Profile.TrainerAssignment == trainerID {
		s.user.Profile.TrainerAssignment = 0
	}
	return nil
}

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
	svc := NewInvitationService(method, NewRelationshipService(rels, users, nil, nil, nil), nil)

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

// A failed accept must surface its cause and leave nothing behind: the claim
// and the relationship share one transaction, so the adapter rolls the used
// code back with the relationship instead of the service patching it up.
func TestAcceptInvitation_ActivateFailure_ReturnsErrorAndWritesNoRelationship(t *testing.T) {
	method := newFakeInvitationMethod(pendingCode("retry1", 42))
	rels := &stubRelationshipRepo{createErr: assert.AnError}
	users := &stubUserRepo{user: &models.User{UserID: 1, Role: models.RoleAthlete}}
	transactions := &recordingTransactions{}
	svc := NewInvitationService(method, NewRelationshipService(rels, users, nil, nil, nil), transactions)

	_, err := svc.AcceptInvitation(context.Background(), "retry1", 7)
	require.ErrorIs(t, err, assert.AnError)

	assert.Equal(t, 1, transactions.calls,
		"the code claim and the relationship write must share one transaction")
	assert.Empty(t, rels.createdTrainers, "a failed accept may not leave a relationship behind")
}

// An athlete who already has an active trainer must never claim the code at
// all. Claiming it would mark the code used for the duration of this request,
// and a third party redeeming the same code in that window would be told it was
// already used when it is not.
func TestAcceptInvitation_AlreadyHasTrainer_DoesNotClaimCode(t *testing.T) {
	method := newFakeInvitationMethod(pendingCode("taken1", 42))
	rels := &stubRelationshipRepo{existing: &models.Relationship{Status: "active"}}
	users := &stubUserRepo{user: &models.User{UserID: 1, Role: models.RoleAthlete}}
	svc := NewInvitationService(method, NewRelationshipService(rels, users, nil, nil, nil), nil)

	_, err := svc.AcceptInvitation(context.Background(), "taken1", 7)
	require.ErrorIs(t, err, ErrAlreadyHasActiveTrainer)

	method.mu.Lock()
	defer method.mu.Unlock()
	assert.Equal(t, "pending", method.codes["taken1"].Status, "code must be untouched")
}

// A cancelled request must not claim anything: the pre-check runs before the
// transaction opens, so a dead context never reaches the code at all.
func TestAcceptInvitation_CancelledContext_DoesNotClaimCode(t *testing.T) {
	method := newFakeInvitationMethod(pendingCode("cancel1", 42))
	rels := &stubRelationshipRepo{createErr: context.Canceled}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	users := &stubUserRepo{user: &models.User{UserID: 1, Role: models.RoleAthlete}}
	svc := NewInvitationService(method, NewRelationshipService(rels, users, nil, nil, nil), nil)

	_, err := svc.AcceptInvitation(ctx, "cancel1", 7)
	require.Error(t, err)

	method.mu.Lock()
	defer method.mu.Unlock()
	assert.Equal(t, "pending", method.codes["cancel1"].Status,
		"a cancelled request must not burn the code")
}

func TestAcceptInvitation_EmptyCode(t *testing.T) {
	svc := NewInvitationService(newFakeInvitationMethod(), NewRelationshipService(&stubRelationshipRepo{}, &stubUserRepo{}, nil, nil, nil), nil)

	_, err := svc.AcceptInvitation(context.Background(), "", 7)
	assert.ErrorIs(t, err, domainerrors.ErrInvitationCodeEmpty)
}

func TestAcceptInvitation_UnknownCode(t *testing.T) {
	svc := NewInvitationService(newFakeInvitationMethod(), NewRelationshipService(&stubRelationshipRepo{}, &stubUserRepo{}, nil, nil, nil), nil)

	_, err := svc.AcceptInvitation(context.Background(), "nope", 7)
	assert.ErrorIs(t, err, domainerrors.ErrInvalidInvitationCode)
}

func TestAcceptInvitation_ExpiredCode(t *testing.T) {
	expired := pendingCode("old123", 42)
	expired.ExpiresAt = time.Now().Add(-time.Hour)
	method := newFakeInvitationMethod(expired)
	svc := NewInvitationService(method, NewRelationshipService(&stubRelationshipRepo{}, &stubUserRepo{}, nil, nil, nil), nil)

	_, err := svc.AcceptInvitation(context.Background(), "old123", 7)
	assert.ErrorIs(t, err, domainerrors.ErrInvitationExpired)
}
