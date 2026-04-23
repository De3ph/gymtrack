package services

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
	"gymtrack-backend/internal/utils"
)

// AuthService encapsulates authentication business logic
type AuthService struct {
	userRepo  repositories.UserRepository
	jwtSecret string
	clock     utils.Clock
}

// NewAuthService creates a new AuthService instance
func NewAuthService(userRepo repositories.UserRepository, jwtSecret string, clock utils.Clock) *AuthService {
	return &AuthService{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
		clock:     clock,
	}
}

// Register creates a new user account
func (s *AuthService) Register(ctx context.Context, req RegisterRequest) (*models.User, error) {
	// Check if user already exists
	existingUser, err := s.userRepo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing user: %w", err)
	}
	if existingUser != nil {
		return nil, ErrUserAlreadyExists
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create new user
	newUser := &models.User{
		UserID:       uuid.New().String(),
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         req.Role,
		Profile:      req.Profile,
	}

	if err := s.userRepo.CreateUser(ctx, newUser); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return newUser, nil
}

// Login authenticates a user and returns tokens
func (s *AuthService) Login(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	// Get user by email
	user, err := s.userRepo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve user: %w", err)
	}
	if user == nil {
		return nil, ErrInvalidCredentials
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	// Generate tokens
	accessToken, err := s.generateToken(user.UserID, user.Role, TokenTypeAccess, time.Hour)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, err := s.generateToken(user.UserID, user.Role, TokenTypeRefresh, time.Hour*24*7)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return &LoginResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// RefreshToken generates a new access token from a refresh token
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*TokenResponse, error) {
	claims, err := s.validateToken(refreshToken, TokenTypeRefresh)
	if err != nil {
		return nil, err
	}

	// Generate new access token
	accessToken, err := s.generateToken(claims.UserID, claims.Role, TokenTypeAccess, time.Hour)
	if err != nil {
		return nil, fmt.Errorf("failed to generate new access token: %w", err)
	}

	return &TokenResponse{
		AccessToken: accessToken,
	}, nil
}

// ValidateToken validates a JWT token and returns its claims
func (s *AuthService) ValidateToken(ctx context.Context, tokenString string) (*TokenClaims, error) {
	return s.validateToken(tokenString, TokenTypeAccess)
}

// generateToken creates a JWT token with the specified claims
func (s *AuthService) generateToken(userID string, role models.UserRole, tokenType TokenType, expiration time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"userId": userID,
		"role":   role,
		"exp":    s.clock.Now().Add(expiration).Unix(),
		"type":   tokenType,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

// validateToken validates a JWT token and extracts claims
func (s *AuthService) validateToken(tokenString string, expectedType TokenType) (*TokenClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	// Verify token type
	tokenType, ok := claims["type"].(string)
	if !ok || TokenType(tokenType) != expectedType {
		return nil, ErrInvalidTokenType
	}

	// Check expiration
	if exp, ok := claims["exp"].(float64); ok {
		if int64(exp) < s.clock.Now().Unix() {
			return nil, ErrTokenExpired
		}
	} else {
		return nil, ErrInvalidToken
	}

	// Extract user info
	userID, ok := claims["userId"].(string)
	if !ok {
		return nil, ErrInvalidToken
	}

	roleStr, ok := claims["role"].(string)
	if !ok {
		return nil, ErrInvalidToken
	}

	return &TokenClaims{
		UserID: userID,
		Role:   models.UserRole(roleStr),
		Type:   expectedType,
	}, nil
}
