package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/smtp"
	"os"
)

func GenerateResetToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func SendPasswordResetEmail(toEmail, name, token string) error {
	from := os.Getenv("SMTP_FROM")
	password := os.Getenv("SMTP_PASSWORD")
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")

	resetLink := fmt.Sprintf("%s/reset-password?token=%s",
		os.Getenv("APP_URL"), token)

	subject := "Reset Your FarmTag Password"
	body := fmt.Sprintf(`Hi %s,

We received a request to reset your FarmTag password.

Click the link below to reset it (expires in 1 hour):

%s

If you didn't request this, you can safely ignore this email.

— The FarmTag Team`, name, resetLink)

	msg := fmt.Sprintf("From: %s\nTo: %s\nSubject: %s\n\n%s",
		from, toEmail, subject, body)

	auth := smtp.PlainAuth("", from, password, host)
	err := smtp.SendMail(host+":"+port, auth, from, []string{toEmail}, []byte(msg))
	if err != nil {
		log.Printf("[EMAIL] Failed to send to %s: %v", toEmail, err)
		return err
	}

	log.Printf("[EMAIL] Password reset email sent to: %s", toEmail)
	return nil
}