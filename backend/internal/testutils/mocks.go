package testutils

import (
	"gymtrack-backend/internal/domain/models"
	"context"
	"errors"

	"github.com/couchbase/gocb/v2"
	"github.com/stretchr/testify/mock"
)

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

// MockGetResult is a mock implementation of gocb.GetResult
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

// Helper function to create test context
func CreateTestContext() context.Context {
	return context.Background()
}

// Helper function to create mock arguments for float64 return values
func Float64Arg(val float64) interface{} {
	return val
}
