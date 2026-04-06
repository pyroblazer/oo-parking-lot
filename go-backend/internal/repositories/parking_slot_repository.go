// Package repositories provides data access layer for parking lot system.
package repositories

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
)

// ErrNoAvailableSlot is returned when no parking slot is available
var ErrNoAvailableSlot = errors.New("no available parking slot")

// ParkingSlotRepository handles parking slot data operations
type ParkingSlotRepository struct {
	db *sql.DB
}

// NewParkingSlotRepository creates a new parking slot repository
func NewParkingSlotRepository(db *sql.DB) *ParkingSlotRepository {
	return &ParkingSlotRepository{db: db}
}

// DB returns the underlying database connection
func (r *ParkingSlotRepository) DB() *sql.DB {
	return r.db
}

// GetByID retrieves a parking slot by ID
func (r *ParkingSlotRepository) GetByID(id int64) (*models.ParkingSlot, error) {
	query := `
		SELECT ps.id, ps.slot_label, ps.slot_type, ps.distances, ps.created_at, ps.updated_at,
			ps.available AS available
		FROM parking_slots ps
		WHERE ps.id = $1
	`

	var slot models.ParkingSlot
	var distancesJSON []byte
	err := r.db.QueryRow(query, id).Scan(
		&slot.ID,
		&slot.SlotLabel,
		&slot.SlotType,
		&distancesJSON,
		&slot.CreatedAt,
		&slot.UpdatedAt,
		&slot.Available,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get parking slot: %w", err)
	}

	if distancesJSON != nil {
		if err := json.Unmarshal(distancesJSON, &slot.Distances); err != nil {
			return nil, fmt.Errorf("failed to unmarshal distances: %w", err)
		}
	}

	return &slot, nil
}

// GetAvailable retrieves all available parking slots
func (r *ParkingSlotRepository) GetAvailable() ([]*models.ParkingSlot, error) {
	query := `
		SELECT ps.id, ps.slot_label, ps.slot_type, ps.distances, ps.created_at, ps.updated_at,
			ps.available AS available
		FROM parking_slots ps
		WHERE ps.available = TRUE
		ORDER BY ps.slot_label
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to get available slots: %w", err)
	}
	defer func() {
		_ = rows.Close()
	}()

	var slots []*models.ParkingSlot
	for rows.Next() {
		var slot models.ParkingSlot
		var distancesJSON []byte
		err := rows.Scan(
			&slot.ID,
			&slot.SlotLabel,
			&slot.SlotType,
			&distancesJSON,
			&slot.CreatedAt,
			&slot.UpdatedAt,
			&slot.Available,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan parking slot: %w", err)
		}

		if distancesJSON != nil {
			if err := json.Unmarshal(distancesJSON, &slot.Distances); err != nil {
				return nil, fmt.Errorf("failed to unmarshal distances: %w", err)
			}
		}

		slots = append(slots, &slot)
	}

	return slots, nil
}

// List retrieves all parking slots
func (r *ParkingSlotRepository) List() ([]*models.ParkingSlot, error) {
	query := `
		SELECT ps.id, ps.slot_label, ps.slot_type, ps.distances, ps.created_at, ps.updated_at,
			ps.available AS available
		FROM parking_slots ps
		ORDER BY ps.slot_label
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to list parking slots: %w", err)
	}
	defer func() {
		_ = rows.Close()
	}()

	var slots []*models.ParkingSlot
	for rows.Next() {
		var slot models.ParkingSlot
		var distancesJSON []byte
		err := rows.Scan(
			&slot.ID,
			&slot.SlotLabel,
			&slot.SlotType,
			&distancesJSON,
			&slot.CreatedAt,
			&slot.UpdatedAt,
			&slot.Available,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan parking slot: %w", err)
		}

		if distancesJSON != nil {
			if err := json.Unmarshal(distancesJSON, &slot.Distances); err != nil {
				return nil, fmt.Errorf("failed to unmarshal distances: %w", err)
			}
		}

		slots = append(slots, &slot)
	}

	return slots, nil
}

