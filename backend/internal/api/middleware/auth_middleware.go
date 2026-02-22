package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"gymtrack-backend/internal/config"
	"gymtrack-backend/internal/domain/models"
)

var (
	appConfig *config.Config
)

func InitAuthMiddleware(cfg *config.Config) {
	appConfig = cfg
}

func JWTAuthMiddleware() gin.HandlerFunc {
	if appConfig == nil {
		panic("Auth middleware not initialized. Call InitAuthMiddleware first.")
	}

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Authorization header format"})
			c.Abort()
			return
		}

		tokenString := parts[1]

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(appConfig.JWTSecret), nil
		})
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token", "details": err.Error()})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			// Check expiration
			if exp, ok := claims["exp"].(float64); ok {
				if int64(exp) < time.Now().Unix() {
					c.JSON(http.StatusUnauthorized, gin.H{"error": "Token expired"})
					c.Abort()
					return
				}
			} else {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Token expiration claim missing"})
				c.Abort()
				return
			}

			// Verify token type is access (for API requests)
			tokenType, ok := claims["type"].(string)
			if !ok || tokenType != "access" {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token type for API access"})
				c.Abort()
				return
			}

			c.Set("userID", claims["userId"])
			c.Set("userRole", models.UserRole(claims["role"].(string)))
			c.Next()
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}
	}
}
