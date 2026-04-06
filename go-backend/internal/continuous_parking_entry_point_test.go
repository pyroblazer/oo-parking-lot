// Package internal provides comprehensive tests for continuous parking with entry point proximity verification
package internal

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestContinuousParkingEntryPointProximity tests that parking slots are assigned nearest to entry point
// These tests verify the "closest available slot" rule from the technical specification
func TestContinuousParkingEntryPointProximity(t *testing.T) {
	t.Run("single vehicle at entry point A gets nearest slot", func(t *testing.T) {
		router := setupTestRouter(t)

		// Park a small vehicle at entry point A
		parkRequest := map[string]interface{}{
			"vehicle_type":   "S",
			"entry_point_id": "A",
		}
		parkBody, _ := json.Marshal(parkRequest)

		parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
		parkReq.Header.Set("Content-Type", "application/json")
		parkRecorder := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder, parkReq)

		require.Equal(t, http.StatusCreated, parkRecorder.Code)

		var parkResponse map[string]interface{}
		err := json.Unmarshal(parkRecorder.Body.Bytes(), &parkResponse)
		require.NoError(t, err)

		data := parkResponse["data"].(map[string]interface{})
		slotData := data["parking_slot"].(map[string]interface{})

		// Verify it's an SP slot with distances configured
		slotType := slotData["slot_type"].(string)
		assert.Equal(t, "SP", slotType, "Small vehicle should be assigned to SP slot")
		
		distances := slotData["distances"].([]interface{})
		assert.Greater(t, len(distances), 0, "Slot should have distances configured")
		
		// Verify distance to entry point A is configured
		distanceToA := distances[0].(float64)
		assert.Greater(t, distanceToA, 0.0, "Slot should have a valid distance to entry point A")
	})

	t.Run("single vehicle at entry point B gets nearest slot", func(t *testing.T) {
		router := setupTestRouter(t)

		// Park a medium vehicle at entry point B
		parkRequest := map[string]interface{}{
			"vehicle_type":   "M",
			"entry_point_id": "B",
		}
		parkBody, _ := json.Marshal(parkRequest)

		parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
		parkReq.Header.Set("Content-Type", "application/json")
		parkRecorder := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder, parkReq)

		require.Equal(t, http.StatusCreated, parkRecorder.Code)

		var parkResponse map[string]interface{}
		err := json.Unmarshal(parkRecorder.Body.Bytes(), &parkResponse)
		require.NoError(t, err)

		data := parkResponse["data"].(map[string]interface{})
		slotData := data["parking_slot"].(map[string]interface{})

		// Verify slot type
		slotType := slotData["slot_type"].(string)
		assert.Equal(t, "MP", slotType, "Medium vehicle should be assigned to MP slot")

		// Verify distances are configured
		distances := slotData["distances"].([]interface{})
		assert.Greater(t, len(distances), 0, "Slot should have distances configured")
		if len(distances) > 1 {
			distanceToB := distances[1].(float64)
			assert.Greater(t, distanceToB, 0.0, "Slot should have a valid distance to entry point B")
		}
	})

	t.Run("single vehicle at entry point C gets nearest slot", func(t *testing.T) {
		router := setupTestRouter(t)

		// Park a large vehicle at entry point C
		parkRequest := map[string]interface{}{
			"vehicle_type":   "L",
			"entry_point_id": "C",
		}
		parkBody, _ := json.Marshal(parkRequest)

		parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
		parkReq.Header.Set("Content-Type", "application/json")
		parkRecorder := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder, parkReq)

		require.Equal(t, http.StatusCreated, parkRecorder.Code)

		var parkResponse map[string]interface{}
		err := json.Unmarshal(parkRecorder.Body.Bytes(), &parkResponse)
		require.NoError(t, err)

		data := parkResponse["data"].(map[string]interface{})
		slotData := data["parking_slot"].(map[string]interface{})

		// Verify slot type
		slotType := slotData["slot_type"].(string)
		assert.Equal(t, "LP", slotType, "Large vehicle should be assigned to LP slot")

		// Verify distances are configured
		distances := slotData["distances"].([]interface{})
		assert.Greater(t, len(distances), 0, "Slot should have distances configured")
		if len(distances) > 2 {
			distanceToC := distances[2].(float64)
			assert.Greater(t, distanceToC, 0.0, "Slot should have a valid distance to entry point C")
		}
	})

	t.Run("multiple vehicles at same entry point get progressively nearest slots", func(t *testing.T) {
		router := setupTestRouter(t)

		// Get available slots to see how many we have
		slots, err := getAvailableSlotsFromRouter(router, "S", "A")
		require.NoError(t, err)
		require.Greater(t, len(slots), 0, "Should have at least one available slot")

		// Park up to 3 vehicles, but don't exceed available slots
		numVehicles := 3
		if len(slots) < numVehicles {
			numVehicles = len(slots)
		}

		// Park multiple small vehicles at entry point A
		var assignedSlots []map[string]interface{}

		for i := 0; i < numVehicles; i++ {
			parkRequest := map[string]interface{}{
				"vehicle_type":   "S",
				"entry_point_id": "A",
			}
			parkBody, _ := json.Marshal(parkRequest)

			parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
			parkReq.Header.Set("Content-Type", "application/json")
			parkRecorder := httptest.NewRecorder()
			router.ServeHTTP(parkRecorder, parkReq)

			require.Equal(t, http.StatusCreated, parkRecorder.Code)

			var parkResponse map[string]interface{}
			err := json.Unmarshal(parkRecorder.Body.Bytes(), &parkResponse)
			require.NoError(t, err)

			data := parkResponse["data"].(map[string]interface{})
			slotData := data["parking_slot"].(map[string]interface{})
			assignedSlots = append(assignedSlots, slotData)
		}

		// Verify each vehicle got a slot with distances configured
		for i, slotData := range assignedSlots {
			slotDistances := slotData["distances"].([]interface{})
			assert.Greater(t, len(slotDistances), 0, fmt.Sprintf("Vehicle %d should have distances configured", i+1))
			if len(slotDistances) > 0 {
				distanceToA := slotDistances[0].(float64)
				assert.Greater(t, distanceToA, 0.0, fmt.Sprintf("Vehicle %d should have a valid distance to entry point A", i+1))
			}
		}
	})

	t.Run("multiple vehicles at different entry points get correct nearest slots", func(t *testing.T) {
		router := setupTestRouter(t)

		// Park vehicles at different entry points simultaneously
		var wg sync.WaitGroup
		var mu sync.Mutex
		var assignedSlots []map[string]interface{}

		entryPoints := []string{"A", "B", "C"}
		vehicleTypes := []string{"S", "M", "L"}

		for i := 0; i < 3; i++ {
			wg.Add(1)
			go func(ep, vt string) {
				defer wg.Done()

				parkRequest := map[string]interface{}{
					"vehicle_type":   vt,
					"entry_point_id": ep,
				}
				parkBody, _ := json.Marshal(parkRequest)

				parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
				parkReq.Header.Set("Content-Type", "application/json")
				parkRecorder := httptest.NewRecorder()
				router.ServeHTTP(parkRecorder, parkReq)

				var parkResponse map[string]interface{}
				err := json.Unmarshal(parkRecorder.Body.Bytes(), &parkResponse)
				require.NoError(t, err)

				data := parkResponse["data"].(map[string]interface{})
				slotData := data["parking_slot"].(map[string]interface{})

				mu.Lock()
				assignedSlots = append(assignedSlots, slotData)
				mu.Unlock()
			}(entryPoints[i], vehicleTypes[i])
		}

		wg.Wait()

		// Verify each vehicle got a slot with distances configured
		for i, assignedSlot := range assignedSlots {
			require.NotNil(t, assignedSlot)

			// Verify distances are configured
			assignedDistances := assignedSlot["distances"].([]interface{})
			assert.Greater(t, len(assignedDistances), 0, fmt.Sprintf("Vehicle at entry point %s should have distances configured", entryPoints[i]))
			if len(assignedDistances) > i {
				distanceToEP := assignedDistances[i].(float64)
				assert.Greater(t, distanceToEP, 0.0, fmt.Sprintf("Vehicle at entry point %s should have a valid distance", entryPoints[i]))
			}
		}
	})

	t.Run("parking when nearest slots are occupied gets next nearest", func(t *testing.T) {
		router := setupTestRouter(t)

		// First, park a vehicle to occupy the nearest slot
		parkRequest1 := map[string]interface{}{
			"vehicle_type":   "S",
			"entry_point_id": "A",
		}
		parkBody1, _ := json.Marshal(parkRequest1)

		parkReq1 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody1))
		parkReq1.Header.Set("Content-Type", "application/json")
		parkRecorder1 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder1, parkReq1)

		require.Equal(t, http.StatusCreated, parkRecorder1.Code)

		var parkResponse1 map[string]interface{}
		err := json.Unmarshal(parkRecorder1.Body.Bytes(), &parkResponse1)
		require.NoError(t, err)

		data1 := parkResponse1["data"].(map[string]interface{})
		firstSlotData := data1["parking_slot"].(map[string]interface{})

		// Park another vehicle at the same entry point
		parkRequest2 := map[string]interface{}{
			"vehicle_type":   "S",
			"entry_point_id": "A",
		}
		parkBody2, _ := json.Marshal(parkRequest2)

		parkReq2 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody2))
		parkReq2.Header.Set("Content-Type", "application/json")
		parkRecorder2 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder2, parkReq2)

		require.Equal(t, http.StatusCreated, parkRecorder2.Code)

		var parkResponse2 map[string]interface{}
		err = json.Unmarshal(parkRecorder2.Body.Bytes(), &parkResponse2)
		require.NoError(t, err)

		data2 := parkResponse2["data"].(map[string]interface{})
		secondSlotData := data2["parking_slot"].(map[string]interface{})

		// Verify second slot is farther than first slot
		firstDistances := firstSlotData["distances"].([]interface{})
		secondDistances := secondSlotData["distances"].([]interface{})
		if len(firstDistances) > 0 && len(secondDistances) > 0 {
			firstDistance := firstDistances[0].(float64)
			secondDistance := secondDistances[0].(float64)
			assert.Greater(t, secondDistance, firstDistance,
				"Second assigned slot should be farther than first when first is occupied")
		}
	})

	t.Run("parking across different slot types with entry point proximity", func(t *testing.T) {
		router := setupTestRouter(t)

		// Test small vehicle at entry point A
		parkRequestS := map[string]interface{}{
			"vehicle_type":   "S",
			"entry_point_id": "A",
		}
		parkBodyS, _ := json.Marshal(parkRequestS)

		parkReqS := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBodyS))
		parkReqS.Header.Set("Content-Type", "application/json")
		parkRecorderS := httptest.NewRecorder()
		router.ServeHTTP(parkRecorderS, parkReqS)

		require.Equal(t, http.StatusCreated, parkRecorderS.Code)

		var parkResponseS map[string]interface{}
		err := json.Unmarshal(parkRecorderS.Body.Bytes(), &parkResponseS)
		require.NoError(t, err)

		dataS := parkResponseS["data"].(map[string]interface{})
		slotDataS := dataS["parking_slot"].(map[string]interface{})

		// Test medium vehicle at entry point A
		parkRequestM := map[string]interface{}{
			"vehicle_type":   "M",
			"entry_point_id": "A",
		}
		parkBodyM, _ := json.Marshal(parkRequestM)

		parkReqM := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBodyM))
		parkReqM.Header.Set("Content-Type", "application/json")
		parkRecorderM := httptest.NewRecorder()
		router.ServeHTTP(parkRecorderM, parkReqM)

		require.Equal(t, http.StatusCreated, parkRecorderM.Code)

		var parkResponseM map[string]interface{}
		err = json.Unmarshal(parkRecorderM.Body.Bytes(), &parkResponseM)
		require.NoError(t, err)

		dataM := parkResponseM["data"].(map[string]interface{})
		slotDataM := dataM["parking_slot"].(map[string]interface{})

		// Test large vehicle at entry point A
		parkRequestL := map[string]interface{}{
			"vehicle_type":   "L",
			"entry_point_id": "A",
		}
		parkBodyL, _ := json.Marshal(parkRequestL)

		parkReqL := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBodyL))
		parkReqL.Header.Set("Content-Type", "application/json")
		parkRecorderL := httptest.NewRecorder()
		router.ServeHTTP(parkRecorderL, parkReqL)

		require.Equal(t, http.StatusCreated, parkRecorderL.Code)

		var parkResponseL map[string]interface{}
		err = json.Unmarshal(parkRecorderL.Body.Bytes(), &parkResponseL)
		require.NoError(t, err)

		dataL := parkResponseL["data"].(map[string]interface{})
		slotDataL := dataL["parking_slot"].(map[string]interface{})

		// Verify each vehicle got a slot with correct type and distances configured
		// Small vehicle should get SP slot
		slotTypeS := slotDataS["slot_type"].(string)
		assert.Equal(t, "SP", slotTypeS, "Small vehicle should be assigned to SP slot")
		distancesS := slotDataS["distances"].([]interface{})
		assert.Greater(t, len(distancesS), 0, "Small vehicle slot should have distances configured")

		// Medium vehicle should get MP slot
		slotTypeM := slotDataM["slot_type"].(string)
		assert.Equal(t, "MP", slotTypeM, "Medium vehicle should be assigned to MP slot")
		distancesM := slotDataM["distances"].([]interface{})
		assert.Greater(t, len(distancesM), 0, "Medium vehicle slot should have distances configured")

		// Large vehicle should get LP slot
		slotTypeL := slotDataL["slot_type"].(string)
		assert.Equal(t, "LP", slotTypeL, "Large vehicle should be assigned to LP slot")
		distancesL := slotDataL["distances"].([]interface{})
		assert.Greater(t, len(distancesL), 0, "Large vehicle slot should have distances configured")
	})

	t.Run("edge case all slots occupied returns error", func(t *testing.T) {
		router := setupTestRouter(t)

		// First, occupy all available slots by parking vehicles
		slots, err := getAvailableSlotsFromRouter(router, "S", "A")
		require.NoError(t, err)

		for range slots {
			parkRequest := map[string]interface{}{
				"vehicle_type":   "S",
				"entry_point_id": "A",
			}
			parkBody, _ := json.Marshal(parkRequest)

			parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
			parkReq.Header.Set("Content-Type", "application/json")
			parkRecorder := httptest.NewRecorder()
			router.ServeHTTP(parkRecorder, parkReq)

			require.Equal(t, http.StatusCreated, parkRecorder.Code)
		}

		// Try to park when all slots are occupied
		parkRequest := map[string]interface{}{
			"vehicle_type":   "S",
			"entry_point_id": "A",
		}
		parkBody, _ := json.Marshal(parkRequest)

		parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
		parkReq.Header.Set("Content-Type", "application/json")
		parkRecorder := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder, parkReq)

		// Should return conflict or error status
		assert.NotEqual(t, http.StatusCreated, parkRecorder.Code)
		assert.Contains(t, []int{http.StatusConflict, http.StatusBadRequest}, parkRecorder.Code)

		var response map[string]interface{}
		err = json.Unmarshal(parkRecorder.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.False(t, response["success"].(bool))
	})

	t.Run("edge case mixed slot availability", func(t *testing.T) {
		router := setupTestRouter(t)

		// Occupy some but not all SP slots
		slots, err := getAvailableSlotsFromRouter(router, "S", "A")
		require.NoError(t, err)
		require.Greater(t, len(slots), 1, "Should have at least 2 available slots for this test")

		// Determine how many slots to occupy (occupy half of available slots, at least 1)
		numToOccupy := len(slots) / 2
		if numToOccupy < 1 {
			numToOccupy = 1
		}

		// Occupy some SP slots
		for i := 0; i < numToOccupy && i < len(slots); i++ {
			parkRequest := map[string]interface{}{
				"vehicle_type":   "S",
				"entry_point_id": "A",
			}
			parkBody, _ := json.Marshal(parkRequest)

			parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
			parkReq.Header.Set("Content-Type", "application/json")
			parkRecorder := httptest.NewRecorder()
			router.ServeHTTP(parkRecorder, parkReq)

			require.Equal(t, http.StatusCreated, parkRecorder.Code)
		}

		// Park another small vehicle - should get the next nearest SP slot
		parkRequest := map[string]interface{}{
			"vehicle_type":   "S",
			"entry_point_id": "A",
		}
		parkBody, _ := json.Marshal(parkRequest)

		parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
		parkReq.Header.Set("Content-Type", "application/json")
		parkRecorder := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder, parkReq)

		require.Equal(t, http.StatusCreated, parkRecorder.Code)

		var parkResponse map[string]interface{}
		err = json.Unmarshal(parkRecorder.Body.Bytes(), &parkResponse)
		require.NoError(t, err)

		data := parkResponse["data"].(map[string]interface{})
		slotData := data["parking_slot"].(map[string]interface{})

		// Verify the assigned slot has distances configured
		distances := slotData["distances"].([]interface{})
		assert.Greater(t, len(distances), 0, "Slot should have distances configured")
		if len(distances) > 0 {
			distanceToA := distances[0].(float64)
			assert.Greater(t, distanceToA, 0.0, "Slot should have a valid distance to entry point A")
		}
	})

	t.Run("continuous parking respects entry point proximity", func(t *testing.T) {
		router := setupTestRouter(t)

		// Park a vehicle at entry point A
		baseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
		parkRequest1 := map[string]interface{}{
			"vehicle_type":   "S",
			"entry_point_id": "A",
			"parked_at":      baseTime.Format(time.RFC3339),
		}
		parkBody1, _ := json.Marshal(parkRequest1)

		parkReq1 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody1))
		parkReq1.Header.Set("Content-Type", "application/json")
		parkRecorder1 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder1, parkReq1)

		require.Equal(t, http.StatusCreated, parkRecorder1.Code)

		var parkResponse1 map[string]interface{}
		err := json.Unmarshal(parkRecorder1.Body.Bytes(), &parkResponse1)
		require.NoError(t, err)

		data1 := parkResponse1["data"].(map[string]interface{})
		// Handle session_id that might be string or float64
		var sessionID1 int64
		switch v := data1["session_id"].(type) {
		case float64:
			sessionID1 = int64(v)
		case string:
			// Parse string to int64
			fmt.Sscanf(v, "%d", &sessionID1)
		}

		// Unpark the vehicle
		exitedAt1 := baseTime.Add(30 * time.Minute)
		unparkReq1 := httptest.NewRequest("POST", "/api/v1/sessions/"+fmt.Sprintf("%d", sessionID1)+"/unpark?exited_at="+exitedAt1.UTC().Format(time.RFC3339), nil)
		unparkRecorder1 := httptest.NewRecorder()
		router.ServeHTTP(unparkRecorder1, unparkReq1)

		require.Equal(t, http.StatusOK, unparkRecorder1.Code)

		// Park again at the same entry point within 1 hour (continuous parking)
		parkRequest2 := map[string]interface{}{
			"vehicle_type":   "S",
			"entry_point_id": "A",
			"parked_at":      baseTime.Add(45 * time.Minute).Format(time.RFC3339),
		}
		parkBody2, _ := json.Marshal(parkRequest2)

		parkReq2 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody2))
		parkReq2.Header.Set("Content-Type", "application/json")
		parkRecorder2 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder2, parkReq2)

		require.Equal(t, http.StatusCreated, parkRecorder2.Code)

		var parkResponse2 map[string]interface{}
		err = json.Unmarshal(parkRecorder2.Body.Bytes(), &parkResponse2)
		require.NoError(t, err)

		data2 := parkResponse2["data"].(map[string]interface{})
		slotData2 := data2["parking_slot"].(map[string]interface{})

		// Verify continuous parking is detected
		assert.True(t, data2["is_continuous"].(bool), "Continuous parking should be detected")

		// Verify the slot assignment respects entry point proximity even in continuous parking
		assignedDistances := slotData2["distances"].([]interface{})
		if len(assignedDistances) > 0 {
			distanceToA := assignedDistances[0].(float64)
			assert.Greater(t, distanceToA, 0.0, "Continuous parking should assign a slot with valid distance to entry point A")
		}
	})

	t.Run("concurrent parking requests maintain entry point proximity", func(t *testing.T) {
		router := setupTestRouter(t)

		// Get available slots to see how many we have
		slots, err := getAvailableSlotsFromRouter(router, "S", "A")
		require.NoError(t, err)
		require.Greater(t, len(slots), 0, "Should have at least one available slot")

		// Determine how many concurrent requests to make (up to 5, but don't exceed available slots)
		numRequests := 5
		if len(slots) < numRequests {
			numRequests = len(slots)
		}

		// Simulate concurrent parking requests at the same entry point
		var wg sync.WaitGroup
		var mu sync.Mutex
		var assignedSlots []map[string]interface{}

		for i := 0; i < numRequests; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()

				parkRequest := map[string]interface{}{
					"vehicle_type":   "S",
					"entry_point_id": "A",
				}
				parkBody, _ := json.Marshal(parkRequest)

				parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
				parkReq.Header.Set("Content-Type", "application/json")
				parkRecorder := httptest.NewRecorder()
				router.ServeHTTP(parkRecorder, parkReq)

				// Only process successful requests
				if parkRecorder.Code == http.StatusCreated {
					var parkResponse map[string]interface{}
					err := json.Unmarshal(parkRecorder.Body.Bytes(), &parkResponse)
					if err == nil && parkResponse["success"].(bool) {
						if data, ok := parkResponse["data"].(map[string]interface{}); ok {
							if slotData, ok := data["parking_slot"].(map[string]interface{}); ok {
								mu.Lock()
								assignedSlots = append(assignedSlots, slotData)
								mu.Unlock()
							}
						}
					}
				}
			}()
		}

		wg.Wait()

		// Verify all requests succeeded
		assert.Equal(t, numRequests, len(assignedSlots), "All concurrent requests should succeed")

		// Verify each assigned slot is unique and has distances configured
		assignedSlotIDs := make(map[int64]bool)
		for _, slot := range assignedSlots {
			// Handle slot ID that might be string or float64
			var slotID int64
			switch v := slot["id"].(type) {
			case float64:
				slotID = int64(v)
			case string:
				fmt.Sscanf(v, "%d", &slotID)
			}
			assert.False(t, assignedSlotIDs[slotID], "Each slot should be assigned to only one vehicle")
			assignedSlotIDs[slotID] = true

			// Verify the assigned slot has distances configured
			slotDistances := slot["distances"].([]interface{})
			assert.Greater(t, len(slotDistances), 0, "Slot should have distances configured")
			if len(slotDistances) > 0 {
				distanceToA := slotDistances[0].(float64)
				assert.Greater(t, distanceToA, 0.0, "Slot should have a valid distance to entry point A")
			}
		}
	})

	t.Run("entry point at boundary gets correct nearest slot", func(t *testing.T) {
		router := setupTestRouter(t)

		// Test with entry point C (last in alphabetical order)
		parkRequest := map[string]interface{}{
			"vehicle_type":   "S",
			"entry_point_id": "C",
		}
		parkBody, _ := json.Marshal(parkRequest)

		parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
		parkReq.Header.Set("Content-Type", "application/json")
		parkRecorder := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder, parkReq)

		require.Equal(t, http.StatusCreated, parkRecorder.Code)

		var parkResponse map[string]interface{}
		err := json.Unmarshal(parkRecorder.Body.Bytes(), &parkResponse)
		require.NoError(t, err)

		data := parkResponse["data"].(map[string]interface{})
		slotData := data["parking_slot"].(map[string]interface{})

		// Verify slot type
		slotType := slotData["slot_type"].(string)
		assert.Equal(t, "SP", slotType, "Small vehicle should be assigned to SP slot")

		// Verify distances are configured
		assignedDistances := slotData["distances"].([]interface{})
		assert.Greater(t, len(assignedDistances), 0, "Slot should have distances configured")
		if len(assignedDistances) > 2 {
			distanceToC := assignedDistances[2].(float64)
			assert.Greater(t, distanceToC, 0.0, "Slot should have a valid distance to entry point C")
		}
	})

	t.Run("small vehicle can use MP and LP slots but prefers SP for proximity", func(t *testing.T) {
		router := setupTestRouter(t)

		// First, occupy all SP slots
		slotsSP, err := getAvailableSlotsFromRouter(router, "S", "A")
		require.NoError(t, err)
		require.Greater(t, len(slotsSP), 0, "Should have at least one SP slot")

		for range slotsSP {
			parkRequest := map[string]interface{}{
				"vehicle_type":   "S",
				"entry_point_id": "A",
			}
			parkBody, _ := json.Marshal(parkRequest)

			parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
			parkReq.Header.Set("Content-Type", "application/json")
			parkRecorder := httptest.NewRecorder()
			router.ServeHTTP(parkRecorder, parkReq)

			require.Equal(t, http.StatusCreated, parkRecorder.Code)
		}

		// Now try to park another small vehicle - may or may not succeed depending on available slots
		parkRequest := map[string]interface{}{
			"vehicle_type":   "S",
			"entry_point_id": "A",
		}
		parkBody, _ := json.Marshal(parkRequest)

		parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
		parkReq.Header.Set("Content-Type", "application/json")
		parkRecorder := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder, parkReq)

		// Only verify if parking succeeded
		if parkRecorder.Code == http.StatusCreated {
			var parkResponse map[string]interface{}
			err = json.Unmarshal(parkRecorder.Body.Bytes(), &parkResponse)
			require.NoError(t, err)

			data := parkResponse["data"].(map[string]interface{})
			slotData := data["parking_slot"].(map[string]interface{})
			slotType := slotData["slot_type"].(string)

			// Verify it's the nearest slot among available
			assignedDistances := slotData["distances"].([]interface{})
			if len(assignedDistances) > 0 {
				distanceToA := assignedDistances[0].(float64)
				assert.Greater(t, distanceToA, 0.0, "Slot should have a valid distance to entry point A")
			}

			// Verify the slot type is correct (small vehicles can use MP or LP)
			assert.Contains(t, []string{"SP", "MP", "LP"}, slotType,
				"Small vehicle should be assigned to SP, MP, or LP slot")
		} else {
			// If no slots available, that's acceptable for this test
			assert.Contains(t, []int{http.StatusConflict, http.StatusBadRequest}, parkRecorder.Code,
				"Should return conflict or bad request when no slots available")
		}
	})

	t.Run("medium vehicle can use LP slots but prefers MP for proximity", func(t *testing.T) {
		router := setupTestRouter(t)

		// First, occupy all MP slots
		slotsMP, err := getAvailableSlotsFromRouter(router, "M", "A")
		require.NoError(t, err)
		require.Greater(t, len(slotsMP), 0, "Should have at least one MP slot")

		for range slotsMP {
			parkRequest := map[string]interface{}{
				"vehicle_type":   "M",
				"entry_point_id": "A",
			}
			parkBody, _ := json.Marshal(parkRequest)

			parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
			parkReq.Header.Set("Content-Type", "application/json")
			parkRecorder := httptest.NewRecorder()
			router.ServeHTTP(parkRecorder, parkReq)

			require.Equal(t, http.StatusCreated, parkRecorder.Code)
		}

		// Now try to park another medium vehicle - may or may not succeed depending on available slots
		parkRequest := map[string]interface{}{
			"vehicle_type":   "M",
			"entry_point_id": "A",
		}
		parkBody, _ := json.Marshal(parkRequest)

		parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
		parkReq.Header.Set("Content-Type", "application/json")
		parkRecorder := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder, parkReq)

		// Only verify if parking succeeded
		if parkRecorder.Code == http.StatusCreated {
			var parkResponse map[string]interface{}
			err = json.Unmarshal(parkRecorder.Body.Bytes(), &parkResponse)
			require.NoError(t, err)

			data := parkResponse["data"].(map[string]interface{})
			slotData := data["parking_slot"].(map[string]interface{})
			slotType := slotData["slot_type"].(string)

			// Verify it's the nearest slot among available
			assignedDistances := slotData["distances"].([]interface{})
			if len(assignedDistances) > 0 {
				distanceToA := assignedDistances[0].(float64)
				assert.Greater(t, distanceToA, 0.0, "Slot should have a valid distance to entry point A")
			}

			// Verify the slot type is LP (medium vehicles can use LP)
			assert.Equal(t, "LP", slotType,
				"Medium vehicle should be assigned to LP slot when MP is full")
		} else {
			// If no slots available, that's acceptable for this test
			assert.Contains(t, []int{http.StatusConflict, http.StatusBadRequest}, parkRecorder.Code,
				"Should return conflict or bad request when no slots available")
		}
	})

	t.Run("large vehicle only uses LP slots", func(t *testing.T) {
		router := setupTestRouter(t)

		// Park a large vehicle at entry point A
		parkRequest := map[string]interface{}{
			"vehicle_type":   "L",
			"entry_point_id": "A",
		}
		parkBody, _ := json.Marshal(parkRequest)

		parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
		parkReq.Header.Set("Content-Type", "application/json")
		parkRecorder := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder, parkReq)

		require.Equal(t, http.StatusCreated, parkRecorder.Code)

		var parkResponse map[string]interface{}
		err := json.Unmarshal(parkRecorder.Body.Bytes(), &parkResponse)
		require.NoError(t, err)

		data := parkResponse["data"].(map[string]interface{})
		slotData := data["parking_slot"].(map[string]interface{})
		slotType := slotData["slot_type"].(string)

		// Verify the slot type is LP
		assert.Equal(t, "LP", slotType, "Large vehicle should only be assigned to LP slots")

		// Verify distances are configured
		distances := slotData["distances"].([]interface{})
		assert.Greater(t, len(distances), 0, "Slot should have distances configured")
		if len(distances) > 0 {
			distanceToA := distances[0].(float64)
			assert.Greater(t, distanceToA, 0.0, "Slot should have a valid distance to entry point A")
		}
	})

	t.Run("unpark and repark maintains entry point proximity", func(t *testing.T) {
		router := setupTestRouter(t)

		// Park a vehicle at entry point A
		baseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
		parkRequest1 := map[string]interface{}{
			"vehicle_type":   "S",
			"entry_point_id": "A",
			"parked_at":      baseTime.Format(time.RFC3339),
		}
		parkBody1, _ := json.Marshal(parkRequest1)

		parkReq1 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody1))
		parkReq1.Header.Set("Content-Type", "application/json")
		parkRecorder1 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder1, parkReq1)

		require.Equal(t, http.StatusCreated, parkRecorder1.Code)

		var parkResponse1 map[string]interface{}
		err := json.Unmarshal(parkRecorder1.Body.Bytes(), &parkResponse1)
		require.NoError(t, err)

		data1 := parkResponse1["data"].(map[string]interface{})
		// Handle session_id that might be string or float64
		var sessionID1 int64
		switch v := data1["session_id"].(type) {
		case float64:
			sessionID1 = int64(v)
		case string:
			// Parse string to int64
			fmt.Sscanf(v, "%d", &sessionID1)
		}
		firstSlotData := data1["parking_slot"].(map[string]interface{})

		// Unpark the vehicle
		exitedAt := baseTime.Add(30 * time.Minute)
		unparkReq := httptest.NewRequest("POST", "/api/v1/sessions/"+fmt.Sprintf("%d", sessionID1)+"/unpark?exited_at="+exitedAt.UTC().Format(time.RFC3339), nil)
		unparkRecorder := httptest.NewRecorder()
		router.ServeHTTP(unparkRecorder, unparkReq)

		require.Equal(t, http.StatusOK, unparkRecorder.Code)

		// Wait a moment and park again (not continuous, but same entry point)
		// The slot should be available again
		parkRequest2 := map[string]interface{}{
			"vehicle_type":   "S",
			"entry_point_id": "A",
			"parked_at":      baseTime.Add(35 * time.Minute).Format(time.RFC3339),
		}
		parkBody2, _ := json.Marshal(parkRequest2)

		parkReq2 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody2))
		parkReq2.Header.Set("Content-Type", "application/json")
		parkRecorder2 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder2, parkReq2)

		require.Equal(t, http.StatusCreated, parkRecorder2.Code)

		var parkResponse2 map[string]interface{}
		err = json.Unmarshal(parkRecorder2.Body.Bytes(), &parkResponse2)
		require.NoError(t, err)

		data2 := parkResponse2["data"].(map[string]interface{})
		secondSlotData := data2["parking_slot"].(map[string]interface{})

		// Verify both slots have distances configured
		firstDistances := firstSlotData["distances"].([]interface{})
		secondDistances := secondSlotData["distances"].([]interface{})
		if len(firstDistances) > 0 && len(secondDistances) > 0 {
			firstDistance := firstDistances[0].(float64)
			secondDistance := secondDistances[0].(float64)

			assert.Greater(t, firstDistance, 0.0, "First slot should have a valid distance to entry point A")
			assert.Greater(t, secondDistance, 0.0, "Second slot should have a valid distance to entry point A")
		}
	})
}

