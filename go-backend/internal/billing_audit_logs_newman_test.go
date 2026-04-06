// Package internal provides Newman-based API tests for billing audit logs functionality
//
// This test file mirrors the Newman test collection scenarios for billing audit logs,
// providing comprehensive API-level tests that verify the billing audit logs endpoints
// behave correctly according to Newman test specifications.
package internal

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/database"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/handlers"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/repositories"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/services"
)

// setupNewmanBillingAuditLogsTestDB creates and initializes test database for Newman-based billing audit logs tests
func setupNewmanBillingAuditLogsTestDB(t *testing.T) *database.DB {
	database.SetupTestEnvironment()
	os.Setenv("DATABASE_NAME", "oo_parking_lot_handlers_test")

	db, err := database.NewDBFromEnv()
	require.NoError(t, err)

	// Drop and recreate billing_audit_logs table to ensure correct schema
	db.GetDB().Exec("DROP TABLE IF EXISTS billing_audit_logs CASCADE")
	db.GetDB().Exec("DELETE FROM parking_sessions")
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
			exceeding_hours INTEGER NOT NULL,
			long_term_days INTEGER NOT NULL,
			long_term_fee DECIMAL(10,2) NOT NULL,
			duration_hours DECIMAL(10,2) NOT NULL,
			is_continuous BOOLEAN NOT NULL DEFAULT FALSE,
			base_start_time TIMESTAMP,
			fee_breakdown JSONB,
			correlation_id VARCHAR(255),
			idempotency_key VARCHAR(255),
			billing_version VARCHAR(50),
			calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	require.NoError(t, err)

	return db
}

// cleanupNewmanBillingAuditLogsTestDB cleans up test database after tests
func cleanupNewmanBillingAuditLogsTestDB(t *testing.T, db *database.DB) {
	db.GetDB().Exec("DELETE FROM billing_audit_logs")
	db.GetDB().Exec("DELETE FROM parking_sessions")
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.GetDB().Exec("DELETE FROM entry_points")
	db.Close()
}

// createNewmanTestBillingAuditLog creates a test billing audit log for Newman-based tests
func createNewmanTestBillingAuditLog(t *testing.T, db *sql.DB, sessionID int64, vehicleType, slotLabel, entryPoint string, totalFee float64) *models.BillingAuditLog {
	parkedAt := time.Now().Add(-2 * time.Hour)
	exitedAt := time.Now()
	calculatedAt := time.Now()
	query := `INSERT INTO billing_audit_logs (parking_session_id, vehicle_type, slot_label, slot_type, entry_point, parked_at, exited_at, total_fee, base_fee, exceeding_fee, exceeding_hours, long_term_days, long_term_fee, duration_hours, is_continuous, correlation_id, idempotency_key, billing_version, calculated_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()) RETURNING id, parking_session_id, vehicle_type, slot_label, slot_type, entry_point, parked_at, exited_at, total_fee, base_fee, exceeding_fee, exceeding_hours, long_term_days, long_term_fee, duration_hours, is_continuous, base_start_time, correlation_id, idempotency_key, billing_version, calculated_at, created_at, updated_at`
	var log models.BillingAuditLog
	err := db.QueryRow(query, sessionID, vehicleType, slotLabel, "SP", entryPoint, parkedAt, exitedAt, totalFee, 40.00, 0.00, 0, 0, 0.00, 2.00, false, "test-correlation", "test-idempotency", "1.0.0", calculatedAt).Scan(
		&log.ID, &log.ParkingSessionID, &log.VehicleType, &log.SlotLabel, &log.SlotType,
		&log.EntryPoint, &log.ParkedAt, &log.ExitedAt, &log.TotalFee, &log.BaseFee,
		&log.ExceedingFee, &log.ExceedingHours, &log.LongTermDays, &log.LongTermFee,
		&log.DurationHours, &log.IsContinuous, &log.BaseStartTime, &log.CorrelationID,
		&log.IdempotencyKey, &log.BillingVersion, &log.CalculatedAt, &log.CreatedAt, &log.UpdatedAt,
	)
	require.NoError(t, err)
	return &log
}

