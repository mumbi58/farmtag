package handlers

import (
	"log"
	"net/http"
	"time"
	"strings"
	"strconv"

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

    // Normalize email
    req.Email = strings.TrimSpace(strings.ToLower(req.Email))
    req.Name  = strings.TrimSpace(req.Name)
    
    // rest of the code unchanged...

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

	hashed, err := utils.HashPassword(req.Password)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Server error"})
	}

	var user models.User
	query := `
		INSERT INTO users (name, email, password)
		VALUES ($1, $2, $3)
		RETURNING id, name, email, phone, is_premium, premium_expires_at, created_at, updated_at
	`
	err = db.DB.QueryRowx(query, req.Name, req.Email, hashed).StructScan(&user)
	if err != nil {
		log.Printf("[AUTH] Register insert error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create account"})
	}

token, err := utils.GenerateToken(strconv.FormatInt(user.ID, 10), user.Email)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to generate token"})
	}

	log.Printf("[AUTH] User registered successfully — ID: %s | Email: %s", user.ID, user.Email)
	return c.JSON(http.StatusCreated, models.AuthResponse{Token: token, User: user})
}

func ForgotPassword(c echo.Context) error {
	log.Println("[AUTH] ForgotPassword request received")

	req := new(models.ForgotPasswordRequest)
	if err := c.Bind(req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	// Check user exists
	var user models.User
err := db.DB.Get(&user, 
    "SELECT * FROM users WHERE email=$1 AND is_deleted IS NOT TRUE", 
    strings.TrimSpace(strings.ToLower(req.Email)),
)
	if err != nil {
		// Don't reveal if email exists or not — security best practice
		log.Printf("[AUTH] ForgotPassword — email not found: %s (returning OK anyway)", req.Email)
		return c.JSON(http.StatusOK, map[string]string{"message": "If that email exists, a reset link has been sent"})
	}

	// Generate reset token
	token, err := utils.GenerateResetToken()
	if err != nil {
		log.Printf("[AUTH] ForgotPassword token generation error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Server error"})
	}

	// Save token with 1 hour expiry
	_, err = db.DB.Exec(`
		UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3
	`, token, time.Now().Add(1*time.Hour), user.ID)
	if err != nil {
		log.Printf("[AUTH] ForgotPassword save token error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Server error"})
	}

	// Send email
	err = utils.SendPasswordResetEmail(user.Email, user.Name, token)
	if err != nil {
		log.Printf("[AUTH] ForgotPassword email send error: %v", err)
		// Still return OK — don't reveal email issues
	}

	log.Printf("[AUTH] ForgotPassword — reset token sent to: %s", user.Email)
	return c.JSON(http.StatusOK, map[string]string{"message": "If that email exists, a reset link has been sent"})
}

func ResetPassword(c echo.Context) error {
	log.Println("[AUTH] ResetPassword request received")

	req := new(models.ResetPasswordRequest)
	if err := c.Bind(req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	// Find user by token and check expiry
	var user models.User
	err := db.DB.Get(&user, `
		SELECT * FROM users 
		WHERE reset_token=$1 AND reset_token_expires > $2
	`, req.Token, time.Now())
	if err != nil {
		log.Printf("[AUTH] ResetPassword — invalid or expired token")
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid or expired reset token"})
	}

	// Hash new password
	hashed, err := utils.HashPassword(req.Password)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Server error"})
	}

	// Update password and clear token
	_, err = db.DB.Exec(`
		UPDATE users SET password=$1, reset_token=NULL, reset_token_expires=NULL WHERE id=$2
	`, hashed, user.ID)
	if err != nil {
		log.Printf("[AUTH] ResetPassword update error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to reset password"})
	}

	log.Printf("[AUTH] ResetPassword — password reset for user: %s", user.Email)
	return c.JSON(http.StatusOK, map[string]string{"message": "Password reset successfully"})
}

func Login(c echo.Context) error {
    log.Println("[AUTH] Login request received")

    req := new(models.LoginRequest)
    if err := c.Bind(req); err != nil {
        log.Printf("[AUTH] Login bind error: %v", err)
        return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
    }

    // ADD THIS
    log.Printf("[AUTH] Login attempting — raw email: %q", req.Email)
    req.Email = strings.TrimSpace(strings.ToLower(req.Email))
    log.Printf("[AUTH] Login attempting — clean email: %q", req.Email)

    var user models.User
    err := db.DB.Get(&user,
        "SELECT * FROM users WHERE email=$1 AND is_deleted IS NOT TRUE",
        req.Email,
    )
    if err != nil {
        log.Printf("[AUTH] Login failed — user not found: %q | err: %v", req.Email, err)
        return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid email or password"})
    }

	// Check password
	if !utils.CheckPassword(user.Password, req.Password) {
		log.Printf("[AUTH] Login failed — wrong password for: %s", req.Email)
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid email or password"})
	}

	// Generate token
token, err := utils.GenerateToken(strconv.FormatInt(user.ID, 10), user.Email)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to generate token"})
	}

	log.Printf("[AUTH] Login successful — ID: %s | Email: %s | Time: %s", user.ID, user.Email, time.Now().Format(time.RFC3339))
	return c.JSON(http.StatusOK, models.AuthResponse{Token: token, User: user})
}

type UpdateProfileReq struct {
	Name  string `json:"name"`
	Phone string `json:"phone"`
}

func UpdateProfile(c echo.Context) error {
	userID := c.Get("user_id").(string)
	log.Printf("[PROFILE] Update request — UserID: %s", userID)

	req := new(UpdateProfileReq)
	if err := c.Bind(req); err != nil {
		log.Printf("[PROFILE] Bind error: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	var user models.User
	query := `
		UPDATE users 
		SET name = COALESCE(NULLIF($1,''), name),
		    phone = COALESCE(NULLIF($2,''), phone),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
		RETURNING id, name, email, phone, is_premium, premium_expires_at, created_at, updated_at
	`
	err := db.DB.QueryRowx(query, req.Name, req.Phone, userID).StructScan(&user)
	if err != nil {
		log.Printf("[PROFILE] Update error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update profile"})
	}

	log.Printf("[PROFILE] Profile updated for UserID: %s", userID)
	return c.JSON(http.StatusOK, user)
}

func DeleteProfile(c echo.Context) error {
	userID := c.Get("user_id").(string)
	log.Printf("[PROFILE] Delete request — UserID: %s", userID)

	// Ensure column exists to support soft delete
	_, _ = db.DB.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`)

	// Perform soft delete
	_, err := db.DB.Exec(`UPDATE users SET is_deleted=true, email = email || '_deleted_' || id WHERE id=$1`, userID)
	if err != nil {
		log.Printf("[PROFILE] Delete error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete account"})
	}

	log.Printf("[PROFILE] Profile deleted for UserID: %s", userID)
	return c.JSON(http.StatusOK, map[string]string{"message": "Account soft deleted successfully"})
}

func ServeStaticPage(title string, body string) echo.HandlerFunc {
	return func(c echo.Context) error {
		html := `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>` + title + `</title>
			<style>
				body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 40px 20px; max-width: 800px; margin: 0 auto; color: #333; }
				h1 { color: #10B981; margin-bottom: 24px; }
				p { margin-bottom: 16px; font-size: 16px; }
			</style>
		</head>
		<body>
			<h1>` + title + `</h1>
			<p>` + body + `</p>
		</body>
		</html>`
		return c.HTML(http.StatusOK, html)
	}
}