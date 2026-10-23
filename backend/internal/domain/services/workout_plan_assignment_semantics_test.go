package services

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// These tests pin the not-found semantics the handler tests depend on. The bug they
// guard against is specific: the repository reports a missing assignment row as
// ErrNotFound, the service treated any non-nil error as a fault, and so every
// first-time assignment — plus every access check for an unassigned athlete —
// answered 500 instead of taking its intended branch.

// fakeAssignmentRepo reports an unknown (athlete, plan) pair as ErrNotFound, matching
// scanAssignment in the PostgreSQL repository.
type fakeAssignmentRepo struct {
	rows map[[2]int]*models.WorkoutPlanAssignment
	err  error

	// listForAthlete is what GetByAthleteID returns.
	listForAthlete []*models.WorkoutPlanAssignment
	calls          int
}

func (f *fakeAssignmentRepo) Create(context.Context, *models.WorkoutPlanAssignment) error { return nil }

func (f *fakeAssignmentRepo) GetByPlanID(context.Context, int) ([]*models.WorkoutPlanAssignment, error) {
	return nil, nil
}

func (f *fakeAssignmentRepo) GetByAthleteID(context.Context, int) ([]*models.WorkoutPlanAssignment, error) {
	return f.listForAthlete, nil
}

func (f *fakeAssignmentRepo) GetByAthleteAndPlan(_ context.Context, athleteID, planID int) (*models.WorkoutPlanAssignment, error) {
	f.calls++
	if f.err != nil {
		return nil, f.err
	}
	if a, ok := f.rows[[2]int{athleteID, planID}]; ok {
		return a, nil
	}
	return nil, domainerrors.ErrNotFound
}

func (f *fakeAssignmentRepo) GetByTrainerID(context.Context, int) ([]*models.WorkoutPlanAssignment, error) {
	return nil, nil
}

func (f *fakeAssignmentRepo) DeleteByPlanID(context.Context, int) error { return nil }

// noRelationshipRepo answers "this trainer does not coach this athlete" for every
// pair, so the assignment check is the only thing under test.
type noRelationshipRepo struct{ err error }

func (f noRelationshipRepo) HasActiveRelationship(context.Context, int, int) (bool, error) {
	return false, f.err
}
func (noRelationshipRepo) Create(context.Context, *models.Relationship) error { return nil }
func (noRelationshipRepo) GetByID(context.Context, int) (*models.Relationship, error) {
	return nil, domainerrors.ErrNotFound
}
func (noRelationshipRepo) GetByTrainerID(context.Context, int) ([]*models.Relationship, error) {
	return nil, nil
}
func (noRelationshipRepo) GetByTrainerAndAthlete(context.Context, int, int) (*models.Relationship, error) {
	return nil, domainerrors.ErrNotFound
}
func (noRelationshipRepo) GetActiveByTrainerID(context.Context, int) ([]*models.Relationship, error) {
	return nil, nil
}
func (noRelationshipRepo) GetActiveByAthleteID(context.Context, int) (*models.Relationship, error) {
	return nil, domainerrors.ErrNotFound
}
func (noRelationshipRepo) GetPendingByAthleteID(context.Context, int) ([]*models.Relationship, error) {
	return nil, nil
}
func (noRelationshipRepo) Update(context.Context, *models.Relationship) error { return nil }
func (noRelationshipRepo) Delete(context.Context, int) error                  { return nil }

// alwaysRelationshipRepo reports every pair as actively coached.
type alwaysRelationshipRepo struct{ noRelationshipRepo }

func (alwaysRelationshipRepo) HasActiveRelationship(context.Context, int, int) (bool, error) {
	return true, nil
}

func seedPlan(t *testing.T, repo *fakePlanRepo, planID, creatorID int) {
	t.Helper()
	plan := models.NewWorkoutPlan(creatorID, "Push Day", "Chest", []models.WorkoutPlanExercise{{
		ExerciseID: 12,
		Name:       "Bench Press",
		Sets:       []models.WorkoutPlanSet{{Weight: 60, WeightUnit: models.WeightUnitKg, Reps: 8, RestTime: 90}},
	}})
	plan.PlanID = planID
	repo.plans[planID] = plan
}

// The first assignment to an athlete is the normal path, and it requires the
// repository to answer "no such assignment" without that being an error.
func TestWorkoutPlanService_AssignPlan_FirstAssignmentSucceeds(t *testing.T) {
	plans := newFakePlanRepo()
	seedPlan(t, plans, 5, 1)
	assignments := &fakeAssignmentRepo{rows: map[[2]int]*models.WorkoutPlanAssignment{}}
	svc := NewWorkoutPlanService(plans, assignments, alwaysRelationshipRepo{}, &fakeWorkoutRepo{})

	created, err := svc.AssignPlan(context.Background(), 5, 1, []int{9})

	require.NoError(t, err, "an athlete with no prior assignment must not be an error")
	require.Len(t, created, 1)
	assert.Equal(t, 9, created[0].AthleteID)
	assert.Equal(t, 1, assignments.calls)
}

