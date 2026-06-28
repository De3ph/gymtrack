package app

import (
	"context"
	"log"

	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/middleware"
	"gymtrack-backend/internal/api/routes"
	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/domain/services"
	"gymtrack-backend/internal/utils"

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
			return config.ProvideCouchbaseConnection(cfg)
		},

		config.LoadConfig,
		func() utils.Clock {
			return utils.RealClock{}
		},

		func(cluster *gocb.Cluster, bucket *gocb.Bucket) repositories.UserRepository {
			return repositories.NewCouchbaseUserRepository(cluster, bucket)
		},

		func(cluster *gocb.Cluster, bucket *gocb.Bucket) repositories.WorkoutRepository {
			return repositories.NewWorkoutRepository(cluster, bucket)
		},

		func(cluster *gocb.Cluster, bucket *gocb.Bucket) repositories.MealRepository {
			return repositories.NewMealRepository(cluster, bucket)
		},

		func(cluster *gocb.Cluster, bucket *gocb.Bucket) repositories.RelationshipRepository {
			return repositories.NewRelationshipRepository(cluster, bucket)
		},

		func(cluster *gocb.Cluster, bucket *gocb.Bucket) repositories.CommentRepository {
			return repositories.NewCommentRepository(cluster, bucket)
		},

		func(cluster *gocb.Cluster, bucket *gocb.Bucket) repositories.MuscleGroupRepository {
			return repositories.NewCouchbaseMuscleGroupRepository(cluster, bucket)
		},

		func(cluster *gocb.Cluster, bucket *gocb.Bucket) repositories.EquipmentRepository {
			return repositories.NewCouchbaseEquipmentRepository(cluster, bucket)
		},

		func(cluster *gocb.Cluster, bucket *gocb.Bucket) repositories.ExerciseRepository {
			return repositories.NewCouchbaseExerciseRepository(cluster, bucket)
		},

		func(cluster *gocb.Cluster, bucket *gocb.Bucket) repositories.WorkoutPlanRepository {
			return repositories.NewWorkoutPlanRepository(cluster, bucket)
		},

		func(cluster *gocb.Cluster, bucket *gocb.Bucket) repositories.WorkoutPlanAssignmentRepository {
			return repositories.NewWorkoutPlanAssignmentRepository(cluster, bucket)
		},

		func(cluster *gocb.Cluster, bucket *gocb.Bucket) repositories.BodyMeasurementRepository {
			return repositories.NewBodyMeasurementRepository(cluster, bucket)
		},

		func(cluster *gocb.Cluster, bucket *gocb.Bucket) repositories.TrainerProfileRepository {
			return repositories.NewCouchbaseTrainerProfileRepository(cluster, bucket)
		},

		func(cluster *gocb.Cluster, bucket *gocb.Bucket) repositories.AvailabilityRepository {
			return repositories.NewCouchbaseAvailabilityRepository(cluster, bucket)
		},

		func(cluster *gocb.Cluster, bucket *gocb.Bucket) repositories.ReviewRepository {
			return repositories.NewCouchbaseReviewRepository(cluster, bucket)
		},

		func(cluster *gocb.Cluster, bucket *gocb.Bucket) repositories.CoachingRequestRepository {
			return repositories.NewCoachingRequestRepository(cluster, bucket)
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

		func(cfg *config.Config, clock utils.Clock, cluster *gocb.Cluster, bucket *gocb.Bucket) *services.AuthService {
			return services.NewAuthService(repositories.NewCouchbaseUserRepository(cluster, bucket), cfg.JWTSecret, clock)
		},

		services.NewUserService,
		services.NewWorkoutService,
		services.NewMealService,
		services.NewCommentService,
		func(
			exerciseRepo repositories.ExerciseRepository,
			muscleGroupRepo repositories.MuscleGroupRepository,
			equipmentRepo repositories.EquipmentRepository,
		) services.ExerciseService {
			return services.NewExerciseService(exerciseRepo, muscleGroupRepo, equipmentRepo)
		},
		services.NewTrainerCatalogService,
		services.NewAvailabilityService,
		services.NewReviewService,
		services.NewCoachingRequestService,
		services.NewWorkoutPlanService,
		func(
			bucket *gocb.Bucket,
			clock utils.Clock,
			relationshipRepo repositories.RelationshipRepository,
			userRepo repositories.UserRepository,
		) *services.InvitationService {
			method := services.NewCodeBasedInvitation(
				services.NewGocbCollectionAdapter(config.GetCollection(bucket, config.CollectionInvitations)),
				clock,
			)
			return services.NewInvitationService(method, relationshipRepo, userRepo, clock)
		},
		services.NewBodyMeasurementService,
		services.NewAdminService,

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

		func() *gin.Engine {
			return gin.Default()
		},
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
		cfg *config.Config,
		cluster *gocb.Cluster,
		bucket *gocb.Bucket,
		authService *services.AuthService,
		router *gin.Engine,
	) {
		config.GlobalCluster = cluster
		config.GlobalBucket = bucket

		middleware.InitAuthMiddleware(cfg, authService)

		corsConfig := cors.DefaultConfig()
		corsConfig.AllowOrigins = []string{"http://localhost:3000", "http://[IP_ADDRESS]:3000", "http://localhost:3001", "http://[IP_ADDRESS]:3001"}
		corsConfig.AllowHeaders = []string{"Content-Type", "Authorization", "X-Requested-With", "Allow", "Origin", "Accept", "X-Abbreviate"}
		corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
		corsConfig.AllowCredentials = true

		router.Use(cors.New(corsConfig))
		router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

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
	fx.Invoke(StartServer),
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