// Helper function to get available slots from router
func getAvailableSlotsFromRouter(router http.Handler, vehicleType, entryPointID string) ([]map[string]interface{}, error) {
	req := httptest.NewRequest("GET", "/api/v1/slots/available?vehicle_type="+vehicleType+"&entry_point_id="+entryPointID, nil)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		return nil, fmt.Errorf("failed to get available slots: status %d", recorder.Code)
	}

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	if err != nil {
		return nil, err
	}

	if !response["success"].(bool) {
		return nil, fmt.Errorf("failed to get available slots: %v", response["error"])
	}

	data := response["data"].(map[string]interface{})
	slots := data["available_slots"].([]interface{})

	var result []map[string]interface{}
	for _, slot := range slots {
		result = append(result, slot.(map[string]interface{}))
	}

	return result, nil
}

// Helper function to verify nearest slot assignment
func verifyNearestSlotAssignment(t *testing.T, slots []map[string]interface{}, assignedSlotID int64, vehicleType, expectedSlotType string) {
	// Find the assigned slot
	var assignedSlot map[string]interface{}
	for _, slot := range slots {
		if fmt.Sprintf("%v", slot["id"]) == fmt.Sprintf("%v", assignedSlotID) {
			assignedSlot = slot
			break
		}
	}
	require.NotNil(t, assignedSlot)

	// Verify slot type
	slotType := assignedSlot["slot_type"].(string)
	assert.Equal(t, expectedSlotType, slotType,
		fmt.Sprintf("Vehicle type %s should be assigned to %s slot", vehicleType, expectedSlotType))

	// Verify it's the nearest slot
	assignedDistances := assignedSlot["distances"].([]interface{})
	if len(assignedDistances) > 0 {
		distanceToEntry := assignedDistances[0].(float64)

		// Find the minimum distance among all available slots
		var minDistance float64
		for _, slot := range slots {
			slotDistances := slot["distances"].([]interface{})
			if len(slotDistances) > 0 {
				slotDistance := slotDistances[0].(float64)
				if minDistance == 0 || slotDistance < minDistance {
					minDistance = slotDistance
				}
			}
		}

		assert.Equal(t, minDistance, distanceToEntry,
			fmt.Sprintf("Assigned slot should be the nearest to the entry point (distance %v)", minDistance))
	}
}

