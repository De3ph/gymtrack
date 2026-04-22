package services

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/utils"
)

// Mock UserRepository for testing
type mockUserRepository struct {
	users map[string]*models.User
}

func newMockUserRepository() *mockUserRepository {
	return &mockUserRepository{
		users: make(map[string]*models.User),
	}
}

func (m *mockUserRepository) CreateUser(ctx context.Context, user *models.User) error {
	m.users[user.UserID] = user
	return nil
}

func (m *mockUserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	for _, user := range m.users {
		if user.Email == email {
			return user, nil
		}
	}
	return nil, nil
}

func (m *mockUserRepository) GetUserByID(ctx context.Context, userID string) (*models.User, error) {
	user, exists := m.users[userID]
	if !exists {
		return nil, nil
	}
	return user, nil
}

func (m *mockUserRepository) UpdateUser(ctx context.Context, user *models.User) error {
	m.users[user.UserID] = user
	return nil
}

func TestAuthService_Register(t *testing.T) {
	// Setup
	mockRepo := newMockUserRepository()
	fakeClock := utils.NewFakeClock(time.Now())
	authService := NewAuthService(mockRepo, "test-secret", fakeClock)

	req := RegisterRequest{
		Email:    "test@example.com",
		Password: "password123",
		Role:     models.RoleAthlete,
		Profile: models.UserProfile{
			Name: "Test User",
		},
	}

	// Test
	user, err := authService.Register(context.Background(), req)

	// Assert
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if user == nil {
		t.Fatal("Expected user, got nil")
	}
	if user.Email != req.Email {
		t.Errorf("Expected email %s, got %s", req.Email, user.Email)
	}
	if user.Role != req.Role {
		t.Errorf("Expected role %s, got %s", req.Role, user.Role)
	}

	// Verify password was hashed
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		t.Errorf("Password was not hashed correctly: %v", err)
	}
}

func TestAuthService_Register_UserAlreadyExists(t *testing.T) {
	// Setup
	mockRepo := newMockUserRepository()
	fakeClock := utils.NewFakeClock(time.Now())
	authService := NewAuthService(mockRepo, "test-secret", fakeClock)

	// Create existing user
	existingUser := &models.User{
		UserID:   uuid.New().String(),
		Email:    "test@example.com",
		Role:     models.RoleAthlete,
		Profile:  models.UserProfile{Name: "Existing User"},
	}
	mockRepo.CreateUser(context.Background(), existingUser)

	req := RegisterRequest{
		Email:    "test@example.com",
		Password: "password123",
		Role:     models.RoleAthlete,
	}

	// Test
	_, err := authService.Register(context.Background(), req)

	// Assert
	if err != ErrUserAlreadyExists {
		t.Errorf("Expected ErrUserAlreadyExists, got %v", err)
	}
}

func TestAuthService_Login(t *testing.T) {
	// Setup
	mockRepo := newMockUserRepository()
	fakeClock := utils.NewFakeClock(time.Now())
	authService := NewAuthService(mockRepo, "test-secret", fakeClock)

	// Create user
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	user := &models.User{
		UserID:       uuid.New().String(),
		Email:        "test@example.com",
		PasswordHash: string(hashedPassword),
		Role:         models.RoleAthlete,
		Profile:      models.UserProfile{Name: "Test User"},
	}
	mockRepo.CreateUser(context.Background(), user)

	req := LoginRequest{
		Email:    "test@example.com",
		Password: "password123",
	}

	// Test
	response, err := authService.Login(context.Background(), req)

	// Assert
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if response == nil {
		t.Fatal("Expected response, got nil")
	}
	if response.User == nil {
		t.Fatal("Expected user in response, got nil")
	}
	if response.AccessToken == "" {
		t.Error("Expected access token, got empty string")
	}
	if response.RefreshToken == "" {
		t.Error("Expected refresh token, got empty string")
	}
}

func TestAuthService_Login_InvalidCredentials(t *testing.T) {
	// Setup
	mockRepo := newMockUserRepository()
	fakeClock := utils.NewFakeClock(time.Now())
	authService := NewAuthService(mockRepo, "test-secret", fakeClock)

	req := LoginRequest{
		Email:    "nonexistent@example.com",
		Password: "wrongpassword",
	}

	// Test
	_, err := authService.Login(context.Background(), req)

	// Assert
	if err != ErrInvalidCredentials {
		t.Errorf("Expected ErrInvalidCredentials, got %v", err)
	}
}

func TestAuthService_RefreshToken(t *testing.T) {
	// Setup
	mockRepo := newMockUserRepository()
	fakeClock := utils.NewFakeClock(time.Now())
	authService := NewAuthService(mockRepo, "test-secret", fakeClock)

	// Create user
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	user := &models.User{
		UserID:       uuid.New().String(),
		Email:        "test@example.com",
		PasswordHash: string(hashedPassword),
		Role:         models.RoleAthlete,
		Profile:      models.UserProfile{Name: "Test User"},
	}
	mockRepo.CreateUser(context.Background(), user)

	// Login to get refresh token
	loginReq := LoginRequest{
		Email:    "test@example.com",
		Password: "password123",
	}
	loginResponse, _ := authService.Login(context.Background(), loginReq)

	// Test refresh
	response, err := authService.RefreshToken(context.Background(), loginResponse.RefreshToken)

	// Assert
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if response == nil {
		t.Fatal("Expected response, got nil")
	}
	if response.AccessToken == "" {
		t.Error("Expected access token, got empty string")
	}
}
