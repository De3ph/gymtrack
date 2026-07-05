package models

import (
	"time"
)

type TargetType string

const (
	TargetTypeWorkout TargetType = "workout"
	TargetTypeMeal    TargetType = "meal"
)

type AuthorRole string

const (
	AuthorRoleTrainer AuthorRole = "trainer"
	AuthorRoleAthlete AuthorRole = "athlete"
)

type Comment struct {
	Type            string     `json:"type"` // Always "comment"
	CommentID       int        `json:"commentId"`
	TargetType      TargetType `json:"targetType" validate:"required,oneof=workout meal"`
	TargetID        int        `json:"targetId" validate:"required"`
	AuthorID        int        `json:"authorId" validate:"required"`
	AuthorRole      AuthorRole `json:"authorRole" validate:"required,oneof=trainer athlete"`
	Content         string     `json:"content" validate:"required,min=1,max=2000"`
	ParentCommentID *int       `json:"parentCommentId,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	EditedAt        *time.Time `json:"editedAt,omitempty"`
}

// NewComment creates a new comment
func NewComment(targetType TargetType, targetID, authorID int, authorRole AuthorRole, content string, parentCommentID *int) *Comment {
	now := time.Now()
	return &Comment{
		Type:            "comment",
		CommentID:       0,
		TargetType:      targetType,
		TargetID:        targetID,
		AuthorID:        authorID,
		AuthorRole:      authorRole,
		Content:         content,
		ParentCommentID: parentCommentID,
		CreatedAt:       now,
	}
}

// Edit updates the comment content and sets the edited timestamp
func (c *Comment) Edit(newContent string) {
	c.Content = newContent
	now := time.Now()
	c.EditedAt = &now
}

// IsReply checks if this comment is a reply to another comment
func (c *Comment) IsReply() bool {
	return c.ParentCommentID != nil && *c.ParentCommentID != 0
}