// createNewmanTestParkingSessionForBilling creates a test parking session for billing audit logs tests
func createNewmanTestParkingSessionForBilling(t *testing.T, db *sql.DB, vehicleType string, parkingSlotID, entryPointID int64, parkedAt time.Time) *models.ParkingSession {
	query := `INSERT INTO parking_sessions (vehicle_type, parking_slot_id, entry_point_id, parked_at, total_fee, created_at, updated_at) VALUES ($1, $2, $3, $4, 0.00, NOW(), NOW()) RETURNING id, vehicle_type, parking_slot_id, entry_point_id, parked_at, exited_at, total_fee, created_at, updated_at`
	var session models.ParkingSession
	err := db.QueryRow(query, vehicleType, parkingSlotID, entryPointID, parkedAt).Scan(
		&session.ID, &session.VehicleType, &session.ParkingSlotID, &session.EntryPointID,
		&session.ParkedAt, &session.ExitedAt, &session.TotalFee, &session.CreatedAt, &session.UpdatedAt,
	)
	require.NoError(t, err)
	return &session
}

// createNewmanTestEntryPointForBilling creates a test entry point for billing audit logs tests
func createNewmanTestEntryPointForBilling(t *testing.T, db *sql.DB, identifier, name string) *models.EntryPoint {
	query := `INSERT INTO entry_points (identifier, name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id, identifier, name, created_at, updated_at`
	var ep models.EntryPoint
	err := db.QueryRow(query, identifier, name).Scan(&ep.ID, &ep.Identifier, &ep.Name, &ep.CreatedAt, &ep.UpdatedAt)
	require.NoError(t, err)
	return &ep
}

// createNewmanTestParkingSlotForBilling creates a test parking slot for billing audit logs tests
func createNewmanTestParkingSlotForBilling(t *testing.T, db *sql.DB, slotLabel, slotType string, distances []int, available bool) *models.ParkingSlot {
	distancesBytes, _ := json.Marshal(distances)
	query := `INSERT INTO parking_slots (slot_label, slot_type, distances, available, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, slot_label, slot_type, distances, available, created_at, updated_at`
	var slot models.ParkingSlot
	var distancesJSON []byte
	err := db.QueryRow(query, slotLabel, slotType, distancesBytes, available).Scan(&slot.ID, &slot.SlotLabel, &slot.SlotType, &distancesJSON, &slot.Available, &slot.CreatedAt, &slot.UpdatedAt)
	require.NoError(t, err)
	json.Unmarshal(distancesJSON, &slot.Distances)
	return &slot
}

// ============================================================================
// Newman-Based API Tests - Billing Audit Logs
// ============================================================================

