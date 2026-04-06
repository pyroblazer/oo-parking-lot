// Package main provides the entry point for parking lot API server.
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/zerolog"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/database"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/handlers"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/middleware"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/repositories"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/services"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/worker"
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
	for _, stmt := range statements {
		if stmt == "" {
			continue
		}
		_, err = db.Exec(stmt)
		if err != nil {
			return fmt.Errorf("failed to execute SQL statement: %w", err)
		}
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
			statements = append(statements, stmt)
			currentStatement.Reset()
		}
	}

	// Add the last statement if it doesn't end with a semicolon
	if currentStatement.Len() > 0 {
		stmt := currentStatement.String()
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
	// NOTE: database.EnsureAvailableColumn is not implemented - column is created by init-db.sql script
	// if err := database.EnsureAvailableColumn(db.GetDB()); err != nil {
	// 	log.Printf("Warning: failed to ensure available column: %v", err)
	// }

	// Initialize database schema and seed data if needed
	// This is critical - if initialization fails, the server should not start
	if err := initializeDatabase(db.GetDB()); err != nil {
		log.Fatalf("Failed to initialize database schema: %v", err)
	}

	// Initialize repositories
	entryPointRepo := repositories.NewEntryPointRepository(db.GetDB())
	parkingSlotRepo := repositories.NewParkingSlotRepository(db.GetDB())
	sessionRepo := repositories.NewParkingSessionRepository(db.GetDB())
	vehicleRepo := repositories.NewVehicleRepository(db.GetDB())
	billingAuditLogRepo := repositories.NewBillingAuditLogRepository(db.GetDB())
	kafkaEventRepo := repositories.NewKafkaEventRepository(db.GetDB())

	// Initialize services
	parkingService := services.NewParkingServiceWithFullRepos(entryPointRepo, parkingSlotRepo, sessionRepo, vehicleRepo, billingAuditLogRepo, kafkaEventRepo)

	// Initialize handlers
	parkingHandler := handlers.NewParkingHandler(parkingService)

	// Setup router
	router := mux.NewRouter()

	// Custom 404 handler that returns JSON instead of plain text
	router.NotFoundHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "404 page not found",
		}); err != nil {
			log.Printf("Warning: failed to write 404 response: %v", err)
		}
	})

	// Apply logging middleware first (before CORS so all requests are logged)
	router.Use(middleware.RequestLogger)

	// Apply Prometheus metrics middleware to record request durations
	router.Use(middleware.MetricsMiddleware)

	// Apply CORS middleware to all routes
	corsMiddleware := middleware.CORS(middleware.DefaultCORSConfig())
	router.Use(corsMiddleware)

	// Expose Prometheus metrics endpoint
	router.Handle("/metrics", middleware.MetricsHandler()).Methods("GET")

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
	api.HandleFunc("/sessions/recent_exits", parkingHandler.RecentExitsHandler).Methods("GET")
	api.HandleFunc("/sessions/{id}", parkingHandler.GetSession).Methods("GET")
	api.HandleFunc("/sessions/{id}", parkingHandler.UpdateSession).Methods("PUT")
	api.HandleFunc("/sessions/{id}", parkingHandler.DeleteSession).Methods("DELETE")
	api.HandleFunc("/sessions/{id}", preflightHandler).Methods("OPTIONS")
	api.HandleFunc("/sessions/{id}/unpark", parkingHandler.UnparkVehicle).Methods("POST")
	api.HandleFunc("/sessions/{id}/unpark", preflightHandler).Methods("OPTIONS")
	// NOTE: ClearSessions is not implemented
	// api.HandleFunc("/sessions/clear", parkingHandler.ClearSessions).Methods("DELETE")
	// api.HandleFunc("/sessions/clear", preflightHandler).Methods("OPTIONS")
	// NOTE: ResetTestCounter is not implemented
	// api.HandleFunc("/sessions/reset-test-counter", parkingHandler.ResetTestCounter).Methods("POST")
	// api.HandleFunc("/sessions/reset-test-counter", preflightHandler).Methods("OPTIONS")

	// Parking slots routes
	api.HandleFunc("/slots", parkingHandler.ListSlots).Methods("GET")
	api.HandleFunc("/slots", parkingHandler.CreateSlot).Methods("POST")
	api.HandleFunc("/slots", preflightHandler).Methods("OPTIONS")
	api.HandleFunc("/slots/available", parkingHandler.AvailableSlots).Methods("GET")
	api.HandleFunc("/slots/{id}", parkingHandler.GetSlot).Methods("GET")
	api.HandleFunc("/slots/{id}", parkingHandler.UpdateSlot).Methods("PUT")
	api.HandleFunc("/slots/{id}", parkingHandler.DeleteSlot).Methods("DELETE")
	api.HandleFunc("/slots/{id}", preflightHandler).Methods("OPTIONS")

	// Entry points routes (using underscore to match Postman collection)
	api.HandleFunc("/entry_points", parkingHandler.ListEntryPoints).Methods("GET")
	api.HandleFunc("/entry_points", parkingHandler.CreateEntryPoint).Methods("POST")
	api.HandleFunc("/entry_points", preflightHandler).Methods("OPTIONS")
	api.HandleFunc("/entry_points/{id}", parkingHandler.GetEntryPoint).Methods("GET")
	api.HandleFunc("/entry_points/{id}", parkingHandler.UpdateEntryPoint).Methods("PUT")
	api.HandleFunc("/entry_points/{id}", parkingHandler.DeleteEntryPoint).Methods("DELETE")
	api.HandleFunc("/entry_points/{id}", preflightHandler).Methods("OPTIONS")

	// Initialize system route
	api.HandleFunc("/initialize", parkingHandler.InitializeSystem).Methods("POST")
	api.HandleFunc("/initialize", preflightHandler).Methods("OPTIONS")

	// Billing audit logs routes (read-only)
	api.HandleFunc("/billing_audit_logs", parkingHandler.ListBillingAuditLogs).Methods("GET")
	api.HandleFunc("/billing_audit_logs/{id}", parkingHandler.GetBillingAuditLog).Methods("GET")
	api.HandleFunc("/billing_audit_logs/session", parkingHandler.GetBillingAuditLogsBySessionID).Methods("GET")

	// Kafka events routes (read-only)
	api.HandleFunc("/kafka_events", parkingHandler.ListKafkaEvents).Methods("GET")
	api.HandleFunc("/kafka_events/{id}", parkingHandler.GetKafkaEvent).Methods("GET")
	api.HandleFunc("/kafka_events/status", parkingHandler.GetKafkaEventsByStatus).Methods("GET")
	api.HandleFunc("/kafka_events/event_type", parkingHandler.GetKafkaEventsByEventType).Methods("GET")

	// NOTE: ResetTestDatabase is not implemented
	// api.HandleFunc("/test/reset-database", parkingHandler.ResetTestDatabase).Methods("POST")
	// api.HandleFunc("/test/reset-database", preflightHandler).Methods("OPTIONS")

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
			"checks": map[string]interface{}{
				"database": map[string]interface{}{
					"status": dbStatus,
				},
			},
			"data": map[string]interface{}{
				"status": dbStatus,
			},
		}

		if err := json.NewEncoder(w).Encode(healthResponse); err != nil {
			log.Printf("Warning: failed to write health check response: %v", err)
		}
	}).Methods("GET")

	// OPTIONS preflight for /health — browsers send this before the GET
	// when the request comes from a different origin.
	router.HandleFunc("/health", preflightHandler).Methods("OPTIONS")

	// Start Asynq worker if Redis is available
	redisAddr := ""
	if rawURL := os.Getenv("REDIS_URL"); rawURL != "" {
		// Strip redis:// or rediss:// prefix to get host:port
		addr := rawURL
		if idx := strings.Index(rawURL, "://"); idx != -1 {
			addr = rawURL[idx+3:]
		}
		// Remove trailing /db suffix (e.g., localhost:6379/0 -> localhost:6379)
		if idx := strings.Index(addr, "/"); idx != -1 {
			addr = addr[:idx]
		}
		redisAddr = addr
	} else if host := os.Getenv("REDIS_HOST"); host != "" {
		redisAddr = host + ":6379"
	}
	var bgWorker *worker.Worker
	if redisAddr != "" {
		zlog := zerolog.New(os.Stdout).With().Timestamp().Logger()
		bgWorker = worker.NewWorker(redisAddr, &zlog)
		go func() {
			log.Printf("Starting Asynq worker with Redis at %s", redisAddr)
			if err := bgWorker.Start(); err != nil {
				log.Printf("Worker stopped: %v", err)
			}
		}()
	} else {
		log.Printf("No REDIS_URL set — Asynq worker disabled")
	}

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

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		sig := <-sigChan
		log.Printf("Received signal %v, shutting down gracefully...", sig)

		// Stop the worker first
		if bgWorker != nil {
			bgWorker.Stop()
		}

		// Shutdown HTTP server with timeout
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if err := server.Shutdown(ctx); err != nil {
			log.Printf("HTTP server shutdown error: %v", err)
		}

		// Close database
		if err := db.Close(); err != nil {
			log.Printf("Database close error: %v", err)
		}
	}()

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Printf("Failed to start server: %v", err)
		if err := db.Close(); err != nil {
			log.Printf("Warning: failed to close database: %v", err)
		}
		os.Exit(1)
	}
}
