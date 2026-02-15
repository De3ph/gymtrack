package routes

import (
	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
)

// CommentRoutes registers comment endpoints under the given router group.
func CommentRoutes(router *gin.RouterGroup, commentHandler *handlers.CommentHandler) {
	comments := router.Group("/comments")
	comments.Use(middleware.JWTAuthMiddleware())
	{
		comments.POST("", commentHandler.CreateComment)
		comments.GET("", commentHandler.GetComments)
		comments.PUT("/:id", commentHandler.UpdateComment)
		comments.DELETE("/:id", commentHandler.DeleteComment)
	}
}
