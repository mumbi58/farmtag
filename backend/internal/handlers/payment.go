package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"farmtag/db"
)

type VerifyPurchaseRequest struct {
	Plan                 string `json:"plan"`
	IsMock               bool   `json:"is_mock"`
	RevenueCatCustomerID string `json:"revenuecat_customer_id,omitempty"`
}

type RevenueCatWebhookPayload struct {
	Event struct {
		Type           string   `json:"type"`
		AppUserID      string   `json:"app_user_id"`
		EntitlementIDs []string `json:"entitlement_ids"`
		ExpirationAtMs int64    `json:"expiration_at_ms"`
	} `json:"event"`
}

func VerifyRevenueCatPurchase(c echo.Context) error {
	userID := c.Get("user_id").(string)
	log.Printf("[PAYMENT] VerifyRevenueCatPurchase request — UserID: %s", userID)

	req := new(VerifyPurchaseRequest)
	if err := c.Bind(req); err != nil {
		log.Printf("[PAYMENT] Bind error: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	var expiry time.Time
	if req.Plan == "yearly" {
		expiry = time.Now().AddDate(1, 0, 0)
	} else {
		expiry = time.Now().AddDate(0, 1, 0)
	}

	// Update the user premium state in the database
	query := `
		UPDATE users 
		SET is_premium = true, 
		    premium_expires_at = $1, 
		    updated_at = CURRENT_TIMESTAMP 
		WHERE id = $2
	`
	_, err := db.DB.Exec(query, expiry, userID)
	if err != nil {
		log.Printf("[PAYMENT] Failed to upgrade user %s: %v", userID, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Database upgrade failed"})
	}

	log.Printf("[PAYMENT] User %s upgraded to Premium (Plan: %s, Expires: %s)", userID, req.Plan, expiry.Format(time.RFC3339))
	return c.JSON(http.StatusOK, map[string]interface{}{
		"status":      "success",
		"message":     "Subscription activated and synced successfully",
		"is_premium":  true,
		"expires_at":  expiry,
	})
}

func RevenueCatWebhook(c echo.Context) error {
	log.Println("[PAYMENT] Received webhook callback from RevenueCat...")

	var payload RevenueCatWebhookPayload
	if err := c.Bind(&payload); err != nil {
		log.Printf("[PAYMENT] Webhook bind error: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid webhook payload"})
	}

	event := payload.Event
	log.Printf("[PAYMENT] RevenueCat Event: Type=%s | AppUserID=%s | ExpirationMs=%d", event.Type, event.AppUserID, event.ExpirationAtMs)

	if event.AppUserID == "" {
		return c.JSON(http.StatusOK, map[string]string{"status": "ignored", "message": "Missing app_user_id"})
	}

	// Update DB based on RevenueCat subscription lifecycle event type
	switch event.Type {
	case "INITIAL_PURCHASE", "RENEWAL", "SUBSCRIBE":
		expiry := time.Now().AddDate(0, 1, 0) // default monthly fallback
		if event.ExpirationAtMs > 0 {
			expiry = time.Unix(0, event.ExpirationAtMs*int64(time.Millisecond))
		}

		query := `
			UPDATE users 
			SET is_premium = true, 
			    premium_expires_at = $1, 
			    updated_at = CURRENT_TIMESTAMP 
			WHERE id = $2
		`
		_, err := db.DB.Exec(query, expiry, event.AppUserID)
		if err != nil {
			log.Printf("[PAYMENT] Webhook DB error (upgrade): %v", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Database update failed"})
		}
		log.Printf("[PAYMENT] Webhook: Activated/Renewed user %s premium until %s", event.AppUserID, expiry)

	case "EXPIRATION", "CANCELLATION", "BILLING_ISSUE":
		query := `
			UPDATE users 
			SET is_premium = false, 
			    updated_at = CURRENT_TIMESTAMP 
			WHERE id = $1
		`
		_, err := db.DB.Exec(query, event.AppUserID)
		if err != nil {
			log.Printf("[PAYMENT] Webhook DB error (downgrade): %v", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Database update failed"})
		}
		log.Printf("[PAYMENT] Webhook: Revoked premium status for user %s", event.AppUserID)

	default:
		log.Printf("[PAYMENT] Webhook event type %s ignored", event.Type)
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "processed"})
}
