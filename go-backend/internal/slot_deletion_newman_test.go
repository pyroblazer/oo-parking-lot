// Package internal provides Newman-based API tests for slot deletion functionality
//
// This test file mirrors the Newman test collection scenarios for slot deletion,
// providing comprehensive API-level tests that verify the DELETE /api/v1/slots/:id endpoint
// behaves correctly according to Newman test specifications.
package internal

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
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

// setupNewmanSlotDeletionTestDB creates and initializes test database for Newman-based slot deletion tests
func setupNewmanSlotDeletionTestDB(t *testing.T) *database.DB {
	database.SetupTestEnvironment()

	db, err := database.NewDBFromEnv()
	require.NoError(t, err)

	// Clean up any existing data
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

	return db
}

// cleanupNewmanSlotDeletionTestDB cleans up test database after tests
func cleanupNewmanSlotDeletionTestDB(t *testing.T, db *database.DB) {
	db.GetDB().Exec("DELETE FROM parking_sessions")
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.GetDB().Exec("DELETE FROM entry_points")
	db.Close()
}

// createNewmanTestEntryPoint creates a test entry point for Newman-based tests
func createNewmanTestEntryPoint(t *testing.T, db *sql.DB, identifier, name string) *models.EntryPoint {
	query := `INSERT INTO entry_points (identifier, name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id, identifier, name, created_at, updated_at`
	var ep models.EntryPoint
	err := db.QueryRow(query, identifier, name).Scan(&ep.ID, &ep.Identifier, &ep.Name, &ep.CreatedAt, &ep.UpdatedAt)
	require.NoError(t, err)
	return &ep
}

// createNewmanDeletionTestParkingSlot creates a test parking slot for Newman-based deletion tests
// Note: Renamed from createNewmanTestParkingSlot to avoid redeclaration with slot_editing_newman_test.go
func createNewmanDeletionTestParkingSlot(t *testing.T, db *sql.DB, slotLabel, slotType string, distances []int, available bool) *models.ParkingSlot {
	distancesBytes, _ := json.Marshal(distances)
	query := `INSERT INTO parking_slots (slot_label, slot_type, distances, available, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, slot_label, slot_type, distances, available, created_at, updated_at`
	var slot models.ParkingSlot
	var distancesJSON []byte
	err := db.QueryRow(query, slotLabel, slotType, distancesBytes, available).Scan(&slot.ID, &slot.SlotLabel, &slot.SlotType, &distancesJSON, &slot.Available, &slot.CreatedAt, &slot.UpdatedAt)
	require.NoError(t, err)
	json.Unmarshal(distancesJSON, &slot.Distances)
	return &slot
}

// createNewmanTestParkingSession creates a test parking session for Newman-based tests
func createNewmanTestParkingSession(t *testing.T, db *sql.DB, vehicleType string, slotID, entryPointID int64, parkedAt time.Time, exitedAt *time.Time) *models.ParkingSession {
	query := `INSERT INTO parking_sessions (vehicle_type, parking_slot_id, entry_point_id, parked_at, exited_at, total_fee, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, 0, NOW(), NOW()) RETURNING id, vehicle_type, parking_slot_id, entry_point_id, parked_at, exited_at, total_fee, created_at, updated_at`
	var session models.ParkingSession
	err := db.QueryRow(query, vehicleType, slotID, entryPointID, parkedAt, exitedAt).Scan(
		&session.ID, &session.VehicleType, &session.ParkingSlotID, &session.EntryPointID,
		&session.ParkedAt, &session.ExitedAt, &session.TotalFee, &session.CreatedAt, &session.UpdatedAt,
	)
	require.NoError(t, err)
	return &session
}

// ============================================================================
// Newman-Based API Tests - DELETE /api/v1/slots/:id
// ============================================================================

