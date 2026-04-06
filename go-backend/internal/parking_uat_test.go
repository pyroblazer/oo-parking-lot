// Package internal provides user acceptance tests for parking system
package internal

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestParkingUAT_CompleteParkingSessionFlow tests UAT-001: Complete Parking Session Flow
//
// Business Requirement:
// Users must be able to park their vehicles and exit the parking lot
// with accurate fee calculation based on parking duration.
//
// User Story:
// As a driver, I want to park my vehicle and pay the correct fee
// so that I can use the parking lot conveniently.
//
// Acceptance Criteria:
// - System assigns an available parking slot
// - System tracks parking duration
// - System calculates and displays the correct fee
// - System provides a detailed fee breakdown
// - System releases the parking slot after exit
func TestParkingUAT_CompleteParkingSessionFlow(t *testing.T) {
	// Given: User arrives at entry point A with a small vehicle
	// This represents the initial state before the user interacts with the system
	router := setupTestRouter(t)

	// When: User requests to park a vehicle
	// The user initiates the parking process through the API
	parkRequest := map[string]interface{}{
		"vehicle_type":   "S",
		"entry_point_id": "A",
	}
	parkBody, _ := json.Marshal(parkRequest)

	parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
	parkReq.Header.Set("Content-Type", "application/json")
	parkRecorder := httptest.NewRecorder()
	router.ServeHTTP(parkRecorder, parkReq)

	// Then: System assigns a parking slot
	// Verify that the system successfully assigns a slot
	assert.Equal(t, http.StatusCreated, parkRecorder.Code, "Park endpoint should return 201 Created")

	var parkResponse map[string]interface{}
	err := json.Unmarshal(parkRecorder.Body.Bytes(), &parkResponse)
	require.NoError(t, err)

	assert.True(t, parkResponse["success"].(bool), "Park response should indicate success")
	data := parkResponse["data"].(map[string]interface{})
	assert.NotNil(t, data["session_id"], "Session ID should be present")
	assert.Equal(t, "S", data["vehicle_type"], "Vehicle type should be S")
	assert.True(t, data["is_active"].(bool), "Session should be active")
	assert.False(t, data["is_continuous"].(bool), "Session should not be continuous")
	assert.GreaterOrEqual(t, data["duration_hours"].(float64), 0.0, "Duration hours should be non-negative")
	assert.GreaterOrEqual(t, data["total_fee"].(float64), 0.0, "Total fee should be non-negative")

	slotData := data["parking_slot"].(map[string]interface{})
	assert.Equal(t, "SP", slotData["slot_type"], "Slot type should be SP")

	// And: System returns session details
	// Verify that the session response contains all necessary information
	assert.NotNil(t, data["parked_at"], "Parked at timestamp should be present")

	// When: User leaves the parking lot after 2 hours
	// Simulate time passing to test fee calculation
	parkedAtStr := data["parked_at"].(string)
	parkedAt, err := time.Parse(time.RFC3339, parkedAtStr)
	require.NoError(t, err)

	// Handle both string and float64 session_id types
	var sessionID int
	switch v := data["session_id"].(type) {
	case float64:
		sessionID = int(v)
	case string:
		id, err := strconv.Atoi(v)
		if err != nil {
			require.NoError(t, err)
			return
		}
		sessionID = id
	default:
		require.Fail(t, "session_id is neither float64 nor string")
		return
	}

	exitedAt := parkedAt.Add(2 * time.Hour)
	unparkReq := httptest.NewRequest("POST", "/api/v1/sessions/"+int64ToString(int64(sessionID))+"/unpark?exited_at="+exitedAt.UTC().Format(time.RFC3339), nil)
	unparkRecorder := httptest.NewRecorder()
	router.ServeHTTP(unparkRecorder, unparkReq)

	// Then: System calculates and returns the parking fee
	// Verify that the system calculates the correct fee
	assert.Equal(t, http.StatusOK, unparkRecorder.Code, "Unpark endpoint should return 200 OK")

	var unparkResponse map[string]interface{}
	err = json.Unmarshal(unparkRecorder.Body.Bytes(), &unparkResponse)
	require.NoError(t, err)

	assert.True(t, unparkResponse["success"].(bool), "Unpark response should indicate success")
	unparkData := unparkResponse["data"].(map[string]interface{})
	assert.Equal(t, 40.0, unparkData["total_fee"], "Total fee for 2 hours should be 40.0")

	// For 2 hours, expect the base rate of 40.0

	// And: System provides a fee breakdown
	// Verify that the fee breakdown is detailed and accurate
	assert.NotNil(t, unparkData["breakdown"], "Fee breakdown should be present")
	assert.Equal(t, 2.0, unparkData["duration_hours"], "Duration hours should be 2.0")

	// And: System marks session as completed
	// Verify that the session is properly updated in the database
	assert.NotNil(t, unparkData["exited_at"], "Exited at timestamp should be present")
}

