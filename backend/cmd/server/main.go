package main

import (
	"log"

	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/middleware"
	"gymtrack-backend/internal/api/routes"
	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/domain/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "gymtrack-backend/docs"
)

// @title GymTrack API
// @version 1.0
// @description Fitness tracking API for personal trainers and athletes
// @host localhost:8080
// @BasePath /api
// @schemes http https
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and the JWT token.
// @contact.name GymTrack API Support
// @license.name MIT
func main() {
	cfg := config.LoadConfig()

	err := config.ConnectCouchbase(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to Couchbase: %v", err)
	}
	defer config.DisconnectCouchbase()

	// Initialize collections
	err = config.InitializeCollections(config.GlobalCluster, config.GlobalBucket)
	if err != nil {
		log.Fatalf("Failed to initialize collections: %v", err)
	}

	// Get specific collections
	userCollection := config.GlobalBucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers)
	workoutCollection := config.GlobalBucket.Scope(config.ScopeDefault).Collection(config.CollectionWorkouts)
	mealCollection := config.GlobalBucket.Scope(config.ScopeDefault).Collection(config.CollectionMeals)
	relationshipCollection := config.GlobalBucket.Scope(config.ScopeDefault).Collection(config.CollectionRelationships)
	commentCollection := config.GlobalBucket.Scope(config.ScopeDefault).Collection(config.CollectionComments)
	invitationCollection := config.GlobalBucket.Scope(config.ScopeDefault).Collection(config.CollectionInvitations)

	// Initialize repositories with specific collections
	userRepo := repositories.NewCouchbaseUserRepository(userCollection)
	workoutRepo := repositories.NewWorkoutRepository(workoutCollection)
	mealRepo := repositories.NewMealRepository(mealCollection)
	relationshipRepo := repositories.NewRelationshipRepository(relationshipCollection)
	commentRepo := repositories.NewCommentRepository(commentCollection)

	// Trainer feature repositories
	trainerProfileRepo := repositories.NewCouchbaseTrainerProfileRepository(userCollection)
	availabilityRepo := repositories.NewCouchbaseAvailabilityRepository(userCollection)
	reviewRepo := repositories.NewCouchbaseReviewRepository(userCollection)
	coachingRequestRepo := repositories.NewCoachingRequestRepository(config.GlobalCluster)

	// Initialize invitation service with adapter pattern
	invitationMethod := services.NewCodeBasedInvitation(invitationCollection)
	invitationService := services.NewInvitationService(invitationMethod, relationshipRepo, userRepo)

	router := gin.Default()

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"} // Restrict to frontend URLs
	corsConfig.AllowHeaders = []string{"Content-Type", "Authorization", "X-Requested-With", "Allow", "Origin", "Accept", "X-Abbreviate"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	corsConfig.AllowCredentials = true

	router.Use(cors.New(corsConfig))

	// Initialize auth middleware with config
	middleware.InitAuthMiddleware(cfg)

	authHandler := handlers.NewAuthHandler(userRepo, cfg.JWTSecret)
	userHandler := handlers.NewUserHandler(userRepo)

	apiGroup := router.Group("/api")
	routes.AuthRoutes(apiGroup, authHandler)
	routes.UserRoutes(apiGroup, userHandler)

	workoutHandler := handlers.NewWorkoutHandler(workoutRepo, relationshipRepo)
	routes.WorkoutRoutes(apiGroup, workoutHandler)

	mealHandler := handlers.NewMealHandler(mealRepo, relationshipRepo)
	routes.MealRoutes(apiGroup, mealHandler)

	relationshipHandler := handlers.NewRelationshipHandler(invitationService, relationshipRepo, userRepo, workoutRepo, mealRepo)
	routes.RelationshipRoutes(apiGroup, relationshipHandler)

	commentService := services.NewCommentService(commentRepo, relationshipRepo, workoutRepo, mealRepo)
	commentHandler := handlers.NewCommentHandler(commentRepo, commentService)
	routes.CommentRoutes(apiGroup, commentHandler)

	// Trainer feature services
	trainerCatalogService := services.NewTrainerCatalogService(trainerProfileRepo, reviewRepo)
	availabilityService := services.NewAvailabilityService(availabilityRepo)
	reviewService := services.NewReviewService(reviewRepo, relationshipRepo)
	coachingRequestService := services.NewCoachingRequestService(coachingRequestRepo, userRepo, relationshipRepo)

	// Trainer feature handlers
	trainerCatalogHandler := handlers.NewTrainerCatalogHandler(trainerCatalogService)
	availabilityHandler := handlers.NewAvailabilityHandler(availabilityService)
	reviewHandler := handlers.NewReviewHandler(reviewService)
	coachingRequestHandler := handlers.NewCoachingRequestHandler(coachingRequestService)

	routes.RegisterTrainerRoutes(router, trainerCatalogHandler, availabilityHandler, reviewHandler)
	routes.RegisterCoachingRequestRoutes(router, coachingRequestHandler)

	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	log.Fatal(router.Run(":8080"))
}
