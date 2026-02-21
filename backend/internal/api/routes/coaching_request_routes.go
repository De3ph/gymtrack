package routes

import (
	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterCoachingRequestRoutes(router *gin.Engine, coachingRequestHandler *handlers.CoachingRequestHandler) {
	// Coaching request routes (authenticated)
	coachingGroup := router.Group("/api/coaching-requests")
	coachingGroup.Use(middleware.JWTAuthMiddleware())
	
	// Create coaching request (athletes only)
	coachingGroup.POST("", coachingRequestHandler.CreateCoachingRequest)
	
	// Get user's requests (athletes and trainers)
	coachingGroup.GET("/my", coachingRequestHandler.GetMyRequests)
	
	// Get pending requests for trainers
	coachingGroup.GET("/pending", coachingRequestHandler.GetPendingRequests)
	
	// Accept/reject coaching request (trainers only)
	coachingGroup.PUT("/:id/accept", coachingRequestHandler.AcceptCoachingRequest)
	coachingGroup.PUT("/:id/reject", coachingRequestHandler.RejectCoachingRequest)
}