func TestWorkoutPlanService_AssignPlan_ExistingAssignmentIsIdempotent(t *testing.T) {
	plans := newFakePlanRepo()
	seedPlan(t, plans, 5, 1)
	assignments := &fakeAssignmentRepo{rows: map[[2]int]*models.WorkoutPlanAssignment{
		{9, 5}: models.NewWorkoutPlanAssignment(5, 9, 1),
	}}
	svc := NewWorkoutPlanService(plans, assignments, alwaysRelationshipRepo{}, &fakeWorkoutRepo{})

	created, err := svc.AssignPlan(context.Background(), 5, 1, []int{9})

	require.NoError(t, err)
	assert.Empty(t, created, "a duplicate assignment is skipped, not duplicated")
}

// A wrapped ErrNotFound must still read as "not assigned": storage layers add query
// context to the sentinel.
func TestWorkoutPlanService_AssignPlan_WrappedNotFoundIsNotAnError(t *testing.T) {
	plans := newFakePlanRepo()
	seedPlan(t, plans, 5, 1)
	assignments := &fakeAssignmentRepo{err: fmt.Errorf("select assignment: %w", domainerrors.ErrNotFound)}
	svc := NewWorkoutPlanService(plans, assignments, alwaysRelationshipRepo{}, &fakeWorkoutRepo{})

	created, err := svc.AssignPlan(context.Background(), 5, 1, []int{9})

	require.NoError(t, err)
	assert.Len(t, created, 1)
}

// Any other fault is a real failure and must not be laundered into an empty success.
func TestWorkoutPlanService_AssignPlan_StorageFaultPropagates(t *testing.T) {
	plans := newFakePlanRepo()
	seedPlan(t, plans, 5, 1)
	assignments := &fakeAssignmentRepo{err: errors.New("connection refused")}
	svc := NewWorkoutPlanService(plans, assignments, alwaysRelationshipRepo{}, &fakeWorkoutRepo{})

	_, err := svc.AssignPlan(context.Background(), 5, 1, []int{9})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "connection refused")
}

func TestWorkoutPlanService_GetPlan_UnassignedAthleteIsForbiddenNotInternal(t *testing.T) {
	plans := newFakePlanRepo()
	seedPlan(t, plans, 5, 1)
	assignments := &fakeAssignmentRepo{rows: map[[2]int]*models.WorkoutPlanAssignment{}}
	svc := NewWorkoutPlanService(plans, assignments, alwaysRelationshipRepo{}, &fakeWorkoutRepo{})

	_, err := svc.GetPlan(context.Background(), 5, 9, models.RoleAthlete)

	require.Error(t, err)
	var svcErr *ServiceError
	require.True(t, errors.As(err, &svcErr), "expected a ServiceError, got %T: %v", err, err)
	assert.Equal(t, "FORBIDDEN", svcErr.Code)
}

func TestWorkoutPlanService_GetPlan_AssignedAthleteSucceeds(t *testing.T) {
	plans := newFakePlanRepo()
	seedPlan(t, plans, 5, 1)
	assignments := &fakeAssignmentRepo{rows: map[[2]int]*models.WorkoutPlanAssignment{
		{9, 5}: models.NewWorkoutPlanAssignment(5, 9, 1),
	}}
	svc := NewWorkoutPlanService(plans, assignments, alwaysRelationshipRepo{}, &fakeWorkoutRepo{})

	plan, err := svc.GetPlan(context.Background(), 5, 9, models.RoleAthlete)

	require.NoError(t, err)
	assert.Equal(t, 5, plan.PlanID)
}

func TestWorkoutPlanService_GetPlan_AssignmentStorageFaultPropagates(t *testing.T) {
	plans := newFakePlanRepo()
	seedPlan(t, plans, 5, 1)
	assignments := &fakeAssignmentRepo{err: errors.New("connection refused")}
	svc := NewWorkoutPlanService(plans, assignments, alwaysRelationshipRepo{}, &fakeWorkoutRepo{})

	_, err := svc.GetPlan(context.Background(), 5, 9, models.RoleAthlete)

	require.Error(t, err)
	assert.NotErrorIs(t, err, ErrWorkoutPlanNotFound)
	assert.Contains(t, err.Error(), "connection refused")
}