// Create creates a new parking slot
func (r *ParkingSlotRepository) Create(slot *models.ParkingSlot) (*models.ParkingSlot, error) {
	newSlot := &models.ParkingSlot{
		SlotLabel: slot.SlotLabel,
		SlotType:  slot.SlotType,
		Distances: slot.Distances,
		Available: slot.Available, // FIX: Use Available field from input
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	distancesJSON, err := json.Marshal(newSlot.Distances)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal distances: %w", err)
	}

	query := `
		INSERT INTO parking_slots (slot_label, slot_type, distances, available, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, slot_label, slot_type, distances, available, created_at, updated_at
	`

	err = r.db.QueryRow(
		query,
		newSlot.SlotLabel,
		newSlot.SlotType,
		distancesJSON,
		newSlot.Available,
		newSlot.CreatedAt,
		newSlot.UpdatedAt,
	).Scan(
		&newSlot.ID,
		&newSlot.SlotLabel,
		&newSlot.SlotType,
		&distancesJSON,
		&newSlot.Available,
		&newSlot.CreatedAt,
		&newSlot.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create parking slot: %w", err)
	}

	if distancesJSON != nil {
		if err := json.Unmarshal(distancesJSON, &newSlot.Distances); err != nil {
			return nil, fmt.Errorf("failed to unmarshal distances: %w", err)
		}
	}

	return newSlot, nil
}

// Update updates a parking slot
func (r *ParkingSlotRepository) Update(slot *models.ParkingSlot) error {
	slot.UpdatedAt = time.Now()

	distancesJSON, err := json.Marshal(slot.Distances)
	if err != nil {
		return fmt.Errorf("failed to marshal distances: %w", err)
	}

	query := `
		UPDATE parking_slots
		SET slot_label = $1, slot_type = $2, distances = $3, available = $4, updated_at = $5
		WHERE id = $6
	`

	_, err = r.db.Exec(
		query,
		slot.SlotLabel,
		slot.SlotType,
		distancesJSON,
		slot.Available,
		slot.UpdatedAt,
		slot.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update parking slot: %w", err)
	}

	return nil
}

// UpdateWithTx updates a parking slot within a transaction
func (r *ParkingSlotRepository) UpdateWithTx(tx *sql.Tx, slot *models.ParkingSlot) error {
	slot.UpdatedAt = time.Now()

	distancesJSON, err := json.Marshal(slot.Distances)
	if err != nil {
		return fmt.Errorf("failed to marshal distances: %w", err)
	}

	query := `
		UPDATE parking_slots
		SET slot_label = $1, slot_type = $2, distances = $3, available = $4, updated_at = $5
		WHERE id = $6
	`

	_, err = tx.Exec(
		query,
		slot.SlotLabel,
		slot.SlotType,
		distancesJSON,
		slot.Available,
		slot.UpdatedAt,
		slot.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update parking slot: %w", err)
	}

	return nil
}

// UpdateAvailability updates only the availability field of a parking slot
func (r *ParkingSlotRepository) UpdateAvailability(id int64, available bool) error {
	query := `
		UPDATE parking_slots
		SET available = $1, updated_at = $2
		WHERE id = $3
	`

	_, err := r.db.Exec(query, available, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to update parking slot availability: %w", err)
	}

	return nil
}

// Delete deletes a parking slot
func (r *ParkingSlotRepository) Delete(id int64) error {
	// First check if slot has active sessions (where exited_at IS NULL)
	var activeSessionCount int
	checkActiveQuery := `
		SELECT COUNT(*)
		FROM parking_sessions
		WHERE parking_slot_id = $1 AND exited_at IS NULL
	`
	err := r.db.QueryRow(checkActiveQuery, id).Scan(&activeSessionCount)
	if err != nil {
		return fmt.Errorf("failed to check for active sessions: %w", err)
	}
	
	fmt.Printf("DEBUG: Delete() - Slot ID: %d, Active session count: %d\n", id, activeSessionCount)
	
	if activeSessionCount > 0 {
		return fmt.Errorf("cannot delete parking slot with active sessions")
	}
	
	// Delete all parking sessions for this slot (both active and historical)
	// This is necessary to satisfy the foreign key constraint
	deleteSessionsQuery := `DELETE FROM parking_sessions WHERE parking_slot_id = $1`
	_, err = r.db.Exec(deleteSessionsQuery, id)
	if err != nil {
		return fmt.Errorf("failed to delete parking sessions: %w", err)
	}
	
	// Now delete the parking slot
	query := `DELETE FROM parking_slots WHERE id = $1`
	
	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete parking slot: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("parking slot not found")
	}
	
	return nil
}

