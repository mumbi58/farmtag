package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"farmtag/db"
	"farmtag/internal/models"
	"farmtag/internal/utils"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
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

type GoogleTokenInfo struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	Name          string `json:"name"`
	EmailVerified string `json:"email_verified"`
	Error         string `json:"error"`
}

func verifyGoogleIDToken(idToken string) (*GoogleTokenInfo, error) {
	resp, err := http.Get("https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google tokeninfo API returned status %d", resp.StatusCode)
	}

	var info GoogleTokenInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}

	if info.Error != "" {
		return nil, fmt.Errorf("google auth error: %s", info.Error)
	}

	return &info, nil
}

func parseAppleToken(identityToken string) (string, string, error) {
	if identityToken == "" {
		return "", "", fmt.Errorf("empty identity token")
	}

	parser := jwt.NewParser()
	var claims jwt.MapClaims
	_, _, err := parser.ParseUnverified(identityToken, &claims)
	if err != nil {
		return "", "", err
	}

	sub, _ := claims["sub"].(string)
	email, _ := claims["email"].(string)

	return sub, email, nil
}

func GoogleLogin(c echo.Context) error {
	log.Println("[AUTH] GoogleLogin request received")

	req := new(models.GoogleLoginRequest)
	if err := c.Bind(req); err != nil {
		log.Printf("[AUTH] GoogleLogin bind error: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	var googleID, email, name string

	// 1. Verify token if provided
	if req.IdToken != "" {
		info, err := verifyGoogleIDToken(req.IdToken)
		if err != nil {
			log.Printf("[AUTH] Google ID token verification failed: %v", err)
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid Google token"})
		}
		googleID = info.Sub
		email = strings.TrimSpace(strings.ToLower(info.Email))
		name = strings.TrimSpace(info.Name)
	} else {
		// Fallback for development if APP_ENV is development
		if os.Getenv("APP_ENV") == "development" || os.Getenv("APP_ENV") == "" {
			googleID = req.ID
			email = strings.TrimSpace(strings.ToLower(req.Email))
			name = strings.TrimSpace(req.Name)
		} else {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Google ID token required"})
		}
	}

	if googleID == "" || email == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Google ID and email are required"})
	}

	if name == "" {
		parts := strings.Split(email, "@")
		name = parts[0]
	}

	// 2. Check if user already exists with this google_id
	var user models.User
	err := db.DB.Get(&user, "SELECT * FROM users WHERE google_id = $1 AND is_deleted IS NOT TRUE", googleID)
	if err == nil {
		// User exists, generate token and return
		token, err := utils.GenerateToken(strconv.FormatInt(user.ID, 10), user.Email)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to generate token"})
		}
		log.Printf("[AUTH] Google login successful for user ID: %d", user.ID)
		return c.JSON(http.StatusOK, models.AuthResponse{Token: token, User: user})
	}

	// 3. Check if user exists with this email
	err = db.DB.Get(&user, "SELECT * FROM users WHERE email = $1 AND is_deleted IS NOT TRUE", email)
	if err == nil {
		// Email exists, link google_id and update profile
		_, err = db.DB.Exec("UPDATE users SET google_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", googleID, user.ID)
		if err != nil {
			log.Printf("[AUTH] Failed to link Google ID: %v", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to link Google account"})
		}
		user.GoogleID = &googleID

		token, err := utils.GenerateToken(strconv.FormatInt(user.ID, 10), user.Email)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to generate token"})
		}
		log.Printf("[AUTH] Linked Google ID and logged in user ID: %d", user.ID)
		return c.JSON(http.StatusOK, models.AuthResponse{Token: token, User: user})
	}

	// 4. Create new user
	randomPassword, err := utils.GenerateResetToken()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Server error"})
	}
	hashed, err := utils.HashPassword(randomPassword)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Server error"})
	}

	query := `
		INSERT INTO users (name, email, password, google_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, email, phone, is_premium, premium_expires_at, google_id, apple_id, created_at, updated_at
	`
	err = db.DB.QueryRowx(query, name, email, hashed, googleID).StructScan(&user)
	if err != nil {
		log.Printf("[AUTH] Google register insert error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create account"})
	}

	token, err := utils.GenerateToken(strconv.FormatInt(user.ID, 10), user.Email)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to generate token"})
	}

	log.Printf("[AUTH] User registered via Google — ID: %d | Email: %s", user.ID, user.Email)
	return c.JSON(http.StatusCreated, models.AuthResponse{Token: token, User: user})
}