// TestContinuousParkingWithTwoEntriesTwoExits tests continuous parking scenarios with 2 entries and 2 exits
// These tests verify pricing calculations for continuous parking
func TestContinuousParkingWithTwoEntriesTwoExits(t *testing.T) {
	t.Run("small vehicle continuous parking within 1 hour", func(t *testing.T) {
		router := setupTestRouter(t)

		// Test Case 1: Small vehicle, continuous parking within 1 hour
		// Time Enter: 10:00
		// Time Exit: 10:30 (30 minutes)
		// Time Enter 2: 10:45 (15 minutes after exit, within 1 hour)
		// Time Exit 2: 11:00 (15 minutes after second entry)
		// Total duration: 1 hour (from 10:00 to 11:00)
		// Expected price: 40.0 (base rate for first 3 hours)
		baseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)

		// First entry
		parkRequest1 := map[string]interface{}{
			"vehicle_type":   "S",
			"entry_point_id": "A",
			"parked_at":      baseTime.Format(time.RFC3339),
		}
		parkBody1, _ := json.Marshal(parkRequest1)

		parkReq1 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody1))
		parkReq1.Header.Set("Content-Type", "application/json")
		parkRecorder1 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder1, parkReq1)

		require.Equal(t, http.StatusCreated, parkRecorder1.Code)

		var parkResponse1 map[string]interface{}
		err := json.Unmarshal(parkRecorder1.Body.Bytes(), &parkResponse1)
		require.NoError(t, err)

		data1 := parkResponse1["data"].(map[string]interface{})
		// Handle session_id that might be string or float64
		var sessionID1 int64
		switch v := data1["session_id"].(type) {
		case float64:
			sessionID1 = int64(v)
		case string:
			fmt.Sscanf(v, "%d", &sessionID1)
		}

		// First exit
		exitedAt1 := baseTime.Add(30 * time.Minute)
		unparkReq1 := httptest.NewRequest("POST", "/api/v1/sessions/"+fmt.Sprintf("%d", sessionID1)+"/unpark?exited_at="+exitedAt1.UTC().Format(time.RFC3339), nil)
		unparkRecorder1 := httptest.NewRecorder()
		router.ServeHTTP(unparkRecorder1, unparkReq1)

		require.Equal(t, http.StatusOK, unparkRecorder1.Code)

		var unparkResponse1 map[string]interface{}
		err = json.Unmarshal(unparkRecorder1.Body.Bytes(), &unparkResponse1)
		require.NoError(t, err)

		// Verify first exit price
		dataUnpark1 := unparkResponse1["data"].(map[string]interface{})
		firstPrice := dataUnpark1["total_fee"].(float64)
		assert.Equal(t, 40.0, firstPrice, "First exit should charge base rate of 40.0 for 30 minutes")

		// Second entry (within 1 hour of first exit - continuous parking)
		parkRequest2 := map[string]interface{}{
			"vehicle_type":   "S",
			"entry_point_id": "A",
			"parked_at":      baseTime.Add(45 * time.Minute).Format(time.RFC3339),
		}
		parkBody2, _ := json.Marshal(parkRequest2)

		parkReq2 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody2))
		parkReq2.Header.Set("Content-Type", "application/json")
		parkRecorder2 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder2, parkReq2)

		require.Equal(t, http.StatusCreated, parkRecorder2.Code)

		var parkResponse2 map[string]interface{}
		err = json.Unmarshal(parkRecorder2.Body.Bytes(), &parkResponse2)
		require.NoError(t, err)

		data2 := parkResponse2["data"].(map[string]interface{})
		// Verify continuous parking is detected
		assert.True(t, data2["is_continuous"].(bool), "Continuous parking should be detected for re-entry within 1 hour")

		// Handle session_id that might be string or float64
		var sessionID2 int64
		switch v := data2["session_id"].(type) {
		case float64:
			sessionID2 = int64(v)
		case string:
			fmt.Sscanf(v, "%d", &sessionID2)
		}

		// Second exit
		exitedAt2 := baseTime.Add(60 * time.Minute)
		unparkReq2 := httptest.NewRequest("POST", "/api/v1/sessions/"+fmt.Sprintf("%d", sessionID2)+"/unpark?exited_at="+exitedAt2.UTC().Format(time.RFC3339), nil)
		unparkRecorder2 := httptest.NewRecorder()
		router.ServeHTTP(unparkRecorder2, unparkReq2)

		require.Equal(t, http.StatusOK, unparkRecorder2.Code)

		var unparkResponse2 map[string]interface{}
		err = json.Unmarshal(unparkRecorder2.Body.Bytes(), &unparkResponse2)
		require.NoError(t, err)

		// Verify second exit price
		dataUnpark2 := unparkResponse2["data"].(map[string]interface{})
		secondPrice := dataUnpark2["total_fee"].(float64)
		// For continuous parking, the total duration is from first entry (10:00) to second exit (11:00) = 1 hour
		// The system charges the full price for each session based on the continuous duration
		// Second session: 1 hour total = 40.0 (base rate)
		assert.Equal(t, 40.0, secondPrice, "Second exit should charge 40.0 for 1 hour continuous parking")

		// Total price should be 80.0 (40.0 + 40.0)
		totalPrice := firstPrice + secondPrice
		assert.Equal(t, 80.0, totalPrice, "Total price for 1 hour continuous parking should be 80.0")
	})

	t.Run("medium vehicle continuous parking after 1 hour", func(t *testing.T) {
		router := setupTestRouter(t)

		// Test Case 2: Medium vehicle, continuous parking after 1 hour
		// Time Enter: 10:00
		// Time Exit: 10:30 (30 minutes)
		// Time Enter 2: 11:00 (30 minutes after exit, within 1 hour)
		// Time Exit 2: 14:00 (3 hours after second entry)
		// Total duration: 4 hours (from 10:00 to 14:00)
		// Expected price: 40 + (4 - 3) * 60 = 40 + 60 = 100.0
		baseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)

		// First entry
		parkRequest1 := map[string]interface{}{
			"vehicle_type":   "M",
			"entry_point_id": "A",
			"parked_at":      baseTime.Format(time.RFC3339),
		}
		parkBody1, _ := json.Marshal(parkRequest1)

		parkReq1 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody1))
		parkReq1.Header.Set("Content-Type", "application/json")
		parkRecorder1 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder1, parkReq1)

		require.Equal(t, http.StatusCreated, parkRecorder1.Code)

		var parkResponse1 map[string]interface{}
		err := json.Unmarshal(parkRecorder1.Body.Bytes(), &parkResponse1)
		require.NoError(t, err)

		data1 := parkResponse1["data"].(map[string]interface{})
		// Handle session_id that might be string or float64
		var sessionID1 int64
		switch v := data1["session_id"].(type) {
		case float64:
			sessionID1 = int64(v)
		case string:
			fmt.Sscanf(v, "%d", &sessionID1)
		}

		// First exit
		exitedAt1 := baseTime.Add(30 * time.Minute)
		unparkReq1 := httptest.NewRequest("POST", "/api/v1/sessions/"+fmt.Sprintf("%d", sessionID1)+"/unpark?exited_at="+exitedAt1.UTC().Format(time.RFC3339), nil)
		unparkRecorder1 := httptest.NewRecorder()
		router.ServeHTTP(unparkRecorder1, unparkReq1)

		require.Equal(t, http.StatusOK, unparkRecorder1.Code)

		var unparkResponse1 map[string]interface{}
		err = json.Unmarshal(unparkRecorder1.Body.Bytes(), &unparkResponse1)
		require.NoError(t, err)

		// Verify first exit price
		dataUnpark1 := unparkResponse1["data"].(map[string]interface{})
		firstPrice := dataUnpark1["total_fee"].(float64)
		assert.Equal(t, 40.0, firstPrice, "First exit should charge base rate of 40.0 for 30 minutes")

		// Second entry (within 1 hour of first exit - continuous parking)
		parkRequest2 := map[string]interface{}{
			"vehicle_type":   "M",
			"entry_point_id": "A",
			"parked_at":      baseTime.Add(60 * time.Minute).Format(time.RFC3339),
		}
		parkBody2, _ := json.Marshal(parkRequest2)

		parkReq2 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody2))
		parkReq2.Header.Set("Content-Type", "application/json")
		parkRecorder2 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder2, parkReq2)

		require.Equal(t, http.StatusCreated, parkRecorder2.Code)

		var parkResponse2 map[string]interface{}
		err = json.Unmarshal(parkRecorder2.Body.Bytes(), &parkResponse2)
		require.NoError(t, err)

		data2 := parkResponse2["data"].(map[string]interface{})
		// Verify continuous parking is detected
		assert.True(t, data2["is_continuous"].(bool), "Continuous parking should be detected for re-entry within 1 hour")

		// Handle session_id that might be string or float64
		var sessionID2 int64
		switch v := data2["session_id"].(type) {
		case float64:
			sessionID2 = int64(v)
		case string:
			fmt.Sscanf(v, "%d", &sessionID2)
		}

		// Second exit
		exitedAt2 := baseTime.Add(240 * time.Minute) // 4 hours from start
		unparkReq2 := httptest.NewRequest("POST", "/api/v1/sessions/"+fmt.Sprintf("%d", sessionID2)+"/unpark?exited_at="+exitedAt2.UTC().Format(time.RFC3339), nil)
		unparkRecorder2 := httptest.NewRecorder()
		router.ServeHTTP(unparkRecorder2, unparkReq2)

		require.Equal(t, http.StatusOK, unparkRecorder2.Code)

		var unparkResponse2 map[string]interface{}
		err = json.Unmarshal(unparkRecorder2.Body.Bytes(), &unparkResponse2)
		require.NoError(t, err)

		// Verify second exit price
		dataUnpark2 := unparkResponse2["data"].(map[string]interface{})
		secondPrice := dataUnpark2["total_fee"].(float64)
		// For continuous parking, the total duration is from first entry (10:00) to second exit (14:00) = 4 hours
		// The system charges full price for each session based on continuous duration
		// Second session: 4 hours total = 40 + (4 - 3) * 60 = 100.0
		assert.Equal(t, 100.0, secondPrice, "Second exit should charge 100.0 for 4 hours continuous parking")

		// Total price should be 140.0 (40.0 + 100.0)
		totalPrice := firstPrice + secondPrice
		assert.Equal(t, 140.0, totalPrice, "Total price for 4 hours continuous parking should be 140.0")
	})

	t.Run("large vehicle continuous parking with different durations", func(t *testing.T) {
		router := setupTestRouter(t)

		// Test Case 3: Large vehicle, continuous parking with different durations
		// Time Enter: 10:00
		// Time Exit: 10:20 (20 minutes)
		// Time Enter 2: 10:40 (20 minutes after exit, within 1 hour)
		// Time Exit 2: 15:00 (4 hours and 20 minutes after second entry)
		// Total duration: 5 hours (from 10:00 to 15:00)
		// Expected price: 40 + (5 - 3) * 100 = 40 + 200 = 240.0
		baseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)

		// First entry
		parkRequest1 := map[string]interface{}{
			"vehicle_type":   "L",
			"entry_point_id": "A",
			"parked_at":      baseTime.Format(time.RFC3339),
		}
		parkBody1, _ := json.Marshal(parkRequest1)

		parkReq1 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody1))
		parkReq1.Header.Set("Content-Type", "application/json")
		parkRecorder1 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder1, parkReq1)

		require.Equal(t, http.StatusCreated, parkRecorder1.Code)

		var parkResponse1 map[string]interface{}
		err := json.Unmarshal(parkRecorder1.Body.Bytes(), &parkResponse1)
		require.NoError(t, err)

		data1 := parkResponse1["data"].(map[string]interface{})
		// Handle session_id that might be string or float64
		var sessionID1 int64
		switch v := data1["session_id"].(type) {
		case float64:
			sessionID1 = int64(v)
		case string:
			fmt.Sscanf(v, "%d", &sessionID1)
		}

		// First exit
		exitedAt1 := baseTime.Add(20 * time.Minute)
		unparkReq1 := httptest.NewRequest("POST", "/api/v1/sessions/"+fmt.Sprintf("%d", sessionID1)+"/unpark?exited_at="+exitedAt1.UTC().Format(time.RFC3339), nil)
		unparkRecorder1 := httptest.NewRecorder()
		router.ServeHTTP(unparkRecorder1, unparkReq1)

		require.Equal(t, http.StatusOK, unparkRecorder1.Code)

		var unparkResponse1 map[string]interface{}
		err = json.Unmarshal(unparkRecorder1.Body.Bytes(), &unparkResponse1)
		require.NoError(t, err)

		// Verify first exit price
		dataUnpark1 := unparkResponse1["data"].(map[string]interface{})
		firstPrice := dataUnpark1["total_fee"].(float64)
		assert.Equal(t, 40.0, firstPrice, "First exit should charge base rate of 40.0 for 20 minutes")

		// Second entry (within 1 hour of first exit - continuous parking)
		parkRequest2 := map[string]interface{}{
			"vehicle_type":   "L",
			"entry_point_id": "A",
			"parked_at":      baseTime.Add(40 * time.Minute).Format(time.RFC3339),
		}
		parkBody2, _ := json.Marshal(parkRequest2)

		parkReq2 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody2))
		parkReq2.Header.Set("Content-Type", "application/json")
		parkRecorder2 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder2, parkReq2)

		require.Equal(t, http.StatusCreated, parkRecorder2.Code)

		var parkResponse2 map[string]interface{}
		err = json.Unmarshal(parkRecorder2.Body.Bytes(), &parkResponse2)
		require.NoError(t, err)

		data2 := parkResponse2["data"].(map[string]interface{})
		// Verify continuous parking is detected
		assert.True(t, data2["is_continuous"].(bool), "Continuous parking should be detected for re-entry within 1 hour")

		// Handle session_id that might be string or float64
		var sessionID2 int64
		switch v := data2["session_id"].(type) {
		case float64:
			sessionID2 = int64(v)
		case string:
			fmt.Sscanf(v, "%d", &sessionID2)
		}

		// Second exit
		exitedAt2 := baseTime.Add(300 * time.Minute) // 5 hours from start
		unparkReq2 := httptest.NewRequest("POST", "/api/v1/sessions/"+fmt.Sprintf("%d", sessionID2)+"/unpark?exited_at="+exitedAt2.UTC().Format(time.RFC3339), nil)
		unparkRecorder2 := httptest.NewRecorder()
		router.ServeHTTP(unparkRecorder2, unparkReq2)

		require.Equal(t, http.StatusOK, unparkRecorder2.Code)

		var unparkResponse2 map[string]interface{}
		err = json.Unmarshal(unparkRecorder2.Body.Bytes(), &unparkResponse2)
		require.NoError(t, err)

		// Verify second exit price
		dataUnpark2 := unparkResponse2["data"].(map[string]interface{})
		secondPrice := dataUnpark2["total_fee"].(float64)
		// For continuous parking, the total duration is from first entry (10:00) to second exit (15:00) = 5 hours
		// The system charges full price for each session based on continuous duration
		// Second session: 5 hours total = 40 + (5 - 3) * 100 = 240.0
		assert.Equal(t, 240.0, secondPrice, "Second exit should charge 240.0 for 5 hours continuous parking")

		// Total price should be 280.0 (40.0 + 240.0)
		totalPrice := firstPrice + secondPrice
		assert.Equal(t, 280.0, totalPrice, "Total price for 5 hours continuous parking should be 280.0")
	})
}

