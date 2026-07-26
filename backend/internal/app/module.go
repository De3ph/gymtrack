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
	"gymtrack-backend/internal/infrastructure/persistence"
	"gymtrack-backend/internal/infrastructure/persistence/postgres"
	"gymtrack-backend/internal/utils"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/swaggo/files"
	"github.com/swaggo/gin-swagger"
	"go.uber.org/fx"
)

var RepositoryModule = fx.Module("repositories",
	fx.Provide(
		config.LoadConfig,
		func() utils.Clock {
			return utils.RealClock{}
		},

		// PostgreSQL connection pool
		func(cfg *config.Config) (*pgxpool.Pool, error) {
			return config.ProvidePostgresPool(&config.PostgresConfig{DSN: cfg.PostgresDSN})
		},

		// Repository factory - creates all PostgreSQL repositories
		func(pool *pgxpool.Pool) *persistence.RepositoryFactory {
			return persistence.NewRepositoryFactory(pool)
		},
		func(factory *persistence.RepositoryFactory) repositories.UserRepository {
			return factory.UserRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.WorkoutRepository {
			return factory.WorkoutRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.MealRepository {
			return factory.MealRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.RelationshipRepository {
			return factory.RelationshipRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.CommentRepository {
			return factory.CommentRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.MuscleGroupRepository {
			return factory.MuscleGroupRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.EquipmentRepository {
			return factory.EquipmentRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.ExerciseRepository {
			return factory.ExerciseRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.WorkoutPlanRepository {
			return factory.WorkoutPlanRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.WorkoutPlanAssignmentRepository {
			return factory.WorkoutPlanAssignmentRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.BodyMeasurementRepository {
			return factory.BodyMeasurementRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.TrainerProfileRepository {
			return factory.TrainerProfileRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.AvailabilityRepository {
			return factory.AvailabilityRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.TrainerReviewRepository {
			return factory.TrainerReviewRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.CoachingRequestRepository {
			return factory.CoachingRequestRepository()
		},

		// Services
		func(userRepo repositories.UserRepository, cfg *config.Config, clock utils.Clock) *services.AuthService {
			return services.NewAuthService(userRepo, cfg.JWTSecret, clock)
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
			pool *pgxpool.Pool,
			clock utils.Clock,
			relationshipRepo repositories.RelationshipRepository,
			userRepo repositories.UserRepository,
		) *services.InvitationService {
			method := postgres.NewPostgresCodeBasedInvitation(pool, clock)
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

		func() *prometheus.Registry {
			reg := prometheus.NewRegistry()
			reg.MustRegister(
				collectors.NewGoCollector(),
				collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
				collectors.NewBuildInfoCollector(),
			)
			return reg
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
		authService *services.AuthService,
		userRepo repositories.UserRepository,
		router *gin.Engine,
		registry *prometheus.Registry,
	) {
		middleware.InitAuthMiddleware(cfg, authService, userRepo)

		corsConfig := cors.DefaultConfig()
		corsConfig.AllowOrigins = []string{"http://localhost:3000", "http://[IP_ADDRESS]:3000", "http://localhost:3001", "http://[IP_ADDRESS]:3001"}
		corsConfig.AllowHeaders = []string{"Content-Type", "Authorization", "X-Requested-With", "Allow", "Origin", "Accept", "X-Abbreviate"}
		corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
		corsConfig.AllowCredentials = true

		router.Use(cors.New(corsConfig))

		// Prometheus metrics
		middleware.InitMetricsMiddleware(registry)
		router.Use(middleware.MetricsMiddleware())
		routes.RegisterMetricsRoutes(router, registry)

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
	Lifecycle   fx.Lifecycle
	Router      *gin.Engine
	AuthService *services.AuthService
	UserRepo    repositories.UserRepository
}

func NewApp(p AppProvider) *App {
	middleware.InitAuthMiddleware(p.Config, p.AuthService, p.UserRepo)

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