func AppleLogin(c echo.Context) error {
	log.Println("[AUTH] AppleLogin request received")

	req := new(models.AppleLoginRequest)
	if err := c.Bind(req); err != nil {
		log.Printf("[AUTH] AppleLogin bind error: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	var appleID, email, name string

	// 1. Try to parse token claims if token is provided
	if req.IdentityToken != "" {
		parsedSub, parsedEmail, err := parseAppleToken(req.IdentityToken)
		if err == nil {
			appleID = parsedSub
			email = strings.TrimSpace(strings.ToLower(parsedEmail))
		} else {
			log.Printf("[AUTH] Warning: Failed to parse Apple identity token: %v", err)
		}
	}

	// 2. Fallback to body-supplied UserID and Email if empty or parsing failed
	if appleID == "" {
		appleID = req.UserID
	}
	if email == "" {
		email = strings.TrimSpace(strings.ToLower(req.Email))
	}
	name = strings.TrimSpace(req.Name)

	if appleID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Apple User ID or identity token required"})
	}

	// 3. Check if user already exists with this apple_id
	var user models.User
	err := db.DB.Get(&user, "SELECT * FROM users WHERE apple_id = $1 AND is_deleted IS NOT TRUE", appleID)
	if err == nil {
		// User exists, generate token and return
		token, err := utils.GenerateToken(strconv.FormatInt(user.ID, 10), user.Email)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to generate token"})
		}
		log.Printf("[AUTH] Apple login successful for user ID: %d", user.ID)
		return c.JSON(http.StatusOK, models.AuthResponse{Token: token, User: user})
	}

	// If user does not exist by apple_id, we need email to proceed
	if email == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Email is required for first-time Apple registration"})
	}

	if name == "" {
		parts := strings.Split(email, "@")
		name = parts[0]
	}

	// 4. Check if user exists with this email
	err = db.DB.Get(&user, "SELECT * FROM users WHERE email = $1 AND is_deleted IS NOT TRUE", email)
	if err == nil {
		// Email exists, link apple_id and update profile
		_, err = db.DB.Exec("UPDATE users SET apple_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", appleID, user.ID)
		if err != nil {
			log.Printf("[AUTH] Failed to link Apple ID: %v", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to link Apple account"})
		}
		user.AppleID = &appleID

		token, err := utils.GenerateToken(strconv.FormatInt(user.ID, 10), user.Email)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to generate token"})
		}
		log.Printf("[AUTH] Linked Apple ID and logged in user ID: %d", user.ID)
		return c.JSON(http.StatusOK, models.AuthResponse{Token: token, User: user})
	}

	// 5. Create new user
	randomPassword, err := utils.GenerateResetToken()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Server error"})
	}
	hashed, err := utils.HashPassword(randomPassword)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Server error"})
	}

	query := `
		INSERT INTO users (name, email, password, apple_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id, name, email, phone, is_premium, premium_expires_at, google_id, apple_id, created_at, updated_at
	`
	err = db.DB.QueryRowx(query, name, email, hashed, appleID).StructScan(&user)
	if err != nil {
		log.Printf("[AUTH] Apple register insert error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create account"})
	}

	token, err := utils.GenerateToken(strconv.FormatInt(user.ID, 10), user.Email)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to generate token"})
	}

	log.Printf("[AUTH] User registered via Apple — ID: %d | Email: %s", user.ID, user.Email)
	return c.JSON(http.StatusCreated, models.AuthResponse{Token: token, User: user})
}