package handlers

import (
	"bytes"
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
			<title>` + title + ` - FarmTag</title>
			<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
			<style>
				:root {
					--primary: #10B981;
					--primary-dark: #059669;
					--primary-light: #D1FAE5;
					--bg: #F9FAFB;
					--text-main: #1F2937;
					--text-muted: #4B5563;
					--border: #E5E7EB;
					--card-bg: #FFFFFF;
				}
				body {
					font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
					background-color: var(--bg);
					color: var(--text-main);
					line-height: 1.6;
					margin: 0;
					padding: 0;
					-webkit-font-smoothing: antialiased;
				}
				.header {
					background: linear-gradient(135deg, var(--primary-dark), var(--primary));
					color: white;
					padding: 60px 20px;
					text-align: center;
					border-bottom: 1px solid var(--border);
				}
				.header h1 {
					margin: 0;
					font-size: 2.5rem;
					font-weight: 800;
					letter-spacing: -0.025em;
				}
				.header p {
					margin: 10px 0 0 0;
					font-size: 1.1rem;
					color: var(--primary-light);
					font-weight: 500;
				}
				.container {
					max-width: 800px;
					margin: -40px auto 60px;
					padding: 0 20px;
				}
				.card {
					background-color: var(--card-bg);
					border-radius: 16px;
					padding: 40px;
					box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
					border: 1px solid var(--border);
				}
				h2 {
					color: var(--primary-dark);
					font-size: 1.5rem;
					font-weight: 700;
					margin-top: 2rem;
					margin-bottom: 1rem;
					border-bottom: 2px solid var(--primary-light);
					padding-bottom: 8px;
					display: flex;
					align-items: center;
					gap: 8px;
				}
				h2:first-of-type {
					margin-top: 0;
				}
				p, li {
					font-size: 1rem;
					color: var(--text-muted);
					margin-bottom: 1.2rem;
				}
				ul, ol {
					padding-left: 20px;
					margin-bottom: 1.5rem;
				}
				li {
					margin-bottom: 0.5rem;
				}
				.footer {
					text-align: center;
					padding: 40px 20px;
					font-size: 0.875rem;
					color: var(--text-muted);
					border-top: 1px solid var(--border);
					margin-top: 40px;
				}
				a {
					color: var(--primary);
					text-decoration: none;
					font-weight: 600;
					transition: color 0.2s;
				}
				a:hover {
					color: var(--primary-dark);
					text-decoration: underline;
				}
				.highlight-box {
					background-color: #F0FDF4;
					border-left: 4px solid var(--primary);
					padding: 20px;
					border-radius: 0 8px 8px 0;
					margin: 20px 0;
				}
				.highlight-box p {
					margin: 0;
					color: var(--primary-dark);
					font-weight: 500;
				}
				.badge {
					display: inline-block;
					background-color: var(--primary-light);
					color: var(--primary-dark);
					padding: 4px 12px;
					border-radius: 9999px;
					font-size: 0.875rem;
					font-weight: 600;
					margin-bottom: 16px;
				}
			</style>
		</head>
		<body>
			<div class="header">
				<h1>` + title + `</h1>
				<p>Last updated: June 10, 2026</p>
			</div>
			<div class="container">
				<div class="card">
					` + body + `
				</div>
			</div>
			<div class="footer">
				&copy; 2026 FarmTag. All rights reserved.<br>
				If you have any questions, contact us at <a href="mailto:info@kerdonet.com">info@kerdonet.com</a>
			</div>
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

type SetPushTokenReq struct {
	PushToken string `json:"push_token"`
}

func SetPushToken(c echo.Context) error {
	userID := c.Get("user_id").(string)
	log.Printf("[PUSH] SetPushToken request — UserID: %s", userID)

	req := new(SetPushTokenReq)
	if err := c.Bind(req); err != nil {
		log.Printf("[PUSH] Bind error: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	_, err := db.DB.Exec("UPDATE users SET push_token=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2", req.PushToken, userID)
	if err != nil {
		log.Printf("[PUSH] Update error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update push token"})
	}

	log.Printf("[PUSH] Push token set successfully for UserID: %s", userID)
	return c.JSON(http.StatusOK, map[string]string{"message": "Push token set successfully"})
}

type ExpoPushMessage struct {
	To    string `json:"to"`
	Sound string `json:"sound,omitempty"`
	Title string `json:"title"`
	Body  string `json:"body"`
}

func TestPushNotification(c echo.Context) error {
	userID := c.Get("user_id").(string)
	log.Printf("[PUSH] TestPushNotification request — UserID: %s", userID)

	var pushToken *string
	err := db.DB.Get(&pushToken, "SELECT push_token FROM users WHERE id=$1", userID)
	if err != nil || pushToken == nil || *pushToken == "" {
		log.Printf("[PUSH] Token not found for UserID: %s", userID)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Push token not registered for user"})
	}

	// Send push notification via Expo
	msg := ExpoPushMessage{
		To:    *pushToken,
		Sound: "default",
		Title: "Test Notification 🌿",
		Body:  "This is a test notification from FarmTag! Your push channel is working perfectly.",
	}

	jsonBytes, err := json.Marshal(msg)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to marshal push payload"})
	}

	resp, err := http.Post("https://exp.host/--/api/v2/push/send", "application/json", bytes.NewReader(jsonBytes))
	if err != nil {
		log.Printf("[PUSH] HTTP request to Expo failed: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to send notification via Expo API"})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[PUSH] Expo API returned status: %d", resp.StatusCode)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Expo API rejected the message"})
	}

	log.Printf("[PUSH] Test push sent successfully to token for UserID: %s", userID)
	return c.JSON(http.StatusOK, map[string]string{"message": "Test notification sent successfully!"})
}