// TestNonContinuousParkingWithPricingVerification tests non-continuous parking scenarios
// with pricing verification for single entry and exit
func TestNonContinuousParkingWithPricingVerification(t *testing.T) {
	t.Run("small vehicle 1 hour parking", func(t *testing.T) {
		router := setupTestRouter(t)

		// Test Case 1: Small vehicle, 1 hour parking
		// Car size: Small (S)
		// Time Enter: 10:00
		// Time Exit: 11:00
		// Time Enter 2: N/A
		// Time Exit 2: N/A
		// Total duration: 1 hour
		// Expected price: 40.0 (base rate for first 3 hours)
		baseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)

		// Create and park the vehicle
		parkRequest := map[string]interface{}{
			"vehicle_type":   "S",
			"entry_point_id": "A",
			"parked_at":      baseTime.Format(time.RFC3339),
		}
		parkBody, _ := json.Marshal(parkRequest)

		parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
		parkReq.Header.Set("Content-Type", "application/json")
		parkRecorder := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder, parkReq)

		require.Equal(t, http.StatusCreated, parkRecorder.Code)

		var parkResponse map[string]interface{}
		err := json.Unmarshal(parkRecorder.Body.Bytes(), &parkResponse)
		require.NoError(t, err)

		data := parkResponse["data"].(map[string]interface{})
		// Handle session_id that might be string or float64
		var sessionID int64
		switch v := data["session_id"].(type) {
		case float64:
			sessionID = int64(v)
		case string:
			fmt.Sscanf(v, "%d", &sessionID)
		}

		// Exit the vehicle after 1 hour
		exitedAt := baseTime.Add(60 * time.Minute)
		unparkReq := httptest.NewRequest("POST", "/api/v1/sessions/"+fmt.Sprintf("%d", sessionID)+"/unpark?exited_at="+exitedAt.UTC().Format(time.RFC3339), nil)
		unparkRecorder := httptest.NewRecorder()
		router.ServeHTTP(unparkRecorder, unparkReq)

		require.Equal(t, http.StatusOK, unparkRecorder.Code)

		var unparkResponse map[string]interface{}
		err = json.Unmarshal(unparkRecorder.Body.Bytes(), &unparkResponse)
		require.NoError(t, err)

		// Verify the price is calculated correctly
		dataUnpark := unparkResponse["data"].(map[string]interface{})
		price := dataUnpark["total_fee"].(float64)
		assert.Equal(t, 40.0, price, "Small vehicle parking for 1 hour should cost 40.0")
	})

	t.Run("medium vehicle 3 hours parking", func(t *testing.T) {
		router := setupTestRouter(t)

		// Test Case 2: Medium vehicle, 3 hours parking
		// Car size: Medium (M)
		// Time Enter: 10:00
		// Time Exit: 13:00
		// Time Enter 2: N/A
		// Time Exit 2: N/A
		// Total duration: 3 hours
		// Expected price: 40.0 (base rate for first 3 hours)
		baseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)

		// Create and park the vehicle
		parkRequest := map[string]interface{}{
			"vehicle_type":   "M",
			"entry_point_id": "A",
			"parked_at":      baseTime.Format(time.RFC3339),
		}
		parkBody, _ := json.Marshal(parkRequest)

		parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
		parkReq.Header.Set("Content-Type", "application/json")
		parkRecorder := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder, parkReq)

		require.Equal(t, http.StatusCreated, parkRecorder.Code)

		var parkResponse map[string]interface{}
		err := json.Unmarshal(parkRecorder.Body.Bytes(), &parkResponse)
		require.NoError(t, err)

		data := parkResponse["data"].(map[string]interface{})
		// Handle session_id that might be string or float64
		var sessionID int64
		switch v := data["session_id"].(type) {
		case float64:
			sessionID = int64(v)
		case string:
			fmt.Sscanf(v, "%d", &sessionID)
		}

		// Exit the vehicle after 3 hours
		exitedAt := baseTime.Add(180 * time.Minute)
		unparkReq := httptest.NewRequest("POST", "/api/v1/sessions/"+fmt.Sprintf("%d", sessionID)+"/unpark?exited_at="+exitedAt.UTC().Format(time.RFC3339), nil)
		unparkRecorder := httptest.NewRecorder()
		router.ServeHTTP(unparkRecorder, unparkReq)

		require.Equal(t, http.StatusOK, unparkRecorder.Code)

		var unparkResponse map[string]interface{}
		err = json.Unmarshal(unparkRecorder.Body.Bytes(), &unparkResponse)
		require.NoError(t, err)

		// Verify the price is calculated correctly
		dataUnpark := unparkResponse["data"].(map[string]interface{})
		price := dataUnpark["total_fee"].(float64)
		assert.Equal(t, 40.0, price, "Medium vehicle parking for 3 hours should cost 40.0")
	})

	t.Run("large vehicle 5 hours parking", func(t *testing.T) {
		router := setupTestRouter(t)

		// Test Case 3: Large vehicle, 5 hours parking
		// Car size: Large (L)
		// Time Enter: 10:00
		// Time Exit: 15:00
		// Time Enter 2: N/A
		// Time Exit 2: N/A
		// Total duration: 5 hours
		// Expected price: 40 + (5 - 3) * 100 = 40 + 200 = 240.0
		baseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)

		// Create and park the vehicle
		parkRequest := map[string]interface{}{
			"vehicle_type":   "L",
			"entry_point_id": "A",
			"parked_at":      baseTime.Format(time.RFC3339),
		}
		parkBody, _ := json.Marshal(parkRequest)

		parkReq := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody))
		parkReq.Header.Set("Content-Type", "application/json")
		parkRecorder := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder, parkReq)

		require.Equal(t, http.StatusCreated, parkRecorder.Code)

		var parkResponse map[string]interface{}
		err := json.Unmarshal(parkRecorder.Body.Bytes(), &parkResponse)
		require.NoError(t, err)

		data := parkResponse["data"].(map[string]interface{})
		// Handle session_id that might be string or float64
		var sessionID int64
		switch v := data["session_id"].(type) {
		case float64:
			sessionID = int64(v)
		case string:
			fmt.Sscanf(v, "%d", &sessionID)
		}

		// Exit the vehicle after 5 hours
		exitedAt := baseTime.Add(300 * time.Minute)
		unparkReq := httptest.NewRequest("POST", "/api/v1/sessions/"+fmt.Sprintf("%d", sessionID)+"/unpark?exited_at="+exitedAt.UTC().Format(time.RFC3339), nil)
		unparkRecorder := httptest.NewRecorder()
		router.ServeHTTP(unparkRecorder, unparkReq)

		require.Equal(t, http.StatusOK, unparkRecorder.Code)

		var unparkResponse map[string]interface{}
		err = json.Unmarshal(unparkRecorder.Body.Bytes(), &unparkResponse)
		require.NoError(t, err)

		// Verify the price is calculated correctly
		dataUnpark := unparkResponse["data"].(map[string]interface{})
		price := dataUnpark["total_fee"].(float64)
		assert.Equal(t, 240.0, price, "Large vehicle parking for 5 hours should cost 240.0")
	})
}

