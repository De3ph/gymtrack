package e2e

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"gymtrack-backend/internal/api/handlers"
	"gymtrack-backend/internal/api/middleware"
	"gymtrack-backend/internal/api/routes"
	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/domain/services"
	logger "gymtrack-backend/internal/infrastructure/log"
	"gymtrack-backend/internal/infrastructure/persistence"
	"gymtrack-backend/internal/infrastructure/persistence/postgres"
	"gymtrack-backend/internal/testutils"
	"gymtrack-backend/internal/utils"
)

// SetupTestEnv creates a fully-wired test environment with a real PostgreSQL
// database. It mirrors the production wiring in app/module.go but uses the
// test database from testutils (POSTGRES_TEST_DSN or testcontainers).
func SetupTestEnv(t *testing.T) *TestEnv {
	t.Helper()

	gin.SetMode(gin.TestMode)
	logger.InitConsole()

	pool, cleanup := testutils.SetupTestPostgresDB(t)
	t.Cleanup(cleanup)

	cfg := &config.Config{
		JWTSecret:    TestJWTSecret,
		ResendAPIKey: "re_test_" + strings.Repeat("x", 25),
		EmailFrom:    "test@test.com",
		CacheEnabled: false,
	}

	factory := persistence.NewRepositoryFactory(pool)
	userRepo := factory.UserRepository()
	workoutRepo := factory.WorkoutRepository()
	mealRepo := factory.MealRepository()
	bodyMeasurementRepo := factory.BodyMeasurementRepository()
	commentRepo := factory.CommentRepository()
	exerciseRepo := factory.ExerciseRepository()
	muscleGroupRepo := factory.MuscleGroupRepository()
	equipmentRepo := factory.EquipmentRepository()
	trainerReviewRepo := factory.TrainerReviewRepository()
	availabilityRepo := factory.AvailabilityRepository()
	trainerProfileRepo := factory.TrainerProfileRepository()
	coachingRequestRepo := factory.CoachingRequestRepository()
	workoutPlanRepo := factory.WorkoutPlanRepository()
	workoutPlanAssignmentRepo := factory.WorkoutPlanAssignmentRepository()
	relationshipRepo := factory.RelationshipRepository()

	clock := utils.NewFakeClock(time.Now().UTC())
	passwordResetRepo := postgres.NewPostgresPasswordResetTokenRepository(pool, clock)
	invitationRepo := postgres.NewPostgresCodeBasedInvitation(pool, clock)

	authService := services.NewAuthService(userRepo, cfg.JWTSecret, clock)
	userService := services.NewUserService(userRepo)
	workoutService := services.NewWorkoutService(workoutRepo, relationshipRepo)
	mealService := services.NewMealService(mealRepo, relationshipRepo)
	bodyMeasurementService := services.NewBodyMeasurementService(bodyMeasurementRepo, relationshipRepo, userRepo)
	commentService := services.NewCommentService(commentRepo, relationshipRepo, workoutRepo, mealRepo)
	exerciseService := services.NewExerciseService(exerciseRepo, muscleGroupRepo, equipmentRepo)
	availabilityService := services.NewAvailabilityService(availabilityRepo, clock)
	reviewService := services.NewReviewService(trainerReviewRepo, relationshipRepo, clock)
	trainerCatalogService := services.NewTrainerCatalogService(trainerProfileRepo, trainerReviewRepo)
	adminService := services.NewAdminService(userRepo, workoutRepo, mealRepo, commentRepo, exerciseRepo)
	passwordResetService := services.NewPasswordResetService(userRepo, passwordResetRepo, &NoopMailer{}, "http://localhost:3000", clock)
	coachingRequestService := services.NewCoachingRequestService(coachingRequestRepo, userRepo, relationshipRepo, clock)
	workoutPlanService := services.NewWorkoutPlanService(workoutPlanRepo, workoutPlanAssignmentRepo, relationshipRepo, workoutRepo)
	invitationService := services.NewInvitationService(invitationRepo, relationshipRepo, userRepo, clock)

	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(userService)
	workoutHandler := handlers.NewWorkoutHandler(workoutService, userRepo)
	mealHandler := handlers.NewMealHandler(mealService, userRepo)
	bodyMeasurementHandler := handlers.NewBodyMeasurementHandler(bodyMeasurementService, userRepo)
	commentHandler := handlers.NewCommentHandler(commentRepo, commentService)
	exerciseHandler := handlers.NewExerciseHandler(exerciseService)
	availabilityHandler := handlers.NewAvailabilityHandler(availabilityService)
	reviewHandler := handlers.NewReviewHandler(reviewService)
	trainerCatalogHandler := handlers.NewTrainerCatalogHandler(trainerCatalogService)
	adminHandler := handlers.NewAdminHandler(adminService)
	passwordResetHandler := handlers.NewPasswordResetHandler(passwordResetService)
	relationshipHandler := handlers.NewRelationshipHandler(invitationService, relationshipRepo, userRepo, workoutRepo, mealRepo)
	coachingRequestHandler := handlers.NewCoachingRequestHandler(coachingRequestService)
	workoutPlanHandler := handlers.NewWorkoutPlanHandler(workoutPlanService, userRepo)

	// Same tuning as production. The cleanup goroutine is stopped when the
	// test finishes so it does not outlive the test process.
	authLimiter := middleware.NewRateLimiter(5, 10)
	t.Cleanup(authLimiter.Stop)

	router := buildTestRouter(cfg, authService, userRepo,
		authHandler, userHandler, workoutHandler, mealHandler,
		bodyMeasurementHandler, commentHandler, exerciseHandler,
		availabilityHandler, reviewHandler, trainerCatalogHandler,
		adminHandler, passwordResetHandler, relationshipHandler,
		coachingRequestHandler, workoutPlanHandler, authLimiter)

	return &TestEnv{
		DB:     pool,
		Router: router,
		Cfg:    cfg,

		AuthService:            authService,
		UserService:            userService,
		WorkoutService:         workoutService,
		MealService:            mealService,
		BodyMeasurementService: bodyMeasurementService,
		CommentService:         commentService,
		ExerciseService:        exerciseService,
		AvailabilityService:    availabilityService,
		ReviewService:          reviewService,
		TrainerCatalogService:  trainerCatalogService,
		AdminService:           adminService,
		PasswordResetService:   passwordResetService,
		CoachingRequestService: coachingRequestService,
		WorkoutPlanService:     workoutPlanService,
		InvitationService:      invitationService,

		UserRepo:                  userRepo,
		WorkoutRepo:               workoutRepo,
		MealRepo:                  mealRepo,
		BodyMeasurementRepo:       bodyMeasurementRepo,
		CommentRepo:               commentRepo,
		ExerciseRepo:              exerciseRepo,
		MuscleGroupRepo:           muscleGroupRepo,
		EquipmentRepo:             equipmentRepo,
		TrainerReviewRepo:         trainerReviewRepo,
		AvailabilityRepo:          availabilityRepo,
		PasswordResetRepo:         passwordResetRepo,
		InvitationMethod:          invitationRepo,
		TrainerProfileRepo:        trainerProfileRepo,
		CoachingRequestRepo:       coachingRequestRepo,
		WorkoutPlanRepo:           workoutPlanRepo,
		WorkoutPlanAssignmentRepo: workoutPlanAssignmentRepo,
		RelationshipRepo:          relationshipRepo,

		AuthHandler:            authHandler,
		UserHandler:            userHandler,
		WorkoutHandler:         workoutHandler,
		MealHandler:            mealHandler,
		BodyMeasurementHandler: bodyMeasurementHandler,
		CommentHandler:         commentHandler,
		ExerciseHandler:        exerciseHandler,
		AvailabilityHandler:    availabilityHandler,
		ReviewHandler:          reviewHandler,
		TrainerCatalogHandler:  trainerCatalogHandler,
		AdminHandler:           adminHandler,
		PasswordResetHandler:   passwordResetHandler,
		RelationshipHandler:    relationshipHandler,
		CoachingRequestHandler: coachingRequestHandler,
		WorkoutPlanHandler:     workoutPlanHandler,
	}
}

