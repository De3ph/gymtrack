package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"

	"gymtrack-backend/internal/domain/models"
	"gymtrack-backend/internal/domain/services"
)

type AuthHandler struct {
	authService *services.AuthService
	validator   *validator.Validate
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		validator:   validator.New(),
	}
}

type RegisterRequest struct {
	Email    string      `json:"email" validate:"required,email" example:"test@example.com"`
	Password string      `json:"password" validate:"required,min=8" example:"password123"`
	Role     string      `json:"role" validate:"required,oneof=trainer athlete" example:"athlete"`
	Profile  interface{} `json:"profile"`
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

	// Convert request to service request format
	var profile models.UserProfile
	if req.Profile != nil {
		profileBytes, err := json.Marshal(req.Profile)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid profile format"})
			return
		}
		if err := json.Unmarshal(profileBytes, &profile); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid profile format"})
			return
		}
	}
	serviceReq := services.RegisterRequest{
		Email:    req.Email,
		Password: req.Password,
		Role:     models.UserRole(req.Role),
		Profile:  profile,
	}

	user, err := h.authService.Register(ctx, serviceReq)
	if err != nil {
		if err == services.ErrUserAlreadyExists {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to register user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully", "userId": user.UserID})
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

	serviceReq := services.LoginRequest{
		Email:    req.Email,
		Password: req.Password,
	}

	response, err := h.authService.Login(ctx, serviceReq)
	if err != nil {
		if err == services.ErrInvalidCredentials {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to login"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Login successful",
		"accessToken":  response.AccessToken,
		"refreshToken": response.RefreshToken,
		"user":         response.User,
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

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	response, err := h.authService.RefreshToken(ctx, req.RefreshToken)
	if err != nil {
		if err == services.ErrInvalidToken || err == services.ErrTokenExpired || err == services.ErrInvalidTokenType {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to refresh token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Token refreshed successfully",
		"accessToken": response.AccessToken,
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
