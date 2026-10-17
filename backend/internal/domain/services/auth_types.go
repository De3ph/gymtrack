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
	Username string             `json:"username" validate:"required,min=3,max=30,alphanum"`
	Email    string             `json:"email" validate:"required,email"`
	Password string             `json:"password" validate:"required,min=8"`
	Role     models.UserRole    `json:"role" validate:"required,oneof=trainer athlete"`
	Profile  models.UserProfile `json:"profile"`
}

// LoginRequest represents the request for user login
type LoginRequest struct {
	Identifier string `json:"identifier" validate:"required"` // Can be email or username
	Password   string `json:"password" validate:"required"`
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
	// TokenVersion is the users.token_version value embedded at issuance.
	// Tokens whose claim no longer matches the row have been revoked
	// (password change/reset or role change) and must be rejected.
	TokenVersion int
}

// Service errors
var (
	ErrUserAlreadyExists       = NewServiceError("An account with this email already exists. Please log in or use a different email.", "USER_EXISTS")
	ErrUsernameAlreadyExists   = NewServiceError("This username is already taken. Please choose a different username.", "USERNAME_EXISTS")
	ErrInvalidCredentials      = NewServiceError("Incorrect email/username or password. Please check your credentials and try again.", "INVALID_CREDENTIALS")
	ErrInvalidToken            = NewServiceError("Your session token is invalid. Please log in again.", "INVALID_TOKEN")
	ErrTokenRevoked            = NewServiceError("Your session has been revoked because your credentials or role changed. Please log in again.", "TOKEN_REVOKED")
	ErrTokenExpired            = NewServiceError("Your session has expired. Please log in again.", "TOKEN_EXPIRED")
	ErrInvalidTokenType        = NewServiceError("Invalid token type for this action. Please log in again to get a fresh token.", "INVALID_TOKEN_TYPE")
	ErrUserNotFound            = NewServiceError("User not found. It may have been deleted or the ID is incorrect.", "USER_NOT_FOUND")
	ErrWorkoutNotFound         = NewServiceError("Workout not found. It may have been deleted or the ID is incorrect.", "WORKOUT_NOT_FOUND")
	ErrMealNotFound            = NewServiceError("Meal not found. It may have been deleted or the ID is incorrect.", "MEAL_NOT_FOUND")
	ErrWorkoutPlanNotFound     = NewServiceError("Workout plan not found. It may have been deleted or the ID is incorrect.", "WORKOUT_PLAN_NOT_FOUND")
	ErrBodyMeasurementNotFound = NewServiceError("Body measurement not found. It may have been deleted or the ID is incorrect.", "BODY_MEASUREMENT_NOT_FOUND")
	ErrAccountDeleted          = NewServiceError("This account has been deleted. You can restore it within 30 days from the login screen.", "ACCOUNT_DELETED")
	ErrAccountCannotBeDeleted  = NewServiceError("Admin accounts cannot be deleted. Demote the account to athlete/trainer first.", "ADMIN_DELETE_FORBIDDEN")
	ErrAccountInactive         = NewServiceError("Your account is not active (suspended or banned). Please contact support.", "ACCOUNT_INACTIVE")
	ErrInvalidResetToken       = NewServiceError("This password reset link is invalid or has expired. Please request a new one.", "INVALID_RESET_TOKEN")
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