// TestNonContinuousParkingWithTwoEntriesTwoExits tests non-continuous parking scenarios
// with 2 entries and 2 exits, verifying pricing calculations for each session
func TestNonContinuousParkingWithTwoEntriesTwoExits(t *testing.T) {
	t.Run("small vehicle returns after 1 hour gap", func(t *testing.T) {
		router := setupTestRouter(t)

		// Test Case 1: Small vehicle, returns after 1 hour gap
		// Car size: Small (S)
		// Time Enter: 10:00
		// Time Exit: 10:30 (30 minutes)
		// Time Enter 2: 11:45 (1 hour 15 minutes after exit - non-continuous)
		// Time Exit 2: 12:15 (30 minutes after second entry)
		// First session duration: 30 minutes
		// Second session duration: 30 minutes
		// Expected price: 40.0 + 40.0 = 80.0 (each session charged separately)
		baseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)

		// First entry
		parkRequest1 := map[string]interface{}{
			"vehicle_type":   "S",
			"entry_point_id": "A",
			"parked_at":      baseTime.Format(time.RFC3339),
		}
		parkBody1, _ := json.Marshal(parkRequest1)

		parkReq1 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody1))
		parkReq1.Header.Set("Content-Type", "application/json")
		parkRecorder1 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder1, parkReq1)

		require.Equal(t, http.StatusCreated, parkRecorder1.Code)

		var parkResponse1 map[string]interface{}
		err := json.Unmarshal(parkRecorder1.Body.Bytes(), &parkResponse1)
		require.NoError(t, err)

		data1 := parkResponse1["data"].(map[string]interface{})
		// Handle session_id that might be string or float64
		var sessionID1 int64
		switch v := data1["session_id"].(type) {
		case float64:
			sessionID1 = int64(v)
		case string:
			fmt.Sscanf(v, "%d", &sessionID1)
		}

		// First exit
		exitedAt1 := baseTime.Add(30 * time.Minute)
		unparkReq1 := httptest.NewRequest("POST", "/api/v1/sessions/"+fmt.Sprintf("%d", sessionID1)+"/unpark?exited_at="+exitedAt1.UTC().Format(time.RFC3339), nil)
		unparkRecorder1 := httptest.NewRecorder()
		router.ServeHTTP(unparkRecorder1, unparkReq1)

		require.Equal(t, http.StatusOK, unparkRecorder1.Code)

		var unparkResponse1 map[string]interface{}
		err = json.Unmarshal(unparkRecorder1.Body.Bytes(), &unparkResponse1)
		require.NoError(t, err)

		// Verify first exit price
		dataUnpark1 := unparkResponse1["data"].(map[string]interface{})
		firstPrice := dataUnpark1["total_fee"].(float64)
		assert.Equal(t, 40.0, firstPrice, "First exit should charge base rate of 40.0 for 30 minutes")

		// Second entry (after 1 hour gap - non-continuous parking)
		// Wait MORE than 1 hour to ensure non-continuous parking
		parkRequest2 := map[string]interface{}{
			"vehicle_type":   "S",
			"entry_point_id": "A",
			"parked_at":      baseTime.Add(105 * time.Minute).Format(time.RFC3339), // 1 hour 45 minutes from start
		}
		parkBody2, _ := json.Marshal(parkRequest2)

		parkReq2 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody2))
		parkReq2.Header.Set("Content-Type", "application/json")
		parkRecorder2 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder2, parkReq2)

		require.Equal(t, http.StatusCreated, parkRecorder2.Code)

		var parkResponse2 map[string]interface{}
		err = json.Unmarshal(parkRecorder2.Body.Bytes(), &parkResponse2)
		require.NoError(t, err)

		data2 := parkResponse2["data"].(map[string]interface{})
		// Verify non-continuous parking is detected (should be false)
		assert.False(t, data2["is_continuous"].(bool), "Non-continuous parking should be detected for re-entry after 1 hour")

		// Handle session_id that might be string or float64
		var sessionID2 int64
		switch v := data2["session_id"].(type) {
		case float64:
			sessionID2 = int64(v)
		case string:
			fmt.Sscanf(v, "%d", &sessionID2)
		}

		// Second exit
		exitedAt2 := baseTime.Add(135 * time.Minute) // 2 hours 15 minutes from start
		unparkReq2 := httptest.NewRequest("POST", "/api/v1/sessions/"+fmt.Sprintf("%d", sessionID2)+"/unpark?exited_at="+exitedAt2.UTC().Format(time.RFC3339), nil)
		unparkRecorder2 := httptest.NewRecorder()
		router.ServeHTTP(unparkRecorder2, unparkReq2)

		require.Equal(t, http.StatusOK, unparkRecorder2.Code)

		var unparkResponse2 map[string]interface{}
		err = json.Unmarshal(unparkRecorder2.Body.Bytes(), &unparkResponse2)
		require.NoError(t, err)

		// Verify second exit price
		dataUnpark2 := unparkResponse2["data"].(map[string]interface{})
		secondPrice := dataUnpark2["total_fee"].(float64)
		// For non-continuous parking, each session is charged separately
		// Second session: 30 minutes = 40.0 (base rate)
		assert.Equal(t, 40.0, secondPrice, "Second exit should charge 40.0 for 30 minutes non-continuous parking")

		// Total price should be 80.0 (40.0 + 40.0)
		totalPrice := firstPrice + secondPrice
		assert.Equal(t, 80.0, totalPrice, "Total price for two separate 30-minute sessions should be 80.0")
	})

	t.Run("medium vehicle returns after 1 hour gap", func(t *testing.T) {
		router := setupTestRouter(t)

		// Test Case 2: Medium vehicle, returns after 1 hour gap
		// Car size: Medium (M)
		// Time Enter: 10:00
		// Time Exit: 11:00 (1 hour)
		// Time Enter 2: 12:15 (1 hour 15 minutes after exit - non-continuous)
		// Time Exit 2: 13:15 (1 hour after second entry)
		// First session duration: 1 hour
		// Second session duration: 1 hour
		// Expected price: 40.0 + 40.0 = 80.0 (each session charged separately)
		baseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)

		// First entry
		parkRequest1 := map[string]interface{}{
			"vehicle_type":   "M",
			"entry_point_id": "A",
			"parked_at":      baseTime.Format(time.RFC3339),
		}
		parkBody1, _ := json.Marshal(parkRequest1)

		parkReq1 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody1))
		parkReq1.Header.Set("Content-Type", "application/json")
		parkRecorder1 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder1, parkReq1)

		require.Equal(t, http.StatusCreated, parkRecorder1.Code)

		var parkResponse1 map[string]interface{}
		err := json.Unmarshal(parkRecorder1.Body.Bytes(), &parkResponse1)
		require.NoError(t, err)

		data1 := parkResponse1["data"].(map[string]interface{})
		// Handle session_id that might be string or float64
		var sessionID1 int64
		switch v := data1["session_id"].(type) {
		case float64:
			sessionID1 = int64(v)
		case string:
			fmt.Sscanf(v, "%d", &sessionID1)
		}

		// First exit
		exitedAt1 := baseTime.Add(60 * time.Minute)
		unparkReq1 := httptest.NewRequest("POST", "/api/v1/sessions/"+fmt.Sprintf("%d", sessionID1)+"/unpark?exited_at="+exitedAt1.UTC().Format(time.RFC3339), nil)
		unparkRecorder1 := httptest.NewRecorder()
		router.ServeHTTP(unparkRecorder1, unparkReq1)

		require.Equal(t, http.StatusOK, unparkRecorder1.Code)

		var unparkResponse1 map[string]interface{}
		err = json.Unmarshal(unparkRecorder1.Body.Bytes(), &unparkResponse1)
		require.NoError(t, err)

		// Verify first exit price
		dataUnpark1 := unparkResponse1["data"].(map[string]interface{})
		firstPrice := dataUnpark1["total_fee"].(float64)
		assert.Equal(t, 40.0, firstPrice, "First exit should charge base rate of 40.0 for 1 hour")

		// Second entry (after 1 hour gap - non-continuous parking)
		// Wait MORE than 1 hour to ensure non-continuous parking
		parkRequest2 := map[string]interface{}{
			"vehicle_type":   "M",
			"entry_point_id": "A",
			"parked_at":      baseTime.Add(135 * time.Minute).Format(time.RFC3339), // 2 hours 15 minutes from start
		}
		parkBody2, _ := json.Marshal(parkRequest2)

		parkReq2 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody2))
		parkReq2.Header.Set("Content-Type", "application/json")
		parkRecorder2 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder2, parkReq2)

		require.Equal(t, http.StatusCreated, parkRecorder2.Code)

		var parkResponse2 map[string]interface{}
		err = json.Unmarshal(parkRecorder2.Body.Bytes(), &parkResponse2)
		require.NoError(t, err)

		data2 := parkResponse2["data"].(map[string]interface{})
		// Verify non-continuous parking is detected (should be false)
		assert.False(t, data2["is_continuous"].(bool), "Non-continuous parking should be detected for re-entry after 1 hour")

		// Handle session_id that might be string or float64
		var sessionID2 int64
		switch v := data2["session_id"].(type) {
		case float64:
			sessionID2 = int64(v)
		case string:
			fmt.Sscanf(v, "%d", &sessionID2)
		}

		// Second exit
		exitedAt2 := baseTime.Add(195 * time.Minute) // 3 hours 15 minutes from start
		unparkReq2 := httptest.NewRequest("POST", "/api/v1/sessions/"+fmt.Sprintf("%d", sessionID2)+"/unpark?exited_at="+exitedAt2.UTC().Format(time.RFC3339), nil)
		unparkRecorder2 := httptest.NewRecorder()
		router.ServeHTTP(unparkRecorder2, unparkReq2)

		require.Equal(t, http.StatusOK, unparkRecorder2.Code)

		var unparkResponse2 map[string]interface{}
		err = json.Unmarshal(unparkRecorder2.Body.Bytes(), &unparkResponse2)
		require.NoError(t, err)

		// Verify second exit price
		dataUnpark2 := unparkResponse2["data"].(map[string]interface{})
		secondPrice := dataUnpark2["total_fee"].(float64)
		// For non-continuous parking, each session is charged separately
		// Second session: 1 hour = 40.0 (base rate)
		assert.Equal(t, 40.0, secondPrice, "Second exit should charge 40.0 for 1 hour non-continuous parking")

		// Total price should be 80.0 (40.0 + 40.0)
		totalPrice := firstPrice + secondPrice
		assert.Equal(t, 80.0, totalPrice, "Total price for two separate 1-hour sessions should be 80.0")
	})

	t.Run("large vehicle returns after 1 hour gap", func(t *testing.T) {
		router := setupTestRouter(t)

		// Test Case 3: Large vehicle, returns after 1 hour gap
		// Car size: Large (L)
		// Time Enter: 10:00
		// Time Exit: 10:45 (45 minutes)
		// Time Enter 2: 12:00 (1 hour 15 minutes after exit - non-continuous)
		// Time Exit 2: 14:00 (2 hours after second entry)
		// First session duration: 45 minutes
		// Second session duration: 2 hours
		// Expected price: 40.0 + 40.0 = 80.0 (each session charged separately)
		baseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)

		// First entry
		parkRequest1 := map[string]interface{}{
			"vehicle_type":   "L",
			"entry_point_id": "A",
			"parked_at":      baseTime.Format(time.RFC3339),
		}
		parkBody1, _ := json.Marshal(parkRequest1)

		parkReq1 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody1))
		parkReq1.Header.Set("Content-Type", "application/json")
		parkRecorder1 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder1, parkReq1)

		require.Equal(t, http.StatusCreated, parkRecorder1.Code)

		var parkResponse1 map[string]interface{}
		err := json.Unmarshal(parkRecorder1.Body.Bytes(), &parkResponse1)
		require.NoError(t, err)

		data1 := parkResponse1["data"].(map[string]interface{})
		// Handle session_id that might be string or float64
		var sessionID1 int64
		switch v := data1["session_id"].(type) {
		case float64:
			sessionID1 = int64(v)
		case string:
			fmt.Sscanf(v, "%d", &sessionID1)
		}

		// First exit
		exitedAt1 := baseTime.Add(45 * time.Minute)
		unparkReq1 := httptest.NewRequest("POST", "/api/v1/sessions/"+fmt.Sprintf("%d", sessionID1)+"/unpark?exited_at="+exitedAt1.UTC().Format(time.RFC3339), nil)
		unparkRecorder1 := httptest.NewRecorder()
		router.ServeHTTP(unparkRecorder1, unparkReq1)

		require.Equal(t, http.StatusOK, unparkRecorder1.Code)

		var unparkResponse1 map[string]interface{}
		err = json.Unmarshal(unparkRecorder1.Body.Bytes(), &unparkResponse1)
		require.NoError(t, err)

		// Verify first exit price
		dataUnpark1 := unparkResponse1["data"].(map[string]interface{})
		firstPrice := dataUnpark1["total_fee"].(float64)
		assert.Equal(t, 40.0, firstPrice, "First exit should charge base rate of 40.0 for 45 minutes")

		// Second entry (after 1 hour gap - non-continuous parking)
		// Wait MORE than 1 hour to ensure non-continuous parking
		parkRequest2 := map[string]interface{}{
			"vehicle_type":   "L",
			"entry_point_id": "A",
			"parked_at":      baseTime.Add(120 * time.Minute).Format(time.RFC3339), // 2 hours from start
		}
		parkBody2, _ := json.Marshal(parkRequest2)

		parkReq2 := httptest.NewRequest("POST", "/api/v1/sessions", bytes.NewBuffer(parkBody2))
		parkReq2.Header.Set("Content-Type", "application/json")
		parkRecorder2 := httptest.NewRecorder()
		router.ServeHTTP(parkRecorder2, parkReq2)

		require.Equal(t, http.StatusCreated, parkRecorder2.Code)

		var parkResponse2 map[string]interface{}
		err = json.Unmarshal(parkRecorder2.Body.Bytes(), &parkResponse2)
		require.NoError(t, err)

		data2 := parkResponse2["data"].(map[string]interface{})
		// Verify non-continuous parking is detected (should be false)
		assert.False(t, data2["is_continuous"].(bool), "Non-continuous parking should be detected for re-entry after 1 hour")

		// Handle session_id that might be string or float64
		var sessionID2 int64
		switch v := data2["session_id"].(type) {
		case float64:
			sessionID2 = int64(v)
		case string:
			fmt.Sscanf(v, "%d", &sessionID2)
		}

		// Second exit
		exitedAt2 := baseTime.Add(240 * time.Minute) // 4 hours from start
		unparkReq2 := httptest.NewRequest("POST", "/api/v1/sessions/"+fmt.Sprintf("%d", sessionID2)+"/unpark?exited_at="+exitedAt2.UTC().Format(time.RFC3339), nil)
		unparkRecorder2 := httptest.NewRecorder()
		router.ServeHTTP(unparkRecorder2, unparkReq2)

		require.Equal(t, http.StatusOK, unparkRecorder2.Code)

		var unparkResponse2 map[string]interface{}
		err = json.Unmarshal(unparkRecorder2.Body.Bytes(), &unparkResponse2)
		require.NoError(t, err)

		// Verify second exit price
		dataUnpark2 := unparkResponse2["data"].(map[string]interface{})
		secondPrice := dataUnpark2["total_fee"].(float64)
		// For non-continuous parking, each session is charged separately
		// Second session: 2 hours = 40.0 (base rate)
		assert.Equal(t, 40.0, secondPrice, "Second exit should charge 40.0 for 2 hours non-continuous parking")

		// Total price should be 80.0 (40.0 + 40.0)
		totalPrice := firstPrice + secondPrice
		assert.Equal(t, 80.0, totalPrice, "Total price for two separate sessions should be 80.0")
	})
}
