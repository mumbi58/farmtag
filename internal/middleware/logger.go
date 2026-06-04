
package middleware

import (
	"log"
	"time"

	"github.com/labstack/echo/v4"
)

func Logger() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()

			err := next(c)

			duration := time.Since(start)
			req := c.Request()
			res := c.Response()

			log.Printf(
				"[HTTP] %s %s | Status: %d | Duration: %v | IP: %s | UserAgent: %s",
				req.Method,
				req.URL.Path,
				res.Status,
				duration,
				c.RealIP(),
				req.UserAgent(),
			)

			return err
		}
	}
}