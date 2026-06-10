package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"farmtag/db"
	"farmtag/internal/models"
)

func CreateExpense(c echo.Context) error {
	userID := c.Get("user_id").(string)
	log.Printf("[EXPENSE] CreateExpense request — UserID: %s", userID)

	req := new(models.CreateExpenseRequest)
	if err := c.Bind(req); err != nil {
		log.Printf("[EXPENSE] Bind error: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	// Validate farm belongs to user
	var count int
	err := db.DB.Get(&count, "SELECT COUNT(*) FROM farms WHERE id=$1 AND user_id=$2", req.FarmID, userID)
	if err != nil || count == 0 {
		log.Printf("[EXPENSE] Farm not found — FarmID: %s | UserID: %s", req.FarmID, userID)
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Farm not found"})
	}

	var expense models.Expense
	query := `
		INSERT INTO expenses (farm_id, category, amount, description, expense_date)
		VALUES ($1, $2, $3, NULLIF($4,''), $5::DATE)
		RETURNING id, farm_id, category, amount, description, expense_date, created_at
	`
	err = db.DB.QueryRowx(query,
		req.FarmID, req.Category, req.Amount, req.Description, req.ExpenseDate,
	).StructScan(&expense)
	if err != nil {
		log.Printf("[EXPENSE] Insert error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create expense"})
	}

	log.Printf("[EXPENSE] Expense created — ID: %s | Category: %s | Amount: %.2f | FarmID: %s",
		expense.ID, expense.Category, expense.Amount, expense.FarmID)
	return c.JSON(http.StatusCreated, expense)
}

func GetExpenses(c echo.Context) error {
	userID := c.Get("user_id").(string)
	farmID := c.QueryParam("farm_id")
	period := c.QueryParam("period") // monthly, yearly, all
	pageStr := c.QueryParam("page")
	limitStr := c.QueryParam("limit")
	log.Printf("[EXPENSE] GetExpenses — UserID: %s | FarmID: %s | Period: %s", userID, farmID, period)

	page := 1
	limit := 5

	if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
		page = p
	}
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}

	offset := (page - 1) * limit

	query := `
		SELECT e.* FROM expenses e
		JOIN farms f ON f.id = e.farm_id
		WHERE f.user_id=$1
	`
	args := []interface{}{userID}
	argIdx := 2

	if farmID != "" {
		query += ` AND e.farm_id=$` + itoa(argIdx)
		args = append(args, farmID)
		argIdx++
	}

	switch period {
	case "monthly":
		query += ` AND DATE_TRUNC('month', e.expense_date) = DATE_TRUNC('month', CURRENT_DATE)`
	case "yearly":
		query += ` AND DATE_TRUNC('year', e.expense_date) = DATE_TRUNC('year', CURRENT_DATE)`
	}

	query += ` ORDER BY e.expense_date DESC`

	// Append dynamic placeholders for Limit/Offset
	limitPlaceholder := fmt.Sprintf("$%d", len(args)+1)
	offsetPlaceholder := fmt.Sprintf("$%d", len(args)+2)
	query += fmt.Sprintf(" LIMIT %s OFFSET %s", limitPlaceholder, offsetPlaceholder)
	args = append(args, limit, offset)

	var expenses []models.Expense
	err := db.DB.Select(&expenses, query, args...)
	if err != nil {
		log.Printf("[EXPENSE] GetExpenses query error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch expenses"})
	}

	log.Printf("[EXPENSE] GetExpenses returned %d records (page: %d, limit: %d)", len(expenses), page, limit)
	return c.JSON(http.StatusOK, expenses)
}

func GetExpenseSummary(c echo.Context) error {
	userID := c.Get("user_id").(string)
	period := c.QueryParam("period")
	log.Printf("[EXPENSE] GetExpenseSummary — UserID: %s | Period: %s", userID, period)

	query := `
		SELECT e.category, SUM(e.amount) as total
		FROM expenses e
		JOIN farms f ON f.id = e.farm_id
		WHERE f.user_id=$1
	`
	args := []interface{}{userID}

	switch period {
	case "monthly":
		query += ` AND DATE_TRUNC('month', e.expense_date) = DATE_TRUNC('month', CURRENT_DATE)`
	case "yearly":
		query += ` AND DATE_TRUNC('year', e.expense_date) = DATE_TRUNC('year', CURRENT_DATE)`
	}

	query += ` GROUP BY e.category ORDER BY total DESC`

	var summaries []models.ExpenseSummary
	err := db.DB.Select(&summaries, query, args...)
	if err != nil {
		log.Printf("[EXPENSE] GetExpenseSummary query error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch expense summary"})
	}

	// Calculate percentages
	var grandTotal float64
	for _, s := range summaries {
		grandTotal += s.Total
	}
	for i := range summaries {
		if grandTotal > 0 {
			summaries[i].Percentage = (summaries[i].Total / grandTotal) * 100
		}
	}

	log.Printf("[EXPENSE] GetExpenseSummary returned %d categories | Total: %.2f", len(summaries), grandTotal)
	return c.JSON(http.StatusOK, map[string]interface{}{
		"summary":     summaries,
		"grand_total": grandTotal,
	})
}

func DeleteExpense(c echo.Context) error {
	userID := c.Get("user_id").(string)
	expenseID := c.Param("id")
	log.Printf("[EXPENSE] DeleteExpense — ID: %s | UserID: %s", expenseID, userID)

	result, err := db.DB.Exec(`
		DELETE FROM expenses e
		USING farms f
		WHERE e.farm_id = f.id AND f.user_id=$1 AND e.id=$2
	`, userID, expenseID)
	if err != nil {
		log.Printf("[EXPENSE] DeleteExpense error: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete expense"})
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		log.Printf("[EXPENSE] DeleteExpense — not found ID: %s", expenseID)
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Expense not found"})
	}

	log.Printf("[EXPENSE] Expense deleted — ID: %s", expenseID)
	return c.JSON(http.StatusOK, map[string]string{"message": "Expense deleted successfully"})
}