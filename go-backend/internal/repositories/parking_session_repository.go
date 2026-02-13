// Package repositories provides data access layer for the parking lot system.
package repositories

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
)

// ParkingSessionRepository handles parking session data operations
type ParkingSessionRepository struct {
	db *sql.DB
}

// NewParkingSessionRepository creates a new parking session repository
func NewParkingSessionRepository(db *sql.DB) *ParkingSessionRepository {
	return &ParkingSessionRepository{db: db}
}

// Create creates a new parking session
func (r *ParkingSessionRepository) Create(session *models.ParkingSession) (*models.ParkingSession, error) {
	baseStartTime := session.ParkedAt // Create a new time.Time value for BaseStartTime

	newSession := &models.ParkingSession{
		VehicleType:   session.VehicleType,
		ParkingSlotID: session.ParkingSlotID,
		EntryPointID:  session.EntryPointID,
		ParkedAt:      session.ParkedAt,
		BaseStartTime: &baseStartTime, // Pointer to baseStartTime (not persisted to DB)
		ExitedAt:      session.ExitedAt,
		TotalFee:      session.TotalFee,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	query := `
		INSERT INTO parking_sessions (vehicle_type, parking_slot_id, entry_point_id, parked_at, exited_at, total_fee, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, vehicle_type, parking_slot_id, entry_point_id, parked_at, exited_at, total_fee, created_at, updated_at
	`

	err := r.db.QueryRow(
		query,
		newSession.VehicleType,
		newSession.ParkingSlotID,
		newSession.EntryPointID,
		&newSession.ParkedAt,
		newSession.ExitedAt,
		newSession.TotalFee,
		newSession.CreatedAt,
		newSession.UpdatedAt,
	).Scan(
		&newSession.ID,
		&newSession.VehicleType,
		&newSession.ParkingSlotID,
		&newSession.EntryPointID,
		&newSession.ParkedAt,
		&newSession.ExitedAt,
		&newSession.TotalFee,
		&newSession.CreatedAt,
		&newSession.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create parking session: %w", err)
	}

	return newSession, nil
}

// GetByID retrieves a parking session by ID
func (r *ParkingSessionRepository) GetByID(id int64) (*models.ParkingSession, error) {
	query := `
		SELECT id, vehicle_type, parking_slot_id, entry_point_id, parked_at, exited_at, total_fee, created_at, updated_at
		FROM parking_sessions
		WHERE id = $1
	`

	var session models.ParkingSession
	err := r.db.QueryRow(query, id).Scan(
		&session.ID,
		&session.VehicleType,
		&session.ParkingSlotID,
		&session.EntryPointID,
		&session.ParkedAt,
		&session.ExitedAt,
		&session.TotalFee,
		&session.CreatedAt,
		&session.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get parking session: %w", err)
	}

	return &session, nil
}

// Update updates a parking session
func (r *ParkingSessionRepository) Update(session *models.ParkingSession) error {
	session.UpdatedAt = time.Now()

	// Start a transaction to update both session and slot availability
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		} else {
			_ = tx.Commit()
		}
	}()

	// Update parking session
	query := `
		UPDATE parking_sessions
		SET exited_at = $1, total_fee = $2, updated_at = $3
		WHERE id = $4
	`

	_, err = tx.Exec(
		query,
		session.ExitedAt,
		session.TotalFee,
		session.UpdatedAt,
		session.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update parking session: %w", err)
	}

	// Update parking slot availability back to TRUE when vehicle is unparked
	if session.ExitedAt != nil {
		slotQuery := `
			UPDATE parking_slots
			SET available = TRUE
			WHERE id = $1
		`
		_, err = tx.Exec(slotQuery, session.ParkingSlotID)
		if err != nil {
			return fmt.Errorf("failed to update parking slot availability: %w", err)
		}
	}

	return nil
}

