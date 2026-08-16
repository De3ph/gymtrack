package services

import (
	"context"
	"sync"
	"testing"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakePlanRepo is an in-memory WorkoutPlanRepository for service tests.
type fakePlanRepo struct {
	mu     sync.Mutex
	plans  map[int]*models.WorkoutPlan
	nextID int
}

func newFakePlanRepo() *fakePlanRepo {
	return &fakePlanRepo{plans: make(map[int]*models.WorkoutPlan)}
}

func (f *fakePlanRepo) Create(_ context.Context, plan *models.WorkoutPlan) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.nextID++
	plan.PlanID = f.nextID
	f.plans[plan.PlanID] = plan
	return nil
}

func (f *fakePlanRepo) GetByID(_ context.Context, planID int) (*models.WorkoutPlan, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	plan, ok := f.plans[planID]
	if !ok {
		return nil, ErrWorkoutPlanNotFound
	}
	return plan, nil
}

func (f *fakePlanRepo) GetByCreatorID(_ context.Context, creatorID int) ([]*models.WorkoutPlan, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	plans := make([]*models.WorkoutPlan, 0)
	for _, p := range f.plans {
		if p.CreatorID == creatorID {
			plans = append(plans, p)
		}
	}
	return plans, nil
}

func (f *fakePlanRepo) CountByCreatorID(_ context.Context, creatorID int) (int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	count := 0
	for _, p := range f.plans {
		if p.CreatorID == creatorID {
			count++
		}
	}
	return count, nil
}

func (f *fakePlanRepo) Update(_ context.Context, plan *models.WorkoutPlan) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.plans[plan.PlanID]; !ok {
		return ErrWorkoutPlanNotFound
	}
	f.plans[plan.PlanID] = plan
	return nil
}

func (f *fakePlanRepo) Delete(_ context.Context, planID int) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.plans[planID]; !ok {
		return ErrWorkoutPlanNotFound
	}
	delete(f.plans, planID)
	return nil
}

var _ repositories.WorkoutPlanRepository = (*fakePlanRepo)(nil)

func newTestWorkoutPlanService(planRepo repositories.WorkoutPlanRepository) *WorkoutPlanService {
	return NewWorkoutPlanService(planRepo, nil, nil, nil)
}

func TestWorkoutPlanService_CreatePlan_AthleteLimit(t *testing.T) {
	svc := newTestWorkoutPlanService(newFakePlanRepo())
	ctx := context.Background()
	athleteID := 42

	exercises := []models.WorkoutPlanExercise{
		{ExerciseID: 1, Name: "Squat", Sets: []models.WorkoutPlanSet{{Weight: 100, WeightUnit: "kg", Reps: 5, RestTime: 120}}, Order: 1},
	}

	for i := 1; i <= 3; i++ {
		plan, err := svc.CreatePlan(ctx, athleteID, models.RoleAthlete, "Plan", "", exercises)
		require.NoError(t, err, "athlete should be able to create plan %d", i)
		assert.Equal(t, athleteID, plan.CreatorID)
	}

	_, err := svc.CreatePlan(ctx, athleteID, models.RoleAthlete, "Plan 4", "", exercises)
	require.Error(t, err)
	svcErr, ok := err.(*ServiceError)
	require.True(t, ok, "expected ServiceError, got %T", err)
	assert.Equal(t, "PLAN_LIMIT_REACHED", svcErr.Code)
}

func TestWorkoutPlanService_CreatePlan_TrainerUnlimited(t *testing.T) {
	svc := newTestWorkoutPlanService(newFakePlanRepo())
	ctx := context.Background()
	trainerID := 7

	exercises := []models.WorkoutPlanExercise{
		{ExerciseID: 1, Name: "Squat", Sets: []models.WorkoutPlanSet{{Weight: 100, WeightUnit: "kg", Reps: 5, RestTime: 120}}, Order: 1},
	}

	for i := 1; i <= 5; i++ {
		plan, err := svc.CreatePlan(ctx, trainerID, models.RoleTrainer, "Trainer Plan", "", exercises)
		require.NoError(t, err, "trainer should be able to create plan %d", i)
		assert.Equal(t, trainerID, plan.CreatorID)
	}
}

func TestWorkoutPlanService_CreatePlan_AthleteLimitIsPerCreator(t *testing.T) {
	svc := newTestWorkoutPlanService(newFakePlanRepo())
	ctx := context.Background()

	exercises := []models.WorkoutPlanExercise{
		{ExerciseID: 1, Name: "Squat", Sets: []models.WorkoutPlanSet{{Weight: 100, WeightUnit: "kg", Reps: 5, RestTime: 120}}, Order: 1},
	}

	for i := 1; i <= 3; i++ {
		_, err := svc.CreatePlan(ctx, 1, models.RoleAthlete, "Plan", "", exercises)
		require.NoError(t, err)
	}

	// A different athlete is unaffected by the first athlete's cap.
	plan, err := svc.CreatePlan(ctx, 2, models.RoleAthlete, "Other Plan", "", exercises)
	require.NoError(t, err)
	assert.Equal(t, 2, plan.CreatorID)
}
