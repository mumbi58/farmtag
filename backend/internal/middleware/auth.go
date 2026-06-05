package middleware

import (
	"log"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"farmtag/internal/utils"
)

func AuthRequired() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				log.Println("[AUTH MIDDLEWARE] Missing Authorization header")
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Authorization header required"})
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				log.Println("[AUTH MIDDLEWARE] Invalid Authorization header format")
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid token format"})
			}

			claims, err := utils.ValidateToken(parts[1])
			if err != nil {
				log.Printf("[AUTH MIDDLEWARE] Token validation failed: %v", err)
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid or expired token"})
			}

			// Set user info in context
			c.Set("user_id", claims.UserID)
			c.Set("email", claims.Email)

			log.Printf("[AUTH MIDDLEWARE] Authenticated — UserID: %s | Path: %s", claims.UserID, c.Request().URL.Path)
			return next(c)
		}
	}
}