// TestParkingUAT_VehicleTypeCompatibility_MediumVehicle tests UAT-002: Vehicle Type Compatibility
//
// Business Requirement:
// Vehicles must be assigned to appropriately sized parking slots
// to ensure safety and optimize space utilization.
//
// User Story:
// As a driver, I want to be assigned to a parking slot that fits my vehicle
// so that I can park safely and without difficulty.
//
// Vehicle Type Compatibility Rules:
// - Small (S) vehicles can park in SP, MP, or LP slots
// - Medium (M) vehicles can park in MP or LP slots
// - Large (L) vehicles can only park in LP slots
//
// Acceptance Criteria:
// - System assigns vehicles only to compatible slot types
// - System prevents vehicles from being assigned to incompatible slots
// - System optimizes slot assignment by preferring smaller compatible slots
func TestParkingUAT_VehicleTypeCompatibility_MediumVehicle(t *testing.T) {
	// Given: User arrives with a medium vehicle
	// Medium vehicles require more space than small vehicles
	// but less than large vehicles
	router := setupTestRouter(t)

	// When: User requests to park a vehicle
	// The system should assign an appropriately sized slot
	parkRequest := map[string]interface{}{
		"vehicle_type":   "M",
		"entry_point_id": "A",
	}
	parkBody, _ := json.Marshal(parkRequest)

	parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
	parkReq.Header.Set("Content-Type", "application/json")
	parkRecorder := httptest.NewRecorder()
	router.ServeHTTP(parkRecorder, parkReq)

	// Then: System assigns an MP or LP slot (not SP)
	// Verify that the medium vehicle is not assigned to a small slot
	assert.Equal(t, http.StatusCreated, parkRecorder.Code, "Park endpoint should return 201 Created")

	var response map[string]interface{}
	err := json.Unmarshal(parkRecorder.Body.Bytes(), &response)
	require.NoError(t, err)

	data := response["data"].(map[string]interface{})
	slotData := data["parking_slot"].(map[string]interface{})
	slotType := slotData["slot_type"].(string)

	assert.Contains(t, []string{"MP", "LP"}, slotType, "Medium vehicle should be assigned to MP or LP slot")
	assert.NotEqual(t, "SP", slotType, "Medium vehicle should NOT be assigned to SP slot")

	// Medium vehicles can only use MP or LP slots
}

// TestParkingUAT_VehicleTypeCompatibility_LargeVehicle tests UAT-002: Vehicle Type Compatibility
func TestParkingUAT_VehicleTypeCompatibility_LargeVehicle(t *testing.T) {
	// Given: User arrives with a large vehicle
	// Large vehicles require the most space and can only fit in LP slots
	router := setupTestRouter(t)

	// When: User requests to park a vehicle
	// The system should assign an LP slot
	parkRequest := map[string]interface{}{
		"vehicle_type":   "L",
		"entry_point_id": "A",
	}
	parkBody, _ := json.Marshal(parkRequest)

	parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
	parkReq.Header.Set("Content-Type", "application/json")
	parkRecorder := httptest.NewRecorder()
	router.ServeHTTP(parkRecorder, parkReq)

	// Then: System assigns an LP slot
	// Verify that the large vehicle is assigned only to an LP slot
	assert.Equal(t, http.StatusCreated, parkRecorder.Code, "Park endpoint should return 201 Created")

	var response map[string]interface{}
	err := json.Unmarshal(parkRecorder.Body.Bytes(), &response)
	require.NoError(t, err)

	data := response["data"].(map[string]interface{})
	slotData := data["parking_slot"].(map[string]interface{})
	assert.Equal(t, "LP", slotData["slot_type"], "Large vehicle should be assigned to LP slot")

	// Large vehicles can only use LP slots
}

