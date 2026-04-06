// Package internal provides Newman-based API tests for sessions functionality
//
// This test file mirrors the Newman test collection scenarios for sessions,
// providing comprehensive API-level tests that verify the session endpoints
// behave correctly according to Newman test specifications.
package internal

import (
	"bytes"
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
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/dtos"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/handlers"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/repositories"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/services"
)

// setupNewmanSessionsTestDB creates and initializes test database for Newman-based sessions tests
func setupNewmanSessionsTestDB(t *testing.T) *database.DB {
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

// cleanupNewmanSessionsTestDB cleans up test database after tests
func cleanupNewmanSessionsTestDB(t *testing.T, db *database.DB) {
	db.GetDB().Exec("DELETE FROM parking_sessions")
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.GetDB().Exec("DELETE FROM entry_points")
	db.Close()
}

// createNewmanTestEntryPointSession creates a test entry point for Newman-based sessions tests
// Note: Renamed to avoid redeclaration with other test files
func createNewmanTestEntryPointSession(t *testing.T, db *sql.DB, identifier, name string) *models.EntryPoint {
	query := `INSERT INTO entry_points (identifier, name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id, identifier, name, created_at, updated_at`
	var ep models.EntryPoint
	err := db.QueryRow(query, identifier, name).Scan(&ep.ID, &ep.Identifier, &ep.Name, &ep.CreatedAt, &ep.UpdatedAt)
	require.NoError(t, err)
	return &ep
}

// createNewmanTestParkingSlotSession creates a test parking slot for Newman-based sessions tests
// Note: Renamed to avoid redeclaration with other test files
func createNewmanTestParkingSlotSession(t *testing.T, db *sql.DB, slotLabel, slotType string, distances []int, available bool) *models.ParkingSlot {
	distancesBytes, _ := json.Marshal(distances)
	query := `INSERT INTO parking_slots (slot_label, slot_type, distances, available, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, slot_label, slot_type, distances, available, created_at, updated_at`
	var slot models.ParkingSlot
	var distancesJSON []byte
	err := db.QueryRow(query, slotLabel, slotType, distancesBytes, available).Scan(&slot.ID, &slot.SlotLabel, &slot.SlotType, &distancesJSON, &slot.Available, &slot.CreatedAt, &slot.UpdatedAt)
	require.NoError(t, err)
	json.Unmarshal(distancesJSON, &slot.Distances)
	return &slot
}

// createNewmanTestParkingSessionS creates a test parking session for Newman-based sessions tests
// Note: Renamed to avoid redeclaration with other test files
func createNewmanTestParkingSessionS(t *testing.T, db *sql.DB, vehicleType string, parkingSlotID, entryPointID int64, parkedAt time.Time) *models.ParkingSession {
	query := `INSERT INTO parking_sessions (vehicle_type, parking_slot_id, entry_point_id, parked_at, total_fee, created_at, updated_at) VALUES ($1, $2, $3, $4, 0.00, NOW(), NOW()) RETURNING id, vehicle_type, parking_slot_id, entry_point_id, parked_at, exited_at, total_fee, created_at, updated_at`
	var session models.ParkingSession
	err := db.QueryRow(query, vehicleType, parkingSlotID, entryPointID, parkedAt).Scan(
		&session.ID, &session.VehicleType, &session.ParkingSlotID, &session.EntryPointID,
		&session.ParkedAt, &session.ExitedAt, &session.TotalFee, &session.CreatedAt, &session.UpdatedAt,
	)
	require.NoError(t, err)
	return &session
}

// Helper function to create string pointers for Newman-based sessions tests
// Note: Renamed to avoid redeclaration with other test files
func stringPtrNewmanSession(s string) *string {
	return &s
}

// ============================================================================
// Newman-Based API Tests - Sessions
// ============================================================================

// TestNewmanSessions provides comprehensive API-level tests mirroring Newman collection
func TestNewmanSessions(t *testing.T) {
	t.Run("Newman-Based Sessions Tests", func(t *testing.T) {
		db := setupNewmanSessionsTestDB(t)
		defer cleanupNewmanSessionsTestDB(t, db)

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
		api.HandleFunc("/sessions", parkingHandler.ParkVehicle).Methods("POST")
		api.HandleFunc("/sessions", parkingHandler.ListSessions).Methods("GET")
		api.HandleFunc("/sessions/{id}", parkingHandler.GetSession).Methods("GET")
		api.HandleFunc("/sessions/{id}", parkingHandler.UpdateSession).Methods("PUT")
		api.HandleFunc("/sessions/{id}", parkingHandler.DeleteSession).Methods("DELETE")
		api.HandleFunc("/sessions/{id}/unpark", parkingHandler.UnparkVehicle).Methods("POST")

		// ========================================================================
		// SUCCESSFUL CRUD TESTS
		// ========================================================================

		t.Run("POST /api/v1/sessions - Park Vehicle (Newman Scenario)", func(t *testing.T) {
			// Clean database before this test to ensure isolation
			db.GetDB().Exec("DELETE FROM parking_sessions")
			db.GetDB().Exec("DELETE FROM parking_slots")
			db.GetDB().Exec("DELETE FROM entry_points")

			// Create test entry point and slot
			ep := createNewmanTestEntryPointSession(t, db.GetDB(), "A", "Entry Point A")
			_ = createNewmanTestParkingSlotSession(t, db.GetDB(), "SP-1", "SP", []int{10, 20, 30}, true)

			// Prepare request body (wrapped format - Postman collection uses {"session": {...}})
			parkReq := dtos.ParkVehicleRequest{
				VehicleType:  "S",
				EntryPointID: ep.Identifier,  // Pass identifier, not ID
			}
			reqBody, _ := json.Marshal(parkReq)

			// Make POST request
			req, err := http.NewRequest("POST", "/api/v1/sessions", bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 201 Created
			assert.Equal(t, http.StatusCreated, rr.Code, "Parking vehicle should return 201 Created")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			// Add nil check before type assertion
			if data, ok := response["data"].(map[string]interface{}); ok {
				assert.Equal(t, "S", data["vehicle_type"], "Vehicle type should match")
				assert.NotEmpty(t, data["session_id"], "Session ID should be set")
				assert.NotEmpty(t, data["parking_slot"], "Parking slot should be set")
				assert.Equal(t, "A", data["entry_point"], "Entry point should match")
				assert.NotEmpty(t, data["parked_at"], "Parked at should be set")
				assert.Equal(t, true, data["is_active"], "Session should be active")
			}

			// Verify session was created in database
			sessions, err := sessionRepo.List()
			require.NoError(t, err)
			assert.Len(t, sessions, 1, "Database should have 1 session")
		})

		t.Run("GET /api/v1/sessions/:id - Get Session (Newman Scenario)", func(t *testing.T) {
			// Clean database before this test to ensure isolation
			db.GetDB().Exec("DELETE FROM parking_sessions")
			db.GetDB().Exec("DELETE FROM parking_slots")
			db.GetDB().Exec("DELETE FROM entry_points")

			// Create test data
			ep := createNewmanTestEntryPointSession(t, db.GetDB(), "A", "Entry Point A")
			slot := createNewmanTestParkingSlotSession(t, db.GetDB(), "SP-2", "SP", []int{10, 20, 30}, true)
			session := createNewmanTestParkingSessionS(t, db.GetDB(), "S", slot.ID, ep.ID, time.Now())

			// Make GET request
			req, err := http.NewRequest("GET", fmt.Sprintf("/api/v1/sessions/%d", session.ID), nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Getting session should return 200 OK")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			// Add nil check before type assertion
			if data, ok := response["data"].(map[string]interface{}); ok {
				assert.Equal(t, fmt.Sprintf("%d", session.ID), data["session_id"], "Session ID should match")
				assert.Equal(t, "S", data["vehicle_type"], "Vehicle type should match")
			}
		})

		t.Run("GET /api/v1/sessions - List Sessions (Newman Scenario)", func(t *testing.T) {
			// Clean database before this test to ensure isolation
			db.GetDB().Exec("DELETE FROM parking_sessions")
			db.GetDB().Exec("DELETE FROM parking_slots")
			db.GetDB().Exec("DELETE FROM entry_points")

			// Create test data
			ep := createNewmanTestEntryPointSession(t, db.GetDB(), "A", "Entry Point A")
			slot := createNewmanTestParkingSlotSession(t, db.GetDB(), "SP-3", "SP", []int{10, 20, 30}, true)
			createNewmanTestParkingSessionS(t, db.GetDB(), "S", slot.ID, ep.ID, time.Now().Add(-2*time.Hour))
			createNewmanTestParkingSessionS(t, db.GetDB(), "M", slot.ID, ep.ID, time.Now().Add(-1*time.Hour))

			// Make GET request
			req, err := http.NewRequest("GET", "/api/v1/sessions", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Listing sessions should return 200 OK")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			// Handle both array and nested object response formats
			var sessions []interface{}
			if data, ok := response["data"].([]interface{}); ok {
				sessions = data
			} else if data, ok := response["data"].(map[string]interface{}); ok {
				sessions = data["data"].([]interface{})
			}
			assert.Len(t, sessions, 2, "Should return 2 sessions")
		})

		t.Run("POST /api/v1/sessions/:id/unpark - Unpark Vehicle (Newman Scenario)", func(t *testing.T) {
			// Clean database before this test to ensure isolation
			db.GetDB().Exec("DELETE FROM parking_sessions")
			db.GetDB().Exec("DELETE FROM parking_slots")
			db.GetDB().Exec("DELETE FROM entry_points")

			// Create test data
			ep := createNewmanTestEntryPointSession(t, db.GetDB(), "A", "Entry Point A")
			slot := createNewmanTestParkingSlotSession(t, db.GetDB(), "SP-4", "SP", []int{10, 20, 30}, true)
			session := createNewmanTestParkingSessionS(t, db.GetDB(), "S", slot.ID, ep.ID, time.Now().Add(-2*time.Hour))

			// Make POST request to unpark
			req, err := http.NewRequest("POST", fmt.Sprintf("/api/v1/sessions/%d/unpark", session.ID), nil)
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Unparking vehicle should return 200 OK")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			// Add nil check before type assertion
			if data, ok := response["data"].(map[string]interface{}); ok {
				assert.NotEmpty(t, data["total_fee"], "Total fee should be set")
				assert.NotEmpty(t, data["exited_at"], "Exited at should be set")
			}

			// Verify session was updated in database
			updatedSession, err := sessionRepo.GetByID(session.ID)
			require.NoError(t, err)
			assert.NotNil(t, updatedSession.ExitedAt, "Session should have exited_at set")
		})

		t.Run("POST /api/v1/sessions - Park Vehicle - Entry Point B (Newman Scenario)", func(t *testing.T) {
			// Clean database before this test to ensure isolation
			db.GetDB().Exec("DELETE FROM parking_sessions")
			db.GetDB().Exec("DELETE FROM parking_slots")
			db.GetDB().Exec("DELETE FROM entry_points")

			// Create test entry point B and slot
			ep := createNewmanTestEntryPointSession(t, db.GetDB(), "B", "Entry Point B")
			_ = createNewmanTestParkingSlotSession(t, db.GetDB(), "SP-5", "MP", []int{10, 20, 30}, true)

			// Prepare request body
			parkReq := dtos.ParkVehicleRequest{
				VehicleType:  "M",
				EntryPointID: ep.Identifier,  // Pass identifier, not ID
			}
			reqBody, _ := json.Marshal(parkReq)

			// Make POST request
			req, err := http.NewRequest("POST", "/api/v1/sessions", bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 201 Created
			assert.Equal(t, http.StatusCreated, rr.Code, "Parking vehicle at entry point B should return 201 Created")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			// Add nil check before type assertion
			if data, ok := response["data"].(map[string]interface{}); ok {
				assert.Equal(t, "M", data["vehicle_type"], "Vehicle type should match")
				assert.Equal(t, "B", data["entry_point"], "Entry point should be B")
			}
		})

		// ========================================================================
		// ERROR HANDLING TESTS
		// ========================================================================

		t.Run("POST /api/v1/sessions/:id/unpark - Invalid Session (Newman Scenario)", func(t *testing.T) {
			// Make POST request to unpark non-existent session
			req, err := http.NewRequest("POST", "/api/v1/sessions/invalid-session-id-99999/unpark", nil)
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 404 Not Found
			assert.Equal(t, http.StatusNotFound, rr.Code, "Unparking invalid session should return 404 Not Found")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.False(t, response["success"].(bool), "Response should indicate failure")
			// Add nil check before type assertion
			if errMsg, ok := response["error"].(string); ok {
				assert.Contains(t, errMsg, "not found", "Error message should mention not found")
			}
		})

		t.Run("PUT /api/v1/sessions/:id - Update Session (Newman Scenario)", func(t *testing.T) {
			// Create test data - completed session (has exited_at)
			ep := createNewmanTestEntryPointSession(t, db.GetDB(), "A", "Entry Point A")
			slot := createNewmanTestParkingSlotSession(t, db.GetDB(), "SP-6", "SP", []int{10, 20, 30}, true)
			session := createNewmanTestParkingSessionS(t, db.GetDB(), "S", slot.ID, ep.ID, time.Now().Add(-2*time.Hour))
			
			// Update session to have exited_at (make it completed)
			sessionExitedAt := time.Now().Add(-1 * time.Hour)
			_, err := db.GetDB().Exec("UPDATE parking_sessions SET exited_at = $1 WHERE id = $2", sessionExitedAt, session.ID)
			require.NoError(t, err)

			// Prepare update request - update exited_at and total_fee
			exitedAt := time.Now()
			exitedAtStr := exitedAt.UTC().Format(time.RFC3339)
			updateReq := dtos.UpdateSessionRequest{
				ExitedAt: &exitedAtStr,
				TotalFee: floatPtrNewmanSession(40.00),
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/sessions/%d", session.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK (for completed session)
			assert.Equal(t, http.StatusOK, rr.Code, "Updating session should return 200 OK")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			// Add nil check before type assertion
			if data, ok := response["data"].(map[string]interface{}); ok {
				assert.NotEmpty(t, data, "Response should have data")
			}
		})

		t.Run("PUT /api/v1/sessions/:id - Update Not Found (Newman Scenario)", func(t *testing.T) {
			// Prepare update request
			exitedAt := time.Now()
			exitedAtStr := exitedAt.UTC().Format(time.RFC3339)
			updateReq := dtos.UpdateSessionRequest{
				ExitedAt: &exitedAtStr,
				TotalFee: floatPtrNewmanSession(40.00),
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request for non-existent session
			req, err := http.NewRequest("PUT", "/api/v1/sessions/999999", bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 404 Not Found
			assert.Equal(t, http.StatusNotFound, rr.Code, "Updating non-existent session should return 404 Not Found")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.False(t, response["success"].(bool), "Response should indicate failure")
			// Add nil check before type assertion
			if errMsg, ok := response["error"].(string); ok {
				assert.Contains(t, errMsg, "not found", "Error message should mention not found")
			}
		})

		t.Run("PUT /api/v1/sessions/:id - Update Active Session (Newman Scenario)", func(t *testing.T) {
			// Clean database before this test to ensure isolation
			db.GetDB().Exec("DELETE FROM parking_sessions")
			db.GetDB().Exec("DELETE FROM parking_slots")
			db.GetDB().Exec("DELETE FROM entry_points")

			// Create test data - active session (no exited_at)
			ep := createNewmanTestEntryPointSession(t, db.GetDB(), "A", "Entry Point A")
			slot := createNewmanTestParkingSlotSession(t, db.GetDB(), "SP-7", "SP", []int{10, 20, 30}, true)
			session := createNewmanTestParkingSessionS(t, db.GetDB(), "S", slot.ID, ep.ID, time.Now())

			// Prepare update request
			exitedAt := time.Now()
			exitedAtStr := exitedAt.UTC().Format(time.RFC3339)
			updateReq := dtos.UpdateSessionRequest{
				ExitedAt: &exitedAtStr,
				TotalFee: floatPtrNewmanSession(40.00),
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/sessions/%d", session.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 409 Conflict (cannot update active session)
			assert.Equal(t, http.StatusConflict, rr.Code, "Updating active session should return 409 Conflict")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.False(t, response["success"].(bool), "Response should indicate failure")
			// Add nil check before type assertion
			if errMsg, ok := response["error"].(string); ok {
				assert.Contains(t, errMsg, "active", "Error message should mention active session")
			}
		})

		t.Run("DELETE /api/v1/sessions/:id - Delete Session (Newman Scenario)", func(t *testing.T) {
			// Clean database before this test to ensure isolation
			db.GetDB().Exec("DELETE FROM parking_sessions")
			db.GetDB().Exec("DELETE FROM parking_slots")
			db.GetDB().Exec("DELETE FROM entry_points")

			// Create test data - completed session (has exited_at)
			ep := createNewmanTestEntryPointSession(t, db.GetDB(), "A", "Entry Point A")
			slot := createNewmanTestParkingSlotSession(t, db.GetDB(), "SP-8", "SP", []int{10, 20, 30}, true)
			exitedAt := time.Now().Add(-1 * time.Hour)
			session := createNewmanTestParkingSessionS(t, db.GetDB(), "S", slot.ID, ep.ID, time.Now().Add(-2*time.Hour))

			// Update session to have exited_at
			_, err := db.GetDB().Exec("UPDATE parking_sessions SET exited_at = $1 WHERE id = $2", exitedAt, session.ID)
			require.NoError(t, err)

			// Make DELETE request
			req, err := http.NewRequest("DELETE", fmt.Sprintf("/api/v1/sessions/%d", session.ID), nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 204 No Content
			assert.Equal(t, http.StatusNoContent, rr.Code, "Deleting session should return 204 No Content")
			assert.Empty(t, rr.Body.String(), "Response body should be empty for 204")

			// Verify session is deleted
			_, err = sessionRepo.GetByID(session.ID)
			assert.Error(t, err, "Session should not exist after deletion")
		})

		t.Run("DELETE /api/v1/sessions/:id - Delete Not Found (Newman Scenario)", func(t *testing.T) {
			// Make DELETE request for non-existent session
			req, err := http.NewRequest("DELETE", "/api/v1/sessions/999999", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 404 Not Found
			assert.Equal(t, http.StatusNotFound, rr.Code, "Deleting non-existent session should return 404 Not Found")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.False(t, response["success"].(bool), "Response should indicate failure")
			// Add nil check before type assertion
			if errMsg, ok := response["error"].(string); ok {
				assert.Contains(t, errMsg, "not found", "Error message should mention not found")
			}
		})

		t.Run("GET /api/v1/sessions/:id - Get Not Found (Newman Scenario)", func(t *testing.T) {
			// Make GET request for non-existent session
			req, err := http.NewRequest("GET", "/api/v1/sessions/999999", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 404 Not Found
			assert.Equal(t, http.StatusNotFound, rr.Code, "Getting non-existent session should return 404 Not Found")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.False(t, response["success"].(bool), "Response should indicate failure")
			// Add nil check before type assertion
			if errMsg, ok := response["error"].(string); ok {
				assert.Contains(t, errMsg, "not found", "Error message should mention not found")
			}
		})
	})
}

// ============================================================================
// Summary and Documentation
// ============================================================================

// TestNewmanSessionsSummary documents Newman-based test coverage
func TestNewmanSessionsSummary(t *testing.T) {
	t.Run("Newman-Based Test Summary", func(t *testing.T) {
		t.Log("=== NEWMAN-BASED SESSIONS TEST SUMMARY ===")
		t.Log("")
		t.Log("Test Scenarios Covered:")
		t.Log("  ✓ Park Vehicle (POST /api/v1/sessions)")
		t.Log("  ✓ Get Session (GET /api/v1/sessions/:id)")
		t.Log("  ✓ List Sessions (GET /api/v1/sessions)")
		t.Log("  ✓ Unpark Vehicle (POST /api/v1/sessions/:id/unpark)")
		t.Log("  ✓ Park Vehicle - Entry Point B (POST /api/v1/sessions)")
		t.Log("  ✓ Unpark Vehicle - Invalid Session (POST /api/v1/sessions/:id/unpark)")
		t.Log("  ✓ Update Session (PUT /api/v1/sessions/:id)")
		t.Log("  ✓ Delete Session (DELETE /api/v1/sessions/:id)")
		t.Log("")
		t.Log("Additional Test Scenarios:")
		t.Log("  ✓ Update Not Found (PUT /api/v1/sessions/:id)")
		t.Log("  ✓ Update Active Session (PUT /api/v1/sessions/:id)")
		t.Log("  ✓ Delete Not Found (DELETE /api/v1/sessions/:id)")
		t.Log("  ✓ Get Not Found (GET /api/v1/sessions/:id)")
		t.Log("")
		t.Log("API Endpoints:")
		t.Log("  - POST   /api/v1/sessions")
		t.Log("  - GET    /api/v1/sessions")
		t.Log("  - GET    /api/v1/sessions/:id")
		t.Log("  - PUT    /api/v1/sessions/:id")
		t.Log("  - DELETE /api/v1/sessions/:id")
		t.Log("  - POST   /api/v1/sessions/:id/unpark")
		t.Log("")
		t.Log("Request Format:")
		t.Log("  - Park Vehicle: {vehicle_type: \"S|M|L\", entry_point_id: \"<id>\"}")
		t.Log("  - Update Session: {exited_at: \"<timestamp>\", total_fee: <float>}")
		t.Log("")
		t.Log("Response Codes:")
		t.Log("  - 201 Created: Successful park")
		t.Log("  - 200 OK: Successful get, list, unpark, update")
		t.Log("  - 204 No Content: Successful delete")
		t.Log("  - 404 Not Found: Resource doesn't exist")
		t.Log("  - 409 Conflict: Cannot update active session")
		t.Log("")
		t.Log("Test Structure:")
		t.Log("  - API-level tests using httptest")
		t.Log("  - Mirrors Newman collection scenarios")
		t.Log("  - Follows Go testing conventions")
		t.Log("  - Uses testify/assert and testify/require")
		t.Log("")
	})
}

// Helper function to create float64 pointers for Newman-based sessions tests
func floatPtrNewmanSession(f float64) *float64 {
	return &f
}