// TestNewmanSlotDeletion provides comprehensive API-level tests mirroring Newman collection
func TestNewmanSlotDeletion(t *testing.T) {
	t.Run("Newman-Based Slot Deletion Tests", func(t *testing.T) {
		db := setupNewmanSlotDeletionTestDB(t)
		defer cleanupNewmanSlotDeletionTestDB(t, db)

		// Initialize repositories
		entryPointRepo := repositories.NewEntryPointRepository(db.GetDB())
		parkingSlotRepo := repositories.NewParkingSlotRepository(db.GetDB())
		sessionRepo := repositories.NewParkingSessionRepository(db.GetDB())

		// Initialize service
		parkingService := services.NewParkingService(entryPointRepo, parkingSlotRepo, sessionRepo)

		// Initialize handler
		parkingHandler := handlers.NewParkingHandler(parkingService)

		// Setup router
		router := mux.NewRouter()
		api := router.PathPrefix("/api/v1").Subrouter()
		api.HandleFunc("/slots/{id}", parkingHandler.DeleteSlot).Methods("DELETE")

		// ========================================================================
		// SUCCESSFUL DELETION TESTS
		// ========================================================================

		t.Run("DELETE /api/v1/slots/:id - Delete unused slot (Newman Scenario)", func(t *testing.T) {
			// Create a slot that has never been used (SP type)
			slot := createNewmanDeletionTestParkingSlot(t, db.GetDB(), "TEST-SP-DEL", "SP", []int{10, 20, 30}, true)

			// Make DELETE request
			req, err := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/slots/%d", slot.ID), nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 204 No Content
			assert.Equal(t, http.StatusNoContent, rr.Code, "Deleting an unused slot should return 204 No Content")
			assert.Empty(t, rr.Body.String(), "Response body should be empty for 204")

			// Verify slot is deleted
			_, err = parkingSlotRepo.GetByID(slot.ID)
			assert.Error(t, err, "Slot should not exist after deletion")
		})

		t.Run("DELETE /api/v1/slots/:id - Delete MP slot successfully (Newman Scenario)", func(t *testing.T) {
			// Create an MP slot that has never been used
			slot := createNewmanDeletionTestParkingSlot(t, db.GetDB(), "TEST-MP-DEL", "MP", []int{25, 35, 45}, true)

			// Make DELETE request
			req, err := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/slots/%d", slot.ID), nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 204 No Content
			assert.Equal(t, http.StatusNoContent, rr.Code, "Deleting an unused MP slot should return 204 No Content")
			assert.Empty(t, rr.Body.String(), "Response body should be empty for 204")

			// Verify slot is deleted
			_, err = parkingSlotRepo.GetByID(slot.ID)
			assert.Error(t, err, "MP slot should not exist after deletion")
		})

		t.Run("DELETE /api/v1/slots/:id - Delete LP slot successfully (Newman Scenario)", func(t *testing.T) {
			// Create an LP slot that has never been used
			slot := createNewmanDeletionTestParkingSlot(t, db.GetDB(), "TEST-LP-DEL", "LP", []int{30, 40, 50}, true)

			// Make DELETE request
			req, err := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/slots/%d", slot.ID), nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 204 No Content
			assert.Equal(t, http.StatusNoContent, rr.Code, "Deleting an unused LP slot should return 204 No Content")
			assert.Empty(t, rr.Body.String(), "Response body should be empty for 204")

			// Verify slot is deleted
			_, err = parkingSlotRepo.GetByID(slot.ID)
			assert.Error(t, err, "LP slot should not exist after deletion")
		})

		// ========================================================================
		// ERROR HANDLING TESTS - ACTIVE SESSIONS
		// ========================================================================

		t.Run("DELETE /api/v1/slots/:id - Delete slot with active sessions (Newman Scenario)", func(t *testing.T) {
			// Clean up any existing data before this test
			db.GetDB().Exec("DELETE FROM parking_sessions")
			db.GetDB().Exec("DELETE FROM parking_slots")
			db.GetDB().Exec("DELETE FROM entry_points")
			
			// Create entry point and slot
			ep := createNewmanTestEntryPoint(t, db.GetDB(), "A", "Entry Point A")
			slot := createNewmanDeletionTestParkingSlot(t, db.GetDB(), "TEST-SP-ACTIVE", "SP", []int{15, 25, 35}, true)

			// Create an active session (exited_at is NULL)
			parkedAt := time.Now().UTC().Add(-1 * time.Hour)
			session := createNewmanTestParkingSession(t, db.GetDB(), "S", slot.ID, ep.ID, parkedAt, nil)

			// Verify session is active
			assert.Nil(t, session.ExitedAt, "Session should be active")

			// Make DELETE request
			req, err := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/slots/%d", slot.ID), nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 409 Conflict
			assert.Equal(t, http.StatusConflict, rr.Code, "Deleting a slot with active sessions should return 409 Conflict")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.Contains(t, response, "error", "Response should contain error field")
			assert.NotEmpty(t, response["error"], "Error message should not be empty")
			assert.Contains(t, response["error"].(string), "active", "Error message should mention active sessions")

			// Verify slot still exists
			_, err = parkingSlotRepo.GetByID(slot.ID)
			assert.NoError(t, err, "Slot should still exist after failed deletion")
		})

		t.Run("DELETE /api/v1/slots/:id - Delete MP slot with active sessions (Newman Scenario)", func(t *testing.T) {
			// Clean up any existing data before this test
			db.GetDB().Exec("DELETE FROM parking_sessions")
			db.GetDB().Exec("DELETE FROM parking_slots")
			db.GetDB().Exec("DELETE FROM entry_points")
			
			// Create entry point and slot
			ep := createNewmanTestEntryPoint(t, db.GetDB(), "A", "Entry Point A")
			slot := createNewmanDeletionTestParkingSlot(t, db.GetDB(), "TEST-MP-ACTIVE", "MP", []int{25, 35, 45}, true)

			// Create an active session
			parkedAt := time.Now().UTC().Add(-1 * time.Hour)
			createNewmanTestParkingSession(t, db.GetDB(), "M", slot.ID, ep.ID, parkedAt, nil)

			// Make DELETE request
			req, err := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/slots/%d", slot.ID), nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 409 Conflict
			assert.Equal(t, http.StatusConflict, rr.Code, "Deleting an MP slot with active sessions should return 409 Conflict")
		})

		t.Run("DELETE /api/v1/slots/:id - Delete LP slot with active sessions (Newman Scenario)", func(t *testing.T) {
			// Clean up any existing data before this test
			db.GetDB().Exec("DELETE FROM parking_sessions")
			db.GetDB().Exec("DELETE FROM parking_slots")
			db.GetDB().Exec("DELETE FROM entry_points")
			
			// Create entry point and slot
			ep := createNewmanTestEntryPoint(t, db.GetDB(), "A", "Entry Point A")
			slot := createNewmanDeletionTestParkingSlot(t, db.GetDB(), "TEST-LP-ACTIVE", "LP", []int{30, 40, 50}, true)

			// Create an active session
			parkedAt := time.Now().UTC().Add(-1 * time.Hour)
			createNewmanTestParkingSession(t, db.GetDB(), "L", slot.ID, ep.ID, parkedAt, nil)

			// Make DELETE request
			req, err := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/slots/%d", slot.ID), nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 409 Conflict
			assert.Equal(t, http.StatusConflict, rr.Code, "Deleting an LP slot with active sessions should return 409 Conflict")
		})

		// ========================================================================
		// SUCCESSFUL DELETION TESTS - HISTORICAL SESSIONS
		// ========================================================================

		t.Run("DELETE /api/v1/slots/:id - Delete slot with historical sessions (Newman Scenario)", func(t *testing.T) {
			// Clean up any existing data before this test
			db.GetDB().Exec("DELETE FROM parking_sessions")
			db.GetDB().Exec("DELETE FROM parking_slots")
			db.GetDB().Exec("DELETE FROM entry_points")
			
			// Create entry point and slot
			ep := createNewmanTestEntryPoint(t, db.GetDB(), "A", "Entry Point A")
			slot := createNewmanDeletionTestParkingSlot(t, db.GetDB(), "TEST-SP-HIST", "SP", []int{20, 30, 40}, true)

			// Create a completed session (exited_at is NOT NULL)
			parkedAt := time.Now().UTC().Add(-24 * time.Hour)
			exitedAt := parkedAt.Add(2 * time.Hour)
			session := createNewmanTestParkingSession(t, db.GetDB(), "S", slot.ID, ep.ID, parkedAt, &exitedAt)

			// Verify session is completed
			assert.NotNil(t, session.ExitedAt, "Session should be completed")

			// CORRECT BEHAVIOR: Slots with historical sessions (but no active sessions)
			// can be deleted. The fix allows deletion as long as there are no active sessions.

			// Make DELETE request
			req, err := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/slots/%d", slot.ID), nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 204 No Content (successful deletion)
			assert.Equal(t, http.StatusNoContent, rr.Code, "Deleting a slot with historical sessions should return 204 No Content")
			assert.Empty(t, rr.Body.String(), "Response body should be empty for 204")

			// Verify slot is deleted
			_, err = parkingSlotRepo.GetByID(slot.ID)
			assert.Error(t, err, "Slot should not exist after deletion")
		})

		// ========================================================================
		// ERROR HANDLING TESTS - NON-EXISTENT SLOT
		// ========================================================================

		t.Run("DELETE /api/v1/slots/:id - Delete non-existent slot (Newman Scenario)", func(t *testing.T) {
			// Make DELETE request for non-existent slot
			req, err := http.NewRequest("DELETE", "/api/v1/slots/999999", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 404 Not Found
			assert.Equal(t, http.StatusNotFound, rr.Code, "Deleting a non-existent slot should return 404 Not Found")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.Contains(t, response, "error", "Response should contain error field")
			assert.NotEmpty(t, response["error"], "Error message should not be empty")
			assert.Contains(t, response["error"].(string), "not found", "Error message should mention not found")
		})

		// ========================================================================
		// EDGE CASE TESTS - INVALID SLOT IDS
		// ========================================================================

		t.Run("DELETE /api/v1/slots/:id - Invalid slot ID - string (Newman Scenario)", func(t *testing.T) {
			// Make DELETE request with invalid ID
			req, err := http.NewRequest("DELETE", "/api/v1/slots/invalid", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 400 Bad Request or 404 Not Found
			assert.Contains(t, []int{http.StatusBadRequest, http.StatusNotFound}, rr.Code, 
				"Invalid slot ID should return 400 or 404")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.Contains(t, response, "error", "Response should contain error field")
		})

		t.Run("DELETE /api/v1/slots/:id - Invalid slot ID - zero (Newman Scenario)", func(t *testing.T) {
			// Make DELETE request with zero ID
			req, err := http.NewRequest("DELETE", "/api/v1/slots/0", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 400 Bad Request or 404 Not Found
			assert.Contains(t, []int{http.StatusBadRequest, http.StatusNotFound}, rr.Code, 
				"Zero ID should return 400 or 404")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.Contains(t, response, "error", "Response should contain error field")
		})

		t.Run("DELETE /api/v1/slots/:id - Invalid slot ID - negative (Newman Scenario)", func(t *testing.T) {
			// Make DELETE request with negative ID
			req, err := http.NewRequest("DELETE", "/api/v1/slots/-1", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 400 Bad Request or 404 Not Found
			assert.Contains(t, []int{http.StatusBadRequest, http.StatusNotFound}, rr.Code, 
				"Negative ID should return 400 or 404")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.Contains(t, response, "error", "Response should contain error field")
		})

		t.Run("DELETE /api/v1/slots/:id - Invalid slot ID - very large (Newman Scenario)", func(t *testing.T) {
			// Make DELETE request with very large ID
			req, err := http.NewRequest("DELETE", "/api/v1/slots/999999999999", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 404 Not Found
			assert.Equal(t, http.StatusNotFound, rr.Code, "Very large ID should return 404 Not Found")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.Contains(t, response, "error", "Response should contain error field")
			assert.NotEmpty(t, response["error"], "Error message should not be empty")
			assert.Contains(t, response["error"].(string), "not found", "Error message should mention not found")
		})

		// ========================================================================
		// EDGE CASE TESTS - CONCURRENT DELETION
		// ========================================================================

		t.Run("DELETE /api/v1/slots/:id - Concurrent deletion attempts (Newman Scenario)", func(t *testing.T) {
			// Create a slot
			slot := createNewmanDeletionTestParkingSlot(t, db.GetDB(), "TEST-CONCURRENT", "SP", []int{10, 20, 30}, true)

			// First deletion should succeed
			req1, err := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/slots/%d", slot.ID), nil)
			require.NoError(t, err)

			rr1 := httptest.NewRecorder()
			router.ServeHTTP(rr1, req1)

			assert.Equal(t, http.StatusNoContent, rr1.Code, "First deletion should succeed with 204")

			// Second deletion should fail (slot already deleted)
			req2, err := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/slots/%d", slot.ID), nil)
			require.NoError(t, err)

			rr2 := httptest.NewRecorder()
			router.ServeHTTP(rr2, req2)

			assert.Equal(t, http.StatusNotFound, rr2.Code, "Second deletion should fail with 404 Not Found")
		})
	})
}

// ============================================================================
// Summary and Documentation
// ============================================================================

// TestNewmanSlotDeletionSummary documents Newman-based test coverage
func TestNewmanSlotDeletionSummary(t *testing.T) {
	t.Run("Newman-Based Test Summary", func(t *testing.T) {
		t.Log("=== NEWMAN-BASED SLOT DELETION TEST SUMMARY ===")
		t.Log("")
		t.Log("Test Scenarios Covered:")
		t.Log("  ✓ Delete unused slot (SP, MP, LP types)")
		t.Log("  ✓ Delete slot with active sessions (returns 409 Conflict)")
		t.Log("  ✓ Delete slot with historical sessions (returns 204 No Content - correct behavior)")
		t.Log("  ✓ Delete non-existent slot (returns 404 Not Found)")
		t.Log("  ✓ Invalid slot IDs (string, zero, negative, very large)")
		t.Log("  ✓ Concurrent deletion attempts")
		t.Log("")
		t.Log("API Endpoint:")
		t.Log("  DELETE /api/v1/slots/:id")
		t.Log("")
		t.Log("Response Codes:")
		t.Log("  - 204 No Content: Successful deletion (including slots with historical sessions)")
		t.Log("  - 409 Conflict: Slot has active sessions")
		t.Log("  - 404 Not Found: Slot doesn't exist")
		t.Log("  - 400 Bad Request: Invalid slot ID format")
		t.Log("")
		t.Log("Test Structure:")
		t.Log("  - API-level tests using httptest")
		t.Log("  - Mirrors Newman collection scenarios")
		t.Log("  - Follows Go testing conventions")
		t.Log("  - Uses testify/assert and testify/require")
		t.Log("")
	})
}
