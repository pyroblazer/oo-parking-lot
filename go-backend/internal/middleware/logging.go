// Package middleware provides HTTP middleware for the parking lot API.
package middleware

import (
	"log"
	"net/http"
	"time"
)

// responseRecorder wraps http.ResponseWriter to capture status code
type responseRecorder struct {
	http.ResponseWriter
	statusCode int
}

// WriteHeader captures the status code and delegates to the wrapped ResponseWriter
func (r *responseRecorder) WriteHeader(code int) {
	r.statusCode = code
	r.ResponseWriter.WriteHeader(code)
}

// RequestLogger returns middleware that logs HTTP requests with method, path, status, and duration
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap the response writer to capture status code
		recorder := &responseRecorder{
			ResponseWriter: w,
			statusCode:     http.StatusOK, // default
		}

		// Call the next handler
		next.ServeHTTP(recorder, r)

		// Log the request
		duration := time.Since(start)
		log.Printf("[HTTP] %s %s %d %s",
			r.Method,
			sanitizeForLogging(r.URL.Path),
			recorder.statusCode,
			duration.Round(time.Microsecond),
		)
	})
}
