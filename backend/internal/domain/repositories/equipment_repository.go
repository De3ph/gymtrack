package repositories

import (
	"context"
	"fmt"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type EquipmentRepository interface {
	GetAllEquipment(ctx context.Context) ([]models.EquipmentDefinition, error)
	GetEquipmentByID(ctx context.Context, id int) (*models.EquipmentDefinition, error)
}

type CouchbaseEquipmentRepository struct {
	collection *gocb.Collection
}

func NewCouchbaseEquipmentRepository(collection *gocb.Collection) *CouchbaseEquipmentRepository {
	return &CouchbaseEquipmentRepository{
		collection: collection,
	}
}

func (r *CouchbaseEquipmentRepository) GetAllEquipment(ctx context.Context) ([]models.EquipmentDefinition, error) {
	query := fmt.Sprintf("SELECT eq.* FROM `%s`.`%s`.`%s` eq WHERE eq.type = 'equipmentDefinition' ORDER BY eq.id",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionEquipment)

	rows, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		Context: ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query equipment: %w", err)
	}
	defer rows.Close()

	var equipment []models.EquipmentDefinition
	for rows.Next() {
		var eq models.EquipmentDefinition
		err := rows.Row(&eq)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal equipment: %w", err)
		}
		equipment = append(equipment, eq)
	}

	if rows.Err() != nil {
		return nil, fmt.Errorf("error during query iteration: %w", rows.Err())
	}

	return equipment, nil
}

func (r *CouchbaseEquipmentRepository) GetEquipmentByID(ctx context.Context, id int) (*models.EquipmentDefinition, error) {
	query := fmt.Sprintf("SELECT eq.* FROM `%s`.`%s`.`%s` eq WHERE eq.type = 'equipmentDefinition' AND eq.id = $1",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionEquipment)

	rows, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{id},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query equipment by ID: %w", err)
	}
	defer rows.Close()

	var eq models.EquipmentDefinition
	if rows.Next() {
		err := rows.Row(&eq)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal equipment: %w", err)
		}
	} else if rows.Err() != nil {
		return nil, fmt.Errorf("error during query iteration: %w", rows.Err())
	} else {
		return nil, nil // Equipment not found
	}

	return &eq, nil
}
