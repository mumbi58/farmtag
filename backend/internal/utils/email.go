package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/smtp"
	"os"
	"strings"
)

func GenerateResetToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func SendPasswordResetEmail(toEmail, name, token string) error {
	fromUser := os.Getenv("SMTP_USER")
	fromEmail := os.Getenv("SMTP_FROM")
	if fromEmail == "" {
		fromEmail = fromUser
	}
	password := os.Getenv("SMTP_PASSWORD")
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")

	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		webURL := os.Getenv("WEB_URL")
		if webURL != "" {
			if !strings.HasPrefix(webURL, "http://") && !strings.HasPrefix(webURL, "https://") {
				appURL = "https://" + webURL
			} else {
				appURL = webURL
			}
		} else {
			appURL = "http://localhost:8080"
		}
	}

	resetLink := fmt.Sprintf("%s/reset-password?token=%s", appURL, token)

	subject := "Reset Your FarmTag Password"
	body := fmt.Sprintf(`Hi %s,

We received a request to reset your FarmTag password.

Click the link below to reset it (expires in 1 hour):

%s

If you didn't request this, you can safely ignore this email.

— The FarmTag Team`, name, resetLink)

	msg := fmt.Sprintf("From: %s\nTo: %s\nSubject: %s\n\n%s",
		fromEmail, toEmail, subject, body)

	auth := smtp.PlainAuth("", fromUser, password, host)
	err := smtp.SendMail(host+":"+port, auth, fromEmail, []string{toEmail}, []byte(msg))
	if err != nil {
		log.Printf("[EMAIL] Failed to send to %s: %v", toEmail, err)
		return err
	}

	log.Printf("[EMAIL] Password reset email sent to: %s (from: %s)", toEmail, fromEmail)
	return nil
}