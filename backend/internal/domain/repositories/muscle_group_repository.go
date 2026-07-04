package repositories

import (
	"context"
	"fmt"

	"gymtrack-backend/internal/config"
	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type MuscleGroupRepository interface {
	GetAllMuscleGroups(ctx context.Context) ([]models.MuscleGroupDefinition, error)
	GetMuscleGroupByID(ctx context.Context, id int) (*models.MuscleGroupDefinition, error)
}

type CouchbaseMuscleGroupRepository struct {
	cluster *gocb.Cluster
	bucket  *gocb.Bucket
}

func NewCouchbaseMuscleGroupRepository(cluster *gocb.Cluster, bucket *gocb.Bucket) *CouchbaseMuscleGroupRepository {
	return &CouchbaseMuscleGroupRepository{
		cluster: cluster,
		bucket:  bucket,
	}
}

func (r *CouchbaseMuscleGroupRepository) GetAllMuscleGroups(ctx context.Context) ([]models.MuscleGroupDefinition, error) {
	query := fmt.Sprintf("SELECT mg.* FROM `%s`.`%s`.`%s` mg WHERE mg.type = 'muscleGroupDefinition' ORDER BY mg.id",
		r.bucket.Name(), config.ScopeDefault, config.CollectionMuscleGroups)

	rows, err := r.cluster.Query(query, &gocb.QueryOptions{
		Context: ctx,
		Timeout: config.DefaultQueryTimeout,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query muscle groups: %w", err)
	}
	defer rows.Close()

	var muscleGroups []models.MuscleGroupDefinition
	for rows.Next() {
		var mg models.MuscleGroupDefinition
		err := rows.Row(&mg)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal muscle group: %w", err)
		}
		muscleGroups = append(muscleGroups, mg)
	}

	if rows.Err() != nil {
		return nil, fmt.Errorf("error during query iteration: %w", rows.Err())
	}

	return muscleGroups, nil
}

func (r *CouchbaseMuscleGroupRepository) GetMuscleGroupByID(ctx context.Context, id int) (*models.MuscleGroupDefinition, error) {
	query := fmt.Sprintf("SELECT mg.* FROM `%s`.`%s`.`%s` mg WHERE mg.type = 'muscleGroupDefinition' AND mg.id = $1",
		r.bucket.Name(), config.ScopeDefault, config.CollectionMuscleGroups)

	rows, err := r.cluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{id},
		Timeout:              config.DefaultQueryTimeout,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query muscle group by ID: %w", err)
	}
	defer rows.Close()

	var mg models.MuscleGroupDefinition
	if rows.Next() {
		err := rows.Row(&mg)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal muscle group: %w", err)
		}
	} else if rows.Err() != nil {
		return nil, fmt.Errorf("error during query iteration: %w", rows.Err())
	} else {
		return nil, domainerrors.ErrNotFound
	}

	return &mg, nil
}
