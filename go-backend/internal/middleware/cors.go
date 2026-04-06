// Package middleware provides HTTP middleware for the parking lot API.
package middleware

import (
	"log"
	"net/http"
	"strings"
	"unicode"
)

// CORSConfig holds the configuration for CORS middleware
type CORSConfig struct {
	AllowedOrigins   []string
	AllowedMethods   []string
	AllowedHeaders   []string
	AllowCredentials bool
}

// sanitizeForLogging removes or escapes potentially dangerous characters from input
// to prevent log injection attacks
func sanitizeForLogging(input string) string {
	if input == "" {
		return ""
	}
	
	var sanitized strings.Builder
	sanitized.Grow(len(input))
	
	for _, r := range input {
		// Remove control characters and newlines to prevent log injection
		if r == '\n' || r == '\r' || r == '\t' {
			sanitized.WriteString("\\")
			switch r {
			case '\n':
				sanitized.WriteString("n")
			case '\r':
				sanitized.WriteString("r")
			case '\t':
				sanitized.WriteString("t")
			}
		} else if unicode.IsControl(r) {
			// Skip other control characters
			continue
		} else if r == '\x00' {
			// Skip null bytes
			continue
		} else {
			sanitized.WriteRune(r)
		}
	}
	
	return sanitized.String()
}

// DefaultCORSConfig returns a default CORS configuration suitable for development
func DefaultCORSConfig() *CORSConfig {
	return &CORSConfig{
		AllowedOrigins: []string{
			"http://localhost:*",
			"http://127.0.0.1:*",
		},
		AllowedMethods: []string{
			http.MethodGet,
			http.MethodPost,
			http.MethodPut,
			http.MethodDelete,
			http.MethodOptions,
		},
		AllowedHeaders: []string{
			"Content-Type",
			"Authorization",
			"X-Requested-With",
			"Accept",
			"Origin",
		},
		AllowCredentials: true,
	}
}

// CORS returns a middleware that handles Cross-Origin Resource Sharing
func CORS(config *CORSConfig) func(http.Handler) http.Handler {
	if config == nil {
		config = DefaultCORSConfig()
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Set CORS headers for all requests
			if origin != "" {
				// Sanitize origin for logging to prevent log injection
				sanitizedOrigin := sanitizeForLogging(origin)
				
				// Check if origin is allowed
				allowed := false
				for _, allowedOrigin := range config.AllowedOrigins {
					if allowedOrigin == "*" || allowedOrigin == origin {
						allowed = true
						log.Printf("[CORS] Origin '%s' allowed (exact match with '%s')", sanitizedOrigin, allowedOrigin)
						break
					}
					// Check for wildcard pattern (e.g., "http://localhost:*")
					if strings.HasSuffix(allowedOrigin, ":*") {
						prefix := strings.TrimSuffix(allowedOrigin, ":*")
						if strings.HasPrefix(origin, prefix) {
							allowed = true
							break
						}
					}
				}

				if !allowed {
					log.Printf("[CORS] Origin '%s' rejected - no matching allowed origin found", sanitizedOrigin)
				}

				if allowed {
					w.Header().Set("Access-Control-Allow-Origin", origin)
				}
			} else {
				log.Printf("[CORS] Request has no Origin header")
			}

			w.Header().Set("Access-Control-Allow-Methods", joinStrings(config.AllowedMethods, ", "))
			w.Header().Set("Access-Control-Allow-Headers", joinStrings(config.AllowedHeaders, ", "))
			if config.AllowCredentials {
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}
			w.Header().Set("Access-Control-Max-Age", "86400") // 24 hours

			// Handle preflight OPTIONS requests
			if r.Method == http.MethodOptions {
				sanitizedOrigin := sanitizeForLogging(origin)
				log.Printf("[CORS] Preflight OPTIONS request from origin '%s'", sanitizedOrigin)
				w.WriteHeader(http.StatusOK)
				return
			}

			// Call the next handler
			next.ServeHTTP(w, r)
		})
	}
}

// joinStrings joins a slice of strings with a separator
func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}