// ResetAllSlotsAvailability resets all parking slots to available status
func (r *ParkingSlotRepository) ResetAllSlotsAvailability() error {
	query := `UPDATE parking_slots SET available = TRUE`

	_, err := r.db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to reset all parking slots availability: %w", err)
	}

	return nil
}

// GetBySlotLabel retrieves a parking slot by slot label
func (r *ParkingSlotRepository) GetBySlotLabel(slotLabel string) (*models.ParkingSlot, error) {
	query := `
		SELECT ps.id, ps.slot_label, ps.slot_type, ps.distances, ps.created_at, ps.updated_at,
			ps.available AS available
		FROM parking_slots ps
		WHERE ps.slot_label = $1
	`

	var slot models.ParkingSlot
	var distancesJSON []byte
	err := r.db.QueryRow(query, slotLabel).Scan(
		&slot.ID,
		&slot.SlotLabel,
		&slot.SlotType,
		&distancesJSON,
		&slot.CreatedAt,
		&slot.UpdatedAt,
		&slot.Available,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get parking slot by slot label: %w", err)
	}

	if distancesJSON != nil {
		if err := json.Unmarshal(distancesJSON, &slot.Distances); err != nil {
			return nil, fmt.Errorf("failed to unmarshal distances: %w", err)
		}
	}

	return &slot, nil
}

// GetBySlotLabelWithTx retrieves a parking slot by slot label within a transaction
func (r *ParkingSlotRepository) GetBySlotLabelWithTx(tx *sql.Tx, slotLabel string) (*models.ParkingSlot, error) {
	query := `
		SELECT ps.id, ps.slot_label, ps.slot_type, ps.distances, ps.created_at, ps.updated_at,
			ps.available AS available
		FROM parking_slots ps
		WHERE ps.slot_label = $1
	`

	var slot models.ParkingSlot
	var distancesJSON []byte
	err := tx.QueryRow(query, slotLabel).Scan(
		&slot.ID,
		&slot.SlotLabel,
		&slot.SlotType,
		&distancesJSON,
		&slot.CreatedAt,
		&slot.UpdatedAt,
		&slot.Available,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get parking slot by slot label: %w", err)
	}

	if distancesJSON != nil {
		if err := json.Unmarshal(distancesJSON, &slot.Distances); err != nil {
			return nil, fmt.Errorf("failed to unmarshal distances: %w", err)
		}
	}

	return &slot, nil
}

// DeleteAll deletes all parking slots (for test database reset)
func (r *ParkingSlotRepository) DeleteAll() error {
	_, err := r.db.Exec("DELETE FROM parking_slots")
	if err != nil {
		return fmt.Errorf("failed to delete all parking slots: %w", err)
	}
	return nil
}

