// Package internal provides tests for status consistency between INSERT and SELECT operations
package internal

import (
	"encoding/json"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/database"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/repositories"
)

// setupStatusConsistencyTestDB creates and initializes test database
func setupStatusConsistencyTestDB(t *testing.T) *database.DB {
	// Setup test environment with sensible defaults
	database.SetupTestEnvironment()
	os.Setenv("DATABASE_NAME", "oo_parking_lot_handlers_test")

	db, err := database.NewDBFromEnv()
	require.NoError(t, err)

	// Clean up any existing data
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.GetDB().Exec("DELETE FROM parking_sessions")
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
			parking_slot_id BIGINT NOT NULL,
			vehicle_type VARCHAR(50) NOT NULL,
			entry_point_id BIGINT NOT NULL,
			parked_at TIMESTAMP NOT NULL,
			exited_at TIMESTAMP
		);
	`)
	require.NoError(t, err)

	// Create an entry point for testing
	_, err = db.GetDB().Exec(`
		INSERT INTO entry_points (identifier, name, created_at, updated_at)
		VALUES ('EP1', 'Entry Point 1', NOW(), NOW())
		RETURNING id
	`)
	require.NoError(t, err)

	return db
}

// cleanupStatusConsistencyTestDB cleans up test database after tests
func cleanupStatusConsistencyTestDB(t *testing.T, db *database.DB) {
	db.GetDB().Exec("DELETE FROM parking_sessions")
	db.GetDB().Exec("DELETE FROM parking_slots")
	db.Close()
}

// TestSlotStatusConsistency tests that newly created slots show as available immediately
func TestSlotStatusConsistency(t *testing.T) {
	db := setupStatusConsistencyTestDB(t)
	defer cleanupStatusConsistencyTestDB(t, db)

	slotRepo := repositories.NewParkingSlotRepository(db.GetDB())

	// Test 1: Create a new slot with available=true
	newSlot := &models.ParkingSlot{
		SlotLabel: "TEST-A1",
		SlotType:  "SP",
		Distances: []int{10, 20, 30},
		Available: true,
	}

	createdSlot, err := slotRepo.Create(newSlot)
	require.NoError(t, err)

	// Verify the created slot has available=true
	assert.True(t, createdSlot.Available, "Expected newly created slot to be available=true")

	// Test 2: Retrieve the slot by ID and verify it's still available
	retrievedSlot, err := slotRepo.GetByID(createdSlot.ID)
	require.NoError(t, err)

	assert.True(t, retrievedSlot.Available, "Expected retrieved slot to be available=true")

	// Test 3: Retrieve the slot by label and verify it's still available
	retrievedByLabel, err := slotRepo.GetBySlotLabel(createdSlot.SlotLabel)
	require.NoError(t, err)

	assert.True(t, retrievedByLabel.Available, "Expected slot retrieved by label to be available=true")

	// Test 4: List all slots and verify the new slot is in the list and available
	allSlots, err := slotRepo.List()
	require.NoError(t, err)

	found := false
	for _, slot := range allSlots {
		if slot.ID == createdSlot.ID {
			found = true
			assert.True(t, slot.Available, "Expected slot in List() to be available=true")
			break
		}
	}

	assert.True(t, found, "Created slot not found in List() results")

	// Test 5: Get available slots and verify the new slot is included
	availableSlots, err := slotRepo.GetAvailable()
	require.NoError(t, err)

	found = false
	for _, slot := range availableSlots {
		if slot.ID == createdSlot.ID {
			found = true
			assert.True(t, slot.Available, "Expected slot in GetAvailable() to be available=true")
			break
		}
	}

	assert.True(t, found, "Created slot not found in GetAvailable() results")

	// Test 6: Verify database directly has available=TRUE
	var dbAvailable bool
	err = db.GetDB().QueryRow("SELECT available FROM parking_slots WHERE id = $1", createdSlot.ID).Scan(&dbAvailable)
	require.NoError(t, err)

	assert.True(t, dbAvailable, "Expected database to have available=TRUE")

	t.Log("✓ All status consistency tests passed!")
}

// TestSlotStatusWithTransaction tests that status is consistent when using transactions
func TestSlotStatusWithTransaction(t *testing.T) {
	db := setupStatusConsistencyTestDB(t)
	defer cleanupStatusConsistencyTestDB(t, db)

	slotRepo := repositories.NewParkingSlotRepository(db.GetDB())

	// Start a transaction
	tx, err := db.GetDB().Begin()
	require.NoError(t, err)
	defer tx.Rollback()

	// Create a slot within the transaction
	newSlot := &models.ParkingSlot{
		SlotLabel: "TEST-TX1",
		SlotType:  "SP",
		Distances: []int{5, 10, 15},
		Available: true,
	}

	createdSlot, err := slotRepo.CreateWithTx(tx, newSlot)
	require.NoError(t, err)

	assert.True(t, createdSlot.Available, "Expected slot created with transaction to be available=true")

	// Retrieve the slot by label within the transaction
	retrievedSlot, err := slotRepo.GetBySlotLabelWithTx(tx, createdSlot.SlotLabel)
	require.NoError(t, err)

	assert.True(t, retrievedSlot.Available, "Expected slot retrieved with transaction to be available=true")

	// Commit the transaction
	err = tx.Commit()
	require.NoError(t, err)

	// Verify after commit, the slot is still available
	finalSlot, err := slotRepo.GetByID(createdSlot.ID)
	require.NoError(t, err)

	assert.True(t, finalSlot.Available, "Expected slot after commit to be available=true")

	t.Log("✓ Transaction status consistency test passed!")
}

// TestSlotStatusUpdate tests that updating the available field works correctly
func TestSlotStatusUpdate(t *testing.T) {
	db := setupStatusConsistencyTestDB(t)
	defer cleanupStatusConsistencyTestDB(t, db)

	slotRepo := repositories.NewParkingSlotRepository(db.GetDB())

	// Create a slot
	newSlot := &models.ParkingSlot{
		SlotLabel: "TEST-UPD1",
		SlotType:  "SP",
		Distances: []int{8, 16, 24},
		Available: true,
	}

	createdSlot, err := slotRepo.Create(newSlot)
	require.NoError(t, err)

	// Verify it's available
	assert.True(t, createdSlot.Available, "Expected newly created slot to be available=true")

	// Update to unavailable
	err = slotRepo.UpdateAvailability(createdSlot.ID, false)
	require.NoError(t, err)

	// Retrieve and verify it's now unavailable
	updatedSlot, err := slotRepo.GetByID(createdSlot.ID)
	require.NoError(t, err)

	assert.False(t, updatedSlot.Available, "Expected slot to be unavailable after update")

	// Verify it's not in GetAvailable() results
	availableSlots, err := slotRepo.GetAvailable()
	require.NoError(t, err)

	for _, slot := range availableSlots {
		if slot.ID == createdSlot.ID {
			t.Error("Unavailable slot should not be in GetAvailable() results")
			break
		}
	}

	// Update back to available
	err = slotRepo.UpdateAvailability(createdSlot.ID, true)
	require.NoError(t, err)

	// Retrieve and verify it's available again
	finalSlot, err := slotRepo.GetByID(createdSlot.ID)
	require.NoError(t, err)

	assert.True(t, finalSlot.Available, "Expected slot to be available after update")

	// Verify it's now in GetAvailable() results
	availableSlots, err = slotRepo.GetAvailable()
	require.NoError(t, err)

	found := false
	for _, slot := range availableSlots {
		if slot.ID == createdSlot.ID {
			found = true
			break
		}
	}

	assert.True(t, found, "Available slot should be in GetAvailable() results")

	t.Log("✓ Status update test passed!")
}

// TestSlotStatusWithOrphanedSessions tests that orphaned sessions don't affect slot availability
func TestSlotStatusWithOrphanedSessions(t *testing.T) {
	db := setupStatusConsistencyTestDB(t)
	defer cleanupStatusConsistencyTestDB(t, db)

	slotRepo := repositories.NewParkingSlotRepository(db.GetDB())

	// Create a slot
	newSlot := &models.ParkingSlot{
		SlotLabel: "TEST-ORPHAN1",
		SlotType:  "SP",
		Distances: []int{12, 24, 36},
		Available: true,
	}

	createdSlot, err := slotRepo.Create(newSlot)
	require.NoError(t, err)

	// Create an orphaned session (exited_at IS NULL) for this slot
	// This simulates the scenario described in the bug report
	_, err = db.GetDB().Exec(`
		INSERT INTO parking_sessions (parking_slot_id, vehicle_type, entry_point_id, parked_at, exited_at)
		VALUES ($1, 'S', (SELECT id FROM entry_points WHERE identifier = 'EP1'), NOW(), NULL)
	`, createdSlot.ID)
	require.NoError(t, err)

	// With the fix, the slot should still show as available=true
	// because we now use the raw available column value
	retrievedSlot, err := slotRepo.GetByID(createdSlot.ID)
	require.NoError(t, err)

	assert.True(t, retrievedSlot.Available, "Expected slot to be available=true even with orphaned session")

	// Verify database still has available=TRUE
	var dbAvailable bool
	err = db.GetDB().QueryRow("SELECT available FROM parking_slots WHERE id = $1", createdSlot.ID).Scan(&dbAvailable)
	require.NoError(t, err)

	assert.True(t, dbAvailable, "Expected database to have available=TRUE even with orphaned session")

	// Verify it's still in GetAvailable() results
	availableSlots, err := slotRepo.GetAvailable()
	require.NoError(t, err)

	found := false
	for _, slot := range availableSlots {
		if slot.ID == createdSlot.ID {
			found = true
			break
		}
	}

	assert.True(t, found, "Slot with available=true should be in GetAvailable() results even with orphaned session")

	t.Log("✓ Orphaned session test passed - slot availability is now consistent!")
}

// TestSlotStatusWithCompletedSessions tests that completed sessions don't affect slot availability
func TestSlotStatusWithCompletedSessions(t *testing.T) {
	db := setupStatusConsistencyTestDB(t)
	defer cleanupStatusConsistencyTestDB(t, db)

	slotRepo := repositories.NewParkingSlotRepository(db.GetDB())

	// Create a slot
	newSlot := &models.ParkingSlot{
		SlotLabel: "TEST-COMPLETED1",
		SlotType:  "SP",
		Distances: []int{15, 30, 45},
		Available: true,
	}

	createdSlot, err := slotRepo.Create(newSlot)
	require.NoError(t, err)

	// Create a completed session (exited_at IS NOT NULL) for this slot
	_, err = db.GetDB().Exec(`
		INSERT INTO parking_sessions (parking_slot_id, vehicle_type, entry_point_id, parked_at, exited_at)
		VALUES ($1, 'S', (SELECT id FROM entry_points WHERE identifier = 'EP1'), NOW() - INTERVAL '1 hour', NOW())
	`, createdSlot.ID)
	require.NoError(t, err)

	// The slot should still show as available=true
	// because we now use the raw available column value
	retrievedSlot, err := slotRepo.GetByID(createdSlot.ID)
	require.NoError(t, err)

	assert.True(t, retrievedSlot.Available, "Expected slot to be available=true even with completed session")

	// Verify database still has available=TRUE
	var dbAvailable bool
	err = db.GetDB().QueryRow("SELECT available FROM parking_slots WHERE id = $1", createdSlot.ID).Scan(&dbAvailable)
	require.NoError(t, err)

	assert.True(t, dbAvailable, "Expected database to have available=TRUE even with completed session")

	t.Log("✓ Completed session test passed - slot availability is consistent!")
}

// TestCreateSlotWithDefaultAvailable tests that slots created without explicit available field default to true
func TestCreateSlotWithDefaultAvailable(t *testing.T) {
	db := setupStatusConsistencyTestDB(t)
	defer cleanupStatusConsistencyTestDB(t, db)

	slotRepo := repositories.NewParkingSlotRepository(db.GetDB())

	// Create a slot without setting available field (should default to true in DB)
	distancesJSON, _ := json.Marshal([]int{7, 14, 21})
	query := `
		INSERT INTO parking_slots (slot_label, slot_type, distances, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		RETURNING id, slot_label, slot_type, distances, available, created_at, updated_at
	`

	var slot models.ParkingSlot
	var distancesJSONResult []byte
	err := db.GetDB().QueryRow(query, "TEST-DEFAULT", "SP", distancesJSON).Scan(
		&slot.ID,
		&slot.SlotLabel,
		&slot.SlotType,
		&distancesJSONResult,
		&slot.Available,
		&slot.CreatedAt,
		&slot.UpdatedAt,
	)
	require.NoError(t, err)
	json.Unmarshal(distancesJSONResult, &slot.Distances)

	// Verify it defaults to true
	assert.True(t, slot.Available, "Expected slot to default to available=true")

	// Verify through repository
	retrievedSlot, err := slotRepo.GetByID(slot.ID)
	require.NoError(t, err)

	assert.True(t, retrievedSlot.Available, "Expected retrieved slot to be available=true")

	t.Log("✓ Default available test passed!")
}
