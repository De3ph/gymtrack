package repositories

import (
	"context"
	"errors"
	"fmt"

	"gymtrack-backend/internal/config"
	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type CommentRepository interface {
	Create(ctx context.Context, comment *models.Comment) error
	GetByID(ctx context.Context, commentID string) (*models.Comment, error)
	GetByTarget(ctx context.Context, targetType models.TargetType, targetID string) ([]*models.Comment, error)
	GetByAuthor(ctx context.Context, authorID string) ([]*models.Comment, error)
	GetReplies(ctx context.Context, parentCommentID string) ([]*models.Comment, error)
	Update(ctx context.Context, comment *models.Comment) error
	Delete(ctx context.Context, commentID string) error
}

type CouchbaseCommentRepository struct {
	cluster *gocb.Cluster
	bucket  *gocb.Bucket
}

func NewCommentRepository(cluster *gocb.Cluster, bucket *gocb.Bucket) *CouchbaseCommentRepository {
	return &CouchbaseCommentRepository{
		cluster: cluster,
		bucket:  bucket,
	}
}

// Create inserts a new comment into the database
func (r *CouchbaseCommentRepository) Create(ctx context.Context, comment *models.Comment) error {
	_, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionComments).Insert(comment.CommentID, comment, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create comment: %w", err)
	}

	return nil
}

// GetByID retrieves a comment by its ID
func (r *CouchbaseCommentRepository) GetByID(ctx context.Context, commentID string) (*models.Comment, error) {
	result, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionComments).Get(commentID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		if errors.Is(err, gocb.ErrDocumentNotFound) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get comment: %w", err)
	}

	var comment models.Comment
	if err := result.Content(&comment); err != nil {
		return nil, fmt.Errorf("failed to decode comment: %w", err)
	}

	return &comment, nil
}

// GetByTarget retrieves comments for a specific workout or meal
func (r *CouchbaseCommentRepository) GetByTarget(ctx context.Context, targetType models.TargetType, targetID string) ([]*models.Comment, error) {
	query := fmt.Sprintf("SELECT c.* FROM `%s`.`%s`.`%s` c WHERE c.type = 'comment' AND c.targetType = $1 AND c.targetId = $2 ORDER BY c.createdAt ASC",
		r.bucket.Name(), config.ScopeDefault, config.CollectionComments)

	result, err := r.cluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{targetType, targetID},
		Context:              ctx,
		Timeout:              config.DefaultQueryTimeout,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query comments by target: %w", err)
	}
	defer result.Close()

	var comments []*models.Comment
	for result.Next() {
		var comment models.Comment
		if err := result.Row(&comment); err != nil {
			return nil, fmt.Errorf("failed to decode comment row: %w", err)
		}
		comments = append(comments, &comment)
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("query iteration error: %w", err)
	}

	return comments, nil
}

// GetByAuthor retrieves comments by a specific author
func (r *CouchbaseCommentRepository) GetByAuthor(ctx context.Context, authorID string) ([]*models.Comment, error) {
	query := fmt.Sprintf("SELECT c.* FROM `%s`.`%s`.`%s` c WHERE c.type = 'comment' AND c.authorId = $1 ORDER BY c.createdAt DESC",
		r.bucket.Name(), config.ScopeDefault, config.CollectionComments)

	result, err := r.cluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{authorID},
		Context:              ctx,
		Timeout:              config.DefaultQueryTimeout,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query comments by author: %w", err)
	}
	defer result.Close()

	var comments []*models.Comment
	for result.Next() {
		var comment models.Comment
		if err := result.Row(&comment); err != nil {
			return nil, fmt.Errorf("failed to decode comment row: %w", err)
		}
		comments = append(comments, &comment)
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("query iteration error: %w", err)
	}

	return comments, nil
}

// GetReplies retrieves replies to a specific comment
func (r *CouchbaseCommentRepository) GetReplies(ctx context.Context, parentCommentID string) ([]*models.Comment, error) {
	query := fmt.Sprintf("SELECT c.* FROM `%s`.`%s`.`%s` c WHERE c.type = 'comment' AND c.parentCommentId = $1 ORDER BY c.createdAt ASC",
		r.bucket.Name(), config.ScopeDefault, config.CollectionComments)

	result, err := r.cluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{parentCommentID},
		Context:              ctx,
		Timeout:              config.DefaultQueryTimeout,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query comment replies: %w", err)
	}
	defer result.Close()

	var comments []*models.Comment
	for result.Next() {
		var comment models.Comment
		if err := result.Row(&comment); err != nil {
			return nil, fmt.Errorf("failed to decode comment row: %w", err)
		}
		comments = append(comments, &comment)
	}

	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("query iteration error: %w", err)
	}

	return comments, nil
}

// Update updates an existing comment
func (r *CouchbaseCommentRepository) Update(ctx context.Context, comment *models.Comment) error {
	_, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionComments).Replace(comment.CommentID, comment, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to update comment: %w", err)
	}

	return nil
}

// Delete removes a comment from the database
func (r *CouchbaseCommentRepository) Delete(ctx context.Context, commentID string) error {
	_, err := r.bucket.Scope(config.ScopeDefault).Collection(config.CollectionComments).Remove(commentID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete comment: %w", err)
	}

	return nil
}
