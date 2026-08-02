package app

import (
	"context"
	"go.uber.org/zap"
	"net/http"
	"time"

	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/middleware"
	"gymtrack-backend/internal/api/routes"
	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/domain/services"
	"gymtrack-backend/internal/infrastructure/cache"
	"gymtrack-backend/internal/infrastructure/persistence"
	"gymtrack-backend/internal/infrastructure/persistence/postgres"
	"gymtrack-backend/internal/utils"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
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

		// Cache adapter factories (one per domain, separate metrics per instance)
		func(cfg *config.Config, reg *prometheus.Registry) cache.Cache[*models.User] {
			return cache.NewUserCache(reg, cfg.CacheEnabled)
		},
		func(cfg *config.Config, reg *prometheus.Registry) cache.Cache[[]models.Exercise] {
			return cache.NewExerciseCache(reg, cfg.CacheEnabled)
		},
		func(cfg *config.Config, reg *prometheus.Registry) cache.Cache[[]models.MuscleGroupDefinition] {
			return cache.NewMuscleGroupCache(reg, cfg.CacheEnabled)
		},
		func(cfg *config.Config, reg *prometheus.Registry) cache.Cache[[]models.EquipmentDefinition] {
			return cache.NewEquipmentCache(reg, cfg.CacheEnabled)
		},
		func(cfg *config.Config, reg *prometheus.Registry) cache.Cache[[]*models.Relationship] {
			return cache.NewRelationshipCache(reg, cfg.CacheEnabled)
		},
		func(cfg *config.Config, reg *prometheus.Registry) cache.Cache[*models.TrainerWithProfile] {
			return cache.NewTrainerIDCache(reg, cfg.CacheEnabled)
		},
		func(cfg *config.Config, reg *prometheus.Registry) cache.Cache[[]models.TrainerWithProfile] {
			return cache.NewTrainerPublicCache(reg, cfg.CacheEnabled)
		},

		// Cached repositories (implement same interfaces, transparent to services)
		func(factory *persistence.RepositoryFactory, userCache cache.Cache[*models.User]) repositories.UserRepository {
			return postgres.NewCachedUserRepository(factory.UserRepository(), userCache)
		},
		func(factory *persistence.RepositoryFactory, exerciseCache cache.Cache[[]models.Exercise]) repositories.ExerciseRepository {
			return postgres.NewCachedExerciseRepository(factory.ExerciseRepository(), exerciseCache)
		},
		func(factory *persistence.RepositoryFactory, muscleGroupCache cache.Cache[[]models.MuscleGroupDefinition]) repositories.MuscleGroupRepository {
			return postgres.NewCachedMuscleGroupRepository(factory.MuscleGroupRepository(), muscleGroupCache)
		},
		func(factory *persistence.RepositoryFactory, equipmentCache cache.Cache[[]models.EquipmentDefinition]) repositories.EquipmentRepository {
			return postgres.NewCachedEquipmentRepository(factory.EquipmentRepository(), equipmentCache)
		},
		func(factory *persistence.RepositoryFactory, relationshipCache cache.Cache[[]*models.Relationship]) repositories.RelationshipRepository {
			return postgres.NewCachedRelationshipRepository(factory.RelationshipRepository(), relationshipCache)
		},
		func(factory *persistence.RepositoryFactory, trainerIDCache cache.Cache[*models.TrainerWithProfile], trainerListCache cache.Cache[[]models.TrainerWithProfile]) repositories.TrainerProfileRepository {
			return postgres.NewCachedTrainerProfileRepository(factory.TrainerProfileRepository(), trainerIDCache, trainerListCache)
		},

		// Uncached repositories (no caching needed for write-heavy or non-reference data)
		func(factory *persistence.RepositoryFactory) repositories.WorkoutRepository {
			return factory.WorkoutRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.MealRepository {
			return factory.MealRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.CommentRepository {
			return factory.CommentRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.BodyMeasurementRepository {
			return factory.BodyMeasurementRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.WorkoutPlanRepository {
			return factory.WorkoutPlanRepository()
		},
		func(factory *persistence.RepositoryFactory) repositories.WorkoutPlanAssignmentRepository {
			return factory.WorkoutPlanAssignmentRepository()
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
		authMw := middleware.JWTAuthMiddleware(cfg, authService, userRepo)
		metricsMw := middleware.MetricsMiddleware(registry)

		corsConfig := cors.DefaultConfig()
		corsConfig.AllowAllOrigins = true // Allow mobile devices + emulators in development

		// corsConfig.AllowOrigins = []string{"http://localhost:3000", "http://[IP_ADDRESS]:3000", "http://localhost:3001", "http://[IP_ADDRESS]:3001"} // Replaced by AllowAllOrigins above
		corsConfig.AllowHeaders = []string{"Content-Type", "Authorization", "X-Requested-With", "Allow", "Origin", "Accept", "X-Abbreviate"}
		corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
		corsConfig.AllowCredentials = true

		router.Use(cors.New(corsConfig))
		router.Use(middleware.BodyLimitMiddleware(middleware.DefaultMaxBodyBytes))

		// Prometheus metrics
		router.Use(metricsMw)
		routes.RegisterMetricsRoutes(router, registry)

		routes.RegisterSwaggerRoutes(router)

		apiGroup := router.Group("/api")
		routes.AuthRoutes(apiGroup, authHandler)
		routes.UserRoutes(apiGroup, userHandler, authMw)
		routes.AdminRoutes(apiGroup, adminHandler, authMw)

		routes.WorkoutRoutes(apiGroup, workoutHandler, authMw)
		routes.MeasurementRoutes(apiGroup, bodyMeasurementHandler, authMw)

		routes.MealRoutes(apiGroup, mealHandler, authMw)

		routes.RelationshipRoutes(apiGroup, relationshipHandler, authMw)
		routes.CommentRoutes(apiGroup, commentHandler, authMw)

		routes.RegisterExerciseRoutes(router, exerciseHandler, authMw)

		routes.RegisterTrainerRoutes(router, trainerCatalogHandler, availabilityHandler, reviewHandler, authMw)
		routes.RegisterCoachingRequestRoutes(router, coachingRequestHandler, authMw)

		routes.RegisterWorkoutPlanRoutes(apiGroup, workoutPlanHandler, authMw)
	}),
	fx.Invoke(StartServer),
)

func StartServer(lc fx.Lifecycle, router *gin.Engine) {
	var srv *http.Server
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			srv = &http.Server{
			Addr:              ":8080",
			Handler:           router,
			ReadTimeout:       10 * time.Second,
			ReadHeaderTimeout: 5 * time.Second,
			WriteTimeout:      30 * time.Second,
			IdleTimeout:       120 * time.Second,
		}
			go func() {
				if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
					zap.L().Error("Server error", zap.Error(err))
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			zap.L().Info("Shutting down server...")
			shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			return srv.Shutdown(shutdownCtx)
		},
	})
}
