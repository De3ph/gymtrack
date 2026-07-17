package postgres

import (
	"context"
	"testing"
	"time"

	domainerrors "gymtrack-backend/internal/domain/errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/testutils"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPostgresCommentRepository(t *testing.T) {
	pool, cleanup := testutils.SetupTestPostgresDB(t)
	defer cleanup()

	repo := NewPostgresCommentRepository(pool)
	ctx := context.Background()

	createUser := func(t *testing.T, username string, role models.UserRole) *models.User {
		t.Helper()
		var userID int
		err := pool.QueryRow(ctx,
			"INSERT INTO users (username, email, password_hash, role, profile) VALUES ($1,$2,$3,$4,$5) RETURNING user_id",
			username, username+"@test.com", "hash", string(role), `{"name":"`+username+`"}`,
		).Scan(&userID)
		require.NoError(t, err)
		return &models.User{UserID: userID, Username: username, Role: role}
	}

	trainer := createUser(t, "cmt_trainer", models.RoleTrainer)
	athlete := createUser(t, "cmt_athlete", models.RoleAthlete)

	t.Run("Create", func(t *testing.T) {
		comment := &models.Comment{
			TargetType: models.TargetTypeWorkout, TargetID: 1,
			AuthorID: athlete.UserID, AuthorRole: models.AuthorRoleAthlete,
			Content: "Great workout!",
		}
		err := repo.Create(ctx, comment)
		require.NoError(t, err)
		assert.NotZero(t, comment.CommentID)
		assert.Equal(t, "comment", comment.Type)
	})

	t.Run("Create_Reply", func(t *testing.T) {
		parent := &models.Comment{
			TargetType: models.TargetTypeWorkout, TargetID: 2,
			AuthorID: athlete.UserID, AuthorRole: models.AuthorRoleAthlete,
			Content: "Parent comment",
		}
		require.NoError(t, repo.Create(ctx, parent))
		reply := &models.Comment{
			TargetType: models.TargetTypeWorkout, TargetID: 2,
			AuthorID: trainer.UserID, AuthorRole: models.AuthorRoleTrainer,
			Content: "Thanks!", ParentCommentID: &parent.CommentID,
		}
		err := repo.Create(ctx, reply)
		require.NoError(t, err)
		require.NotNil(t, reply.ParentCommentID)
		assert.Equal(t, parent.CommentID, *reply.ParentCommentID)
	})

	t.Run("GetByID", func(t *testing.T) {
		comment := &models.Comment{
			TargetType: models.TargetTypeMeal, TargetID: 10,
			AuthorID: trainer.UserID, AuthorRole: models.AuthorRoleTrainer,
			Content: "Nice meal plan",
		}
		require.NoError(t, repo.Create(ctx, comment))
		fetched, err := repo.GetByID(ctx, comment.CommentID)
		require.NoError(t, err)
		assert.Equal(t, comment.CommentID, fetched.CommentID)
		assert.Equal(t, models.TargetTypeMeal, fetched.TargetType)
		assert.Equal(t, models.AuthorRoleTrainer, fetched.AuthorRole)
		assert.Nil(t, fetched.ParentCommentID)
		assert.Nil(t, fetched.EditedAt)
		assert.Equal(t, "comment", fetched.Type)
	})

	t.Run("GetByID_NotFound", func(t *testing.T) {
		_, err := repo.GetByID(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("GetByTarget", func(t *testing.T) {
		for i, content := range []string{"First", "Second", "Third"} {
			c := &models.Comment{
				TargetType: models.TargetTypeWorkout, TargetID: 50,
				AuthorID: athlete.UserID, AuthorRole: models.AuthorRoleAthlete,
				Content: content,
			}
			c.CreatedAt = c.CreatedAt.Add(time.Duration(i) * time.Millisecond)
			require.NoError(t, repo.Create(ctx, c))
		}
		comments, err := repo.GetByTarget(ctx, models.TargetTypeWorkout, 50)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(comments), 3)
		for _, c := range comments {
			assert.Equal(t, models.TargetTypeWorkout, c.TargetType)
			assert.Equal(t, 50, c.TargetID)
			assert.Equal(t, "comment", c.Type)
		}
	})

	t.Run("GetByTarget_Empty", func(t *testing.T) {
		comments, err := repo.GetByTarget(ctx, models.TargetTypeMeal, 999999)
		require.NoError(t, err)
		assert.Empty(t, comments)
	})

	t.Run("GetByAuthor", func(t *testing.T) {
		comments, err := repo.GetByAuthor(ctx, athlete.UserID)
		require.NoError(t, err)
		assert.NotEmpty(t, comments)
		for _, c := range comments {
			assert.Equal(t, athlete.UserID, c.AuthorID)
			assert.Equal(t, "comment", c.Type)
		}
	})

	t.Run("GetByAuthor_Empty", func(t *testing.T) {
		emptyUser := createUser(t, "cmt_no_comments", models.RoleAthlete)
		comments, err := repo.GetByAuthor(ctx, emptyUser.UserID)
		require.NoError(t, err)
		assert.Empty(t, comments)
	})

	t.Run("GetReplies", func(t *testing.T) {
		parent := &models.Comment{
			TargetType: models.TargetTypeWorkout, TargetID: 60,
			AuthorID: athlete.UserID, AuthorRole: models.AuthorRoleAthlete,
			Content: "Parent for replies",
		}
		require.NoError(t, repo.Create(ctx, parent))
		for _, content := range []string{"Reply 1", "Reply 2"} {
			r := &models.Comment{
				TargetType: models.TargetTypeWorkout, TargetID: 60,
				AuthorID: trainer.UserID, AuthorRole: models.AuthorRoleTrainer,
				Content: content, ParentCommentID: &parent.CommentID,
			}
			require.NoError(t, repo.Create(ctx, r))
		}
		replies, err := repo.GetReplies(ctx, parent.CommentID)
		require.NoError(t, err)
		assert.Len(t, replies, 2)
		for _, r := range replies {
			require.NotNil(t, r.ParentCommentID)
			assert.Equal(t, parent.CommentID, *r.ParentCommentID)
		}
	})

	t.Run("GetReplies_Empty", func(t *testing.T) {
		replies, err := repo.GetReplies(ctx, 999999)
		require.NoError(t, err)
		assert.Empty(t, replies)
	})

	t.Run("Update", func(t *testing.T) {
		comment := &models.Comment{
			TargetType: models.TargetTypeWorkout, TargetID: 70,
			AuthorID: athlete.UserID, AuthorRole: models.AuthorRoleAthlete,
			Content: "Original content",
		}
		require.NoError(t, repo.Create(ctx, comment))
		comment.Content = "Updated content"
		err := repo.Update(ctx, comment)
		require.NoError(t, err)
		require.NotNil(t, comment.EditedAt)
		fetched, err := repo.GetByID(ctx, comment.CommentID)
		require.NoError(t, err)
		assert.Equal(t, "Updated content", fetched.Content)
		assert.NotNil(t, fetched.EditedAt)
	})

	t.Run("Update_NotFound", func(t *testing.T) {
		comment := &models.Comment{CommentID: 999999, Content: "nope"}
		err := repo.Update(ctx, comment)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("Delete", func(t *testing.T) {
		comment := &models.Comment{
			TargetType: models.TargetTypeMeal, TargetID: 80,
			AuthorID: trainer.UserID, AuthorRole: models.AuthorRoleTrainer,
			Content: "To be deleted",
		}
		require.NoError(t, repo.Create(ctx, comment))
		err := repo.Delete(ctx, comment.CommentID)
		require.NoError(t, err)
		_, err = repo.GetByID(ctx, comment.CommentID)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})

	t.Run("Delete_NotFound", func(t *testing.T) {
		err := repo.Delete(ctx, 999999)
		assert.ErrorIs(t, err, domainerrors.ErrNotFound)
	})
}
