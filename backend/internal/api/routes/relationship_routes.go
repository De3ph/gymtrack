package routes

import (
	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
)

func RelationshipRoutes(router *gin.RouterGroup, handler *handlers.RelationshipHandler) {
	relationships := router.Group("/relationships")
	relationships.Use(middleware.JWTAuthMiddleware())
	{
		// Trainer endpoints
		relationships.POST("/invite", handler.GenerateInvitation)
		relationships.GET("/my-clients", handler.GetMyClients)
		relationships.GET("/client/:id", handler.GetClientDetails)
		relationships.GET("/client/:id/stats", handler.GetClientStats)

		// Athlete endpoints
		relationships.POST("/accept", handler.AcceptInvitation)
		relationships.GET("/my-trainer", handler.GetMyTrainer)

		// Shared endpoints (both trainer and athlete)
		relationships.DELETE("/:id", handler.TerminateRelationship)
	}
}
