package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/repositories"
)

type AuthHandler struct {
	userRepo  repositories.UserRepository
	validator *validator.Validate
	jwtSecret string
}

func NewAuthHandler(userRepo repositories.UserRepository, jwtSecret string) *AuthHandler {
	return &AuthHandler{
		userRepo:  userRepo,
		validator: validator.New(),
		jwtSecret: jwtSecret,
	}
}

type RegisterRequest struct {
	Email    string             `json:"email" validate:"required,email" example:"test@example.com"`
	Password string             `json:"password" validate:"required,min=8" example:"password123"`
	Role     models.UserRole    `json:"role" validate:"required,oneof=trainer athlete" example:"athlete"`
	Profile  models.UserProfile `json:"profile"`
}

// Register godoc
// @Summary User registration
// @Description Register a new user with email, password, and role.
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body handlers.RegisterRequest true "Register Request"
// @Success 201 {object} map[string]interface{} "User registered successfully"
// @Failure 400 {object} map[string]interface{} "Bad Request - Invalid input"
// @Failure 409 {object} map[string]interface{} "Conflict - User with email already exists"
// @Failure 500 {object} map[string]interface{} "Internal Server Error"
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	// Check if user already exists
	existingUser, err := h.userRepo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check existing user"})
		return
	}
	if existingUser != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "user with this email already exists"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	newUser := &models.User{
		UserID:       uuid.New().String(),
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         req.Role,
		Profile:      req.Profile,
	}

	if err := h.userRepo.CreateUser(ctx, newUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully", "userId": newUser.UserID})
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email" example:"test@example.com"`
	Password string `json:"password" validate:"required" example:"password123"`
}

// Login godoc
// @Summary User login
// @Description Authenticate user and return JWT token with refresh token.
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body handlers.LoginRequest true "Login Request"
// @Success 200 {object} map[string]string "Login successful"
// @Failure 400 {object} map[string]interface{} "Bad Request - Invalid input"
// @Failure 401 {object} map[string]interface{} "Unauthorized - Invalid credentials"
// @Failure 500 {object} map[string]interface{} "Internal Server Error"
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	user, err := h.userRepo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve user"})
		return
	}
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	// Generate access token (short-lived)
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": user.UserID,
		"role":   user.Role,
		"exp":    time.Now().Add(time.Hour * 1).Unix(), // Access token expires after 1 hour
		"type":   "access",
	})

	accessTokenString, err := accessToken.SignedString([]byte(h.jwtSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate access token"})
		return
	}

	// Generate refresh token (long-lived)
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": user.UserID,
		"role":   user.Role,
		"exp":    time.Now().Add(time.Hour * 24 * 7).Unix(), // Refresh token expires after 7 days
		"type":   "refresh",
	})

	refreshTokenString, err := refreshToken.SignedString([]byte(h.jwtSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate refresh token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Login successful",
		"accessToken":  accessTokenString,
		"refreshToken": refreshTokenString,
		"user":         user,
	})
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
}

// RefreshToken godoc
// @Summary Refresh access token
// @Description Generate new access token using refresh token.
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body handlers.RefreshTokenRequest true "Refresh Token Request"
// @Success 200 {object} map[string]string "Token refreshed successfully"
// @Failure 400 {object} map[string]interface{} "Bad Request - Invalid input"
// @Failure 401 {object} map[string]interface{} "Unauthorized - Invalid or expired refresh token"
// @Failure 500 {object} map[string]interface{} "Internal Server Error"
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse and validate refresh token
	token, err := jwt.Parse(req.RefreshToken, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(h.jwtSecret), nil
	})

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token claims"})
		return
	}

	// Verify token type is refresh
	tokenType, ok := claims["type"].(string)
	if !ok || tokenType != "refresh" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token type"})
		return
	}

	// Check expiration
	if exp, ok := claims["exp"].(float64); ok {
		if int64(exp) < time.Now().Unix() {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Refresh token expired"})
			return
		}
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token expiration claim missing"})
		return
	}

	// Extract user info
	userID, ok := claims["userId"].(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID claim missing"})
		return
	}

	role, ok := claims["role"].(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Role claim missing"})
		return
	}

	// Generate new access token
	newAccessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": userID,
		"role":   role,
		"exp":    time.Now().Add(time.Hour * 1).Unix(), // Access token expires after 1 hour
		"type":   "access",
	})

	newAccessTokenString, err := newAccessToken.SignedString([]byte(h.jwtSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate new access token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Token refreshed successfully",
		"accessToken": newAccessTokenString,
	})
}

// Logout godoc
// @Summary User logout
// @Description Logout user and clear tokens.
// @Tags Auth
// @Accept json
// @Produce json
// @Success 200 {object} map[string]string "Logout successful"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal Server Error"
func (h *AuthHandler) Logout(c *gin.Context) {
	// In a stateless JWT implementation, logout is typically handled client-side
	// by removing the token from storage. However, we can add token blacklisting
	// if needed in the future for immediate invalidation.

	c.JSON(http.StatusOK, gin.H{"message": "Logout successful"})
}
