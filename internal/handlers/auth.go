package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"farmtag/db"
	"farmtag/internal/models"
	"farmtag/internal/utils"
)

func Register(c echo.Context) error {
	log.Println("[AUTH] Register request received")

	req := new(models.RegisterRequest)
	if err := c.Bind(req); err != nil {
		log.Printf("[AUTH] Register bind error: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	// Check if email exists
	var count int
	err := db.DB.Get(&count, "SELECT COUNT(*) FROM users WHERE email=$1", req.Email)
	if err != nil {
		log.Printf("[AUTH] Register DB check error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Server error"})
	}
	if count > 0 {
		log.Printf("[AUTH] Register failed — email already exists: %s", req.Email)
		return c.JSON(http.StatusConflict, map[string]string{"error": "Email already registered"})
	}

	// Hash password
	hashed, err := utils.HashPassword(req.Password)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Server error"})
	}

	// Insert user
	var user models.User
	query := `
		INSERT INTO users (name, email, password, phone)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, email, phone, is_premium, premium_expires_at, created_at, updated_at
	`
	phone := req.Phone
	err = db.DB.QueryRowx(query, req.Name, req.Email, hashed, phone).StructScan(&user)
	if err != nil {
		log.Printf("[AUTH] Register insert error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create account"})
	}

	// Generate token
	token, err := utils.GenerateToken(user.ID, user.Email)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to generate token"})
	}

	log.Printf("[AUTH] User registered successfully — ID: %s | Email: %s", user.ID, user.Email)
	return c.JSON(http.StatusCreated, models.AuthResponse{Token: token, User: user})
}

func Login(c echo.Context) error {
	log.Println("[AUTH] Login request received")

	req := new(models.LoginRequest)
	if err := c.Bind(req); err != nil {
		log.Printf("[AUTH] Login bind error: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	// Fetch user
	var user models.User
	err := db.DB.Get(&user, "SELECT * FROM users WHERE email=$1", req.Email)
	if err != nil {
		log.Printf("[AUTH] Login failed — user not found: %s", req.Email)
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid email or password"})
	}

	// Check password
	if !utils.CheckPassword(user.Password, req.Password) {
		log.Printf("[AUTH] Login failed — wrong password for: %s", req.Email)
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid email or password"})
	}

	// Generate token
	token, err := utils.GenerateToken(user.ID, user.Email)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to generate token"})
	}

	log.Printf("[AUTH] Login successful — ID: %s | Email: %s | Time: %s", user.ID, user.Email, time.Now().Format(time.RFC3339))
	return c.JSON(http.StatusOK, models.AuthResponse{Token: token, User: user})
}