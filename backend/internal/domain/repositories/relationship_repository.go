package repositories

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type RelationshipRepository interface {
	Create(ctx context.Context, relationship *models.Relationship) error
	GetByID(ctx context.Context, relationshipID string) (*models.Relationship, error)
	GetByTrainerID(ctx context.Context, trainerID string) ([]*models.Relationship, error)
	GetByAthleteID(ctx context.Context, athleteID string) (*models.Relationship, error)
	GetPendingByAthleteID(ctx context.Context, athleteID string) ([]*models.Relationship, error)
	HasActiveRelationship(ctx context.Context, trainerID, athleteID string) (bool, error)
	Update(ctx context.Context, relationship *models.Relationship) error
	Delete(ctx context.Context, relationshipID string) error
}

type CouchbaseRelationshipRepository struct {
	collection *gocb.Collection
}

func NewRelationshipRepository(collection *gocb.Collection) *CouchbaseRelationshipRepository {
	return &CouchbaseRelationshipRepository{
		collection: collection,
	}
}

// Create inserts a new relationship into the database
func (r *CouchbaseRelationshipRepository) Create(ctx context.Context, relationship *models.Relationship) error {

	_, err := r.collection.Insert(relationship.RelationshipID, relationship, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create relationship: %w", err)
	}

	return nil
}

// GetByID retrieves a relationship by its ID
func (r *CouchbaseRelationshipRepository) GetByID(ctx context.Context, relationshipID string) (*models.Relationship, error) {

	result, err := r.collection.Get(relationshipID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get relationship: %w", err)
	}

	var relationship models.Relationship
	if err := result.Content(&relationship); err != nil {
		return nil, fmt.Errorf("failed to decode relationship: %w", err)
	}

	return &relationship, nil
}

// GetByTrainerID retrieves all relationships for a trainer
func (r *CouchbaseRelationshipRepository) GetByTrainerID(ctx context.Context, trainerID string) ([]*models.Relationship, error) {

	query := fmt.Sprintf("SELECT r.* FROM `%s`.`%s`.`%s` r WHERE r.type = 'relationship' AND r.trainerId = $1",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionRelationships)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{trainerID},
		Context:              ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query relationships by trainer: %w", err)
	}
	defer result.Close()

	var relationships []*models.Relationship
	for result.Next() {
		var relationship models.Relationship
		if err := result.Row(&relationship); err != nil {
			return nil, fmt.Errorf("failed to decode relationship row: %w", err)
		}
		relationships = append(relationships, &relationship)
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("query iteration error: %w", err)
	}

	return relationships, nil
}

// GetByAthleteID retrieves active relationship for an athlete
func (r *CouchbaseRelationshipRepository) GetByAthleteID(ctx context.Context, athleteID string) (*models.Relationship, error) {

	query := fmt.Sprintf("SELECT r.* FROM `%s`.`%s`.`%s` r WHERE r.type = 'relationship' AND r.athleteId = $1 AND r.status = 'active' LIMIT 1",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionRelationships)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID},
		Context:              ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query relationship by athlete: %w", err)
	}
	defer result.Close()

	var relationship models.Relationship
	if result.Next() {
		if err := result.Row(&relationship); err != nil {
			return nil, fmt.Errorf("failed to decode relationship row: %w", err)
		}
		return &relationship, nil
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("query iteration error: %w", err)
	}

	return nil, nil // No active relationship found
}

// GetPendingByAthleteID retrieves pending invitations for an athlete
func (r *CouchbaseRelationshipRepository) GetPendingByAthleteID(ctx context.Context, athleteID string) ([]*models.Relationship, error) {

	query := fmt.Sprintf("SELECT r.* FROM `%s`.`%s`.`%s` r WHERE r.type = 'relationship' AND r.athleteId = $1 AND r.status = 'pending'",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionRelationships)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{athleteID},
		Context:              ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query pending relationships: %w", err)
	}
	defer result.Close()

	var relationships []*models.Relationship
	for result.Next() {
		var relationship models.Relationship
		if err := result.Row(&relationship); err != nil {
			return nil, fmt.Errorf("failed to decode relationship row: %w", err)
		}
		relationships = append(relationships, &relationship)
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("query iteration error: %w", err)
	}

	return relationships, nil
}

// HasActiveRelationship checks if an active relationship exists between a trainer and athlete
func (r *CouchbaseRelationshipRepository) HasActiveRelationship(ctx context.Context, trainerID, athleteID string) (bool, error) {
	query := fmt.Sprintf("SELECT COUNT(r) as count FROM `%s`.`%s`.`%s` r WHERE r.type = 'relationship' AND r.trainerId = $1 AND r.athleteId = $2 AND r.status = 'active' LIMIT 1",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionRelationships)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{trainerID, athleteID},
		Context:              ctx,
	})
	if err != nil {
		return false, fmt.Errorf("failed to query active relationship: %w", err)
	}
	defer result.Close()

	type countResult struct {
		Count int `json:"count"`
	}

	var res countResult
	if result.Next() {
		if err := result.Row(&res); err != nil {
			return false, fmt.Errorf("failed to decode count result: %w", err)
		}
	}

	if err := result.Err(); err != nil {
		return false, fmt.Errorf("query iteration error: %w", err)
	}

	return res.Count > 0, nil
}

// Update updates an existing relationship
func (r *CouchbaseRelationshipRepository) Update(ctx context.Context, relationship *models.Relationship) error {

	relationship.UpdatedAt = time.Now()

	_, err := r.collection.Replace(relationship.RelationshipID, relationship, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to update relationship: %w", err)
	}

	return nil
}

// Delete removes a relationship from the database
func (r *CouchbaseRelationshipRepository) Delete(ctx context.Context, relationshipID string) error {

	_, err := r.collection.Remove(relationshipID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete relationship: %w", err)
	}

	return nil
}
