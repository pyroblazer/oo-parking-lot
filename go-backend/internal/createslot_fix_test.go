// Package internal provides tests for CreateSlot fix
package internal

import (
	"testing"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/database"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/dtos"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/repositories"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestCreateSlotFix tests the CreateSlot fix - new slots should always be created as available
func TestCreateSlotFix(t *testing.T) {
	// Setup test database
	db := setupCreateSlotFixTestDB(t)
	defer db.Close()

	// Create repositories
	entryPointRepo := repositories.NewEntryPointRepository(db.GetDB())
	parkingSlotRepo := repositories.NewParkingSlotRepository(db.GetDB())
	sessionRepo := repositories.NewParkingSessionRepository(db.GetDB())

	// Create service
	parkingService := services.NewParkingService(entryPointRepo, parkingSlotRepo, sessionRepo)

	t.Run("CreateSlot sets Available to true", func(t *testing.T) {
		// Create a new slot
		createSlotReq := dtos.CreateSlotRequest{
			SlotLabel: "SP-NEW",
			SlotType:  "SP",
			Distances: []int{10, 20, 30},
		}

		newSlot, err := parkingService.CreateSlot(&createSlotReq)
		require.NoError(t, err)
		require.NotNil(t, newSlot)

		// Verify the slot was created with Available=true (THIS IS THE FIX)
		assert.True(t, newSlot.Available, "New slot should be created as available - THIS IS THE FIX BEING TESTED")

		// Verify in database
		slotFromDB, err := parkingSlotRepo.GetBySlotLabel("SP-NEW")
		require.NoError(t, err)
		require.NotNil(t, slotFromDB)
		assert.True(t, slotFromDB.Available, "Slot in database should be available")
	})

	t.Run("CreateSlot while another slot is occupied", func(t *testing.T) {
		// Clean up database before this test
		_, err := db.GetDB().Exec("DELETE FROM parking_sessions")
		require.NoError(t, err, "Failed to delete parking sessions")

		_, err = db.GetDB().Exec("DELETE FROM parking_slots")
		require.NoError(t, err, "Failed to delete parking slots")

		_, err = db.GetDB().Exec("DELETE FROM entry_points")
		require.NoError(t, err, "Failed to delete entry points")

		// Create entry point
		ep := &models.EntryPoint{
			Identifier: "A",
			Name:       "Entry Point A",
		}
		_, err = entryPointRepo.Create(ep)
		require.NoError(t, err)

		// Create SP-1 slot (occupied)
		slot1 := &models.ParkingSlot{
			SlotLabel: "SP-1",
			SlotType:  models.SlotTypeSmall,
			Distances: []int{10},
			Available: false, // Manually set to false to simulate occupied slot
		}
		_, err = parkingSlotRepo.Create(slot1)
		require.NoError(t, err)

		// Create SP-2 and SP-3 slots (available)
		slot2 := &models.ParkingSlot{
			SlotLabel: "SP-2",
			SlotType:  models.SlotTypeSmall,
			Distances: []int{20},
			Available: true,
		}
		_, err = parkingSlotRepo.Create(slot2)
		require.NoError(t, err)

		slot3 := &models.ParkingSlot{
			SlotLabel: "SP-3",
			SlotType:  models.SlotTypeSmall,
			Distances: []int{30},
			Available: true,
		}
		_, err = parkingSlotRepo.Create(slot3)
		require.NoError(t, err)

		// Create a new SP-4 slot using CreateSlot service
		createSlotReq := dtos.CreateSlotRequest{
			SlotLabel: "SP-4",
			SlotType:  "SP",
			Distances: []int{40},
		}

		newSlot, err := parkingService.CreateSlot(&createSlotReq)
		require.NoError(t, err)

		// Verify SP-4 is created as available (THIS IS THE FIX)
		assert.True(t, newSlot.Available, "SP-4 should be created as available - THIS IS THE FIX BEING TESTED")

		// Verify in database
		slot4, err := parkingSlotRepo.GetBySlotLabel("SP-4")
		require.NoError(t, err)
		assert.True(t, slot4.Available, "SP-4 should be available in database")

		// Verify SP-1 is still occupied
		slot1Check, err := parkingSlotRepo.GetBySlotLabel("SP-1")
		require.NoError(t, err)
		assert.False(t, slot1Check.Available, "SP-1 should still be occupied")

		// Verify SP-2 and SP-3 are still available
		slot2Check, err := parkingSlotRepo.GetBySlotLabel("SP-2")
		require.NoError(t, err)
		assert.True(t, slot2Check.Available, "SP-2 should still be available")

		slot3Check, err := parkingSlotRepo.GetBySlotLabel("SP-3")
		require.NoError(t, err)
		assert.True(t, slot3Check.Available, "SP-3 should still be available")
	})

	t.Run("CreateSlot with different types", func(t *testing.T) {
		// Create SP slot
		spReq := dtos.CreateSlotRequest{
			SlotLabel: "SP-TEST",
			SlotType:  "SP",
			Distances: []int{10, 20, 30},
		}

		spSlot, err := parkingService.CreateSlot(&spReq)
		require.NoError(t, err)
		assert.True(t, spSlot.Available, "SP slot should be created as available")
		assert.Equal(t, models.SlotTypeSmall, spSlot.SlotType)

		// Create MP slot
		mpReq := dtos.CreateSlotRequest{
			SlotLabel: "MP-TEST",
			SlotType:  "MP",
			Distances: []int{15, 25, 35},
		}

		mpSlot, err := parkingService.CreateSlot(&mpReq)
		require.NoError(t, err)
		assert.True(t, mpSlot.Available, "MP slot should be created as available")
		assert.Equal(t, models.SlotTypeMedium, mpSlot.SlotType)

		// Create LP slot
		lpReq := dtos.CreateSlotRequest{
			SlotLabel: "LP-TEST",
			SlotType:  "LP",
			Distances: []int{20, 30, 40},
		}

		lpSlot, err := parkingService.CreateSlot(&lpReq)
		require.NoError(t, err)
		assert.True(t, lpSlot.Available, "LP slot should be created as available")
		assert.Equal(t, models.SlotTypeLarge, lpSlot.SlotType)
	})
}

// setupCreateSlotFixTestDB creates a test database for CreateSlot fix tests
func setupCreateSlotFixTestDB(t *testing.T) *database.DB {
	// Use test database from environment or default
	db, err := database.NewDBFromEnv()
	require.NoError(t, err, "Failed to create test database")

	// Clean up database before test
	_, err = db.GetDB().Exec("DELETE FROM parking_sessions")
	require.NoError(t, err, "Failed to delete parking sessions")

	_, err = db.GetDB().Exec("DELETE FROM parking_slots")
	require.NoError(t, err, "Failed to delete parking slots")

	_, err = db.GetDB().Exec("DELETE FROM entry_points")
	require.NoError(t, err, "Failed to delete entry points")

	return db
}
