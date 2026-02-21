package main

import (
	"log"

	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/routes"
	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/domain/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

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

	// Initialize invitation service with adapter pattern
	invitationMethod := services.NewCodeBasedInvitation(invitationCollection)
	invitationService := services.NewInvitationService(invitationMethod, relationshipRepo, userRepo)

	router := gin.Default()

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"http://localhost:3000"}
	corsConfig.AllowHeaders = []string{"Content-Type", "Authorization"}
	corsConfig.AllowCredentials = true

	router.Use(cors.New(corsConfig))

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

	// Trainer feature handlers
	trainerCatalogHandler := handlers.NewTrainerCatalogHandler(trainerCatalogService)
	availabilityHandler := handlers.NewAvailabilityHandler(availabilityService)
	reviewHandler := handlers.NewReviewHandler(reviewService)

	routes.RegisterTrainerRoutes(router, trainerCatalogHandler, availabilityHandler, reviewHandler)

	log.Fatal(router.Run(":8080"))
}
