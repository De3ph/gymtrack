package routes

import (
	"gymtrack-backend/internal/api/handlers"

	"github.com/gin-gonic/gin"
)

// CommentRoutes registers comment endpoints under the given router group.
func CommentRoutes(router *gin.RouterGroup, commentHandler *handlers.CommentHandler, authMw gin.HandlerFunc) {
	comments := router.Group("/comments")
	comments.Use(authMw)
	{
		comments.POST("", commentHandler.CreateComment)
		comments.GET("", commentHandler.GetComments)
		comments.PUT("/:id", commentHandler.UpdateComment)
		comments.DELETE("/:id", commentHandler.DeleteComment)
	}
}
