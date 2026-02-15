package repositories

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type RelationshipRepository struct {
	collection *gocb.Collection
}

func NewRelationshipRepository(collection *gocb.Collection) *RelationshipRepository {
	return &RelationshipRepository{
		collection: collection,
	}
}

// Create inserts a new relationship into the database
func (r *RelationshipRepository) Create(relationship *models.Relationship) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.Insert(relationship.RelationshipID, relationship, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create relationship: %w", err)
	}

	return nil
}

// GetByID retrieves a relationship by its ID
func (r *RelationshipRepository) GetByID(relationshipID string) (*models.Relationship, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

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
func (r *RelationshipRepository) GetByTrainerID(trainerID string) ([]*models.Relationship, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

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

// GetByAthleteID retrieves the active relationship for an athlete
func (r *RelationshipRepository) GetByAthleteID(athleteID string) (*models.Relationship, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

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
func (r *RelationshipRepository) GetPendingByAthleteID(athleteID string) ([]*models.Relationship, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

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

// Update updates an existing relationship
func (r *RelationshipRepository) Update(relationship *models.Relationship) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

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
func (r *RelationshipRepository) Delete(relationshipID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.Remove(relationshipID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete relationship: %w", err)
	}

	return nil
}
