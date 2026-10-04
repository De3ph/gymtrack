package handlers

import (
	"context"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
)

// Fakes for the repositories behind the workout-plan service. WorkoutPlanHandler
// holds a concrete *services.WorkoutPlanService, so the repository boundary is
// the only seam that needs no production change: each fake records its call
// arguments and returns a canned result or error.
//
// Identifiers are prefixed "Plan" to stay collision-free with the trainer-catalog
// fakes.

// fakePlanRepo implements repositories.WorkoutPlanRepository.
type fakePlanRepo struct {
	plans map[int]*models.WorkoutPlan

	listErr   error
	getErr    error
	createErr error
	updateErr error
	deleteErr error
	countErr  error

	byCreator []*models.WorkoutPlan

	count     int
	created   *models.WorkoutPlan
	updated   *models.WorkoutPlan
	deleted   []int
	countSeen int

	// creatorSeen records the creatorID passed to GetByCreatorID so a test can
	// assert the service scoped the lookup to the session user.
	creatorSeen int
}

func (f *fakePlanRepo) Create(ctx context.Context, plan *models.WorkoutPlan) error {
	if f.createErr != nil {
		return f.createErr
	}
	f.created = plan
	return nil
}

func (f *fakePlanRepo) GetByID(ctx context.Context, planID int) (*models.WorkoutPlan, error) {
	if f.getErr != nil {
		return nil, f.getErr
	}
	plan, ok := f.plans[planID]
	if !ok {
		return nil, domainerrors.ErrNotFound
	}
	return plan, nil
}

func (f *fakePlanRepo) GetByCreatorID(ctx context.Context, creatorID int) ([]*models.WorkoutPlan, error) {
	f.creatorSeen = creatorID
	if f.listErr != nil {
		return nil, f.listErr
	}
	return f.byCreator, nil
}

func (f *fakePlanRepo) CountByCreatorID(ctx context.Context, creatorID int) (int, error) {
	f.countSeen = creatorID
	if f.countErr != nil {
		return 0, f.countErr
	}
	return f.count, nil
}

func (f *fakePlanRepo) Update(ctx context.Context, plan *models.WorkoutPlan) error {
	if f.updateErr != nil {
		return f.updateErr
	}
	f.updated = plan
	return nil
}

func (f *fakePlanRepo) Delete(ctx context.Context, planID int) error {
	if f.deleteErr != nil {
		return f.deleteErr
	}
	f.deleted = append(f.deleted, planID)
	return nil
}

// fakePlanAssignmentRepo implements repositories.WorkoutPlanAssignmentRepository.
type fakePlanAssignmentRepo struct {
	byPlan    map[int][]*models.WorkoutPlanAssignment
	byAthlete map[int][]*models.WorkoutPlanAssignment

	listErr         error
	byAthleteErr    error
	pairErr         error
	createErr       error
	deleteByPlanErr error

	created        []*models.WorkoutPlanAssignment
	deletedPlanIDs []int
}

func (f *fakePlanAssignmentRepo) Create(ctx context.Context, assignment *models.WorkoutPlanAssignment) error {
	if f.createErr != nil {
		return f.createErr
	}
	f.created = append(f.created, assignment)
	return nil
}

func (f *fakePlanAssignmentRepo) GetByPlanID(ctx context.Context, planID int) ([]*models.WorkoutPlanAssignment, error) {
	if f.listErr != nil {
		return nil, f.listErr
	}
	return f.byPlan[planID], nil
}

func (f *fakePlanAssignmentRepo) GetByAthleteID(ctx context.Context, athleteID int) ([]*models.WorkoutPlanAssignment, error) {
	if f.byAthleteErr != nil {
		return nil, f.byAthleteErr
	}
	return f.byAthlete[athleteID], nil
}

// GetByAthleteAndPlan reports an unknown pair as domainerrors.ErrNotFound, matching
// scanAssignment in the PostgreSQL repository, which maps pgx.ErrNoRows to that
// sentinel.
//
// This matters: the service translates only ErrNotFound into "not assigned yet". A
// fake returning (nil, nil) instead would hide the difference between an athlete who
// has no assignment and a storage fault, and would let a regression that breaks every
// first-time assignment pass.
func (f *fakePlanAssignmentRepo) GetByAthleteAndPlan(ctx context.Context, athleteID int, planID int) (*models.WorkoutPlanAssignment, error) {
	if f.pairErr != nil {
		return nil, f.pairErr
	}
	for _, assignment := range f.byAthlete[athleteID] {
		if assignment.PlanID == planID {
			return assignment, nil
		}
	}
	return nil, domainerrors.ErrNotFound
}

func (f *fakePlanAssignmentRepo) GetByTrainerID(ctx context.Context, trainerID int) ([]*models.WorkoutPlanAssignment, error) {
	if f.listErr != nil {
		return nil, f.listErr
	}
	seen := make(map[int]bool)
	out := make([]*models.WorkoutPlanAssignment, 0)
	for _, assignments := range f.byPlan {
		for _, assignment := range assignments {
			if assignment.TrainerID == trainerID && !seen[assignment.AssignmentID] {
				seen[assignment.AssignmentID] = true
				out = append(out, assignment)
			}
		}
	}
	return out, nil
}

func (f *fakePlanAssignmentRepo) DeleteByPlanID(ctx context.Context, planID int) error {
	if f.deleteByPlanErr != nil {
		return f.deleteByPlanErr
	}
	f.deletedPlanIDs = append(f.deletedPlanIDs, planID)
	delete(f.byPlan, planID)
	return nil
}

