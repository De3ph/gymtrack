package app

import (
	"context"
	"log"
	"time"

	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/middleware"
	"gymtrack-backend/internal/api/routes"
	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/domain/services"

	"github.com/couchbase/gocb/v2"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/swaggo/files"
	"github.com/swaggo/gin-swagger"
	"go.uber.org/fx"
)

var RepositoryModule = fx.Module("repositories",
	fx.Provide(
		func(cfg *config.Config) (*gocb.Cluster, *gocb.Bucket, error) {
			cluster, err := gocb.Connect(cfg.CouchbaseConnectionString, gocb.ClusterOptions{
				Authenticator: gocb.PasswordAuthenticator{
					Username: cfg.CouchbaseUsername,
					Password: cfg.CouchbasePassword,
				},
			})
			if err != nil {
				return nil, nil, err
			}

			bucket := cluster.Bucket(cfg.CouchbaseBucket)
			if err := bucket.WaitUntilReady(10*time.Second, nil); err != nil {
				return nil, nil, err
			}

			return cluster, bucket, nil
		},

		repositories.NewCouchbaseUserRepository,
		repositories.NewWorkoutRepository,
		repositories.NewMealRepository,
		repositories.NewRelationshipRepository,
		repositories.NewCommentRepository,
		repositories.NewCouchbaseMuscleGroupRepository,
		repositories.NewCouchbaseEquipmentRepository,
		repositories.NewCouchbaseExerciseRepository,
		repositories.NewWorkoutPlanRepository,
		repositories.NewWorkoutPlanAssignmentRepository,
		repositories.NewBodyMeasurementRepository,
		repositories.NewCouchbaseTrainerProfileRepository,
		repositories.NewCouchbaseAvailabilityRepository,
		repositories.NewCouchbaseReviewRepository,
		repositories.NewCoachingRequestRepository,
	),

	fx.Provide(
		services.NewUserService,
		services.NewWorkoutService,
		services.NewMealService,
		services.NewCommentService,
		services.NewExerciseService,
		services.NewTrainerCatalogService,
		services.NewAvailabilityService,
		services.NewReviewService,
		services.NewCoachingRequestService,
		services.NewInvitationService,
		services.NewBodyMeasurementService,
		services.NewAdminService,
	),

	fx.Provide(
		handlers.NewAuthHandler,
		handlers.NewUserHandler,
		handlers.NewAdminHandler,
		handlers.NewWorkoutHandler,
		handlers.NewMealHandler,
		handlers.NewRelationshipHandler,
		handlers.NewCommentHandler,
		handlers.NewExerciseHandler,
		handlers.NewTrainerCatalogHandler,
		handlers.NewAvailabilityHandler,
		handlers.NewReviewHandler,
		handlers.NewCoachingRequestHandler,
		handlers.NewWorkoutPlanHandler,
		handlers.NewBodyMeasurementHandler,
	),

	fx.Invoke(func(
		authHandler *handlers.AuthHandler,
		userHandler *handlers.UserHandler,
		adminHandler *handlers.AdminHandler,
		workoutHandler *handlers.WorkoutHandler,
		mealHandler *handlers.MealHandler,
		relationshipHandler *handlers.RelationshipHandler,
		commentHandler *handlers.CommentHandler,
		exerciseHandler *handlers.ExerciseHandler,
		trainerCatalogHandler *handlers.TrainerCatalogHandler,
		availabilityHandler *handlers.AvailabilityHandler,
		reviewHandler *handlers.ReviewHandler,
		coachingRequestHandler *handlers.CoachingRequestHandler,
		workoutPlanHandler *handlers.WorkoutPlanHandler,
		bodyMeasurementHandler *handlers.BodyMeasurementHandler,
		router *gin.Engine,
	) {
		apiGroup := router.Group("/api")
		routes.AuthRoutes(apiGroup, authHandler)
		routes.UserRoutes(apiGroup, userHandler)
		routes.AdminRoutes(apiGroup, adminHandler)

		routes.WorkoutRoutes(apiGroup, workoutHandler)
		routes.MeasurementRoutes(apiGroup, bodyMeasurementHandler)

		routes.MealRoutes(apiGroup, mealHandler)

		routes.RelationshipRoutes(apiGroup, relationshipHandler)
		routes.CommentRoutes(apiGroup, commentHandler)

		routes.RegisterExerciseRoutes(router, exerciseHandler)

		routes.RegisterTrainerRoutes(router, trainerCatalogHandler, availabilityHandler, reviewHandler)
		routes.RegisterCoachingRequestRoutes(router, coachingRequestHandler)

		routes.RegisterWorkoutPlanRoutes(apiGroup, workoutPlanHandler)
	}),
)

type AppProvider struct {
	fx.In

	Config      *config.Config
	Cluster     *gocb.Cluster
	Bucket      *gocb.Bucket
	Lifecycle   fx.Lifecycle
	Router      *gin.Engine
	AuthService *services.AuthService
}

func NewApp(p AppProvider) *App {
	config.GlobalCluster = p.Cluster
	config.GlobalBucket = p.Bucket

	middleware.InitAuthMiddleware(p.Config, p.AuthService)

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"http://localhost:3000", "http://[IP_ADDRESS]:3000", "http://localhost:3001", "http://[IP_ADDRESS]:3001"}
	corsConfig.AllowHeaders = []string{"Content-Type", "Authorization", "X-Requested-With", "Allow", "Origin", "Accept", "X-Abbreviate"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	corsConfig.AllowCredentials = true

	p.Router.Use(cors.New(corsConfig))

	p.Router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	return &App{Router: p.Router}
}

type App struct {
	Router *gin.Engine
}

func StartServer(lc fx.Lifecycle, router *gin.Engine) {
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			go func() {
				if err := router.Run(":8080"); err != nil {
					log.Printf("Server error: %v", err)
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			log.Println("Shutting down server...")
			return nil
		},
	})
}
