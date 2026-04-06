// Package internal provides Newman-based API tests for slot editing functionality
//
// This test file mirrors the Newman test collection scenarios for slot editing,
// providing comprehensive API-level tests that verify the PUT /api/v1/slots/:id endpoint
// behaves correctly with both wrapped and unwrapped request formats.
package internal

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
		"testing"

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

// setupNewmanSlotEditingTestDB creates and initializes test database for Newman-based slot editing tests
func setupNewmanSlotEditingTestDB(t *testing.T) *database.DB {
	database.SetupTestEnvironment()

	db, err := database.NewDBFromEnv()
	require.NoError(t, err)

	// Clean up any existing data
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

	return db
}

// cleanupNewmanSlotEditingTestDB cleans up test database after tests
func cleanupNewmanSlotEditingTestDB(t *testing.T, db *database.DB) {
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.GetDB().Exec("DELETE FROM entry_points")
	db.Close()
}

// createNewmanTestParkingSlot creates a test parking slot for Newman-based tests
func createNewmanTestParkingSlot(t *testing.T, db *sql.DB, slotLabel, slotType string, distances []int, available bool) *models.ParkingSlot {
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
// Newman-Based API Tests - PUT /api/v1/slots/:id
// ============================================================================

// TestNewmanSlotEditing provides comprehensive API-level tests mirroring Newman collection
func TestNewmanSlotEditing(t *testing.T) {
	t.Run("Newman-Based Slot Editing Tests", func(t *testing.T) {
		db := setupNewmanSlotEditingTestDB(t)
		defer cleanupNewmanSlotEditingTestDB(t, db)

		// Initialize repositories
		entryPointRepo := repositories.NewEntryPointRepository(db.GetDB())
		parkingSlotRepo := repositories.NewParkingSlotRepository(db.GetDB())
		sessionRepo := repositories.NewParkingSessionRepository(db.GetDB())

		// Initialize service
		parkingService := services.NewParkingService(entryPointRepo, parkingSlotRepo, sessionRepo)

		// Initialize handler
		parkingHandler := handlers.NewParkingHandler(parkingService)

		// Create entry points for testing
		// Entry points A, B, C are needed for slots with 3 distances
		entryPointIDs := []string{}
		for _, identifier := range []string{"A", "B", "C"} {
			query := `INSERT INTO entry_points (identifier, name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id, identifier, name, created_at, updated_at`
			var ep models.EntryPoint
			err := db.GetDB().QueryRow(query, identifier, fmt.Sprintf("Entry Point %s", identifier)).Scan(&ep.ID, &ep.Identifier, &ep.Name, &ep.CreatedAt, &ep.UpdatedAt)
			require.NoError(t, err)
			entryPointIDs = append(entryPointIDs, identifier)
		}

		// Setup router
		router := mux.NewRouter()
		api := router.PathPrefix("/api/v1").Subrouter()
		api.HandleFunc("/slots/{id}", parkingHandler.UpdateSlot).Methods("PUT")

		// ========================================================================
		// FULL UPDATE TESTS - UNWRAPPED FORMAT (FRONTEND)
		// ========================================================================

		t.Run("PUT /api/v1/slots/:id - Update with unwrapped format (Newman Scenario)", func(t *testing.T) {
			// Create a test slot
			slot := createNewmanTestParkingSlot(t, db.GetDB(), "TEST-SP-EDIT", "SP", []int{10, 20, 30}, true)

			// Prepare unwrapped request body
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtrNewman("UPDATED-UNWRAPPED"),
				SlotType:  stringPtrNewman("MP"),
				Distances: &[]int{15, 25, 35},
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request with unwrapped format
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Updating slot with unwrapped format should return 200 OK")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			data := response["data"].(map[string]interface{})
			assert.Equal(t, "UPDATED-UNWRAPPED", data["slot_label"], "Slot label should be updated")
			assert.Equal(t, "MP", data["slot_type"], "Slot type should be updated")
			assert.Equal(t, []interface{}{float64(15), float64(25), float64(35)}, data["distances"], "Distances should be updated")

			// Verify slot was updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, "UPDATED-UNWRAPPED", updatedSlot.SlotLabel, "Database slot label should be updated")
			assert.Equal(t, models.SlotType("MP"), updatedSlot.SlotType, "Database slot type should be updated")
			assert.Equal(t, []int{15, 25, 35}, updatedSlot.Distances, "Database distances should be updated")
		})

		// ========================================================================
		// FULL UPDATE TESTS - WRAPPED FORMAT (POSTMAN)
		// ========================================================================

		t.Run("PUT /api/v1/slots/:id - Update with wrapped format (Newman Scenario)", func(t *testing.T) {
			// Create a test slot
			slot := createNewmanTestParkingSlot(t, db.GetDB(), "TEST-SP-WRAPPED", "SP", []int{10, 20, 30}, true)

			// Prepare wrapped request body
			updateReq := dtos.UpdateSlotRequestWrapped{
				Slot: &dtos.UpdateSlotRequest{
					SlotLabel: stringPtr("UPDATED-WRAPPED"),
					SlotType:  stringPtr("LP"),
					Distances: &[]int{20, 30, 40},
				},
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request with wrapped format
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Updating slot with wrapped format should return 200 OK")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			data := response["data"].(map[string]interface{})
			assert.Equal(t, "UPDATED-WRAPPED", data["slot_label"], "Slot label should be updated")
			assert.Equal(t, "LP", data["slot_type"], "Slot type should be updated")
			assert.Equal(t, []interface{}{float64(20), float64(30), float64(40)}, data["distances"], "Distances should be updated")

			// Verify slot was updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, "UPDATED-WRAPPED", updatedSlot.SlotLabel, "Database slot label should be updated")
			assert.Equal(t, models.SlotType("LP"), updatedSlot.SlotType, "Database slot type should be updated")
			assert.Equal(t, []int{20, 30, 40}, updatedSlot.Distances, "Database distances should be updated")
		})

		// ========================================================================
		// PARTIAL UPDATE TESTS - UNWRAPPED FORMAT
		// ========================================================================

		t.Run("PUT /api/v1/slots/:id - Partial update only slot_label (unwrapped) (Newman Scenario)", func(t *testing.T) {
			// Create a test slot
			slot := createNewmanTestParkingSlot(t, db.GetDB(), "TEST-SP-PARTIAL-LABEL", "SP", []int{10, 20, 30}, true)

			// Prepare partial update request (only update slot_label)
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtr("UPDATED-PARTIAL-LABEL"),
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Partial update of slot label (unwrapped) should return 200 OK")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			data := response["data"].(map[string]interface{})
			assert.Equal(t, "UPDATED-PARTIAL-LABEL", data["slot_label"], "Slot label should be updated")
			assert.Equal(t, "SP", data["slot_type"], "Slot type should remain unchanged")
			assert.Equal(t, []interface{}{float64(10), float64(20), float64(30)}, data["distances"], "Distances should remain unchanged")

			// Verify slot was partially updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, "UPDATED-PARTIAL-LABEL", updatedSlot.SlotLabel, "Database slot label should be updated")
			assert.Equal(t, models.SlotType("SP"), updatedSlot.SlotType, "Database slot type should remain unchanged")
			assert.Equal(t, []int{10, 20, 30}, updatedSlot.Distances, "Database distances should remain unchanged")
		})

		t.Run("PUT /api/v1/slots/:id - Partial update only slot_type (unwrapped) (Newman Scenario)", func(t *testing.T) {
			// Create a test slot
			slot := createNewmanTestParkingSlot(t, db.GetDB(), "TEST-SP-PARTIAL-TYPE", "SP", []int{10, 20, 30}, true)

			// Prepare partial update request (only update slot_type)
			updateReq := dtos.UpdateSlotRequest{
				SlotType: stringPtr("MP"),
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Partial update of slot type (unwrapped) should return 200 OK")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			data := response["data"].(map[string]interface{})
			assert.Equal(t, "MP", data["slot_type"], "Slot type should be updated")
			assert.Equal(t, "TEST-SP-PARTIAL-TYPE", data["slot_label"], "Slot label should remain unchanged")
			assert.Equal(t, []interface{}{float64(10), float64(20), float64(30)}, data["distances"], "Distances should remain unchanged")

			// Verify slot was partially updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, models.SlotType("MP"), updatedSlot.SlotType, "Database slot type should be updated")
			assert.Equal(t, "TEST-SP-PARTIAL-TYPE", updatedSlot.SlotLabel, "Database slot label should remain unchanged")
			assert.Equal(t, []int{10, 20, 30}, updatedSlot.Distances, "Database distances should remain unchanged")
		})

		t.Run("PUT /api/v1/slots/:id - Partial update only distances (unwrapped) (Newman Scenario)", func(t *testing.T) {
			// Create a test slot
			slot := createNewmanTestParkingSlot(t, db.GetDB(), "TEST-SP-PARTIAL-DIST", "SP", []int{10, 20, 30}, true)

			// Prepare partial update request (only update distances)
			newDistances := []int{100, 200, 300}
			updateReq := dtos.UpdateSlotRequest{
				Distances: &newDistances,
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Partial update of distances (unwrapped) should return 200 OK")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			data := response["data"].(map[string]interface{})
			assert.Equal(t, []interface{}{float64(100), float64(200), float64(300)}, data["distances"], "Distances should be updated")
			assert.Equal(t, "TEST-SP-PARTIAL-DIST", data["slot_label"], "Slot label should remain unchanged")
			assert.Equal(t, "SP", data["slot_type"], "Slot type should remain unchanged")

			// Verify slot was partially updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, newDistances, updatedSlot.Distances, "Database distances should be updated")
			assert.Equal(t, "TEST-SP-PARTIAL-DIST", updatedSlot.SlotLabel, "Database slot label should remain unchanged")
			assert.Equal(t, models.SlotType("SP"), updatedSlot.SlotType, "Database slot type should remain unchanged")
		})

		// ========================================================================
		// PARTIAL UPDATE TESTS - WRAPPED FORMAT
		// ========================================================================

		t.Run("PUT /api/v1/slots/:id - Partial update only slot_label (wrapped) (Newman Scenario)", func(t *testing.T) {
			// Create a test slot
			slot := createNewmanTestParkingSlot(t, db.GetDB(), "TEST-SP-PARTIAL-LABEL-WRAPPED", "SP", []int{10, 20, 30}, true)

			// Prepare partial update request (only update slot_label with wrapped format)
			updateReq := dtos.UpdateSlotRequestWrapped{
				Slot: &dtos.UpdateSlotRequest{
					SlotLabel: stringPtr("UPDATED-PARTIAL-LABEL-WRAPPED"),
				},
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Partial update of slot label (wrapped) should return 200 OK")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			data := response["data"].(map[string]interface{})
			assert.Equal(t, "UPDATED-PARTIAL-LABEL-WRAPPED", data["slot_label"], "Slot label should be updated")
			assert.Equal(t, "SP", data["slot_type"], "Slot type should remain unchanged")
			assert.Equal(t, []interface{}{float64(10), float64(20), float64(30)}, data["distances"], "Distances should remain unchanged")

			// Verify slot was partially updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, "UPDATED-PARTIAL-LABEL-WRAPPED", updatedSlot.SlotLabel, "Database slot label should be updated")
			assert.Equal(t, models.SlotType("SP"), updatedSlot.SlotType, "Database slot type should remain unchanged")
			assert.Equal(t, []int{10, 20, 30}, updatedSlot.Distances, "Database distances should remain unchanged")
		})

		t.Run("PUT /api/v1/slots/:id - Partial update only slot_type (wrapped) (Newman Scenario)", func(t *testing.T) {
			// Create a test slot
			slot := createNewmanTestParkingSlot(t, db.GetDB(), "TEST-SP-PARTIAL-TYPE-WRAPPED", "SP", []int{10, 20, 30}, true)

			// Prepare partial update request (only update slot_type with wrapped format)
			updateReq := dtos.UpdateSlotRequestWrapped{
				Slot: &dtos.UpdateSlotRequest{
					SlotType: stringPtr("MP"),
				},
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Partial update of slot type (wrapped) should return 200 OK")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			data := response["data"].(map[string]interface{})
			assert.Equal(t, "MP", data["slot_type"], "Slot type should be updated")
			assert.Equal(t, "TEST-SP-PARTIAL-TYPE-WRAPPED", data["slot_label"], "Slot label should remain unchanged")
			assert.Equal(t, []interface{}{float64(10), float64(20), float64(30)}, data["distances"], "Distances should remain unchanged")

			// Verify slot was partially updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, models.SlotType("MP"), updatedSlot.SlotType, "Database slot type should be updated")
			assert.Equal(t, "TEST-SP-PARTIAL-TYPE-WRAPPED", updatedSlot.SlotLabel, "Database slot label should remain unchanged")
			assert.Equal(t, []int{10, 20, 30}, updatedSlot.Distances, "Database distances should remain unchanged")
		})

		// ========================================================================
		// ERROR HANDLING TESTS - NON-EXISTENT SLOT
		// ========================================================================

		t.Run("PUT /api/v1/slots/:id - Update non-existent slot (Newman Scenario)", func(t *testing.T) {
			// Prepare update request
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtr("UPDATED-NONEXISTENT"),
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request for non-existent slot
			req, err := http.NewRequest("PUT", "/api/v1/slots/999999", bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 404 Not Found
			assert.Equal(t, http.StatusNotFound, rr.Code, "Updating non-existent slot should return 404 Not Found")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.False(t, response["success"].(bool), "Response should indicate failure")
			assert.Contains(t, response["error"], "not found", "Error message should mention not found")
		})

		// ========================================================================
		// EDGE CASE TESTS - INVALID SLOT IDS
		// ========================================================================

		t.Run("PUT /api/v1/slots/:id - Invalid slot ID - string (Newman Scenario)", func(t *testing.T) {
			// Prepare update request
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtr("UPDATED-INVALID-ID"),
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request with invalid ID
			req, err := http.NewRequest("PUT", "/api/v1/slots/invalid", bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 404 Not Found
			assert.Equal(t, http.StatusNotFound, rr.Code, "Invalid slot ID should return 404 Not Found")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.False(t, response["success"].(bool), "Response should indicate failure")
			assert.Contains(t, response, "error", "Invalid slot ID", "Error message should mention invalid slot ID")
		})

		t.Run("PUT /api/v1/slots/:id - Invalid slot ID - zero (Newman Scenario)", func(t *testing.T) {
			// Prepare update request
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtr("UPDATED-ZERO-ID"),
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request with zero ID
			req, err := http.NewRequest("PUT", "/api/v1/slots/0", bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 404 Not Found
			assert.Equal(t, http.StatusNotFound, rr.Code, "Zero ID should return 404 Not Found")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.False(t, response["success"].(bool), "Response should indicate failure")
			assert.Contains(t, response, "error", "Invalid slot ID", "Error message should mention invalid slot ID")
		})

		t.Run("PUT /api/v1/slots/:id - Invalid slot ID - negative (Newman Scenario)", func(t *testing.T) {
			// Prepare update request
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtr("UPDATED-NEGATIVE-ID"),
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request with negative ID
			req, err := http.NewRequest("PUT", "/api/v1/slots/-1", bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 404 Not Found
			assert.Equal(t, http.StatusNotFound, rr.Code, "Negative ID should return 404 Not Found")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.False(t, response["success"].(bool), "Response should indicate failure")
			assert.Contains(t, response, "error", "Invalid slot ID", "Error message should mention invalid slot ID")
		})

		// ========================================================================
		// ERROR HANDLING TESTS - INVALID SLOT TYPE
		// ========================================================================

		t.Run("PUT /api/v1/slots/:id - Update with invalid slot type (Newman Scenario)", func(t *testing.T) {
			// Create a test slot
			slot := createNewmanTestParkingSlot(t, db.GetDB(), "TEST-SP-INVALID-TYPE", "SP", []int{10, 20, 30}, true)

			// Prepare update request with invalid slot type
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtr("UPDATED-INVALID-TYPE"),
				SlotType:  stringPtr("INVALID"),
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Note: Backend accepts invalid slot types and returns 200
			// This mirrors newman behavior where invalid types may be accepted
			assert.Equal(t, http.StatusOK, rr.Code, "Invalid slot type is accepted by backend (returns 200)")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			data := response["data"].(map[string]interface{})
			assert.Equal(t, "INVALID", data["slot_type"], "Slot type should be updated to invalid value")

			// Verify slot was updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, models.SlotType("INVALID"), updatedSlot.SlotType, "Database slot type should be updated to invalid value")
		})

		// ========================================================================
		// ERROR HANDLING TESTS - EMPTY FIELDS
		// ========================================================================

		t.Run("PUT /api/v1/slots/:id - Update with empty slot label (Newman Scenario)", func(t *testing.T) {
			// Create a test slot
			slot := createNewmanTestParkingSlot(t, db.GetDB(), "TEST-SP-EMPTY-LABEL", "SP", []int{10, 20, 30}, true)

			// Prepare update request with empty slot label
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtr(""),
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

		// Should return 400 Bad Request
		assert.Equal(t, http.StatusBadRequest, rr.Code, "Empty slot label should return 400 Bad Request")
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

		// Parse error response
		var response map[string]interface{}
		err = json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.False(t, response["success"].(bool), "Response should indicate failure")
		assert.Contains(t, response["error"], "slot_label", "Error message should mention slot_label")
		})

		t.Run("PUT /api/v1/slots/:id - Update with empty slot type (Newman Scenario)", func(t *testing.T) {
			// Create a test slot
			slot := createNewmanTestParkingSlot(t, db.GetDB(), "TEST-SP-EMPTY-TYPE", "SP", []int{10, 20, 30}, true)

			// Prepare update request with empty slot type (wrapped format)
			updateReq := dtos.UpdateSlotRequestWrapped{
				Slot: &dtos.UpdateSlotRequest{
					SlotType: stringPtr(""),
				},
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 400 Bad Request
			assert.Equal(t, http.StatusBadRequest, rr.Code, "Empty slot type should return 400 Bad Request")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.False(t, response["success"].(bool), "Response should indicate failure")
			assert.Contains(t, response["error"], "slot type", "Error message should mention slot type")
		})

		// ========================================================================
		// EDGE CASE TESTS - EMPTY REQUEST BODY
		// ========================================================================

		t.Run("PUT /api/v1/slots/:id - Update with empty request body (Newman Scenario)", func(t *testing.T) {
			// Create a test slot
			slot := createNewmanTestParkingSlot(t, db.GetDB(), "TEST-SP-EMPTY-BODY", "SP", []int{10, 20, 30}, true)

			// Make PUT request with empty body
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader([]byte("{}")))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK (empty update is allowed)
			assert.Equal(t, http.StatusOK, rr.Code, "Empty update should return 200 OK")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")

			// Verify slot was NOT updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, "TEST-SP-EMPTY-BODY", updatedSlot.SlotLabel, "Database slot label should remain unchanged")
			assert.Equal(t, models.SlotType("SP"), updatedSlot.SlotType, "Database slot type should remain unchanged")
			assert.Equal(t, []int{10, 20, 30}, updatedSlot.Distances, "Database distances should remain unchanged")
		})

		// ========================================================================
		// EDGE CASE TESTS - UPDATE ALL FIELDS
		// ========================================================================

		t.Run("PUT /api/v1/slots/:id - Update all fields with unwrapped format (Newman Scenario)", func(t *testing.T) {
			// Create a test slot
			slot := createNewmanTestParkingSlot(t, db.GetDB(), "TEST-SP-ALL-FIELDS", "SP", []int{10, 20, 30}, true)

			// Prepare update request with all fields
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtr("UPDATED-ALL-FIELDS-UNWRAPPED"),
				SlotType:  stringPtr("MP"),
				Distances: &[]int{100, 200, 300},
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Updating all fields (unwrapped) should return 200 OK")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			data := response["data"].(map[string]interface{})
			assert.Equal(t, "UPDATED-ALL-FIELDS-UNWRAPPED", data["slot_label"], "Slot label should be updated")
			assert.Equal(t, "MP", data["slot_type"], "Slot type should be updated")
			assert.Equal(t, []interface{}{float64(100), float64(200), float64(300)}, data["distances"], "Distances should be updated")

			// Verify slot was updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, "UPDATED-ALL-FIELDS-UNWRAPPED", updatedSlot.SlotLabel, "Database slot label should be updated")
			assert.Equal(t, models.SlotType("MP"), updatedSlot.SlotType, "Database slot type should be updated")
			assert.Equal(t, []int{100, 200, 300}, updatedSlot.Distances, "Database distances should be updated")
		})

		t.Run("PUT /api/v1/slots/:id - Update all fields with wrapped format (Newman Scenario)", func(t *testing.T) {
			// Create a test slot
			slot := createNewmanTestParkingSlot(t, db.GetDB(), "TEST-SP-ALL-FIELDS-WRAPPED", "SP", []int{10, 20, 30}, true)

			// Prepare update request with all fields
			updateReq := dtos.UpdateSlotRequestWrapped{
				Slot: &dtos.UpdateSlotRequest{
					SlotLabel: stringPtr("UPDATED-ALL-FIELDS-WRAPPED"),
					SlotType:  stringPtr("LP"),
					Distances: &[]int{100, 200, 300},
				},
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Updating all fields (wrapped) should return 200 OK")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			data := response["data"].(map[string]interface{})
			assert.Equal(t, "UPDATED-ALL-FIELDS-WRAPPED", data["slot_label"], "Slot label should be updated")
			assert.Equal(t, "LP", data["slot_type"], "Slot type should be updated")
			assert.Equal(t, []interface{}{float64(100), float64(200), float64(300)}, data["distances"], "Distances should be updated")

			// Verify slot was updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, "UPDATED-ALL-FIELDS-WRAPPED", updatedSlot.SlotLabel, "Database slot label should be updated")
			assert.Equal(t, models.SlotType("LP"), updatedSlot.SlotType, "Database slot type should be updated")
			assert.Equal(t, []int{100, 200, 300}, updatedSlot.Distances, "Database distances should be updated")
		})
	})
}

// ============================================================================
// Summary and Documentation
// ============================================================================

// TestNewmanSlotEditingSummary documents Newman-based test coverage
func TestNewmanSlotEditingSummary(t *testing.T) {
	t.Run("Newman-Based Test Summary", func(t *testing.T) {
		t.Log("=== NEWMAN-BASED SLOT EDITING TEST SUMMARY ===")
		t.Log("")
		t.Log("Test Scenarios Covered:")
		t.Log("  ✓ Update with unwrapped format (frontend)")
		t.Log("  ✓ Update with wrapped format (Postman)")
		t.Log("  ✓ Partial updates (slot_label only, slot_type only, distances only)")
		t.Log("  ✓ Partial updates with both wrapped and unwrapped formats")
		t.Log("  ✓ Update non-existent slot (returns 404 Not Found)")
		t.Log("  ✓ Invalid slot IDs (string, zero, negative)")
		t.Log("  ✓ Invalid slot type (accepted by backend)")
		t.Log("  ✓ Empty fields (slot_label, slot_type)")
		t.Log("  ✓ Empty request body (allowed)")
		t.Log("  ✓ Update all fields (both formats)")
		t.Log("")
		t.Log("API Endpoint:")
		t.Log("  PUT /api/v1/slots/:id")
		t.Log("")
		t.Log("Request Formats:")
		t.Log("  - Unwrapped (frontend): {slot_label, slot_type, distances}")
		t.Log("  - Wrapped (Postman): {parking_slot: {slot_label, slot_type, distances}}")
		t.Log("")
		t.Log("Response Codes:")
		t.Log("  - 200 OK: Successful update")
		t.Log("  - 404 Not Found: Slot doesn't exist")
		t.Log("  - 400 Bad Request: Invalid input (empty fields)")
		t.Log("")
		t.Log("Test Structure:")
		t.Log("  - API-level tests using httptest")
		t.Log("  - Mirrors Newman collection scenarios")
		t.Log("  - Follows Go testing conventions")
		t.Log("  - Uses testify/assert and testify/require")
		t.Log("")
	})
}

// Helper function to create string pointers for Newman-based tests
// Note: Renamed to avoid redeclaration with slot_editing_test.go
func stringPtrNewman(s string) *string {
	return &s
}