// GetPreviousSessions retrieves previous sessions for continuous parking check
// Only returns sessions that exited within 1 hour BEFORE the specified time (parkTime)
// This ensures we only consider sessions that exited: parkTime - 1 hour <= exited_at < parkTime
func (r *ParkingSessionRepository) GetPreviousSessions(vehicleType string, parkTime time.Time) ([]*models.ParkingSession, error) {
	since := parkTime.Add(-time.Hour)
	query := `
		SELECT id, vehicle_type, parking_slot_id, entry_point_id, parked_at, exited_at, total_fee, created_at, updated_at
		FROM parking_sessions
		WHERE vehicle_type = $1
		AND exited_at IS NOT NULL
		AND exited_at >= $2
		AND exited_at < $3
		ORDER BY exited_at DESC
	`

	rows, err := r.db.Query(query, vehicleType, since, parkTime)
	if err != nil {
		return nil, fmt.Errorf("failed to get previous sessions: %w", err)
	}
	defer func() {
		_ = rows.Close()
	}()

	var sessions []*models.ParkingSession
	for rows.Next() {
		var session models.ParkingSession
		err := rows.Scan(
			&session.ID,
			&session.VehicleType,
			&session.ParkingSlotID,
			&session.EntryPointID,
			&session.ParkedAt,
			&session.ExitedAt,
			&session.TotalFee,
			&session.CreatedAt,
			&session.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan parking session: %w", err)
		}
		sessions = append(sessions, &session)
	}

	return sessions, nil
}

// List retrieves all parking sessions
func (r *ParkingSessionRepository) List() ([]*models.ParkingSession, error) {
	query := `
		SELECT id, vehicle_type, parking_slot_id, entry_point_id, parked_at, exited_at, total_fee, created_at, updated_at
		FROM parking_sessions
		ORDER BY parked_at DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to list parking sessions: %w", err)
	}
	defer func() {
		_ = rows.Close()
	}()

	var sessions []*models.ParkingSession
	for rows.Next() {
		var session models.ParkingSession
		err := rows.Scan(
			&session.ID,
			&session.VehicleType,
			&session.ParkingSlotID,
			&session.EntryPointID,
			&session.ParkedAt,
			&session.ExitedAt,
			&session.TotalFee,
			&session.CreatedAt,
			&session.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan parking session: %w", err)
		}
		sessions = append(sessions, &session)
	}

	return sessions, nil
}

// ListPaginated retrieves parking sessions with pagination
func (r *ParkingSessionRepository) ListPaginated(page, perPage int) ([]*models.ParkingSession, error) {
	offset := (page - 1) * perPage

	query := `
		SELECT id, vehicle_type, parking_slot_id, entry_point_id, parked_at, exited_at, total_fee, created_at, updated_at
		FROM parking_sessions
		ORDER BY parked_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.Query(query, perPage, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list parking sessions: %w", err)
	}
	defer func() {
		_ = rows.Close()
	}()

	var sessions []*models.ParkingSession
	for rows.Next() {
		var session models.ParkingSession
		err := rows.Scan(
			&session.ID,
			&session.VehicleType,
			&session.ParkingSlotID,
			&session.EntryPointID,
			&session.ParkedAt,
			&session.ExitedAt,
			&session.TotalFee,
			&session.CreatedAt,
			&session.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan parking session: %w", err)
		}
		sessions = append(sessions, &session)
	}

	return sessions, nil
}

// Delete deletes a parking session
func (r *ParkingSessionRepository) Delete(id int64) error {
	query := `DELETE FROM parking_sessions WHERE id = $1`

	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete parking session: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("parking session not found")
	}

	return nil
}

// DeleteActiveSessions deletes all active parking sessions (where exited_at is NULL)
func (r *ParkingSessionRepository) DeleteActiveSessions() error {
	query := `DELETE FROM parking_sessions WHERE exited_at IS NULL`

	_, err := r.db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to delete active parking sessions: %w", err)
	}

	return nil
}