// BackfillDistancesForNewEntryPoint adds a distance value for a new entry point to all existing parking slots
// This is called when a new entry point is created to ensure all slots have distance values for all entry points
// The distance is inserted at the correct position based on alphabetical order of entry points
func (r *ParkingSlotRepository) BackfillDistancesForNewEntryPoint(identifier string, defaultDistance int) error {
	fmt.Printf("DEBUG: BackfillDistancesForNewEntryPoint - Starting for identifier=%s, defaultDistance=%d\n", identifier, defaultDistance)
	
	// Get all entry points to find the correct insertion index
	query := `
		SELECT id, identifier, name, created_at, updated_at
		FROM entry_points
		ORDER BY identifier ASC
	`
	
	rows, err := r.db.Query(query)
	if err != nil {
		fmt.Printf("DEBUG: BackfillDistancesForNewEntryPoint - Failed to query entry points: %v\n", err)
		return fmt.Errorf("failed to query entry points: %w", err)
	}
	defer func() {
		_ = rows.Close()
	}()
	
	var entryPoints []*models.EntryPoint
	for rows.Next() {
		var ep models.EntryPoint
		err := rows.Scan(
			&ep.ID,
			&ep.Identifier,
			&ep.Name,
			&ep.CreatedAt,
			&ep.UpdatedAt,
		)
		if err != nil {
			return fmt.Errorf("failed to scan entry point: %w", err)
		}
		entryPoints = append(entryPoints, &ep)
	}
	
	// Find the correct insertion index based on alphabetical order of entry points
	insertIndex := len(entryPoints) // Default to end if not found
	for i, ep := range entryPoints {
		if identifier < ep.Identifier {
			insertIndex = i
			break
		}
	}
	
	fmt.Printf("DEBUG: BackfillDistancesForNewEntryPoint - Calculated insertIndex=%d for identifier=%s (looking for position in %v)\n", insertIndex, identifier, entryPoints)

	// Get all parking slots
	slots, err := r.List()
	if err != nil {
		fmt.Printf("DEBUG: BackfillDistancesForNewEntryPoint - Failed to list parking slots: %v\n", err)
		return fmt.Errorf("failed to list parking slots for backfill: %w", err)
	}
	
	fmt.Printf("DEBUG: BackfillDistancesForNewEntryPoint - Found %d parking slots to update\n", len(slots))

	// Update each slot to insert the new distance value at the correct position
	for _, slot := range slots {
		fmt.Printf("DEBUG: BackfillDistancesForNewEntryPoint - Processing slot %s (ID=%d) with current distances=%v\n", slot.SlotLabel, slot.ID, slot.Distances)
		
		// Insert the default distance at the correct position
		if insertIndex >= len(slot.Distances) {
			// If index is beyond current length, append
			slot.Distances = append(slot.Distances, defaultDistance)
		} else {
			// Insert at the correct position
			slot.Distances = append(slot.Distances[:insertIndex], append([]int{defaultDistance}, slot.Distances[insertIndex:]...)...)
		}

		// Update the slot with the new distances array
		fmt.Printf("DEBUG: BackfillDistancesForNewEntryPoint - Updating slot %s with new distances=%v\n", slot.SlotLabel, slot.Distances)
		if err := r.Update(slot); err != nil {
			fmt.Printf("DEBUG: BackfillDistancesForNewEntryPoint - Failed to update slot %s: %v\n", slot.SlotLabel, err)
			return fmt.Errorf("failed to backfill distances for slot %s: %w", slot.SlotLabel, err)
		}
		fmt.Printf("DEBUG: BackfillDistancesForNewEntryPoint - Successfully updated slot %s\n", slot.SlotLabel)
	}

	fmt.Printf("DEBUG: BackfillDistancesForNewEntryPoint - Completed successfully, updated %d slots\n", len(slots))
	return nil
}

