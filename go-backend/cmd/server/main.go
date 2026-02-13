// Package main provides the entry point for parking lot API server.
package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/database"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/handlers"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/middleware"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/repositories"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/services"
)

// initializeDatabase runs database initialization script to create tables and seed data
func initializeDatabase(db *sql.DB) error {
	// Read the init-db.sql script
	script, err := os.ReadFile("scripts/init-db.sql")
	if err != nil {
		return fmt.Errorf("failed to read init-db.sql: %w", err)
	}

	// Split the script into individual statements
	statements := splitSQLStatements(string(script))

	// Execute each statement
	for i, stmt := range statements {
		if stmt == "" {
			continue
		}
		log.Printf("Executing statement %d...", i+1)
		_, err = db.Exec(stmt)
		if err != nil {
			return fmt.Errorf("failed to execute statement %d: %w", i+1, err)
		}
		log.Printf("Statement %d executed successfully", i+1)
	}

	log.Println("Database initialized successfully")
	return nil
}

// splitSQLStatements splits a SQL script into individual statements
func splitSQLStatements(script string) []string {
	var statements []string
	var currentStatement strings.Builder

	lines := strings.Split(script, "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		// Skip empty lines and comments
		if trimmed == "" || strings.HasPrefix(trimmed, "--") {
			continue
		}
		currentStatement.WriteString(line)
		currentStatement.WriteString("\n")
		// Check if the line ends with a semicolon
		if strings.HasSuffix(trimmed, ";") {
			stmt := currentStatement.String()
			log.Printf("Statement %d: %s", len(statements)+1, stmt)
			statements = append(statements, stmt)
			currentStatement.Reset()
		}
	}

	// Add the last statement if it doesn't end with a semicolon
	if currentStatement.Len() > 0 {
		stmt := currentStatement.String()
		log.Printf("Statement %d: %s", len(statements)+1, stmt)
		statements = append(statements, stmt)
		currentStatement.Reset()
	}

	return statements
}

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found: %v", err)
	}

	// Initialize database
	db, err := database.NewDBFromEnv()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Ensure available column exists in parking_slots table
	if err := database.EnsureAvailableColumn(db.GetDB()); err != nil {
		log.Printf("Warning: failed to ensure available column: %v", err)
	}

	// Initialize database schema and seed data if needed
	if err := initializeDatabase(db.GetDB()); err != nil {
		log.Printf("Warning: failed to initialize database schema: %v", err)
	}

	// Initialize repositories
	entryPointRepo := repositories.NewEntryPointRepository(db.GetDB())
	parkingSlotRepo := repositories.NewParkingSlotRepository(db.GetDB())
	sessionRepo := repositories.NewParkingSessionRepository(db.GetDB())

	// Initialize services
	parkingService := services.NewParkingService(entryPointRepo, parkingSlotRepo, sessionRepo)

	// Initialize handlers
	parkingHandler := handlers.NewParkingHandler(parkingService)

	// Setup router
	router := mux.NewRouter()

	// Apply CORS middleware to all routes
	corsMiddleware := middleware.CORS(middleware.DefaultCORSConfig())
	router.Use(corsMiddleware)

	// API routes
	api := router.PathPrefix("/api/v1").Subrouter()

	// preflightHandler responds to CORS preflight OPTIONS requests.
	// gorilla/mux does NOT forward OPTIONS to method-restricted routes,
	// so every path that accepts DELETE, PUT, or POST needs an explicit
	// OPTIONS entry so the CORS middleware can set the right headers.
	preflightHandler := func(w http.ResponseWriter, r *http.Request) {
		// CORS middleware already ran and set the headers; just return 200.
		w.WriteHeader(http.StatusOK)
	}

	// Parking sessions routes
	api.HandleFunc("/sessions", parkingHandler.ParkVehicle).Methods("POST")
	api.HandleFunc("/sessions", parkingHandler.ListSessions).Methods("GET")
	api.HandleFunc("/sessions", preflightHandler).Methods("OPTIONS")
	api.HandleFunc("/sessions/{id}", parkingHandler.GetSession).Methods("GET")
	api.HandleFunc("/sessions/{id}", parkingHandler.DeleteSession).Methods("DELETE")
	api.HandleFunc("/sessions/{id}", preflightHandler).Methods("OPTIONS")
	api.HandleFunc("/sessions/{id}/unpark", parkingHandler.UnparkVehicle).Methods("POST")
	api.HandleFunc("/sessions/{id}/unpark", preflightHandler).Methods("OPTIONS")

	// Parking slots routes
	api.HandleFunc("/slots", parkingHandler.ListSlots).Methods("GET")
	api.HandleFunc("/slots", parkingHandler.CreateSlot).Methods("POST")
	api.HandleFunc("/slots", preflightHandler).Methods("OPTIONS")
	api.HandleFunc("/slots/available", parkingHandler.AvailableSlots).Methods("GET")
	api.HandleFunc("/slots/{id}", parkingHandler.UpdateSlot).Methods("PUT")
	api.HandleFunc("/slots/{id}", parkingHandler.DeleteSlot).Methods("DELETE")
	api.HandleFunc("/slots/{id}", preflightHandler).Methods("OPTIONS")

	// Entry points routes (using underscore to match Postman collection)
	api.HandleFunc("/entry_points", parkingHandler.ListEntryPoints).Methods("GET")
	api.HandleFunc("/entry_points", parkingHandler.CreateEntryPoint).Methods("POST")
	api.HandleFunc("/entry_points", preflightHandler).Methods("OPTIONS")
	api.HandleFunc("/entry_points/{id}", parkingHandler.UpdateEntryPoint).Methods("PUT")
	api.HandleFunc("/entry_points/{id}", parkingHandler.DeleteEntryPoint).Methods("DELETE")
	api.HandleFunc("/entry_points/{id}", preflightHandler).Methods("OPTIONS")

	// Initialize system route
	api.HandleFunc("/initialize", parkingHandler.InitializeSystem).Methods("POST")
	api.HandleFunc("/initialize", preflightHandler).Methods("OPTIONS")

	// Health check
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		// Check database connectivity
		dbStatus := "healthy"
		if err := db.GetDB().Ping(); err != nil {
			dbStatus = "unhealthy"
			w.WriteHeader(http.StatusServiceUnavailable)
		} else {
			w.WriteHeader(http.StatusOK)
		}

		healthResponse := map[string]interface{}{
			"status":    "ok",
			"service":   "parking-lot-api",
			"version":   "1.0.0",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"database":  dbStatus,
			"checks": map[string]interface{}{
				"database": map[string]interface{}{
					"status": dbStatus,
				},
			},
		}

		if err := json.NewEncoder(w).Encode(healthResponse); err != nil {
			log.Printf("Warning: failed to write health check response: %v", err)
		}
	}).Methods("GET")

	// OPTIONS preflight for /health — browsers send this before the GET
	// when the request comes from a different origin.
	router.HandleFunc("/health", preflightHandler).Methods("OPTIONS")

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	log.Printf("Starting server on port %s", port) // #nosec G706 -- port is from environment variable and is safe

	// Configure server with timeouts to prevent slowloris attacks
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil {
		log.Printf("Failed to start server: %v", err)
		if err := db.Close(); err != nil {
			log.Printf("Warning: failed to close database: %v", err)
		}
		os.Exit(1)
	}
}