func TestWorkoutPlanService_StartWorkoutFromPlan_UnassignedAthleteIsForbidden(t *testing.T) {
	plans := newFakePlanRepo()
	seedPlan(t, plans, 5, 1)
	assignments := &fakeAssignmentRepo{rows: map[[2]int]*models.WorkoutPlanAssignment{}}
	svc := NewWorkoutPlanService(plans, assignments, alwaysRelationshipRepo{}, &fakeWorkoutRepo{})

	workout, err := svc.StartWorkoutFromPlan(context.Background(), 5, 9)

	require.Error(t, err)
	assert.Nil(t, workout)
	var svcErr *ServiceError
	require.True(t, errors.As(err, &svcErr), "expected a ServiceError, got %T: %v", err, err)
	assert.Equal(t, "FORBIDDEN", svcErr.Code)
}

// resolveAssignedPlans skips only a genuinely missing plan. A storage fault must
// surface, or a database outage would be reported to the athlete as a short but
// successful list.
func TestWorkoutPlanService_GetMyPlans_PlanStorageFaultPropagates(t *testing.T) {
	plans := &faultingPlanRepo{fakePlanRepo: newFakePlanRepo(), getErr: errors.New("connection refused")}
	seedPlan(t, plans.fakePlanRepo, 5, 1)

	// One assignment, so resolving its plan is unavoidable.
	assignments := &fakeAssignmentRepo{
		rows:           map[[2]int]*models.WorkoutPlanAssignment{},
		listForAthlete: []*models.WorkoutPlanAssignment{models.NewWorkoutPlanAssignment(5, 9, 1)},
	}

	svc := NewWorkoutPlanService(plans, assignments, alwaysRelationshipRepo{}, &fakeWorkoutRepo{})

	_, err := svc.GetMyPlans(context.Background(), 9)

	require.Error(t, err, "a plan lookup fault must not be reported as an empty list")
	assert.Contains(t, err.Error(), "connection refused")
}

// A plan that was genuinely deleted is skipped so one stale assignment cannot break
// the whole listing.
func TestWorkoutPlanService_GetMyPlans_MissingPlanIsSkipped(t *testing.T) {
	plans := newFakePlanRepo()
	seedPlan(t, plans, 5, 1)

	// One live assignment, plus one whose plan (99) has since been deleted.
	assignments := &fakeAssignmentRepo{
		rows: map[[2]int]*models.WorkoutPlanAssignment{},
		listForAthlete: []*models.WorkoutPlanAssignment{
			models.NewWorkoutPlanAssignment(5, 9, 1),
			models.NewWorkoutPlanAssignment(99, 9, 1),
		},
	}
	svc := NewWorkoutPlanService(plans, assignments, alwaysRelationshipRepo{}, &fakeWorkoutRepo{})

	resolved, err := svc.GetMyPlans(context.Background(), 9)

	require.NoError(t, err)
	require.Len(t, resolved, 1, "the deleted plan's assignment is skipped, the live one survives")
	assert.Equal(t, 5, resolved[0].PlanID)
}

// faultingPlanRepo serves GetByID from a map that may fail, leaving the rest of the
// repository contract to the embedded fake.
type faultingPlanRepo struct {
	*fakePlanRepo
	getErr error
}

func (f *faultingPlanRepo) GetByID(_ context.Context, planID int) (*models.WorkoutPlan, error) {
	if f.getErr != nil {
		return nil, f.getErr
	}
	return f.fakePlanRepo.GetByID(context.Background(), planID)
}

// fakeWorkoutRepo records the workout a plan is turned into. Only Create is reachable
// from the plan service; the read methods satisfy the interface.
type fakeWorkoutRepo struct {
	created *models.Workout
}

func (f *fakeWorkoutRepo) Create(_ context.Context, workout *models.Workout) error {
	f.created = workout
	return nil
}

func (f *fakeWorkoutRepo) GetByID(context.Context, int) (*models.Workout, error) {
	return nil, domainerrors.ErrNotFound
}

func (f *fakeWorkoutRepo) GetByAthleteID(context.Context, int, int, int) ([]*models.Workout, error) {
	return nil, nil
}

func (f *fakeWorkoutRepo) GetByAthleteDateRange(context.Context, int, *time.Time, *time.Time, int, int) ([]*models.Workout, error) {
	return nil, nil
}

func (f *fakeWorkoutRepo) CountByAthlete(context.Context, int, *time.Time, *time.Time) (int, error) {
	return 0, nil
}

func (f *fakeWorkoutRepo) CountAll(context.Context) (int, error) { return 0, nil }

func (f *fakeWorkoutRepo) Update(_ context.Context, workout *models.Workout) error {
	return nil
}

func (f *fakeWorkoutRepo) Delete(_ context.Context, _ int) error { return nil }
