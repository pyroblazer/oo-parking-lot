// Package repositories provides data access layer for parking lot system.
package repositories

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
)

// ParkingSlotRepository handles parking slot data operations
type ParkingSlotRepository struct {
	db *sql.DB
}

// NewParkingSlotRepository creates a new parking slot repository
func NewParkingSlotRepository(db *sql.DB) *ParkingSlotRepository {
	return &ParkingSlotRepository{db: db}
}

// GetByID retrieves a parking slot by ID
func (r *ParkingSlotRepository) GetByID(id int64) (*models.ParkingSlot, error) {
	query := `
		SELECT ps.id, ps.slot_label, ps.slot_type, ps.distances, ps.created_at, ps.updated_at,
			ps.available AND NOT EXISTS (
				SELECT 1 FROM parking_sessions
				WHERE parking_slot_id = ps.id AND exited_at IS NULL
			) AS available
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
			ps.available AND NOT EXISTS (
				SELECT 1 FROM parking_sessions
				WHERE parking_slot_id = ps.id AND exited_at IS NULL
			) AS available
		FROM parking_slots ps
		WHERE ps.available AND NOT EXISTS (
			SELECT 1 FROM parking_sessions
			WHERE parking_slot_id = ps.id AND exited_at IS NULL
		)
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
			ps.available AND NOT EXISTS (
				SELECT 1 FROM parking_sessions
				WHERE parking_slot_id = ps.id AND exited_at IS NULL
			) AS available
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
			ps.available AND NOT EXISTS (
				SELECT 1 FROM parking_sessions
				WHERE parking_slot_id = ps.id AND exited_at IS NULL
			) AS available
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