// RemoveDistanceForDeletedEntryPoint removes a distance value for a deleted entry point from all parking slots
// This is called when an entry point is deleted to maintain correct distance array ordering
func (r *ParkingSlotRepository) RemoveDistanceForDeletedEntryPoint(identifier string) error {
	// Get all entry points ordered alphabetically to determine removal index
	query := `
		SELECT identifier
		FROM entry_points
		ORDER BY identifier ASC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return fmt.Errorf("failed to list entry points for removal: %w", err)
	}
	defer func() {
		_ = rows.Close()
	}()

	var identifiers []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return fmt.Errorf("failed to scan entry point identifier: %w", err)
		}
		identifiers = append(identifiers, id)
	}

	// Find the index of the entry point to remove
	removeIndex := -1
	for i, id := range identifiers {
		if id == identifier {
			removeIndex = i
			break
		}
	}

	// If entry point not found, nothing to remove
	if removeIndex == -1 {
		return nil
	}

	// Get all parking slots
	slots, err := r.List()
	if err != nil {
		return fmt.Errorf("failed to list parking slots for removal: %w", err)
	}

	// Update each slot to remove the distance value at the correct position
	for _, slot := range slots {
		// Remove the distance at the correct position
		if removeIndex < len(slot.Distances) {
			slot.Distances = append(slot.Distances[:removeIndex], slot.Distances[removeIndex+1:]...)
		}

		// Update the slot with the new distances array
		if err := r.Update(slot); err != nil {
			return fmt.Errorf("failed to remove distance for slot %s: %w", slot.SlotLabel, err)
		}
	}

	return nil
}

// ReorderDistancesForUpdatedEntryPoint reorders distance arrays when an entry point's identifier changes
// This ensures distance arrays maintain correct alphabetical order after identifier updates
func (r *ParkingSlotRepository) ReorderDistancesForUpdatedEntryPoint(oldIdentifier, newIdentifier string) error {
	fmt.Printf("DEBUG: ReorderDistancesForUpdatedEntryPoint - Starting: oldIdentifier=%s, newIdentifier=%s\n", oldIdentifier, newIdentifier)
	
	// Get all entry points ordered alphabetically to determine old and new positions
	query := `
		SELECT identifier
		FROM entry_points
		ORDER BY identifier ASC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return fmt.Errorf("failed to list entry points for reordering: %w", err)
	}
	defer func() {
		_ = rows.Close()
	}()

	var identifiers []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return fmt.Errorf("failed to scan entry point identifier: %w", err)
		}
		identifiers = append(identifiers, id)
	}

	// Find the old and new indices
	oldIndex := -1
	newIndex := -1
	for i, id := range identifiers {
		if id == oldIdentifier {
			oldIndex = i
		}
		if id == newIdentifier {
			newIndex = i
		}
	}

	// If old index not found, nothing to reorder
	if oldIndex == -1 {
		fmt.Printf("DEBUG: ReorderDistancesForUpdatedEntryPoint - Old identifier %s not found, skipping reordering\n", oldIdentifier)
		return nil
	}

	// If indices are the same, nothing to reorder
	if oldIndex == newIndex {
		fmt.Printf("DEBUG: ReorderDistancesForUpdatedEntryPoint - Indices are the same (%d), skipping reordering\n", oldIndex)
		return nil
	}

	fmt.Printf("DEBUG: ReorderDistancesForUpdatedEntryPoint - Old index: %d, New index: %d\n", oldIndex, newIndex)

	// Get all parking slots
	slots, err := r.List()
	if err != nil {
		return fmt.Errorf("failed to list parking slots for reordering: %w", err)
	}

	// Update each slot to reorder the distance array
	for _, slot := range slots {
		fmt.Printf("DEBUG: ReorderDistancesForUpdatedEntryPoint - Processing slot %s (ID=%d) with current distances=%v\n", slot.SlotLabel, slot.ID, slot.Distances)
		
		// Extract the distance at the old index
		var distance int
		if oldIndex < len(slot.Distances) {
			distance = slot.Distances[oldIndex]
		} else {
			// Old index is beyond current length, use default distance
			distance = 0
		}

		// Remove the distance at the old index
		if oldIndex < len(slot.Distances) {
			slot.Distances = append(slot.Distances[:oldIndex], slot.Distances[oldIndex+1:]...)
		}

		// Insert the distance at the new index
		if newIndex > len(slot.Distances) {
			// If new index is beyond current length, append
			slot.Distances = append(slot.Distances, distance)
		} else {
			// Insert at the correct position
			slot.Distances = append(slot.Distances[:newIndex], append([]int{distance}, slot.Distances[newIndex:]...)...)
		}

		fmt.Printf("DEBUG: ReorderDistancesForUpdatedEntryPoint - Updating slot %s with new distances=%v\n", slot.SlotLabel, slot.Distances)
		
		// Update the slot with the new distances array
		if err := r.Update(slot); err != nil {
			return fmt.Errorf("failed to reorder distances for slot %s: %w", slot.SlotLabel, err)
		}
	}

	fmt.Printf("DEBUG: ReorderDistancesForUpdatedEntryPoint - Completed successfully, updated %d slots\n", len(slots))
	return nil
}

// CreateWithTx creates a new parking slot within a transaction
func (r *ParkingSlotRepository) CreateWithTx(tx *sql.Tx, slot *models.ParkingSlot) (*models.ParkingSlot, error) {
	newSlot := &models.ParkingSlot{
		SlotLabel: slot.SlotLabel,
		SlotType:  slot.SlotType,
		Distances: slot.Distances,
		Available: slot.Available, // FIX: Use Available field from input
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	distancesJSON, err := json.Marshal(newSlot.Distances)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal distances: %w", err)
	}

	query := `
		INSERT INTO parking_slots (slot_label, slot_type, distances, available, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, slot_label, slot_type, distances, available, created_at, updated_at
	`

	err = tx.QueryRow(
		query,
		newSlot.SlotLabel,
		newSlot.SlotType,
		distancesJSON,
		newSlot.Available,
		newSlot.CreatedAt,
		newSlot.UpdatedAt,
	).Scan(
		&newSlot.ID,
		&newSlot.SlotLabel,
		&newSlot.SlotType,
		&distancesJSON,
		&newSlot.Available,
		&newSlot.CreatedAt,
		&newSlot.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create parking slot: %w", err)
	}

	if distancesJSON != nil {
		if err := json.Unmarshal(distancesJSON, &newSlot.Distances); err != nil {
			return nil, fmt.Errorf("failed to unmarshal distances: %w", err)
		}
	}

	return newSlot, nil
}

