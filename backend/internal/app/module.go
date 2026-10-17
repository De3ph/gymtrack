package app

import (
	"context"
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
	"gymtrack-backend/internal/infrastructure/email"
	"gymtrack-backend/internal/infrastructure/persistence"
	"gymtrack-backend/internal/infrastructure/persistence/postgres"
	"gymtrack-backend/internal/infrastructure/tracing"
	"gymtrack-backend/internal/utils"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"go.uber.org/fx"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

var RepositoryModule = fx.Module("repositories",
	fx.Provide(
		config.LoadConfig,
		func() utils.Clock {
			return utils.RealClock{}
		},

		// PostgreSQL connection pool.
		//
		// The pool owns background acquire-signal goroutines and idle
		// connections, so it must be closed on shutdown. Without this hook fx
		// has no reason to call pool.Close(): ProvidePostgresPool only closes on
		// the ping-failure path.
		func(cfg *config.Config, lc fx.Lifecycle) (*pgxpool.Pool, error) {
			pool, err := config.ProvidePostgresPool(&config.PostgresConfig{DSN: cfg.PostgresDSN})
			if err != nil {
				return nil, err
			}
			lc.Append(fx.Hook{
				OnStop: func(context.Context) error {
					pool.Close()
					return nil
				},
			})
			return pool, nil
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

		// Cache invalidation bus. Decorators caching different projections of
		// the same users row (user:* and trainer:*) coordinate through this so
		// a write through one clears the other, without an fx dependency cycle.
		postgres.NewCacheInvalidationBus,

		// Cached repositories (implement same interfaces, transparent to services)
		func(factory *persistence.RepositoryFactory, userCache cache.Cache[*models.User], bus *postgres.CacheInvalidationBus) repositories.UserRepository {
			return postgres.NewCachedUserRepository(factory.UserRepository(), userCache, bus)
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
		func(factory *persistence.RepositoryFactory, trainerIDCache cache.Cache[*models.TrainerWithProfile], trainerListCache cache.Cache[[]models.TrainerWithProfile], bus *postgres.CacheInvalidationBus) repositories.TrainerProfileRepository {
			return postgres.NewCachedTrainerProfileRepository(factory.TrainerProfileRepository(), trainerIDCache, trainerListCache, bus)
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

		// Password reset dependencies
		func(pool *pgxpool.Pool, clock utils.Clock) repositories.PasswordResetTokenRepository {
			return postgres.NewPostgresPasswordResetTokenRepository(pool, clock)
		},
		func(cfg *config.Config) services.EmailSender {
			if cfg.ResendAPIKey != "" && cfg.EmailFrom != "" {
				return email.NewResendSender(cfg.ResendAPIKey, cfg.EmailFrom)
			}
			zap.L().Warn("password reset emails disabled: RESEND_API_KEY/EMAIL_FROM not set")
			return email.DisabledSender{}
		},
		func(
			userRepo repositories.UserRepository,
			tokenRepo repositories.PasswordResetTokenRepository,
			mailer services.EmailSender,
			cfg *config.Config,
			clock utils.Clock,
		) *services.PasswordResetService {
			return services.NewPasswordResetService(userRepo, tokenRepo, mailer, cfg.FrontendURL, clock)
		},

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
		handlers.NewPasswordResetHandler,

		// Gin engine. The mode comes from GIN_MODE (or APP_ENV=production),
		// not from the compiled binary, so production never runs in debug mode
		// by accident. Trusted proxies default to none: X-Forwarded-For is only
		// honoured from the CIDRs listed in TRUSTED_PROXIES (the compose
		// reverse proxy). Trusting every proxy would let clients spoof
		// ClientIP and bypass the per-IP rate limiter.
		func(cfg *config.Config) *gin.Engine {
			gin.SetMode(cfg.GinMode)
			router := gin.Default()
			if err := router.SetTrustedProxies(cfg.TrustedProxies); err != nil {
				zap.L().Warn("invalid TRUSTED_PROXIES; trusting no proxies",
					zap.Strings("proxies", cfg.TrustedProxies), zap.Error(err))
				_ = router.SetTrustedProxies(nil)
			}
			return router
		},

		// Per-IP limiter for the auth endpoints. It is provided (not created
		// inline in the route table) so its cleanup goroutine can be stopped
		// on shutdown by the lifecycle hook below.
		func(lc fx.Lifecycle) *middleware.RateLimiter {
			limiter := middleware.NewRateLimiter(rate.Limit(5), 10)
			lc.Append(fx.Hook{
				OnStop: func(context.Context) error {
					limiter.Stop()
					return nil
				},
			})
			return limiter
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

	// Initialize OpenTelemetry tracer provider before the server starts
	// (fx runs OnStart hooks in registration order), flush on shutdown.
	fx.Invoke(func(lc fx.Lifecycle, cfg *config.Config) {
		var shutdownTracing func(context.Context) error
		lc.Append(fx.Hook{
			OnStart: func(ctx context.Context) error {
				var err error
				shutdownTracing, err = tracing.Init(cfg.OTelEndpoint, cfg.TraceSamplingRatio)
				return err
			},
			OnStop: func(ctx context.Context) error {
				if shutdownTracing == nil {
					return nil
				}
				shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()
				return shutdownTracing(shutdownCtx)
			},
		})
	}),

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
		pwResetHandler *handlers.PasswordResetHandler,
		cfg *config.Config,
		authService *services.AuthService,
		userRepo repositories.UserRepository,
		router *gin.Engine,
		registry *prometheus.Registry,
		pool *pgxpool.Pool,
		authLimiter *middleware.RateLimiter,
	) {
		authMw := middleware.JWTAuthMiddleware(cfg, authService, userRepo)
		metricsMw := middleware.MetricsMiddleware(registry)

		corsConfig := cors.DefaultConfig()
		corsConfig.AllowHeaders = []string{"Content-Type", "Authorization", "X-Requested-With", "Allow", "Origin", "Accept", "X-Abbreviate"}
		corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
		corsConfig.AllowCredentials = true
		if len(cfg.AllowedOrigins) == 0 {
			// Production default: the browser talks to the backend through the
			// same-origin reverse proxy, so no cross-origin access is needed.
			// gin-contrib/cors panics on an empty allow-list ("all origins
			// disabled"), so reject every origin explicitly instead.
			corsConfig.AllowOriginFunc = func(string) bool { return false }
			zap.L().Info("CORS: no ALLOWED_ORIGINS configured; cross-origin browser requests are rejected (same-origin reverse proxy expected)")
		} else {
			corsConfig.AllowOrigins = cfg.AllowedOrigins
		}
		router.Use(cors.New(corsConfig))
		router.Use(middleware.BodyLimitMiddleware(middleware.DefaultMaxBodyBytes))

		// Distributed tracing: server span per request (enables trace_id in logs)
		router.Use(middleware.TracingMiddleware())
		// Structured HTTP access logs with trace correlation
		router.Use(middleware.AccessLogMiddleware())

		// pprof profiling endpoints (PPROF_ENABLED=true)
		routes.RegisterProfilingRoutes(router, cfg.PProfEnabled)

		// Liveness/readiness probe (DB ping). Registered before the metrics
		// middleware so frequent health checks do not pollute HTTP metrics.
		routes.RegisterHealthRoutes(router, pool)

		// Prometheus metrics
		router.Use(metricsMw)
		routes.RegisterMetricsRoutes(router, registry)

		routes.RegisterSwaggerRoutes(router)

		apiGroup := router.Group("/api")
		routes.AuthRoutes(apiGroup, authHandler, pwResetHandler, authLimiter)
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

func StartServer(lc fx.Lifecycle, router *gin.Engine, cfg *config.Config) {
	var srv *http.Server
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			srv = &http.Server{
				Addr:              ":" + cfg.Port,
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