// fakePlanWorkoutRepo implements repositories.WorkoutRepository, which the plan
// service uses when a plan is turned into a logged workout.
type fakePlanWorkoutRepo struct {
	createErr error
	created   *models.Workout
}

func (f *fakePlanWorkoutRepo) Create(ctx context.Context, workout *models.Workout) error {
	if f.createErr != nil {
		return f.createErr
	}
	f.created = workout
	return nil
}

func (f *fakePlanWorkoutRepo) GetByID(ctx context.Context, workoutID int) (*models.Workout, error) {
	return nil, domainerrors.ErrNotFound
}

func (f *fakePlanWorkoutRepo) GetByAthleteID(ctx context.Context, athleteID int, limit, offset int) ([]*models.Workout, error) {
	return nil, nil
}

func (f *fakePlanWorkoutRepo) GetByAthleteDateRange(ctx context.Context, athleteID int, startDate, endDate *time.Time, limit, offset int) ([]*models.Workout, error) {
	return nil, nil
}

func (f *fakePlanWorkoutRepo) CountByAthlete(ctx context.Context, athleteID int, startDate, endDate *time.Time) (int, error) {
	return 0, nil
}

func (f *fakePlanWorkoutRepo) CountAll(ctx context.Context) (int, error) {
	return 0, nil
}

// fakePlanUserRepo implements repositories.UserRepository for the client lookup
// performed by GetClientPlans.
type fakePlanUserRepo struct {
	byUsername   map[string]*models.User
	lookupErr    error
	lookupSeenAs []string
}

// GetUserByUsername reports an unknown username as domainerrors.ErrNotFound, matching
// the PostgreSQL repository (and the caching decorator, which passes it through). The
// handler maps that sentinel to its 404 branch; returning (nil, nil) here would test a
// branch no real repository can reach.
func (f *fakePlanUserRepo) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	f.lookupSeenAs = append(f.lookupSeenAs, username)
	if f.lookupErr != nil {
		return nil, f.lookupErr
	}
	user, ok := f.byUsername[username]
	if !ok {
		return nil, domainerrors.ErrNotFound
	}
	return user, nil
}

func (f *fakePlanUserRepo) GetUserByID(ctx context.Context, userID int) (*models.User, error) {
	for _, user := range f.byUsername {
		if user.UserID == userID {
			return user, nil
		}
	}
	return nil, domainerrors.ErrNotFound
}

func (f *fakePlanUserRepo) CreateUser(ctx context.Context, user *models.User) error {
	return nil
}

func (f *fakePlanUserRepo) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	return nil, domainerrors.ErrNotFound
}

func (f *fakePlanUserRepo) GetAllUsers(ctx context.Context) ([]*models.User, error) { return nil, nil }

func (f *fakePlanUserRepo) UpdateUser(ctx context.Context, user *models.User) error { return nil }

func (f *fakePlanUserRepo) GetAllUsersFiltered(ctx context.Context, role string, search string, limit, offset int) ([]*models.User, error) {
	return nil, nil
}

func (f *fakePlanUserRepo) CountUsers(ctx context.Context, role string, search string) (int, error) {
	return 0, nil
}

func (f *fakePlanUserRepo) SoftDeleteUser(ctx context.Context, userID int) error { return nil }

func (f *fakePlanUserRepo) RestoreUser(ctx context.Context, userID int) error { return nil }

func (f *fakePlanUserRepo) GetUsersReadyForHardDelete(ctx context.Context, before time.Time) ([]int, error) {
	return nil, nil
}

func (f *fakePlanUserRepo) HardDeleteUser(ctx context.Context, userID int) error { return nil }

// fakePlanRelationshipRepo implements repositories.RelationshipRepository.
//
// The service only ever asks one question ("is this trainer coaching this
// athlete?"), so the fake answers exactly that from a lookup table and records the
// pairs it was asked about.
type fakePlanRelationshipRepo struct {
	// active maps a (trainerID, athleteID) pair to whether the relationship is
	// active. A pair absent from the map is simply "no relationship".
	active map[[2]int]bool

	hasErr   error
	hasSeen  [][2]int
	hasCalls int
}

func (f *fakePlanRelationshipRepo) HasActiveRelationship(ctx context.Context, trainerID, athleteID int) (bool, error) {
	f.hasCalls++
	f.hasSeen = append(f.hasSeen, [2]int{trainerID, athleteID})
	if f.hasErr != nil {
		return false, f.hasErr
	}
	return f.active[[2]int{trainerID, athleteID}], nil
}

func (f *fakePlanRelationshipRepo) Create(ctx context.Context, relationship *models.Relationship) error {
	return nil
}

func (f *fakePlanRelationshipRepo) GetByID(ctx context.Context, relationshipID int) (*models.Relationship, error) {
	return nil, domainerrors.ErrNotFound
}

func (f *fakePlanRelationshipRepo) GetByTrainerID(ctx context.Context, trainerID int) ([]*models.Relationship, error) {
	return nil, nil
}

func (f *fakePlanRelationshipRepo) GetByAthleteID(ctx context.Context, athleteID int) (*models.Relationship, error) {
	return nil, domainerrors.ErrNotFound
}

func (f *fakePlanRelationshipRepo) GetPendingByAthleteID(ctx context.Context, athleteID int) ([]*models.Relationship, error) {
	return nil, nil
}

func (f *fakePlanRelationshipRepo) Update(ctx context.Context, relationship *models.Relationship) error {
	return nil
}

func (f *fakePlanRelationshipRepo) Delete(ctx context.Context, relationshipID int) error {
	return nil
}
