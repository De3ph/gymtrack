package repositories

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gymtrack-backend/internal/config"
	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type CoachingRequestRepository interface {
	Create(ctx context.Context, request *models.CoachingRequest) error
	GetByID(ctx context.Context, requestID string) (*models.CoachingRequest, error)
	GetByAthleteID(ctx context.Context, athleteID string) ([]*models.CoachingRequest, error)
	GetByTrainerID(ctx context.Context, trainerID string) ([]*models.CoachingRequest, error)
	Update(ctx context.Context, request *models.CoachingRequest) error
	Delete(ctx context.Context, requestID string) error
	GetPendingByTrainerID(ctx context.Context, trainerID string) ([]*models.CoachingRequest, error)
}

type CouchbaseCoachingRequestRepository struct {
	cluster *gocb.Cluster
	bucket  *gocb.Bucket
}

func NewCoachingRequestRepository(cluster *gocb.Cluster, bucket *gocb.Bucket) *CouchbaseCoachingRequestRepository {
	return &CouchbaseCoachingRequestRepository{
		cluster: cluster,
		bucket:  bucket,
	}
}

func (r *CouchbaseCoachingRequestRepository) Create(ctx context.Context, request *models.CoachingRequest) error {
	request.Type = "coaching_request"
	request.CreatedAt = time.Now()
	request.UpdatedAt = time.Now()

	collection := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers)
	_, err := collection.Insert(request.RequestID, request, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create coaching request: %w", err)
	}

	return nil
}

func (r *CouchbaseCoachingRequestRepository) GetByID(ctx context.Context, requestID string) (*models.CoachingRequest, error) {
	collection := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers)
	result, err := collection.Get(requestID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		if errors.Is(err, gocb.ErrDocumentNotFound) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get coaching request: %w", err)
	}

	var request models.CoachingRequest
	err = result.Content(&request)
	if err != nil {
		return nil, fmt.Errorf("failed to decode coaching request: %w", err)
	}

	return &request, nil
}

func (r *CouchbaseCoachingRequestRepository) GetByAthleteID(ctx context.Context, athleteID string) ([]*models.CoachingRequest, error) {
	query := fmt.Sprintf("SELECT req.* FROM `%s`.`%s`.`%s` req WHERE req.type = 'coaching_request' AND req.athleteId = $1 ORDER BY req.createdAt DESC",
		r.bucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := r.cluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{athleteID},
		Timeout:              config.DefaultQueryTimeout,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query coaching requests: %w", err)
	}
	defer rows.Close()

	var requests []*models.CoachingRequest
	for rows.Next() {
		var request models.CoachingRequest
		if err := rows.Row(&request); err != nil {
			continue
		}
		requests = append(requests, &request)
	}

	return requests, nil
}

func (r *CouchbaseCoachingRequestRepository) GetByTrainerID(ctx context.Context, trainerID string) ([]*models.CoachingRequest, error) {
	query := fmt.Sprintf("SELECT req.* FROM `%s`.`%s`.`%s` req WHERE req.type = 'coaching_request' AND req.trainerId = $1 ORDER BY req.createdAt DESC",
		r.bucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := r.cluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{trainerID},
		Timeout:              config.DefaultQueryTimeout,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query coaching requests: %w", err)
	}
	defer rows.Close()

	var requests []*models.CoachingRequest
	for rows.Next() {
		var request models.CoachingRequest
		if err := rows.Row(&request); err != nil {
			continue
		}
		requests = append(requests, &request)
	}

	return requests, nil
}

func (r *CouchbaseCoachingRequestRepository) GetPendingByTrainerID(ctx context.Context, trainerID string) ([]*models.CoachingRequest, error) {
	query := fmt.Sprintf("SELECT req.* FROM `%s`.`%s`.`%s` req WHERE req.type = 'coaching_request' AND req.trainerId = $1 AND req.status = 'pending' ORDER BY req.createdAt DESC",
		r.bucket.Name(), config.ScopeDefault, config.CollectionUsers)

	rows, err := r.cluster.Query(query, &gocb.QueryOptions{
		Context:              ctx,
		PositionalParameters: []interface{}{trainerID},
		Timeout:              config.DefaultQueryTimeout,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query pending coaching requests: %w", err)
	}
	defer rows.Close()

	var requests []*models.CoachingRequest
	for rows.Next() {
		var request models.CoachingRequest
		if err := rows.Row(&request); err != nil {
			continue
		}
		requests = append(requests, &request)
	}

	return requests, nil
}

func (r *CouchbaseCoachingRequestRepository) Update(ctx context.Context, request *models.CoachingRequest) error {
	request.UpdatedAt = time.Now()

	collection := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers)
	_, err := collection.Replace(request.RequestID, request, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		if errors.Is(err, gocb.ErrDocumentNotFound) {
			return domainerrors.ErrNotFound
		}
		return fmt.Errorf("failed to update coaching request: %w", err)
	}

	return nil
}

func (r *CouchbaseCoachingRequestRepository) Delete(ctx context.Context, requestID string) error {
	collection := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers)
	_, err := collection.Remove(requestID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		if errors.Is(err, gocb.ErrDocumentNotFound) {
			return domainerrors.ErrNotFound
		}
		return fmt.Errorf("failed to delete coaching request: %w", err)
	}

	return nil
}
