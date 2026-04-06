// Package internal provides comprehensive tests for slot editing functionality
//
// This test file verifies that the UpdateSlot endpoint accepts both wrapped and unwrapped
// request formats, providing compatibility with both frontend and Postman clients.
package internal

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
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

// setupSlotEditingTestDB creates and initializes test database for slot editing tests
func setupSlotEditingTestDB(t *testing.T) *database.DB {
	// Setup test environment with sensible defaults
	database.SetupTestEnvironment()
	os.Setenv("DATABASE_NAME", "oo_parking_lot_handlers_test")

	db, err := database.NewDBFromEnv()
	require.NoError(t, err)

	// Clean up any existing data to avoid duplicate key violations
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

// cleanupSlotEditingTestDB cleans up test database after tests
func cleanupSlotEditingTestDB(t *testing.T, db *database.DB) {
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.GetDB().Exec("DELETE FROM entry_points")
	db.Close()
}

// createSlotEditingTestParkingSlot creates a test parking slot for slot editing tests
func createSlotEditingTestParkingSlot(t *testing.T, db *sql.DB, slotLabel, slotType string, distances []int, available bool) *models.ParkingSlot {
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
// Handler Level Tests
// ============================================================================

// TestParkingSlotHandler_UpdateSlot tests handler-level slot editing
func TestParkingSlotHandler_UpdateSlot(t *testing.T) {
	t.Run("Handler Level Tests", func(t *testing.T) {
		db := setupSlotEditingTestDB(t)
		defer cleanupSlotEditingTestDB(t, db)

		// Initialize repositories
		entryPointRepo := repositories.NewEntryPointRepository(db.GetDB())
		parkingSlotRepo := repositories.NewParkingSlotRepository(db.GetDB())
		sessionRepo := repositories.NewParkingSessionRepository(db.GetDB())

		// Initialize service
		parkingService := services.NewParkingService(entryPointRepo, parkingSlotRepo, sessionRepo)

		// Initialize handler
		parkingHandler := handlers.NewParkingHandler(parkingService)

		// Create entry points for testing (needed for distances validation)
		for _, identifier := range []string{"A", "B", "C"} {
			query := `INSERT INTO entry_points (identifier, name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())`
			_, err := db.GetDB().Exec(query, identifier, fmt.Sprintf("Entry Point %s", identifier))
			require.NoError(t, err)
		}

		// Setup router
		router := mux.NewRouter()
		api := router.PathPrefix("/api/v1").Subrouter()
		api.HandleFunc("/slots/{id}", parkingHandler.UpdateSlot).Methods("PUT")

		t.Run("PUT /api/v1/slots/{id} - Update slot with unwrapped format (frontend)", func(t *testing.T) {
			// Create a test slot
			slot := createSlotEditingTestParkingSlot(t, db.GetDB(), "TEST-UNWRAPPED", "SP", []int{10, 20, 30}, true)

			// Prepare unwrapped request body
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtr("TEST-UNWRAPPED-UPDATED"),
				SlotType:  stringPtr("MP"),
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
			assert.Equal(t, "TEST-UNWRAPPED-UPDATED", data["slot_label"], "Slot label should be updated")
			assert.Equal(t, "MP", data["slot_type"], "Slot type should be updated")

			// Verify slot was updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, "TEST-UNWRAPPED-UPDATED", updatedSlot.SlotLabel, "Database slot label should be updated")
			assert.Equal(t, models.SlotType("MP"), updatedSlot.SlotType, "Database slot type should be updated")
		})

		t.Run("PUT /api/v1/slots/{id} - Update slot with wrapped format (Postman)", func(t *testing.T) {
			// Create a test slot
			slot := createSlotEditingTestParkingSlot(t, db.GetDB(), "TEST-WRAPPED", "SP", []int{10, 20, 30}, true)

			// Prepare wrapped request body
			updateReq := dtos.UpdateSlotRequestWrapped{
				Slot: &dtos.UpdateSlotRequest{
					SlotLabel: stringPtr("TEST-WRAPPED-UPDATED"),
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
			assert.Equal(t, "TEST-WRAPPED-UPDATED", data["slot_label"], "Slot label should be updated")
			assert.Equal(t, "LP", data["slot_type"], "Slot type should be updated")

			// Verify slot was updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, "TEST-WRAPPED-UPDATED", updatedSlot.SlotLabel, "Database slot label should be updated")
			assert.Equal(t, models.SlotType("LP"), updatedSlot.SlotType, "Database slot type should be updated")
		})

		t.Run("PUT /api/v1/slots/{id} - Partial update with unwrapped format", func(t *testing.T) {
			// Create a test slot
			slot := createSlotEditingTestParkingSlot(t, db.GetDB(), "TEST-PARTIAL", "SP", []int{10, 20, 30}, true)

			// Prepare partial update request (only update slot_label)
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtr("TEST-PARTIAL-UPDATED"),
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK
			assert.Equal(t, http.StatusOK, rr.Code, "Partial update should return 200 OK")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			data := response["data"].(map[string]interface{})
			assert.Equal(t, "TEST-PARTIAL-UPDATED", data["slot_label"], "Slot label should be updated")
			assert.Equal(t, "SP", data["slot_type"], "Slot type should remain unchanged")

			// Verify slot was partially updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, "TEST-PARTIAL-UPDATED", updatedSlot.SlotLabel, "Database slot label should be updated")
			assert.Equal(t, models.SlotType("SP"), updatedSlot.SlotType, "Database slot type should remain unchanged")
			assert.Equal(t, []int{10, 20, 30}, updatedSlot.Distances, "Database distances should remain unchanged")
		})

		t.Run("PUT /api/v1/slots/{id} - Update non-existent slot", func(t *testing.T) {
			// Prepare update request
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtr("TEST-NONEXISTENT"),
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

		t.Run("PUT /api/v1/slots/{id} - Invalid slot ID format", func(t *testing.T) {
			// Prepare update request
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtr("TEST-INVALID"),
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request with invalid ID
			req, err := http.NewRequest("PUT", "/api/v1/slots/invalid", bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 404 Not Found (handler returns 404 for invalid ID)
			assert.Equal(t, http.StatusNotFound, rr.Code, "Invalid slot ID should return 404 Not Found")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.False(t, response["success"].(bool), "Response should indicate failure")
			assert.Contains(t, response["error"], "not found", "Error message should mention not found")
		})

		t.Run("PUT /api/v1/slots/{id} - Update with invalid slot type", func(t *testing.T) {
			// Create a test slot
			slot := createSlotEditingTestParkingSlot(t, db.GetDB(), "TEST-INVALID-TYPE", "SP", []int{10, 20, 30}, true)

			// Prepare update request with invalid slot type
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtr("TEST-INVALID-TYPE"),
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

		t.Run("PUT /api/v1/slots/{id} - Update with empty request body", func(t *testing.T) {
			// Create a test slot
			slot := createSlotEditingTestParkingSlot(t, db.GetDB(), "TEST-EMPTY", "SP", []int{10, 20, 30}, true)

			// Make PUT request with empty body
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader([]byte("{}")))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK (empty update is allowed)
			assert.Equal(t, http.StatusOK, rr.Code, "Empty update should return 200 OK")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
		})

		t.Run("PUT /api/v1/slots/{id} - Update with invalid JSON", func(t *testing.T) {
			// Create a test slot
			slot := createSlotEditingTestParkingSlot(t, db.GetDB(), "TEST-INVALID-JSON", "SP", []int{10, 20, 30}, true)

			// Make PUT request with invalid JSON
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader([]byte("{invalid json")))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 400 Bad Request
			assert.Equal(t, http.StatusBadRequest, rr.Code, "Invalid JSON should return 400 Bad Request")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.False(t, response["success"].(bool), "Response should indicate failure")
			assert.Contains(t, response["error"], "Invalid request body", "Error message should mention invalid request body")
		})

		t.Run("PUT /api/v1/slots/{id} - Partial update only slot type (unwrapped)", func(t *testing.T) {
			// Create a test slot
			slot := createSlotEditingTestParkingSlot(t, db.GetDB(), "TEST-PARTIAL-TYPE-UNWRAPPED", "SP", []int{10, 20, 30}, true)

			// Prepare partial update request (only update slot_type with unwrapped format)
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
			assert.Equal(t, "TEST-PARTIAL-TYPE-UNWRAPPED", data["slot_label"], "Slot label should remain unchanged")

			// Verify slot was partially updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, models.SlotType("MP"), updatedSlot.SlotType, "Database slot type should be updated")
			assert.Equal(t, "TEST-PARTIAL-TYPE-UNWRAPPED", updatedSlot.SlotLabel, "Database slot label should remain unchanged")
			assert.Equal(t, []int{10, 20, 30}, updatedSlot.Distances, "Database distances should remain unchanged")
		})

		t.Run("PUT /api/v1/slots/{id} - Partial update only distances (unwrapped)", func(t *testing.T) {
			// Create a test slot
			slot := createSlotEditingTestParkingSlot(t, db.GetDB(), "TEST-PARTIAL-DIST-UNWRAPPED", "SP", []int{10, 20, 30}, true)

			// Prepare partial update request (only update distances with unwrapped format)
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
			assert.Equal(t, "TEST-PARTIAL-DIST-UNWRAPPED", data["slot_label"], "Slot label should remain unchanged")

			// Verify slot was partially updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, []int{100, 200, 300}, updatedSlot.Distances, "Database distances should be updated")
			assert.Equal(t, "TEST-PARTIAL-DIST-UNWRAPPED", updatedSlot.SlotLabel, "Database slot label should remain unchanged")
			assert.Equal(t, models.SlotType("SP"), updatedSlot.SlotType, "Database slot type should remain unchanged")
		})

		t.Run("PUT /api/v1/slots/{id} - Partial update only slot label (wrapped)", func(t *testing.T) {
			// Create a test slot
			slot := createSlotEditingTestParkingSlot(t, db.GetDB(), "TEST-PARTIAL-LABEL-WRAPPED", "SP", []int{10, 20, 30}, true)

			// Prepare partial update request (only update slot_label with wrapped format)
			updateReq := dtos.UpdateSlotRequestWrapped{
				Slot: &dtos.UpdateSlotRequest{
					SlotLabel: stringPtr("TEST-PARTIAL-LABEL-WRAPPED-UPDATED"),
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
			assert.Equal(t, "TEST-PARTIAL-LABEL-WRAPPED-UPDATED", data["slot_label"], "Slot label should be updated")
			assert.Equal(t, "SP", data["slot_type"], "Slot type should remain unchanged")

			// Verify slot was partially updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, "TEST-PARTIAL-LABEL-WRAPPED-UPDATED", updatedSlot.SlotLabel, "Database slot label should be updated")
			assert.Equal(t, models.SlotType("SP"), updatedSlot.SlotType, "Database slot type should remain unchanged")
			assert.Equal(t, []int{10, 20, 30}, updatedSlot.Distances, "Database distances should remain unchanged")
		})

		t.Run("PUT /api/v1/slots/{id} - Partial update only slot type (wrapped)", func(t *testing.T) {
			// Create a test slot
			slot := createSlotEditingTestParkingSlot(t, db.GetDB(), "TEST-PARTIAL-TYPE-WRAPPED", "SP", []int{10, 20, 30}, true)

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
			assert.Equal(t, "TEST-PARTIAL-TYPE-WRAPPED", data["slot_label"], "Slot label should remain unchanged")

			// Verify slot was partially updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, models.SlotType("MP"), updatedSlot.SlotType, "Database slot type should be updated")
			assert.Equal(t, "TEST-PARTIAL-TYPE-WRAPPED", updatedSlot.SlotLabel, "Database slot label should remain unchanged")
			assert.Equal(t, []int{10, 20, 30}, updatedSlot.Distances, "Database distances should remain unchanged")
		})

		t.Run("PUT /api/v1/slots/{id} - Partial update only distances (wrapped)", func(t *testing.T) {
			// Create a test slot
			slot := createSlotEditingTestParkingSlot(t, db.GetDB(), "TEST-PARTIAL-DIST-WRAPPED", "SP", []int{10, 20, 30}, true)

			// Prepare partial update request (only update distances with wrapped format)
			newDistances := []int{100, 200, 300}
			updateReq := dtos.UpdateSlotRequestWrapped{
				Slot: &dtos.UpdateSlotRequest{
					Distances: &newDistances,
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
			assert.Equal(t, http.StatusOK, rr.Code, "Partial update of distances (wrapped) should return 200 OK")

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool), "Response should indicate success")
			data := response["data"].(map[string]interface{})
			assert.Equal(t, []interface{}{float64(100), float64(200), float64(300)}, data["distances"], "Distances should be updated")
			assert.Equal(t, "TEST-PARTIAL-DIST-WRAPPED", data["slot_label"], "Slot label should remain unchanged")

			// Verify slot was partially updated in database
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, []int{100, 200, 300}, updatedSlot.Distances, "Database distances should be updated")
			assert.Equal(t, "TEST-PARTIAL-DIST-WRAPPED", updatedSlot.SlotLabel, "Database slot label should remain unchanged")
			assert.Equal(t, models.SlotType("SP"), updatedSlot.SlotType, "Database slot type should remain unchanged")
		})

		t.Run("PUT /api/v1/slots/{id} - Update with empty slot type (unwrapped)", func(t *testing.T) {
			// Create a test slot
			slot := createSlotEditingTestParkingSlot(t, db.GetDB(), "TEST-EMPTY-TYPE-UNWRAPPED", "SP", []int{10, 20, 30}, true)

			// Prepare update request with empty slot type (unwrapped format)
			updateReq := dtos.UpdateSlotRequest{
				SlotType: stringPtr(""),
			}
			reqBody, _ := json.Marshal(updateReq)

			// Make PUT request
			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Backend rejects empty slot types and returns 400 Bad Request
			assert.Equal(t, http.StatusBadRequest, rr.Code, "Empty slot type should be rejected with 400 Bad Request")
			assert.Equal(t, "application/json", rr.Header().Get("Content-Type"), "Response should be JSON")

			// Parse error response
			var response map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.False(t, response["success"].(bool), "Response should indicate failure")
			assert.Contains(t, response["error"], "slot type cannot be empty", "Error message should mention slot type cannot be empty")
		})
	})
}

// ============================================================================
// Table-Driven Tests
// ============================================================================

// TestSlotEditingScenarios provides table-driven tests for various editing scenarios
func TestSlotEditingScenarios(t *testing.T) {
	t.Run("Table-Driven Scenarios", func(t *testing.T) {
		db := setupSlotEditingTestDB(t)
		defer cleanupSlotEditingTestDB(t, db)

		entryPointRepo := repositories.NewEntryPointRepository(db.GetDB())
		parkingSlotRepo := repositories.NewParkingSlotRepository(db.GetDB())
		sessionRepo := repositories.NewParkingSessionRepository(db.GetDB())
		parkingService := services.NewParkingService(entryPointRepo, parkingSlotRepo, sessionRepo)
		parkingHandler := handlers.NewParkingHandler(parkingService)

		// Create entry points for testing (needed for distances validation)
		for _, identifier := range []string{"A", "B", "C"} {
			query := `INSERT INTO entry_points (identifier, name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())`
			_, err := db.GetDB().Exec(query, identifier, fmt.Sprintf("Entry Point %s", identifier))
			require.NoError(t, err)
		}

		router := mux.NewRouter()
		api := router.PathPrefix("/api/v1").Subrouter()
		api.HandleFunc("/slots/{id}", parkingHandler.UpdateSlot).Methods("PUT")

		testCases := []struct {
			name             string
			setupSlot        func(t *testing.T) *models.ParkingSlot
			requestBody      interface{}
			expectStatus     int
			expectSuccess    bool
			expectedLabel    string
			expectedType     string
			description     string
		}{
			{
				name: "Update SP slot to MP with unwrapped format",
				setupSlot: func(t *testing.T) *models.ParkingSlot {
					return createSlotEditingTestParkingSlot(t, db.GetDB(), "TABLE-SP-MP", "SP", []int{10, 20, 30}, true)
				},
				requestBody: dtos.UpdateSlotRequest{
					SlotLabel: stringPtr("TABLE-SP-MP-UPDATED"),
					SlotType:  stringPtr("MP"),
					Distances: &[]int{15, 25, 35},
				},
				expectStatus:  http.StatusOK,
				expectSuccess: true,
				expectedLabel: "TABLE-SP-MP-UPDATED",
				expectedType:  "MP",
				description: "Successfully update SP slot to MP type with unwrapped format",
			},
			{
				name: "Update MP slot to LP with wrapped format",
				setupSlot: func(t *testing.T) *models.ParkingSlot {
					return createSlotEditingTestParkingSlot(t, db.GetDB(), "TABLE-MP-LP", "MP", []int{20, 30, 40}, true)
				},
				requestBody: dtos.UpdateSlotRequestWrapped{
					Slot: &dtos.UpdateSlotRequest{
						SlotLabel: stringPtr("TABLE-MP-LP-UPDATED"),
						SlotType:  stringPtr("LP"),
						Distances: &[]int{25, 35, 45},
					},
				},
				expectStatus:  http.StatusOK,
				expectSuccess: true,
				expectedLabel: "TABLE-MP-LP-UPDATED",
				expectedType:  "LP",
				description: "Successfully update MP slot to LP type with wrapped format",
			},
			{
				name: "Update only distances with unwrapped format",
				setupSlot: func(t *testing.T) *models.ParkingSlot {
					return createSlotEditingTestParkingSlot(t, db.GetDB(), "TABLE-DISTANCES", "SP", []int{10, 20, 30}, true)
				},
				requestBody: dtos.UpdateSlotRequest{
					Distances: &[]int{100, 200, 300},
				},
				expectStatus:  http.StatusOK,
				expectSuccess: true,
				expectedLabel: "TABLE-DISTANCES",
				expectedType:  "SP",
				description: "Successfully update only distances with unwrapped format",
			},
			{
				name: "Update with all fields using wrapped format",
				setupSlot: func(t *testing.T) *models.ParkingSlot {
					return createSlotEditingTestParkingSlot(t, db.GetDB(), "TABLE-ALL-FIELDS", "LP", []int{30, 40, 50}, true)
				},
				requestBody: dtos.UpdateSlotRequestWrapped{
					Slot: &dtos.UpdateSlotRequest{
						SlotLabel: stringPtr("TABLE-ALL-FIELDS-UPDATED"),
						SlotType:  stringPtr("SP"),
						Distances: &[]int{5, 10, 15},
					},
				},
				expectStatus:  http.StatusOK,
				expectSuccess: true,
				expectedLabel: "TABLE-ALL-FIELDS-UPDATED",
				expectedType:  "SP",
				description: "Successfully update all fields using wrapped format",
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				t.Logf("Test scenario: %s", tc.description)

				// Setup slot
				slot := tc.setupSlot(t)

				// Marshal request body
				var reqBody []byte
				var err error
				switch v := tc.requestBody.(type) {
				case dtos.UpdateSlotRequest:
					reqBody, err = json.Marshal(v)
				case dtos.UpdateSlotRequestWrapped:
					reqBody, err = json.Marshal(v)
				}
				require.NoError(t, err)

				// Make PUT request
				req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
				require.NoError(t, err)
				req.Header.Set("Content-Type", "application/json")

				rr := httptest.NewRecorder()
				router.ServeHTTP(rr, req)

				// Verify status code
				assert.Equal(t, tc.expectStatus, rr.Code, "Expected status code: "+tc.description)

				// Parse response
				var response map[string]interface{}
				err = json.Unmarshal(rr.Body.Bytes(), &response)
				require.NoError(t, err)

				// Verify success flag
				assert.Equal(t, tc.expectSuccess, response["success"].(bool), "Expected success flag: "+tc.description)

				if tc.expectSuccess {
					data := response["data"].(map[string]interface{})
					assert.Equal(t, tc.expectedLabel, data["slot_label"], "Expected slot label: "+tc.description)
					assert.Equal(t, tc.expectedType, data["slot_type"], "Expected slot type: "+tc.description)

					// Verify slot was updated in database
					updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
					require.NoError(t, err)
					assert.Equal(t, tc.expectedLabel, updatedSlot.SlotLabel, "Database slot label: "+tc.description)
					assert.Equal(t, models.SlotType(tc.expectedType), updatedSlot.SlotType, "Database slot type: "+tc.description)
				}
			})
		}
	})
}

// ============================================================================
// Edge Cases and Boundary Conditions
// ============================================================================

// TestSlotEditingEdgeCases tests edge cases and boundary conditions
func TestSlotEditingEdgeCases(t *testing.T) {
	t.Run("Edge Cases", func(t *testing.T) {
		db := setupSlotEditingTestDB(t)
		defer cleanupSlotEditingTestDB(t, db)

		entryPointRepo := repositories.NewEntryPointRepository(db.GetDB())
		parkingSlotRepo := repositories.NewParkingSlotRepository(db.GetDB())
		sessionRepo := repositories.NewParkingSessionRepository(db.GetDB())
		parkingService := services.NewParkingService(entryPointRepo, parkingSlotRepo, sessionRepo)
		parkingHandler := handlers.NewParkingHandler(parkingService)

		// Create entry points for testing (needed for distances validation)
		for _, identifier := range []string{"A", "B", "C"} {
			query := `INSERT INTO entry_points (identifier, name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())`
			_, err := db.GetDB().Exec(query, identifier, fmt.Sprintf("Entry Point %s", identifier))
			require.NoError(t, err)
		}

		router := mux.NewRouter()
		api := router.PathPrefix("/api/v1").Subrouter()
		api.HandleFunc("/slots/{id}", parkingHandler.UpdateSlot).Methods("PUT")

		t.Run("Update slot with zero ID", func(t *testing.T) {
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtr("TEST-ZERO-ID"),
			}
			reqBody, _ := json.Marshal(updateReq)

			req, err := http.NewRequest("PUT", "/api/v1/slots/0", bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusNotFound, rr.Code, "Zero ID should return 404 Not Found")
		})

		t.Run("Update slot with negative ID", func(t *testing.T) {
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtr("TEST-NEGATIVE-ID"),
			}
			reqBody, _ := json.Marshal(updateReq)

			req, err := http.NewRequest("PUT", "/api/v1/slots/-1", bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusNotFound, rr.Code, "Negative ID should return 404 Not Found")
		})

		t.Run("Update slot with very large ID", func(t *testing.T) {
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtr("TEST-LARGE-ID"),
			}
			reqBody, _ := json.Marshal(updateReq)

			req, err := http.NewRequest("PUT", "/api/v1/slots/9223372036854775807", bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusNotFound, rr.Code, "Very large ID should return 404 Not Found")
		})

		t.Run("Update slot with empty string slot label", func(t *testing.T) {
			slot := createSlotEditingTestParkingSlot(t, db.GetDB(), "TEST-EMPTY-LABEL", "SP", []int{10, 20, 30}, true)

			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: stringPtr(""),
			}
			reqBody, _ := json.Marshal(updateReq)

			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 400 Bad Request (validation happens at handler level)
			assert.Equal(t, http.StatusBadRequest, rr.Code, "Empty slot label should return 400 Bad Request")
		})

		t.Run("Update slot with negative distances", func(t *testing.T) {
			slot := createSlotEditingTestParkingSlot(t, db.GetDB(), "TEST-NEGATIVE-DIST", "SP", []int{10, 20, 30}, true)

			negativeDistances := []int{-10, -20, -30}
			updateReq := dtos.UpdateSlotRequest{
				Distances: &negativeDistances,
			}
			reqBody, _ := json.Marshal(updateReq)

			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Should return 200 OK (negative distances are accepted by the backend)
			assert.Equal(t, http.StatusOK, rr.Code, "Negative distances should be accepted")

			// Verify slot was updated
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, negativeDistances, updatedSlot.Distances, "Database distances should be updated to negative values")
		})

		t.Run("Update slot with empty distances array", func(t *testing.T) {
			slot := createSlotEditingTestParkingSlot(t, db.GetDB(), "TEST-EMPTY-DIST", "SP", []int{10, 20, 30}, true)

			emptyDistances := []int{}
			updateReq := dtos.UpdateSlotRequest{
				Distances: &emptyDistances,
			}
			reqBody, _ := json.Marshal(updateReq)

			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Empty distances array is preserved as-is (no backfilling when array is empty)
			assert.Equal(t, http.StatusOK, rr.Code, "Empty distances array should be preserved")

			// Verify slot was updated with empty distances
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, []int{}, updatedSlot.Distances, "Database distances should be empty")
		})

		t.Run("Update slot with distances array of wrong size", func(t *testing.T) {
			slot := createSlotEditingTestParkingSlot(t, db.GetDB(), "TEST-WRONG-SIZE", "SP", []int{10, 20, 30}, true)

			wrongSizeDistances := []int{10, 20}
			updateReq := dtos.UpdateSlotRequest{
				Distances: &wrongSizeDistances,
			}
			reqBody, _ := json.Marshal(updateReq)

			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			// Wrong size distances array gets backfilled with 0 to match entry point count (3)
			assert.Equal(t, http.StatusOK, rr.Code, "Wrong size distances array should be backfilled")

			// Verify slot was updated with backfilled distances
			updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
			require.NoError(t, err)
			assert.Equal(t, []int{10, 20, 0}, updatedSlot.Distances, "Database distances should be backfilled with 0")
		})

		t.Run("Update slot with very long slot label", func(t *testing.T) {
			slot := createSlotEditingTestParkingSlot(t, db.GetDB(), "TEST-LONG-LABEL", "SP", []int{10, 20, 30}, true)

			longLabel := string(make([]byte, 1000))
			for i := range longLabel {
				longLabel = longLabel[:i] + "A"
			}
			updateReq := dtos.UpdateSlotRequest{
				SlotLabel: &longLabel,
			}
			reqBody, _ := json.Marshal(updateReq)

			req, err := http.NewRequest("PUT", fmt.Sprintf("/api/v1/slots/%d", slot.ID), bytes.NewReader(reqBody))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		// Should return 400 Bad Request (handler validates slot label length before database)
		assert.Equal(t, http.StatusBadRequest, rr.Code, "Very long slot label should be rejected with 400 Bad Request")

		// Verify slot was NOT updated (still has original label)
		updatedSlot, err := parkingSlotRepo.GetByID(slot.ID)
		require.NoError(t, err)
		assert.Equal(t, "TEST-LONG-LABEL", updatedSlot.SlotLabel, "Database slot label should remain unchanged")
		})
	})
}

// ============================================================================
// Summary and Documentation
// ============================================================================

// TestSlotEditingSummary documents the correct behavior
func TestSlotEditingSummary(t *testing.T) {
	t.Run("Summary", func(t *testing.T) {
		t.Log("=== SLOT EDITING BEHAVIOR SUMMARY ===")
		t.Log("")
		t.Log("Feature:")
		t.Log("  The UpdateSlot endpoint accepts both wrapped and unwrapped request formats")
		t.Log("  to provide compatibility with both frontend and Postman clients.")
		t.Log("")
		t.Log("Request Formats:")
		t.Log("  - Unwrapped (frontend): {slot_label, slot_type, distances}")
		t.Log("  - Wrapped (Postman): {parking_slot: {slot_label, slot_type, distances}}")
		t.Log("")
		t.Log("Current Behavior:")
		t.Log("  - Both formats are accepted and processed correctly")
		t.Log("  - Partial updates are supported (only update specified fields)")
		t.Log("  - Invalid slot IDs return 404 Not Found")
		t.Log("  - Invalid JSON returns 400 Bad Request")
		t.Log("")
		t.Log("Test Coverage:")
		t.Log("  ✓ Update with unwrapped format (frontend)")
		t.Log("  ✓ Update with wrapped format (Postman)")
		t.Log("  ✓ Partial updates (only some fields)")
		t.Log("  ✓ Update non-existent slot")
		t.Log("  ✓ Invalid slot ID format")
		t.Log("  ✓ Invalid slot type")
		t.Log("  ✓ Empty request body")
		t.Log("  ✓ Invalid JSON")
		t.Log("  ✓ Edge cases (zero ID, negative ID, very large ID)")
		t.Log("  ✓ Boundary conditions (empty strings, negative distances, etc.)")
		t.Log("")
	})
}

// Helper function to create string pointers
func stringPtr(s string) *string {
	return &s
}
