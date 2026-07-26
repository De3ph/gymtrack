package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresCommentRepository implements the CommentRepository interface using PostgreSQL.
type PostgresCommentRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresCommentRepository creates a new PostgreSQL-backed comment repository.
func NewPostgresCommentRepository(pool *pgxpool.Pool) *PostgresCommentRepository {
	return &PostgresCommentRepository{pool: pool}
}

const commentCols = "id, target_type, target_id, author_id, author_role, content, parent_comment_id, created_at, edited_at"

func scanComment(row interface{ Scan(dest ...any) error }, c *models.Comment) error {
	return row.Scan(
		&c.CommentID, &c.TargetType, &c.TargetID, &c.AuthorID, &c.AuthorRole,
		&c.Content, &c.ParentCommentID, &c.CreatedAt, &c.EditedAt,
	)
}

func (r *PostgresCommentRepository) Create(ctx context.Context, comment *models.Comment) error {
	now := time.Now()
	comment.CreatedAt = now

	query := "INSERT INTO comments (target_type, target_id, author_id, author_role, content, parent_comment_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id"

	err := r.pool.QueryRow(ctx, query,
		string(comment.TargetType), comment.TargetID, comment.AuthorID,
		string(comment.AuthorRole), comment.Content, comment.ParentCommentID, comment.CreatedAt,
	).Scan(&comment.CommentID)
	if err != nil {
		return fmt.Errorf("failed to create comment: %w", err)
	}

	comment.Type = "comment"
	return nil
}

func (r *PostgresCommentRepository) GetByID(ctx context.Context, commentID int) (*models.Comment, error) {
	query := "SELECT " + commentCols + " FROM comments WHERE id = $1"

	c := &models.Comment{}
	if err := scanComment(r.pool.QueryRow(ctx, query, commentID), c); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get comment by ID: %w", err)
	}

	c.Type = "comment"
	return c, nil
}

func (r *PostgresCommentRepository) GetByTarget(ctx context.Context, targetType models.TargetType, targetID int) ([]*models.Comment, error) {
	query := "SELECT " + commentCols + " FROM comments WHERE target_type = $1 AND target_id = $2 ORDER BY created_at ASC"

	rows, err := r.pool.Query(ctx, query, string(targetType), targetID)
	if err != nil {
		return nil, fmt.Errorf("failed to query comments by target: %w", err)
	}
	defer rows.Close()

	var comments []*models.Comment
	for rows.Next() {
		c := &models.Comment{}
		if err := scanComment(rows, c); err != nil {
			return nil, fmt.Errorf("failed to scan comment row: %w", err)
		}
		c.Type = "comment"
		comments = append(comments, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return comments, nil
}

func (r *PostgresCommentRepository) GetByAuthor(ctx context.Context, authorID int) ([]*models.Comment, error) {
	query := "SELECT " + commentCols + " FROM comments WHERE author_id = $1 ORDER BY created_at DESC"

	rows, err := r.pool.Query(ctx, query, authorID)
	if err != nil {
		return nil, fmt.Errorf("failed to query comments by author: %w", err)
	}
	defer rows.Close()

	var comments []*models.Comment
	for rows.Next() {
		c := &models.Comment{}
		if err := scanComment(rows, c); err != nil {
			return nil, fmt.Errorf("failed to scan comment row: %w", err)
		}
		c.Type = "comment"
		comments = append(comments, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return comments, nil
}

func (r *PostgresCommentRepository) GetReplies(ctx context.Context, parentCommentID int) ([]*models.Comment, error) {
	query := "SELECT " + commentCols + " FROM comments WHERE parent_comment_id = $1 ORDER BY created_at ASC"

	rows, err := r.pool.Query(ctx, query, parentCommentID)
	if err != nil {
		return nil, fmt.Errorf("failed to query comment replies: %w", err)
	}
	defer rows.Close()

	var comments []*models.Comment
	for rows.Next() {
		c := &models.Comment{}
		if err := scanComment(rows, c); err != nil {
			return nil, fmt.Errorf("failed to scan comment row: %w", err)
		}
		c.Type = "comment"
		comments = append(comments, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return comments, nil
}

func (r *PostgresCommentRepository) Update(ctx context.Context, comment *models.Comment) error {
	now := time.Now()
	comment.EditedAt = &now

	query := "UPDATE comments SET content = $1, parent_comment_id = $2, edited_at = $3 WHERE id = $4"

	tag, err := r.pool.Exec(ctx, query, comment.Content, comment.ParentCommentID, comment.EditedAt, comment.CommentID)
	if err != nil {
		return fmt.Errorf("failed to update comment: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *PostgresCommentRepository) Delete(ctx context.Context, commentID int) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM comments WHERE id = $1", commentID)
	if err != nil {
		return fmt.Errorf("failed to delete comment: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainerrors.ErrNotFound
	}
	return nil
}

func (r *PostgresCommentRepository) GetAllComments(ctx context.Context, targetType string, limit, offset int) ([]*models.Comment, error) {
	query := "SELECT " + commentCols + " FROM comments WHERE ($1 = '' OR target_type = $1) ORDER BY created_at DESC LIMIT $2 OFFSET $3"

	rows, err := r.pool.Query(ctx, query, targetType, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query all comments: %w", err)
	}
	defer rows.Close()

	var comments []*models.Comment
	for rows.Next() {
		c := &models.Comment{}
		if err := scanComment(rows, c); err != nil {
			return nil, fmt.Errorf("failed to scan comment row: %w", err)
		}
		c.Type = "comment"
		comments = append(comments, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}
	return comments, nil
}

func (r *PostgresCommentRepository) CountAllComments(ctx context.Context, targetType string) (int, error) {
	query := "SELECT COUNT(*) FROM comments WHERE ($1 = '' OR target_type = $1)"

	var count int
	err := r.pool.QueryRow(ctx, query, targetType).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count comments: %w", err)
	}
	return count, nil
}

// Compile-time interface compliance check.
var _ repositories.CommentRepository = (*PostgresCommentRepository)(nil)
