package repositories

import (
	"context"
	"fmt"
	"time"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/models"

	"github.com/couchbase/gocb/v2"
)

type CommentRepository struct {
	collection *gocb.Collection
}

func NewCommentRepository(collection *gocb.Collection) *CommentRepository {
	return &CommentRepository{
		collection: collection,
	}
}

// Create inserts a new comment into the database
func (r *CommentRepository) Create(comment *models.Comment) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.Insert(comment.CommentID, comment, &gocb.InsertOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to create comment: %w", err)
	}

	return nil
}

// GetByID retrieves a comment by its ID
func (r *CommentRepository) GetByID(commentID string) (*models.Comment, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := r.collection.Get(commentID, &gocb.GetOptions{
		Context: ctx,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get comment: %w", err)
	}

	var comment models.Comment
	if err := result.Content(&comment); err != nil {
		return nil, fmt.Errorf("failed to decode comment: %w", err)
	}

	return &comment, nil
}

// GetByTarget retrieves comments for a specific workout or meal
func (r *CommentRepository) GetByTarget(targetType models.TargetType, targetID string) ([]*models.Comment, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT c.* FROM `%s`.`%s`.`%s` c WHERE c.type = 'comment' AND c.targetType = $1 AND c.targetId = $2 ORDER BY c.createdAt ASC",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionComments)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{targetType, targetID},
		Context:              ctx,
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
func (r *CommentRepository) GetByAuthor(authorID string) ([]*models.Comment, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT c.* FROM `%s`.`%s`.`%s` c WHERE c.type = 'comment' AND c.authorId = $1 ORDER BY c.createdAt DESC",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionComments)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{authorID},
		Context:              ctx,
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
func (r *CommentRepository) GetReplies(parentCommentID string) ([]*models.Comment, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	query := fmt.Sprintf("SELECT c.* FROM `%s`.`%s`.`%s` c WHERE c.type = 'comment' AND c.parentCommentId = $1 ORDER BY c.createdAt ASC",
		config.GlobalBucket.Name(), config.ScopeDefault, config.CollectionComments)

	result, err := config.GlobalCluster.Query(query, &gocb.QueryOptions{
		PositionalParameters: []interface{}{parentCommentID},
		Context:              ctx,
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
func (r *CommentRepository) Update(comment *models.Comment) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.Replace(comment.CommentID, comment, &gocb.ReplaceOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to update comment: %w", err)
	}

	return nil
}

// Delete removes a comment from the database
func (r *CommentRepository) Delete(commentID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.Remove(commentID, &gocb.RemoveOptions{
		Context: ctx,
	})
	if err != nil {
		return fmt.Errorf("failed to delete comment: %w", err)
	}

	return nil
}