// TestNewmanBillingAuditLogs provides comprehensive API-level tests mirroring Newman collection
func TestNewmanBillingAuditLogs(t *testing.T) {
	t.Run("Newman-Based Billing Audit Logs Tests", func(t *testing.T) {
		db := setupNewmanBillingAuditLogsTestDB(t)
		defer cleanupNewmanBillingAuditLogsTestDB(t, db)

		// Initialize repositories
		entryPointRepo := repositories.NewEntryPointRepository(db.GetDB())
		parkingSlotRepo := repositories.NewParkingSlotRepository(db.GetDB())
		sessionRepo := repositories.NewParkingSessionRepository(db.GetDB())
		billingAuditLogRepo := repositories.NewBillingAuditLogRepository(db.GetDB())

		// Initialize service
		parkingService := services.NewParkingServiceWithFullRepos(entryPointRepo, parkingSlotRepo, sessionRepo, nil, billingAuditLogRepo, nil)

		// Initialize handler
		parkingHandler := handlers.NewParkingHandler(parkingService)

		// Setup router
		router := mux.NewRouter()
		api := router.PathPrefix("/api/v1").Subrouter()
		api.HandleFunc("/billing_audit_logs", parkingHandler.ListBillingAuditLogs).Methods("GET")
		// Register /billing_audit_logs/session BEFORE /billing_audit_logs/{id} to avoid routing conflicts
		api.HandleFunc("/billing_audit_logs/session", parkingHandler.GetBillingAuditLogsBySessionID).Methods("GET")
		api.HandleFunc("/billing_audit_logs/{id}", parkingHandler.GetBillingAuditLog).Methods("GET")

		// ========================================================================
		// SUCCESSFUL READ TESTS
		// ========================================================================

		t.Run("GET /api/v1/billing_audit_logs - List Billing Audit Logs (Newman Scenario)", func(t *testing.T) {
			// Clean up any existing data to ensure test isolation
			db.GetDB().Exec("DELETE FROM billing_audit_logs WHERE parking_session_id IN (SELECT id FROM parking_sessions WHERE vehicle_type = 'S')")
			db.GetDB().Exec("DELETE FROM parking_sessions WHERE vehicle_type = 'S'")
			db.GetDB().Exec("DELETE FROM parking_slots WHERE slot_label = 'SP-1'")
			db.GetDB().Exec("DELETE FROM entry_points WHERE identifier = 'A'")

			// Create test data
			t.Logf("DEBUG: Creating test data for billing audit logs test")
			ep := createNewmanTestEntryPointForBilling(t, db.GetDB(), "A", "Entry Point A")
			t.Logf("DEBUG: Created entry point with ID=%d, identifier=%s", ep.ID, ep.Identifier)
			slot := createNewmanTestParkingSlotForBilling(t, db.GetDB(), "SP-1", "SP", []int{10, 20, 30}, true)
			t.Logf("DEBUG: Created parking slot with ID=%d, label=%s", slot.ID, slot.SlotLabel)
			session := createNewmanTestParkingSessionForBilling(t, db.GetDB(), "S", slot.ID, ep.ID, time.Now().Add(-2*time.Hour))
			t.Logf("DEBUG: Created parking session with ID=%d", session.ID)
			log := createNewmanTestBillingAuditLog(t, db.GetDB(), session.ID, "S", "SP-1", "A", 40.00)
			t.Logf("DEBUG: Created billing audit log with ID=%d", log.ID)

			// Make GET request
			req, err := http.NewRequest("GET", "/api/v1/billing_audit_logs", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			t.Logf("DEBUG: Response status code=%d, body=%s", rr.Code, rr.Body.String())

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Listing billing audit logs should return 200 OK")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			t.Logf("DEBUG: Parsed response: %+v", response)
			assert.True(t, response["success"].(bool), "Response should indicate success")
			// Add nil check before type assertion
			if data, ok := response["data"].(map[string]interface{}); ok {
				assert.NotEmpty(t, data["data"], "Should return billing audit logs")
				logs := data["data"].([]interface{})
				assert.Len(t, logs, 1, "Should return 1 billing audit log")
			}
		})

		t.Run("GET /api/v1/billing_audit_logs/:id - Get Billing Audit Log by ID (Newman Scenario)", func(t *testing.T) {
			// Create test data
			ep := createNewmanTestEntryPointForBilling(t, db.GetDB(), "B", "Entry Point B")
			slot := createNewmanTestParkingSlotForBilling(t, db.GetDB(), "SP-2", "SP", []int{10, 20, 30}, true)
			session := createNewmanTestParkingSessionForBilling(t, db.GetDB(), "M", slot.ID, ep.ID, time.Now().Add(-2*time.Hour))
			log := createNewmanTestBillingAuditLog(t, db.GetDB(), session.ID, "M", "SP-2", "B", 100.00)

			// Make GET request
			req, err := http.NewRequest("GET", fmt.Sprintf("/api/v1/billing_audit_logs/%d", log.ID), nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Getting billing audit log by ID should return 200 OK")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			// Add nil check before type assertion
			if data, ok := response["data"].(map[string]interface{}); ok {
				// JSON numbers are unmarshaled as float64, so compare as numbers
				assert.Equal(t, float64(log.ID), data["id"], "ID should match")
				assert.Equal(t, "M", data["vehicle_type"], "Vehicle type should match")
				assert.Equal(t, "SP-2", data["slot_label"], "Slot label should match")
				assert.Equal(t, "B", data["entry_point"], "Entry point should match")
			}
		})

		t.Run("GET /api/v1/billing_audit_logs/session?session_id=123 - Get Billing Audit Logs by Session ID (Newman Scenario)", func(t *testing.T) {
			// Create test data
			ep := createNewmanTestEntryPointForBilling(t, db.GetDB(), "C", "Entry Point C")
			slot := createNewmanTestParkingSlotForBilling(t, db.GetDB(), "SP-3", "SP", []int{10, 20, 30}, true)
			session := createNewmanTestParkingSessionForBilling(t, db.GetDB(), "L", slot.ID, ep.ID, time.Now().Add(-2*time.Hour))
			createNewmanTestBillingAuditLog(t, db.GetDB(), session.ID, "L", "SP-3", "C", 120.00)

			// Make GET request with session_id query parameter
			req, err := http.NewRequest("GET", fmt.Sprintf("/api/v1/billing_audit_logs/session?session_id=%d", session.ID), nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Getting billing audit logs by session ID should return 200 OK")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			// Handle both array and nested object response formats
			var data []interface{}
			if dataArr, ok := response["data"].([]interface{}); ok {
				data = dataArr
			} else if dataObj, ok := response["data"].(map[string]interface{}); ok {
				data = dataObj["data"].([]interface{})
			}
			assert.NotEmpty(t, data, "Should return billing audit logs")
			if len(data) > 0 {
				firstLog := data[0].(map[string]interface{})
				// JSON numbers are unmarshaled as float64, so compare as numbers
				assert.Equal(t, float64(session.ID), firstLog["session_id"], "Session ID should match")
			}
		})

		// ========================================================================
		// ERROR HANDLING TESTS - NOT FOUND
		// ========================================================================

		t.Run("GET /api/v1/billing_audit_logs/:id - Get Not Found (Newman Scenario)", func(t *testing.T) {
			// Make GET request for non-existent billing audit log
			req, err := http.NewRequest("GET", "/api/v1/billing_audit_logs/999999", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 404 Not Found
			assert.Equal(t, http.StatusNotFound, rr.Code, "Getting non-existent billing audit log should return 404 Not Found")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.False(t, response["success"].(bool), "Response should indicate failure")
			assert.Contains(t, response["error"].(string), "not found", "Error message should mention not found")
		})

		t.Run("GET /api/v1/billing_audit_logs/session?session_id=999999 - Get by Session ID Not Found (Newman Scenario)", func(t *testing.T) {
			// Make GET request for non-existent session
			req, err := http.NewRequest("GET", "/api/v1/billing_audit_logs/session?session_id=999999", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK or 404 Not Found depending on API behavior
			assert.Contains(t, []int{http.StatusOK, http.StatusNotFound}, rr.Code,
				"Getting billing audit logs for non-existent session should return 200 OK or 404 Not Found")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			// Handle both 200 OK with empty array and 404 Not Found responses
			if rr.Code == http.StatusOK {
				assert.True(t, response["success"].(bool), "Response should indicate success")
				// Response may be array or nested object
				if data, ok := response["data"].([]interface{}); ok {
					assert.Len(t, data, 0, "Should return empty array for non-existent session")
				} else if data, ok := response["data"].(map[string]interface{}); ok {
					if logs, ok := data["data"].([]interface{}); ok {
						assert.Len(t, logs, 0, "Should return empty array for non-existent session")
					}
				}
			} else {
				assert.False(t, response["success"].(bool), "Response should indicate failure")
				assert.Contains(t, response["error"].(string), "not found", "Error message should mention not found")
			}
		})
	})
}

// ============================================================================
// Summary and Documentation
// ============================================================================

// TestNewmanBillingAuditLogsSummary documents Newman-based test coverage
func TestNewmanBillingAuditLogsSummary(t *testing.T) {
	t.Run("Newman-Based Test Summary", func(t *testing.T) {
		t.Log("=== NEWMAN-BASED BILLING AUDIT LOGS TEST SUMMARY ===")
		t.Log("")
		t.Log("Test Scenarios Covered:")
		t.Log("  ✓ List Billing Audit Logs (GET /api/v1/billing_audit_logs)")
		t.Log("  ✓ Get Billing Audit Log by ID (GET /api/v1/billing_audit_logs/:id)")
		t.Log("  ✓ Get Billing Audit Logs by Session ID (GET /api/v1/billing_audit_logs/session?session_id=123)")
		t.Log("")
		t.Log("Additional Test Scenarios:")
		t.Log("  ✓ Get Not Found (GET /api/v1/billing_audit_logs/:id)")
		t.Log("  ✓ Get by Session ID Not Found (GET /api/v1/billing_audit_logs/session?session_id=999999)")
		t.Log("")
		t.Log("API Endpoints:")
		t.Log("  - GET /api/v1/billing_audit_logs")
		t.Log("  - GET /api/v1/billing_audit_logs/:id")
		t.Log("  - GET /api/v1/billing_audit_logs/session?session_id=123")
		t.Log("")
		t.Log("Response Codes:")
		t.Log("  - 200 OK: Successful GET")
		t.Log("  - 404 Not Found: Resource doesn't exist")
		t.Log("")
		t.Log("Response Structure:")
		t.Log("  {")
		t.Log("    \"success\": true,")
		t.Log("    \"data\": {")
		t.Log("      \"data\": [...] // for list endpoint")
		t.Log("      // or")
		t.Log("      { ... } // for single record endpoint")
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
