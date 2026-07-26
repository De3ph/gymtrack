package routes

import (
	"gymtrack-backend/internal/api/handlers"

	"github.com/gin-gonic/gin"
)

func RegisterTrainerRoutes(router *gin.Engine,
	trainerCatalogHandler *handlers.TrainerCatalogHandler,
	availabilityHandler *handlers.AvailabilityHandler,
	reviewHandler *handlers.ReviewHandler,
	authMw gin.HandlerFunc) {

	// Trainer catalog routes (public)
	router.GET("/api/trainers", trainerCatalogHandler.GetTrainers)
	router.GET("/api/trainers/:id", trainerCatalogHandler.GetTrainerByID)
	router.GET("/api/trainers/:id/availability", availabilityHandler.GetTrainerAvailability)
	router.GET("/api/trainers/:id/reviews", reviewHandler.GetTrainerReviews)

	// Trainer profile management (trainer only)
	trainerGroup := router.Group("/api/trainers/me")
	trainerGroup.Use(authMw)
	trainerGroup.PUT("/profile", trainerCatalogHandler.UpdateMyProfile)
	trainerGroup.GET("/profile", trainerCatalogHandler.GetMyProfile)
	trainerGroup.GET("/availability", availabilityHandler.GetMyAvailability)
	trainerGroup.PUT("/availability", availabilityHandler.SetMyAvailability)
	trainerGroup.DELETE("/availability/:slotId", availabilityHandler.DeleteSlot)

	// Review routes (athlete only for create, owner for update/delete)
	router.POST("/api/trainers/:id/reviews", authMw, reviewHandler.CreateReview)
	router.PUT("/api/reviews/:id", authMw, reviewHandler.UpdateReview)
	router.DELETE("/api/reviews/:id", authMw, reviewHandler.DeleteReview)
}
