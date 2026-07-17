package persistence

import (
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/infrastructure/persistence/postgres"

	"github.com/jackc/pgx/v5/pgxpool"
)

// RepositoryFactory creates all repository implementations.
type RepositoryFactory struct {
	pool *pgxpool.Pool
}

// NewRepositoryFactory creates a new RepositoryFactory with the given connection pool.
func NewRepositoryFactory(pool *pgxpool.Pool) *RepositoryFactory {
	return &RepositoryFactory{pool: pool}
}

func (f *RepositoryFactory) UserRepository() repositories.UserRepository {
	return postgres.NewPostgresUserRepository(f.pool)
}

func (f *RepositoryFactory) WorkoutRepository() repositories.WorkoutRepository {
	return postgres.NewPostgresWorkoutRepository(f.pool)
}

func (f *RepositoryFactory) MealRepository() repositories.MealRepository {
	return postgres.NewPostgresMealRepository(f.pool)
}

func (f *RepositoryFactory) RelationshipRepository() repositories.RelationshipRepository {
	return postgres.NewPostgresRelationshipRepository(f.pool)
}

func (f *RepositoryFactory) CommentRepository() repositories.CommentRepository {
	return postgres.NewPostgresCommentRepository(f.pool)
}

func (f *RepositoryFactory) MuscleGroupRepository() repositories.MuscleGroupRepository {
	return postgres.NewPostgresMuscleGroupRepository(f.pool)
}

func (f *RepositoryFactory) EquipmentRepository() repositories.EquipmentRepository {
	return postgres.NewPostgresEquipmentRepository(f.pool)
}

func (f *RepositoryFactory) ExerciseRepository() repositories.ExerciseRepository {
	return postgres.NewPostgresExerciseRepository(f.pool)
}

func (f *RepositoryFactory) WorkoutPlanRepository() repositories.WorkoutPlanRepository {
	return postgres.NewPostgresWorkoutPlanRepository(f.pool)
}

func (f *RepositoryFactory) WorkoutPlanAssignmentRepository() repositories.WorkoutPlanAssignmentRepository {
	return postgres.NewPostgresWorkoutPlanAssignmentRepository(f.pool)
}

func (f *RepositoryFactory) BodyMeasurementRepository() repositories.BodyMeasurementRepository {
	return postgres.NewPostgresBodyMeasurementRepository(f.pool)
}

func (f *RepositoryFactory) TrainerProfileRepository() repositories.TrainerProfileRepository {
	return postgres.NewPostgresTrainerProfileRepository(f.pool)
}

func (f *RepositoryFactory) AvailabilityRepository() repositories.AvailabilityRepository {
	return postgres.NewPostgresAvailabilityRepository(f.pool)
}

func (f *RepositoryFactory) TrainerReviewRepository() repositories.TrainerReviewRepository {
	return postgres.NewPostgresTrainerReviewRepository(f.pool)
}

func (f *RepositoryFactory) CoachingRequestRepository() repositories.CoachingRequestRepository {
	return postgres.NewPostgresCoachingRequestRepository(f.pool)
}
