package repositories

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type ExerciseRepository interface {
	CreateExercise(ctx context.Context, exercise *models.Exercise) error
	GetExerciseByID(ctx context.Context, exerciseID string) (*models.Exercise, error)
	GetAllExercises(ctx context.Context) ([]models.Exercise, error)
	GetExercisesByMuscleGroup(ctx context.Context, muscleGroupID int) ([]models.Exercise, error)
	GetExercisesByEquipment(ctx context.Context, equipmentID int) ([]models.Exercise, error)
	SearchExercises(ctx context.Context, query string, muscleGroupID *int, equipmentID *int) ([]models.Exercise, error)
}

type CouchbaseExerciseRepository struct {
	collection *gocb.Collection
}

func NewCouchbaseExerciseRepository(collection *gocb.Collection) *CouchbaseExerciseRepository {
	return &CouchbaseExerciseRepository{
		collection: collection,
	}
}

func (r *CouchbaseExerciseRepository) CreateExercise(ctx context.Context, exercise *models.Exercise) error {
	exercise.CreatedAt = time.Now()

	_, err := r.collection.Insert(exercise.ExerciseID, exercise, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create exercise: %w", err)
	}
	return nil
}

func (r *CouchbaseExerciseRepository) GetExerciseByID(ctx context.Context, exerciseID string) (*models.Exercise, error) {
	var exercise models.Exercise
	getResult, err := r.collection.Get(exerciseID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		if err == gocb.ErrDocumentNotFound {
			return nil, nil // Exercise not found
		}
		return nil, fmt.Errorf("failed to get exercise by ID: %w", err)
	}

	err = getResult.Content(&exercise)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal exercise content: %w", err)
	}

	return &exercise, nil
}

func (r *CouchbaseExerciseRepository) GetAllExercises(ctx context.Context) ([]models.Exercise, error) {
	query := fmt.Sprintf("SELECT ex.* FROM `%s`.`%s`.`%s` ex WHERE ex.type = 'exercise' ORDER BY ex.name",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionExercises)

	rows, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		Context: ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query exercises: %w", err)
	}
	defer rows.Close()

	var exercises []models.Exercise
	for rows.Next() {
		var ex models.Exercise
		err := rows.Row(&ex)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal exercise: %w", err)
		}
		exercises = append(exercises, ex)
	}

	if rows.Err() != nil {
		return nil, fmt.Errorf("error during query iteration: %w", rows.Err())
	}

	return exercises, nil
}

func (r *CouchbaseExerciseRepository) GetExercisesByMuscleGroup(ctx context.Context, muscleGroupID int) ([]models.Exercise, error) {
	query := fmt.Sprintf("SELECT ex.* FROM `%s`.`%s`.`%s` ex WHERE ex.type = 'exercise' AND ex.muscleGroupId = $1 ORDER BY ex.name",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionExercises)

	rows, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{muscleGroupID},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query exercises by muscle group: %w", err)
	}
	defer rows.Close()

	var exercises []models.Exercise
	for rows.Next() {
		var ex models.Exercise
		err := rows.Row(&ex)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal exercise: %w", err)
		}
		exercises = append(exercises, ex)
	}

	if rows.Err() != nil {
		return nil, fmt.Errorf("error during query iteration: %w", rows.Err())
	}

	return exercises, nil
}

func (r *CouchbaseExerciseRepository) GetExercisesByEquipment(ctx context.Context, equipmentID int) ([]models.Exercise, error) {
	query := fmt.Sprintf("SELECT ex.* FROM `%s`.`%s`.`%s` ex WHERE ex.type = 'exercise' AND ex.equipmentId = $1 ORDER BY ex.name",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionExercises)

	rows, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{equipmentID},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query exercises by equipment: %w", err)
	}
	defer rows.Close()

	var exercises []models.Exercise
	for rows.Next() {
		var ex models.Exercise
		err := rows.Row(&ex)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal exercise: %w", err)
		}
		exercises = append(exercises, ex)
	}

	if rows.Err() != nil {
		return nil, fmt.Errorf("error during query iteration: %w", rows.Err())
	}

	return exercises, nil
}

func (r *CouchbaseExerciseRepository) SearchExercises(ctx context.Context, query string, muscleGroupID *int, equipmentID *int) ([]models.Exercise, error) {
	var n1qlQuery string
	var params []interface{}

	if muscleGroupID != nil && equipmentID != nil {
		n1qlQuery = fmt.Sprintf("SELECT ex.* FROM `%s`.`%s`.`%s` ex WHERE ex.type = 'exercise' AND ex.name LIKE $1 AND ex.muscleGroupId = $2 AND ex.equipmentId = $3 ORDER BY ex.name",
			config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionExercises)
		params = []interface{}{"%" + query + "%", *muscleGroupID, *equipmentID}
	} else if muscleGroupID != nil {
		n1qlQuery = fmt.Sprintf("SELECT ex.* FROM `%s`.`%s`.`%s` ex WHERE ex.type = 'exercise' AND ex.name LIKE $1 AND ex.muscleGroupId = $2 ORDER BY ex.name",
			config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionExercises)
		params = []interface{}{"%" + query + "%", *muscleGroupID}
	} else if equipmentID != nil {
		n1qlQuery = fmt.Sprintf("SELECT ex.* FROM `%s`.`%s`.`%s` ex WHERE ex.type = 'exercise' AND ex.name LIKE $1 AND ex.equipmentId = $2 ORDER BY ex.name",
			config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionExercises)
		params = []interface{}{"%" + query + "%", *equipmentID}
	} else {
		n1qlQuery = fmt.Sprintf("SELECT ex.* FROM `%s`.`%s`.`%s` ex WHERE ex.type = 'exercise' AND ex.name LIKE $1 ORDER BY ex.name",
			config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionExercises)
		params = []interface{}{"%" + query + "%"}
	}

	rows, err := config.GlobalCluster.Query(n1qlQuery, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: params,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to search exercises: %w", err)
	}
	defer rows.Close()

	var exercises []models.Exercise
	for rows.Next() {
		var ex models.Exercise
		err := rows.Row(&ex)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal exercise: %w", err)
		}
		exercises = append(exercises, ex)
	}

	if rows.Err() != nil {
		return nil, fmt.Errorf("error during query iteration: %w", rows.Err())
	}

	return exercises, nil
}