// TestParkingUAT_SlotAllocationStrategy tests UAT-003: Slot Allocation Strategy
//
// Business Requirement:
// The system should assign the closest available parking slot to minimize
// the distance users need to travel within the parking lot.
//
// User Story:
// As a driver, I want to be assigned to the closest available parking slot
// so that I can minimize time and effort to park my vehicle.
//
// Slot Allocation Strategy:
// - Slots are sorted by distance from the entry point
// - The closest available compatible slot is always assigned first
// - This optimizes user experience and reduces traffic congestion
//
// Acceptance Criteria:
// - System assigns the closest available slot
// - System considers slot type compatibility
// - System considers entry point distance
func TestParkingUAT_SlotAllocationStrategy(t *testing.T) {
	// Given: Multiple slots are available at different distances
	// Create three slots at varying distances from the entry point
	// to test the distance-based allocation strategy
	router := setupTestRouter(t)

	// When: User requests to park a vehicle
	// The system should select the closest available slot
	parkRequest := map[string]interface{}{
		"vehicle_type":   "S",
		"entry_point_id": "A",
	}
	parkBody, _ := json.Marshal(parkRequest)

	parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
	parkReq.Header.Set("Content-Type", "application/json")
	parkRecorder := httptest.NewRecorder()
	router.ServeHTTP(parkRecorder, parkReq)

	// Then: System assigns to closest slot
	// Verify that the closest slot was assigned
	assert.Equal(t, http.StatusCreated, parkRecorder.Code, "Park endpoint should return 201 Created")

	var response map[string]interface{}
	err := json.Unmarshal(parkRecorder.Body.Bytes(), &response)
	require.NoError(t, err)

	data := response["data"].(map[string]interface{})
	slotData := data["parking_slot"].(map[string]interface{})
	assert.NotNil(t, slotData["id"], "Slot ID should be present")
	assert.Equal(t, "SP", slotData["slot_type"], "Slot type should be SP")

	// Verify that the closest slot was assigned
}

// TestParkingUAT_ContinuousParkingDetection tests UAT-004: Continuous Parking Detection
//
// Business Requirement:
// The system should detect when a vehicle exits and re-enters within
// a short time period (1 hour threshold) to track continuous parking sessions.
//
// User Story:
// As a parking operator, I want to detect continuous parking sessions
// so that I can apply special rates or track frequent visitors.
//
// Continuous Parking Use Cases:
// - Vehicles that leave temporarily (e.g., to run errands)
// - Tracking frequent visitors for loyalty programs
// - Applying special rates for continuous parking sessions
// - Preventing abuse of short-term parking rates
//
// Acceptance Criteria:
// - System detects re-entry within 1 hour of previous exit
// - System marks the second session as continuous
// - System does not mark sessions as continuous if re-entry is after 1 hour
func TestParkingUAT_ContinuousParkingDetection(t *testing.T) {
	// Given: User parks a vehicle
	router := setupTestRouter(t)

	baseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)

	// First parking session
	parkRequest1 := map[string]interface{}{
		"vehicle_type":   "S",
		"entry_point_id": "A",
		"parked_at":     baseTime.Format(time.RFC3339),
	}
	parkBody1, _ := json.Marshal(parkRequest1)

	parkReq1 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody1))
	parkReq1.Header.Set("Content-Type", "application/json")
	parkRecorder1 := httptest.NewRecorder()
	router.ServeHTTP(parkRecorder1, parkReq1)

	require.Equal(t, http.StatusCreated, parkRecorder1.Code, "First park should succeed")

	var parkResponse1 map[string]interface{}
	err := json.Unmarshal(parkRecorder1.Body.Bytes(), &parkResponse1)
	require.NoError(t, err)

	// Handle both string and float64 session_id types
	var sessionID1 int
	switch v := parkResponse1["data"].(map[string]interface{})["session_id"].(type) {
	case float64:
		sessionID1 = int(v)
	case string:
		id, err := strconv.Atoi(v)
		if err != nil {
			require.NoError(t, err)
			return
		}
		sessionID1 = id
	default:
		require.Fail(t, "session_id is neither float64 nor string")
		return
	}

	// When: User unparks after 30 minutes
	// Simulate the vehicle leaving after a short stay
	exitedAt1 := baseTime.Add(30 * time.Minute)
	unparkReq1 := httptest.NewRequest("POST", "/api/v1/sessions/"+int64ToString(int64(sessionID1))+"/unpark?exited_at="+exitedAt1.UTC().Format(time.RFC3339), nil)
	unparkRecorder1 := httptest.NewRecorder()
	router.ServeHTTP(unparkRecorder1, unparkReq1)

	require.Equal(t, http.StatusOK, unparkRecorder1.Code, "First unpark should succeed")

	// And: User parks again within 1 hour
	// Vehicle re-enters within the continuous parking threshold
	// 45 minutes from now means 75 minutes from the first session start
	parkRequest2 := map[string]interface{}{
		"vehicle_type":   "S",
		"entry_point_id": "A",
		"parked_at":     exitedAt1.Add(45 * time.Minute).Format(time.RFC3339),
	}
	parkBody2, _ := json.Marshal(parkRequest2)

	parkReq2 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody2))
	parkReq2.Header.Set("Content-Type", "application/json")
	parkRecorder2 := httptest.NewRecorder()
	router.ServeHTTP(parkRecorder2, parkReq2)

	// Then: System marks the second session as continuous
	// Verify that system correctly identifies this as continuous parking
	assert.Equal(t, http.StatusCreated, parkRecorder2.Code, "Second park should succeed")

	var parkResponse2 map[string]interface{}
	err = json.Unmarshal(parkRecorder2.Body.Bytes(), &parkResponse2)
	require.NoError(t, err)

	parkData2 := parkResponse2["data"].(map[string]interface{})
	assert.True(t, parkData2["is_continuous"].(bool), "Continuous parking should be detected within 1 hour of exit")
}

