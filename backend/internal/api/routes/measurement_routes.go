package routes

import (
	"gymtrack-backend/internal/api/handlers"

	"github.com/gin-gonic/gin"
)

func MeasurementRoutes(router *gin.RouterGroup, measurementHandler *handlers.BodyMeasurementHandler, authMw gin.HandlerFunc) {
	measurements := router.Group("/measurements")
	measurements.Use(authMw)
	{
		measurements.POST("", measurementHandler.CreateBodyMeasurement)
		measurements.GET("", measurementHandler.GetBodyMeasurements)
		measurements.GET("/latest", measurementHandler.GetLatestBodyMeasurement)
		measurements.GET("/:id", measurementHandler.GetBodyMeasurement)
		measurements.PUT("/:id", measurementHandler.UpdateBodyMeasurement)
		measurements.DELETE("/:id", measurementHandler.DeleteBodyMeasurement)
	}

	// Trainer client view routes
	clients := router.Group("/clients")
	clients.Use(authMw)
	{
		clients.GET("/:username/measurements", measurementHandler.GetClientBodyMeasurements)
	}
}
