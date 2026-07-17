package repositories

import (
	"context"

	"gymtrack-backend/internal/domain/models"
)

// CommentRepository defines data access for comments.
type CommentRepository interface {
	Create(ctx context.Context, comment *models.Comment) error
	GetByID(ctx context.Context, commentID int) (*models.Comment, error)
	GetByTarget(ctx context.Context, targetType models.TargetType, targetID int) ([]*models.Comment, error)
	GetByAuthor(ctx context.Context, authorID int) ([]*models.Comment, error)
	GetReplies(ctx context.Context, parentCommentID int) ([]*models.Comment, error)
	Update(ctx context.Context, comment *models.Comment) error
	Delete(ctx context.Context, commentID int) error
}