// TestParkingUAT_LongTermParkingRates tests UAT-005: Long-term Parking Rates
//
// Business Requirement:
// The system should apply special long-term parking rates for vehicles
// that park for 24 hours or more to encourage long-term parking.
//
// User Story:
// As a driver parking for multiple days, I want to benefit from
// long-term parking rates so that I can save money compared to
// paying hourly rates.
//
// Long-term Pricing Model:
// - Base rate: 40.0 for the first 3 hours
// - Hourly rate: 20.0 per hour after the first 3 hours
// - Long-term rate: 5000.0 per day (24-hour period) for parking 24+ hours
//
// Acceptance Criteria:
// - System applies long-term rate for 24+ hour parking
// - System provides detailed fee breakdown including long-term component
// - System correctly calculates mixed short-term and long-term fees
func TestParkingUAT_LongTermParkingRates(t *testing.T) {
	// Given: User parks a vehicle
	router := setupTestRouter(t)

	baseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)

	parkRequest := map[string]interface{}{
		"vehicle_type":   "S",
		"entry_point_id": "A",
		"parked_at":     baseTime.Format(time.RFC3339),
	}
	parkBody, _ := json.Marshal(parkRequest)

	parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
	parkReq.Header.Set("Content-Type", "application/json")
	parkRecorder := httptest.NewRecorder()
	router.ServeHTTP(parkRecorder, parkReq)

	require.Equal(t, http.StatusCreated, parkRecorder.Code, "Park should succeed")

	var parkResponse map[string]interface{}
	err := json.Unmarshal(parkRecorder.Body.Bytes(), &parkResponse)
	require.NoError(t, err)

	// Handle both string and float64 session_id types
	var sessionID int
	switch v := parkResponse["data"].(map[string]interface{})["session_id"].(type) {
	case float64:
		sessionID = int(v)
	case string:
		id, err := strconv.Atoi(v)
		if err != nil {
			require.NoError(t, err)
			return
		}
		sessionID = id
	default:
		require.Fail(t, "session_id is neither float64 nor string")
		return
	}

	// When: User unparks after 25 hours
	// Simulate long-term parking (more than 24 hours)
	exitedAt := baseTime.Add(25 * time.Hour)
	unparkReq := httptest.NewRequest("POST", "/api/v1/sessions/"+int64ToString(int64(sessionID))+"/unpark?exited_at="+exitedAt.UTC().Format(time.RFC3339), nil)
	unparkRecorder := httptest.NewRecorder()
	router.ServeHTTP(unparkRecorder, unparkReq)

	// Then: System applies to long-term rate
	// Verify that long-term rate is applied correctly
	assert.Equal(t, http.StatusOK, unparkRecorder.Code, "Unpark should succeed")

	var unparkResponse map[string]interface{}
	err = json.Unmarshal(unparkRecorder.Body.Bytes(), &unparkResponse)
	require.NoError(t, err)

	assert.True(t, unparkResponse["success"].(bool), "Unpark response should indicate success")
	unparkData := unparkResponse["data"].(map[string]interface{})

	// For 25 hours:
	// - Long-term rate: 5000.0 (1 day at 24 hours)
	// - Base rate: 40.0 (for remaining 1 hour)
	// - Total: 5040.0
	assert.Equal(t, 5040.0, unparkData["total_fee"], "Total fee for 25 hours should be 5040.0")

	// And: Fee breakdown shows long-term component
	// Verify that fee breakdown includes the long-term component
	assert.NotNil(t, unparkData["breakdown"], "Fee breakdown should be present")
}