// NoopMailer implements services.EmailSender for tests (no outbound email).
type NoopMailer struct{}

func (n *NoopMailer) SendPasswordResetEmail(_ context.Context, _, _ string) error {
	return nil
}

// buildTestRouter wires all routes with the same middleware chain as production.
func buildTestRouter(cfg *config.Config, authSvc *services.AuthService, userRepo repositories.UserRepository,
	authH *handlers.AuthHandler, userH *handlers.UserHandler,
	wsH *handlers.WorkoutHandler, msH *handlers.MealHandler,
	bmH *handlers.BodyMeasurementHandler, commentH *handlers.CommentHandler,
	exH *handlers.ExerciseHandler, availH *handlers.AvailabilityHandler,
	reviewH *handlers.ReviewHandler, trainerH *handlers.TrainerCatalogHandler,
	adminH *handlers.AdminHandler, pwH *handlers.PasswordResetHandler,
	relH *handlers.RelationshipHandler, coachH *handlers.CoachingRequestHandler,
	wpH *handlers.WorkoutPlanHandler, authLimiter *middleware.RateLimiter,
) *gin.Engine {
	router := gin.New()
	router.Use(gin.Recovery())

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"http://localhost:3000", "http://localhost:3001"}
	corsConfig.AllowHeaders = []string{"Content-Type", "Authorization", "X-Requested-With", "Allow", "Origin", "Accept"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	corsConfig.AllowCredentials = true
	router.Use(cors.New(corsConfig))
	router.Use(middleware.BodyLimitMiddleware(middleware.DefaultMaxBodyBytes))
	router.Use(middleware.TracingMiddleware())
	router.Use(middleware.AccessLogMiddleware())

	authMw := middleware.JWTAuthMiddleware(cfg, authSvc, userRepo)

	apiGroup := router.Group("/api")
	routes.AuthRoutes(apiGroup, authH, pwH, authLimiter)
	routes.UserRoutes(apiGroup, userH, authMw)
	routes.AdminRoutes(apiGroup, adminH, authMw)
	routes.WorkoutRoutes(apiGroup, wsH, authMw)
	routes.MeasurementRoutes(apiGroup, bmH, authMw)
	routes.MealRoutes(apiGroup, msH, authMw)
	routes.RelationshipRoutes(apiGroup, relH, authMw)
	routes.CommentRoutes(apiGroup, commentH, authMw)
	routes.RegisterExerciseRoutes(router, exH, authMw)
	routes.RegisterTrainerRoutes(router, trainerH, availH, reviewH, authMw)
	routes.RegisterCoachingRequestRoutes(router, coachH, authMw)
	routes.RegisterWorkoutPlanRoutes(apiGroup, wpH, authMw)

	return router
}

