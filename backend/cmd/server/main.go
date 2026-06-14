package main

import (
	"log"

	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/middleware"
	"gymtrack-backend/internal/api/routes"
	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/domain/services"
	"gymtrack-backend/internal/utils"

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

	// Seed initial data
	/* err = config.SeedAllData(config.GlobalBucket)
	if err != nil {
		log.Fatalf("Failed to seed initial data: %v", err)
	} */

	// Get specific collections
	userCollection := config.GlobalBucket.Scope(config.ScopeDefault).Collection(config.CollectionUsers)
	workoutCollection := config.GlobalBucket.Scope(config.ScopeDefault).Collection(config.CollectionWorkouts)
	mealCollection := config.GlobalBucket.Scope(config.ScopeDefault).Collection(config.CollectionMeals)
	relationshipCollection := config.GlobalBucket.Scope(config.ScopeDefault).Collection(config.CollectionRelationships)
	commentCollection := config.GlobalBucket.Scope(config.ScopeDefault).Collection(config.CollectionComments)
	invitationCollection := config.GlobalBucket.Scope(config.ScopeDefault).Collection(config.CollectionInvitations)
	muscleGroupCollection := config.GlobalBucket.Scope(config.ScopeDefault).Collection(config.CollectionMuscleGroups)
	equipmentCollection := config.GlobalBucket.Scope(config.ScopeDefault).Collection(config.CollectionEquipment)
	exerciseCollection := config.GlobalBucket.Scope(config.ScopeDefault).Collection(config.CollectionExercises)
	workoutPlanCollection := config.GlobalBucket.Scope(config.ScopeDefault).Collection(config.CollectionWorkoutPlans)
	workoutPlanAssignmentCollection := config.GlobalBucket.Scope(config.ScopeDefault).Collection(config.CollectionWorkoutPlanAssignments)

	// Initialize repositories with specific collections
	userRepo := repositories.NewCouchbaseUserRepository(userCollection)
	workoutRepo := repositories.NewWorkoutRepository(workoutCollection)
	mealRepo := repositories.NewMealRepository(mealCollection)
	relationshipRepo := repositories.NewRelationshipRepository(relationshipCollection)
	commentRepo := repositories.NewCommentRepository(commentCollection)

	// Exercise feature repositories
	muscleGroupRepo := repositories.NewCouchbaseMuscleGroupRepository(muscleGroupCollection)
	equipmentRepo := repositories.NewCouchbaseEquipmentRepository(equipmentCollection)
	exerciseRepo := repositories.NewCouchbaseExerciseRepository(exerciseCollection)

	// Workout plan repositories
	workoutPlanRepo := repositories.NewWorkoutPlanRepository(workoutPlanCollection)
	workoutPlanAssignmentRepo := repositories.NewWorkoutPlanAssignmentRepository(workoutPlanAssignmentCollection)

	// Trainer feature repositories
	trainerProfileRepo := repositories.NewCouchbaseTrainerProfileRepository(userCollection)
	availabilityRepo := repositories.NewCouchbaseAvailabilityRepository(userCollection)
	reviewRepo := repositories.NewCouchbaseReviewRepository(userCollection)
	coachingRequestRepo := repositories.NewCoachingRequestRepository(config.GlobalCluster)

	// Trainer feature services
	availableClock := utils.RealClock{}
	trainerCatalogService := services.NewTrainerCatalogService(trainerProfileRepo, reviewRepo)
	availabilityService := services.NewAvailabilityService(availabilityRepo, availableClock)
	reviewService := services.NewReviewService(reviewRepo, relationshipRepo, availableClock)
	coachingRequestService := services.NewCoachingRequestService(coachingRequestRepo, userRepo, relationshipRepo, availableClock)
	invitationMethod := services.NewCodeBasedInvitation(services.NewGocbCollectionAdapter(invitationCollection), utils.RealClock{})
	invitationService := services.NewInvitationService(invitationMethod, relationshipRepo, userRepo, utils.RealClock{})

	// Exercise feature service
	exerciseService := services.NewExerciseService(exerciseRepo, muscleGroupRepo, equipmentRepo)

	router := gin.Default()

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"} // Restrict to frontend URLs
	corsConfig.AllowHeaders = []string{"Content-Type", "Authorization", "X-Requested-With", "Allow", "Origin", "Accept", "X-Abbreviate"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	corsConfig.AllowCredentials = true

	router.Use(cors.New(corsConfig))

	// Create auth service
	authService := services.NewAuthService(userRepo, cfg.JWTSecret, availableClock)

	// Initialize auth middleware with config and service
	middleware.InitAuthMiddleware(cfg, authService)

	authHandler := handlers.NewAuthHandler(authService)
	userService := services.NewUserService(userRepo)
	userHandler := handlers.NewUserHandler(userService)

	apiGroup := router.Group("/api")
	routes.AuthRoutes(apiGroup, authHandler)
	routes.UserRoutes(apiGroup, userHandler)

	workoutService := services.NewWorkoutService(workoutRepo, relationshipRepo)
	workoutHandler := handlers.NewWorkoutHandler(workoutService, userRepo)
	routes.WorkoutRoutes(apiGroup, workoutHandler)

	mealService := services.NewMealService(mealRepo, relationshipRepo)
	mealHandler := handlers.NewMealHandler(mealService, userRepo)
	routes.MealRoutes(apiGroup, mealHandler)

	relationshipHandler := handlers.NewRelationshipHandler(invitationService, relationshipRepo, userRepo, workoutRepo, mealRepo)
	routes.RelationshipRoutes(apiGroup, relationshipHandler)

	commentService := services.NewCommentService(commentRepo, relationshipRepo, workoutRepo, mealRepo)
	commentHandler := handlers.NewCommentHandler(commentRepo, commentService)
	routes.CommentRoutes(apiGroup, commentHandler)

	// Trainer feature handlers
	trainerCatalogHandler := handlers.NewTrainerCatalogHandler(trainerCatalogService)
	availabilityHandler := handlers.NewAvailabilityHandler(availabilityService)
	reviewHandler := handlers.NewReviewHandler(reviewService)
	coachingRequestHandler := handlers.NewCoachingRequestHandler(coachingRequestService)

	// Exercise feature handler
	exerciseHandler := handlers.NewExerciseHandler(exerciseService)

	routes.RegisterTrainerRoutes(router, trainerCatalogHandler, availabilityHandler, reviewHandler)
	routes.RegisterCoachingRequestRoutes(router, coachingRequestHandler)
	routes.RegisterExerciseRoutes(router, exerciseHandler)

	// Workout plan service, handler, routes
	workoutPlanService := services.NewWorkoutPlanService(workoutPlanRepo, workoutPlanAssignmentRepo, relationshipRepo, workoutRepo)
	workoutPlanHandler := handlers.NewWorkoutPlanHandler(workoutPlanService, userRepo)
	routes.RegisterWorkoutPlanRoutes(apiGroup, workoutPlanHandler)

	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	log.Fatal(router.Run(":8080"))
}
