package testutils

import (
	"context"
	"errors"
	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"time"

	"github.com/couchbase/gocb/v2"
	"github.com/stretchr/testify/mock"
)

func NewTestUser(id, email string, role models.UserRole) *models.User {
	return &models.User{
		UserID: id,
		Email:  email,
		Role:   role,
		Profile: models.UserProfile{
			Name: "Test User",
		},
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
}

func NewTestRelationship(relationshipID, trainerID, athleteID string, status models.RelationshipStatus) *models.Relationship {
	return &models.Relationship{
		RelationshipID: relationshipID,
		TrainerID:      trainerID,
		AthleteID:      athleteID,
		Status:         status,
		CreatedAt:      time.Now().UTC(),
		UpdatedAt:      time.Now().UTC(),
	}
}

func NewTestInvitation(invitationID, trainerID, code, status string) *models.Invitation {
	return &models.Invitation{
		Type:         "invitation",
		InvitationID: invitationID,
		TrainerID:    trainerID,
		Code:         code,
		Status:       status,
		CreatedAt:    time.Now().UTC(),
		ExpiresAt:    time.Now().UTC().Add(7 * 24 * time.Hour),
	}
}

// Mock implementations for Couchbase interfaces
// These are shared mocks that avoid import cycles by not importing domain models

// MockCollection is a mock implementation of gocb.Collection
type MockCollection struct {
	mock.Mock
}

// MockUserRepository is a shared mock for UserRepository used across tests
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) GetUserByID(ctx context.Context, userID string) (*models.User, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserRepository) UpdateUser(ctx context.Context, user *models.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *MockUserRepository) CreateUser(ctx context.Context, user *models.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *MockUserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

// MockRelationshipRepository is a shared mock for RelationshipRepository used across tests
type MockRelationshipRepository struct {
	mock.Mock
}

func (m *MockRelationshipRepository) Create(relationship *models.Relationship) error {
	args := m.Called(relationship)
	return args.Error(0)
}

func (m *MockRelationshipRepository) GetByAthleteID(athleteID string) (*models.Relationship, error) {
	args := m.Called(athleteID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Relationship), args.Error(1)
}

func (m *MockRelationshipRepository) GetPendingByAthleteID(athleteID string) ([]*models.Relationship, error) {
	args := m.Called(athleteID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.Relationship), args.Error(1)
}

func (m *MockRelationshipRepository) Delete(relationshipID string) error {
	args := m.Called(relationshipID)
	return args.Error(0)
}

func (m *MockRelationshipRepository) GetByID(relationshipID string) (*models.Relationship, error) {
	args := m.Called(relationshipID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Relationship), args.Error(1)
}

func (m *MockRelationshipRepository) GetByTrainerID(trainerID string) ([]*models.Relationship, error) {
	args := m.Called(trainerID)
	return args.Get(0).([]*models.Relationship), args.Error(1)
}

func (m *MockRelationshipRepository) Update(relationship *models.Relationship) error {
	args := m.Called(relationship)
	return args.Error(0)
}

// MockCoachingRequestRepository is a mock implementation of CoachingRequestRepository
type MockCoachingRequestRepository struct {
	mock.Mock
}

func (m *MockCoachingRequestRepository) Create(ctx context.Context, request *models.CoachingRequest) error {
	args := m.Called(ctx, request)
	return args.Error(0)
}

func (m *MockCoachingRequestRepository) GetByID(ctx context.Context, requestID string) (*models.CoachingRequest, error) {
	args := m.Called(ctx, requestID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.CoachingRequest), args.Error(1)
}

func (m *MockCoachingRequestRepository) GetByAthleteID(ctx context.Context, athleteID string) ([]*models.CoachingRequest, error) {
	args := m.Called(ctx, athleteID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.CoachingRequest), args.Error(1)
}

func (m *MockCoachingRequestRepository) GetByTrainerID(ctx context.Context, trainerID string) ([]*models.CoachingRequest, error) {
	args := m.Called(ctx, trainerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.CoachingRequest), args.Error(1)
}

func (m *MockCoachingRequestRepository) Update(ctx context.Context, request *models.CoachingRequest) error {
	args := m.Called(ctx, request)
	return args.Error(0)
}

func (m *MockCoachingRequestRepository) Delete(ctx context.Context, requestID string) error {
	args := m.Called(ctx, requestID)
	return args.Error(0)
}

func (m *MockCoachingRequestRepository) GetPendingByTrainerID(ctx context.Context, trainerID string) ([]*models.CoachingRequest, error) {
	args := m.Called(ctx, trainerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.CoachingRequest), args.Error(1)
}

// MockReviewRepository is a mock implementation of ReviewRepository
type MockReviewRepository struct {
	mock.Mock
}

func (m *MockReviewRepository) CreateReview(ctx context.Context, review *models.TrainerReview) error {
	args := m.Called(ctx, review)
	return args.Error(0)
}

func (m *MockReviewRepository) GetReviewByID(ctx context.Context, reviewID string) (*models.TrainerReview, error) {
	args := m.Called(ctx, reviewID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.TrainerReview), args.Error(1)
}

func (m *MockReviewRepository) GetByAthleteID(ctx context.Context, athleteID string) (*models.TrainerReview, error) {
	args := m.Called(ctx, athleteID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.TrainerReview), args.Error(1)
}

func (m *MockReviewRepository) GetByTrainerID(ctx context.Context, trainerID string) ([]models.TrainerReview, error) {
	args := m.Called(ctx, trainerID)
	return args.Get(0).([]models.TrainerReview), args.Error(1)
}

func (m *MockReviewRepository) UpdateReview(ctx context.Context, review *models.TrainerReview) error {
	args := m.Called(ctx, review)
	return args.Error(0)
}

func (m *MockReviewRepository) DeleteReview(ctx context.Context, reviewID string) error {
	args := m.Called(ctx, reviewID)
	return args.Error(0)
}

func (m *MockReviewRepository) GetAverageRating(ctx context.Context, trainerID string) (float64, int, error) {
	args := m.Called(ctx, trainerID)
	return args.Get(0).(float64), args.Get(1).(int), args.Error(2)
}

type MockTrainerProfileRepository struct {
	mock.Mock
}

func (m *MockTrainerProfileRepository) GetPublicTrainers(ctx context.Context, filters *repositories.TrainerFilters, limit, offset int) ([]models.TrainerWithProfile, error) {
	args := m.Called(ctx, filters, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.TrainerWithProfile), args.Error(1)
}

func (m *MockTrainerProfileRepository) GetTrainerByID(ctx context.Context, trainerID string) (*models.TrainerWithProfile, error) {
	args := m.Called(ctx, trainerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.TrainerWithProfile), args.Error(1)
}

func (m *MockTrainerProfileRepository) UpdateTrainerProfile(ctx context.Context, trainerID string, profile *models.TrainerProfile) error {
	args := m.Called(ctx, trainerID, profile)
	return args.Error(0)
}

func (m *MockTrainerProfileRepository) SearchTrainers(ctx context.Context, query string, filters *repositories.TrainerFilters, limit, offset int) ([]models.TrainerWithProfile, error) {
	args := m.Called(ctx, query, filters, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.TrainerWithProfile), args.Error(1)
}

func (m *MockTrainerProfileRepository) CountTrainers(ctx context.Context, filters *repositories.TrainerFilters) (int, error) {
	args := m.Called(ctx, filters)
	return args.Int(0), args.Error(1)
}

func (m *MockCollection) Insert(id string, value interface{}, opts *gocb.InsertOptions) (*gocb.MutationResult, error) {
	args := m.Called(id, value, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*gocb.MutationResult), args.Error(1)
}

func (m *MockCollection) Get(id string, opts *gocb.GetOptions) (*gocb.GetResult, error) {
	args := m.Called(id, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*gocb.GetResult), args.Error(1)
}

func (m *MockCollection) Upsert(id string, value interface{}, opts *gocb.UpsertOptions) (*gocb.MutationResult, error) {
	args := m.Called(id, value, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*gocb.MutationResult), args.Error(1)
}

func (m *MockCollection) Replace(id string, value interface{}, opts *gocb.ReplaceOptions) (*gocb.MutationResult, error) {
	args := m.Called(id, value, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*gocb.MutationResult), args.Error(1)
}

func (m *MockCollection) Remove(id string, opts *gocb.RemoveOptions) (*gocb.MutationResult, error) {
	args := m.Called(id, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*gocb.MutationResult), args.Error(1)
}

func (m *MockCollection) MutateIn(id string, specs []gocb.MutateInSpec, opts *gocb.MutateInOptions) (*gocb.MutationResult, error) {
	args := m.Called(id, specs, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*gocb.MutationResult), args.Error(1)
}

// InvitationGetResult defines the interface for Get result operations
type InvitationGetResult interface {
	Content(valuePtr interface{}) error
	Cas() gocb.Cas
}

// MockGetResult is a mock implementation of InvitationGetResult
type MockGetResult struct {
	mock.Mock
}

func (m *MockGetResult) Content(valuePtr interface{}) error {
	args := m.Called(valuePtr)
	return args.Error(0)
}

func (m *MockGetResult) Exists() bool {
	args := m.Called()
	return args.Bool(0)
}

func (m *MockGetResult) Cas() gocb.Cas {
	args := m.Called()
	return args.Get(0).(gocb.Cas)
}

func (m *MockGetResult) Expiry() *time.Duration {
	args := m.Called()
	if args.Get(0) == nil {
		return nil
	}
	duration := args.Get(0).(time.Duration)
	return &duration
}

func (m *MockGetResult) ExpiryTime() time.Time {
	args := m.Called()
	return args.Get(0).(time.Time)
}

// MockQueryResult is a mock implementation of gocb.QueryResult
type MockQueryResult struct {
	mock.Mock
	rows    []interface{}
	current int
}

func (m *MockQueryResult) Next() bool {
	if m.current >= len(m.rows) {
		return false
	}
	m.current++
	return true
}

func (m *MockQueryResult) Row(dest interface{}) error {
	if m.current <= 0 || m.current > len(m.rows) {
		return errors.New("no row available")
	}

	args := m.Called(dest)
	return args.Error(0)
}

func (m *MockQueryResult) Close() error {
	args := m.Called()
	return args.Error(0)
}

func (m *MockQueryResult) Err() error {
	args := m.Called()
	return args.Error(0)
}

// MockCluster is a mock implementation of gocb.Cluster
type MockCluster struct {
	mock.Mock
}

func (m *MockCluster) Query(query string, opts *gocb.QueryOptions) (*gocb.QueryResult, error) {
	args := m.Called(query, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*gocb.QueryResult), args.Error(1)
}

// MockAvailabilityRepository is a mock implementation of AvailabilityRepository
type MockAvailabilityRepository struct {
	mock.Mock
}

func (m *MockAvailabilityRepository) GetByTrainerID(ctx context.Context, trainerID string) ([]models.TrainerAvailability, error) {
	args := m.Called(ctx, trainerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.TrainerAvailability), args.Error(1)
}

func (m *MockAvailabilityRepository) GetBySlotID(ctx context.Context, slotID string) (*models.TrainerAvailability, error) {
	args := m.Called(ctx, slotID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.TrainerAvailability), args.Error(1)
}

func (m *MockAvailabilityRepository) UpsertAvailability(ctx context.Context, slot *models.TrainerAvailability) error {
	args := m.Called(ctx, slot)
	return args.Error(0)
}

func (m *MockAvailabilityRepository) DeleteAvailability(ctx context.Context, slotID string) error {
	args := m.Called(ctx, slotID)
	return args.Error(0)
}

func (m *MockAvailabilityRepository) GetAvailableSlots(ctx context.Context, trainerID string, dayOfWeek int) ([]models.TrainerAvailability, error) {
	args := m.Called(ctx, trainerID, dayOfWeek)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.TrainerAvailability), args.Error(1)
}

func (m *MockAvailabilityRepository) BookSlotAtomic(ctx context.Context, slotID string) error {
	args := m.Called(ctx, slotID)
	return args.Error(0)
}

func (m *MockAvailabilityRepository) CleanupExpiredSlots(ctx context.Context, retentionDays int) error {
	args := m.Called(ctx, retentionDays)
	return args.Error(0)
}

// Helper function to create test context
func CreateTestContext() context.Context {
	return context.Background()
}

// Helper function to create mock arguments for float64 return values
func Float64Arg(val float64) interface{} {
	return val
}