// TestEnv holds the fully-wired test application.
type TestEnv struct {
	DB     *pgxpool.Pool
	Router *gin.Engine
	Cfg    *config.Config

	// Services
	AuthService            *services.AuthService
	UserService            *services.UserService
	WorkoutService         *services.WorkoutService
	MealService            *services.MealService
	BodyMeasurementService *services.BodyMeasurementService
	CommentService         *services.CommentService
	ExerciseService        *services.ExerciseServiceImpl
	AvailabilityService    *services.AvailabilityService
	ReviewService          *services.ReviewService
	TrainerCatalogService  *services.TrainerCatalogService
	AdminService           *services.AdminService
	PasswordResetService   *services.PasswordResetService
	CoachingRequestService *services.CoachingRequestService
	WorkoutPlanService     *services.WorkoutPlanService
	InvitationService      *services.InvitationService

	// Repositories
	UserRepo                  repositories.UserRepository
	WorkoutRepo               repositories.WorkoutRepository
	MealRepo                  repositories.MealRepository
	BodyMeasurementRepo       repositories.BodyMeasurementRepository
	CommentRepo               repositories.CommentRepository
	ExerciseRepo              repositories.ExerciseRepository
	MuscleGroupRepo           repositories.MuscleGroupRepository
	EquipmentRepo             repositories.EquipmentRepository
	TrainerReviewRepo         repositories.TrainerReviewRepository
	AvailabilityRepo          repositories.AvailabilityRepository
	PasswordResetRepo         repositories.PasswordResetTokenRepository
	InvitationMethod          services.InvitationMethod
	TrainerProfileRepo        repositories.TrainerProfileRepository
	CoachingRequestRepo       repositories.CoachingRequestRepository
	WorkoutPlanRepo           repositories.WorkoutPlanRepository
	WorkoutPlanAssignmentRepo repositories.WorkoutPlanAssignmentRepository
	RelationshipRepo          repositories.RelationshipRepository

	// Handlers
	AuthHandler            *handlers.AuthHandler
	UserHandler            *handlers.UserHandler
	WorkoutHandler         *handlers.WorkoutHandler
	MealHandler            *handlers.MealHandler
	BodyMeasurementHandler *handlers.BodyMeasurementHandler
	CommentHandler         *handlers.CommentHandler
	ExerciseHandler        *handlers.ExerciseHandler
	AvailabilityHandler    *handlers.AvailabilityHandler
	ReviewHandler          *handlers.ReviewHandler
	TrainerCatalogHandler  *handlers.TrainerCatalogHandler
	AdminHandler           *handlers.AdminHandler
	PasswordResetHandler   *handlers.PasswordResetHandler
	RelationshipHandler    *handlers.RelationshipHandler
	CoachingRequestHandler *handlers.CoachingRequestHandler
	WorkoutPlanHandler     *handlers.WorkoutPlanHandler
}
