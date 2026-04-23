package services

import (
	"gymtrack-backend/internal/domain/models"
)

// TokenType represents the type of JWT token
type TokenType string

const (
	TokenTypeAccess  TokenType = "access"
	TokenTypeRefresh TokenType = "refresh"
)

// RegisterRequest represents the request for user registration
type RegisterRequest struct {
	Email    string             `json:"email" validate:"required,email"`
	Password string             `json:"password" validate:"required,min=8"`
	Role     models.UserRole    `json:"role" validate:"required,oneof=trainer athlete"`
	Profile  models.UserProfile `json:"profile"`
}

// LoginRequest represents the request for user login
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// LoginResponse represents the response after successful login
type LoginResponse struct {
	User         *models.User `json:"user"`
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken"`
}

// TokenResponse represents the response after token refresh
type TokenResponse struct {
	AccessToken string `json:"accessToken"`
}

// TokenClaims represents the extracted JWT claims
type TokenClaims struct {
	UserID string
	Role   models.UserRole
	Type   TokenType
}

// Service errors
var (
	ErrUserAlreadyExists  = NewServiceError("user with this email already exists", "USER_EXISTS")
	ErrInvalidCredentials = NewServiceError("invalid credentials", "INVALID_CREDENTIALS")
	ErrInvalidToken       = NewServiceError("invalid token", "INVALID_TOKEN")
	ErrTokenExpired       = NewServiceError("token expired", "TOKEN_EXPIRED")
	ErrInvalidTokenType   = NewServiceError("invalid token type", "INVALID_TOKEN_TYPE")
)

// ServiceError represents a business logic error with a code
type ServiceError struct {
	Message string
	Code    string
}

func (e *ServiceError) Error() string {
	return e.Message
}

func NewServiceError(message, code string) *ServiceError {
	return &ServiceError{
		Message: message,
		Code:    code,
	}
}