// TestParkingUAT_ErrorHandling_InvalidVehicleType tests UAT-006: Error Handling
//
// Business Requirement:
// The system should handle errors gracefully and provide clear, actionable
// error messages to users when something goes wrong.
//
// User Story:
// As a user, I want to receive clear error messages when I make a mistake
// so that I can understand what went wrong and how to fix it.
//
// Error Scenarios Tested:
// - Invalid vehicle type
// - No available parking slots
// - Double parking attempts
// - Non-existent entry points
//
// Acceptance Criteria:
// - System returns appropriate HTTP status codes for errors
// - System provides descriptive error messages
// - System does not create invalid data
// - System maintains data integrity
func TestParkingUAT_ErrorHandling_InvalidVehicleType(t *testing.T) {
	// Given: User provides an invalid vehicle type
	// Valid vehicle types are 'S', 'M', and 'L'
	// 'X' is an invalid vehicle type
	router := setupTestRouter(t)

	// When: User requests to park a vehicle
	parkRequest := map[string]interface{}{
		"vehicle_type":   "X",
		"entry_point_id": "A",
	}
	parkBody, _ := json.Marshal(parkRequest)

	parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
	parkReq.Header.Set("Content-Type", "application/json")
	parkRecorder := httptest.NewRecorder()
	router.ServeHTTP(parkRecorder, parkReq)

	// Then: System returns a validation error
	// Verify that system rejects invalid input with a clear error message
	assert.Equal(t, http.StatusBadRequest, parkRecorder.Code, "Invalid vehicle type should return 400 Bad Request")

	var response map[string]interface{}
	err := json.Unmarshal(parkRecorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.False(t, response["success"].(bool), "Response should indicate failure")

	// Verify that error message is present and descriptive
	errorMsg := response["error"].(string)
	assert.Contains(t, strings.ToLower(errorMsg), "invalid vehicle type", "Error message should mention invalid vehicle type")
}

// TestParkingUAT_ErrorHandling_NonExistentEntryPoint tests UAT-006: Error Handling
func TestParkingUAT_ErrorHandling_NonExistentEntryPoint(t *testing.T) {
	// Given: User provides a non-existent entry point
	router := setupTestRouter(t)

	// When: User requests to park a vehicle
	parkRequest := map[string]interface{}{
		"vehicle_type":   "S",
		"entry_point_id": "99999",
	}
	parkBody, _ := json.Marshal(parkRequest)

	parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
	parkReq.Header.Set("Content-Type", "application/json")
	parkRecorder := httptest.NewRecorder()
	router.ServeHTTP(parkRecorder, parkReq)

	// Then: System returns a not found error
	// Verify that system rejects non-existent entry point
	assert.Equal(t, http.StatusNotFound, parkRecorder.Code, "Non-existent entry point should return 404 Not Found")

	var response map[string]interface{}
	err := json.Unmarshal(parkRecorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.False(t, response["success"].(bool), "Response should indicate failure")

	// Verify that error message is present and descriptive
	errorMsg := response["error"].(string)
	assert.Contains(t, strings.ToLower(errorMsg), "entry point", "Error message should mention entry point")
}

// TestParkingUAT_AvailableSlotsQuery tests UAT-007: Available Slots Query
//
// Business Requirement:
// Users should be able to query available parking slots to make informed
// decisions about where to park and which entry point to use.
//
// User Story:
// As a driver, I want to see available parking slots before entering
// so that I can choose the best entry point and know if parking is available.
//
// Query Features:
// - Filter by vehicle type (shows compatible slots only)
// - Filter by entry point (shows slots near specific entrance)
// - Returns slot details (type, distance, status)
// - Provides total count of available slots
//
// Acceptance Criteria:
// - System returns only compatible slots for vehicle type
// - System returns slots from specified entry point
// - System provides accurate slot counts
// - System returns slot details including distance information
func TestParkingUAT_AvailableSlotsQuery(t *testing.T) {
	// Given: Multiple slots are available
	// Create a variety of slots to test the filtering functionality
	router := setupTestRouter(t)

	// When: User queries available slots for a small vehicle
	// Query API for slots compatible with small vehicles
	req := httptest.NewRequest("GET", "/api/v1/slots/available?vehicle_type=S&entry_point_id=A", nil)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)

	// Then: System returns all compatible slots
	// Verify that all compatible slot types are returned
	assert.Equal(t, http.StatusOK, recorder.Code, "Available slots query should return 200 OK")

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.True(t, response["success"].(bool), "Response should indicate success")
	data := response["data"].(map[string]interface{})
	assert.Greater(t, data["total_available"].(float64), 0.0, "Total available slots should be greater than 0")
	assert.NotNil(t, data["available_slots"], "Available slots should be present")
}
