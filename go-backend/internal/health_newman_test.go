// Package internal provides Newman-based API tests for health check functionality
//
// This test file mirrors the Newman test collection scenarios for health check,
// providing comprehensive API-level tests that verify the health check endpoint
// behaves correctly according to Newman test specifications.
package internal

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/database"
)

// setupNewmanHealthTestDB creates and initializes test database for Newman-based health tests
func setupNewmanHealthTestDB(t *testing.T) *database.DB {
	database.SetupTestEnvironment()

	db, err := database.NewDBFromEnv()
	require.NoError(t, err)

	// Clean up any existing data
	db.GetDB().Exec("DELETE FROM kafka_events")
	db.GetDB().Exec("DELETE FROM billing_audit_logs")
	db.GetDB().Exec("DELETE FROM parking_sessions")
	db.GetDB().Exec("DELETE FROM vehicles")
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.GetDB().Exec("DELETE FROM entry_points")

	// Create tables for testing
	_, err = db.GetDB().Exec(`
		CREATE TABLE IF NOT EXISTS entry_points (
			id BIGSERIAL PRIMARY KEY,
			identifier VARCHAR(255) UNIQUE NOT NULL,
			name VARCHAR(255),
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	require.NoError(t, err)

	_, err = db.GetDB().Exec(`
		CREATE TABLE IF NOT EXISTS parking_slots (
			id BIGSERIAL PRIMARY KEY,
			slot_label VARCHAR(255) UNIQUE NOT NULL,
			slot_type VARCHAR(50) NOT NULL,
			distances JSONB NOT NULL,
			available BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	require.NoError(t, err)

	_, err = db.GetDB().Exec(`
		CREATE TABLE IF NOT EXISTS parking_sessions (
			id BIGSERIAL PRIMARY KEY,
			vehicle_type VARCHAR(50) NOT NULL,
			parking_slot_id BIGINT NOT NULL REFERENCES parking_slots(id),
			entry_point_id BIGINT NOT NULL REFERENCES entry_points(id),
			parked_at TIMESTAMP NOT NULL,
			exited_at TIMESTAMP,
			total_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	require.NoError(t, err)

	_, err = db.GetDB().Exec(`
		CREATE TABLE IF NOT EXISTS vehicles (
			id BIGSERIAL PRIMARY KEY,
			license_plate VARCHAR(255) UNIQUE NOT NULL,
			vehicle_type VARCHAR(50),
			color VARCHAR(100),
			brand VARCHAR(100),
			model VARCHAR(100),
			year INTEGER,
			metadata JSONB,
			first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			last_seen_at TIMESTAMP,
			total_sessions INTEGER DEFAULT 0,
			total_spent DECIMAL(10,2) DEFAULT 0.00,
			total_hours_parked DECIMAL(10,2) DEFAULT 0.00,
			is_frequent BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	require.NoError(t, err)

	_, err = db.GetDB().Exec(`
		CREATE TABLE IF NOT EXISTS billing_audit_logs (
			id BIGSERIAL PRIMARY KEY,
			parking_session_id BIGINT NOT NULL,
			vehicle_type VARCHAR(50) NOT NULL,
			slot_label VARCHAR(255),
			slot_type VARCHAR(50),
			entry_point VARCHAR(255),
			parked_at TIMESTAMP NOT NULL,
			exited_at TIMESTAMP NOT NULL,
			total_fee DECIMAL(10,2) NOT NULL,
			base_fee DECIMAL(10,2) NOT NULL,
			exceeding_fee DECIMAL(10,2) NOT NULL,
			exceeding_hours DECIMAL(10,2) NOT NULL,
			long_term_days INTEGER NOT NULL,
			long_term_fee DECIMAL(10,2) NOT NULL,
			duration_hours DECIMAL(10,2) NOT NULL,
			is_continuous BOOLEAN NOT NULL DEFAULT FALSE,
			base_start_time TIMESTAMP,
			correlation_id VARCHAR(255),
			idempotency_key VARCHAR(255),
			billing_version VARCHAR(50),
			calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	require.NoError(t, err)

	_, err = db.GetDB().Exec(`
		CREATE TABLE IF NOT EXISTS kafka_events (
			id BIGSERIAL PRIMARY KEY,
			event_type VARCHAR(255) NOT NULL,
			topic VARCHAR(255) NOT NULL,
			partition INTEGER,
			kafka_offset BIGINT,
			event_key VARCHAR(255),
			event_payload JSONB,
			correlation_id VARCHAR(255),
			causation_id VARCHAR(255),
			idempotency_key VARCHAR(255),
			event_id VARCHAR(255),
			occurred_at TIMESTAMP NOT NULL,
			published_at TIMESTAMP,
			status VARCHAR(50) NOT NULL DEFAULT 'pending',
			retry_count INTEGER DEFAULT 0,
			error_message TEXT,
			metadata JSONB,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	require.NoError(t, err)

	return db
}

// cleanupNewmanHealthTestDB cleans up test database after tests
func cleanupNewmanHealthTestDB(t *testing.T, db *database.DB) {
	db.GetDB().Exec("DELETE FROM kafka_events")
	db.GetDB().Exec("DELETE FROM billing_audit_logs")
	db.GetDB().Exec("DELETE FROM parking_sessions")
	db.GetDB().Exec("DELETE FROM vehicles")
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.GetDB().Exec("DELETE FROM entry_points")
	db.Close()
}

// ============================================================================
// Newman-Based API Tests - Health Check
// ============================================================================

// TestNewmanHealth provides comprehensive API-level tests mirroring Newman collection
func TestNewmanHealth(t *testing.T) {
	t.Run("Newman-Based Health Check Tests", func(t *testing.T) {
		db := setupNewmanHealthTestDB(t)
		defer cleanupNewmanHealthTestDB(t, db)

		// Setup router
		router := mux.NewRouter()

		// Health check handler (matching main.go implementation)
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
				t.Logf("Warning: failed to write health check response: %v", err)
			}
		}).Methods("GET")

		// ========================================================================
		// SUCCESSFUL HEALTH CHECK TESTS
		// ========================================================================

		t.Run("GET /health - Health Check (Newman Scenario)", func(t *testing.T) {
			// Make GET request to health endpoint
			req, err := http.NewRequest("GET", "/health", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK when database is healthy
			assert.Equal(t, http.StatusOK, rr.Code, "Health check should return 200 OK when database is healthy")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.Equal(t, "ok", response["status"], "Status should be ok")
			assert.Equal(t, "parking-lot-api", response["service"], "Service name should match")
			assert.Equal(t, "1.0.0", response["version"], "Version should match")
			assert.NotEmpty(t, response["timestamp"], "Timestamp should be set")
			assert.Equal(t, "healthy", response["database"], "Database status should be healthy")

			// Verify checks structure
			checks := response["checks"].(map[string]interface{})
			dbCheck := checks["database"].(map[string]interface{})
			assert.Equal(t, "healthy", dbCheck["status"], "Database check status should be healthy")
		})

		// ========================================================================
		// ERROR HANDLING TESTS - UNHEALTHY DATABASE
		// ========================================================================

		t.Run("GET /health - Database Unhealthy (Newman Scenario)", func(t *testing.T) {
			// Close database connection to simulate unhealthy state
			db.Close()

			// Make GET request to health endpoint
			req, err := http.NewRequest("GET", "/health", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 503 Service Unavailable when database is unhealthy
			assert.Equal(t, http.StatusServiceUnavailable, rr.Code, "Health check should return 503 Service Unavailable when database is unhealthy")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.Equal(t, "ok", response["status"], "Status should still be ok")
			assert.Equal(t, "unhealthy", response["database"], "Database status should be unhealthy")

			// Verify checks structure
			checks := response["checks"].(map[string]interface{})
			dbCheck := checks["database"].(map[string]interface{})
			assert.Equal(t, "unhealthy", dbCheck["status"], "Database check status should be unhealthy")
		})
	})
}

// ============================================================================
// Summary and Documentation
// ============================================================================

// TestNewmanHealthSummary documents Newman-based test coverage
func TestNewmanHealthSummary(t *testing.T) {
	t.Run("Newman-Based Test Summary", func(t *testing.T) {
		t.Log("=== NEWMAN-BASED HEALTH CHECK TEST SUMMARY ===")
		t.Log("")
		t.Log("Test Scenarios Covered:")
		t.Log("  ✓ Health Check - Healthy Database (GET /health)")
		t.Log("  ✓ Health Check - Unhealthy Database (GET /health)")
		t.Log("")
		t.Log("API Endpoint:")
		t.Log("  - GET /health")
		t.Log("")
		t.Log("Response Codes:")
		t.Log("  - 200 OK: Service and database are healthy")
		t.Log("  - 503 Service Unavailable: Database is unhealthy")
		t.Log("")
		t.Log("Response Structure:")
		t.Log("  {")
		t.Log("    \"status\": \"ok\",")
		t.Log("    \"service\": \"parking-lot-api\",")
		t.Log("    \"version\": \"1.0.0\",")
		t.Log("    \"timestamp\": \"<ISO8601 timestamp>\",")
		t.Log("    \"database\": \"healthy|unhealthy\",")
		t.Log("    \"checks\": {")
		t.Log("      \"database\": {")
		t.Log("        \"status\": \"healthy|unhealthy\"")
		t.Log("      }")
		t.Log("    }")
		t.Log("  }")
		t.Log("")
		t.Log("Test Structure:")
		t.Log("  - API-level tests using httptest")
		t.Log("  - Mirrors Newman collection scenarios")
		t.Log("  - Follows Go testing conventions")
		t.Log("  - Uses testify/assert and testify/require")
		t.Log("")
	})
}