// FindAndLockAvailableSlot finds and locks an available slot for a vehicle type within a transaction
// This uses UPDATE ... RETURNING to atomically find and mark a slot as unavailable
// This is more efficient than SELECT FOR UPDATE as it only locks and updates one row
func (r *ParkingSlotRepository) FindAndLockAvailableSlot(tx *sql.Tx, slotType models.SlotType, entryPoint *models.EntryPoint) (*models.ParkingSlot, error) {
	// First, get all available slots to find the closest one
	query := `
		SELECT ps.id, ps.slot_label, ps.slot_type, ps.distances, ps.created_at, ps.updated_at, ps.available
		FROM parking_slots ps
		WHERE ps.available = TRUE AND ps.slot_type = $1
		ORDER BY ps.slot_label
	`

	rows, err := tx.Query(query, slotType)
	if err != nil {
		return nil, fmt.Errorf("failed to find available slots: %w", err)
	}
	defer func() {
		_ = rows.Close()
	}()

	var slots []*models.ParkingSlot
	for rows.Next() {
		var slot models.ParkingSlot
		var distancesJSON []byte
		err := rows.Scan(
			&slot.ID,
			&slot.SlotLabel,
			&slot.SlotType,
			&distancesJSON,
			&slot.CreatedAt,
			&slot.UpdatedAt,
			&slot.Available,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan parking slot: %w", err)
		}

		if distancesJSON != nil {
			if err := json.Unmarshal(distancesJSON, &slot.Distances); err != nil {
				return nil, fmt.Errorf("failed to unmarshal distances: %w", err)
			}
		}

		slots = append(slots, &slot)
	}

	// Check if any compatible slot is available
	if len(slots) == 0 {
		return nil, ErrNoAvailableSlot
	}

	// Sort by distance from entry point, then by slot label (for ties)
	sort.Slice(slots, func(i, j int) bool {
		distI := slots[i].DistanceFrom(entryPoint)
		distJ := slots[j].DistanceFrom(entryPoint)
		if distI == distJ {
			return slots[i].SlotLabel < slots[j].SlotLabel
		}
		return distI < distJ
	})

	// Atomically update the closest slot to unavailable and return it
	// This prevents race conditions by updating in a single atomic operation
	closestSlot := slots[0]
	updateQuery := `
		UPDATE parking_slots
		SET available = FALSE, updated_at = $1
		WHERE id = $2 AND available = TRUE
		RETURNING id, slot_label, slot_type, distances, created_at, updated_at, available
	`

	var updatedSlot models.ParkingSlot
	var distancesJSON []byte
	err = tx.QueryRow(updateQuery, time.Now(), closestSlot.ID).Scan(
		&updatedSlot.ID,
		&updatedSlot.SlotLabel,
		&updatedSlot.SlotType,
		&distancesJSON,
		&updatedSlot.CreatedAt,
		&updatedSlot.UpdatedAt,
		&updatedSlot.Available,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			// The slot was taken by another transaction, try the next one
			if len(slots) > 1 {
				for i := 1; i < len(slots); i++ {
					closestSlot = slots[i]
					err = tx.QueryRow(updateQuery, time.Now(), closestSlot.ID).Scan(
						&updatedSlot.ID,
						&updatedSlot.SlotLabel,
						&updatedSlot.SlotType,
						&distancesJSON,
						&updatedSlot.CreatedAt,
						&updatedSlot.UpdatedAt,
						&updatedSlot.Available,
					)
					if err == nil {
						if distancesJSON != nil {
							if err := json.Unmarshal(distancesJSON, &updatedSlot.Distances); err != nil {
								return nil, fmt.Errorf("failed to unmarshal distances: %w", err)
							}
						}
						return &updatedSlot, nil
					}
				}
			}
			return nil, ErrNoAvailableSlot
		}
		return nil, fmt.Errorf("failed to update parking slot availability: %w", err)
	}

	if distancesJSON != nil {
		if err := json.Unmarshal(distancesJSON, &updatedSlot.Distances); err != nil {
			return nil, fmt.Errorf("failed to unmarshal distances: %w", err)
		}
	}

	return &updatedSlot, nil
}
