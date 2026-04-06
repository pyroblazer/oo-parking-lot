// Package repositories provides data access layer for the parking lot system.
package repositories

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
)

// EntryPointRepository handles entry point data operations
type EntryPointRepository struct {
	db *sql.DB
}

// NewEntryPointRepository creates a new entry point repository
func NewEntryPointRepository(db *sql.DB) *EntryPointRepository {
	return &EntryPointRepository{db: db}
}

// DB returns the underlying database connection
func (r *EntryPointRepository) DB() *sql.DB {
	return r.db
}

// GetByIDentifier retrieves an entry point by identifier (case-insensitive, trimmed)
func (r *EntryPointRepository) GetByIDentifier(identifier string) (*models.EntryPoint, error) {
	// Trim whitespace and use case-insensitive matching for robust lookup
	trimmedIdentifier := strings.TrimSpace(identifier)
	query := `
		SELECT id, identifier, name, created_at, updated_at
		FROM entry_points
		WHERE LOWER(TRIM(identifier)) = LOWER($1)
	`

	var ep models.EntryPoint
	err := r.db.QueryRow(query, trimmedIdentifier).Scan(
		&ep.ID,
		&ep.Identifier,
		&ep.Name,
		&ep.CreatedAt,
		&ep.UpdatedAt,
	)

	if err != nil {
		// Don't wrap sql.ErrNoRows so service can detect "not found" properly
		if err == sql.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get entry point: %w", err)
	}

	return &ep, nil
}

// GetByID retrieves an entry point by ID
func (r *EntryPointRepository) GetByID(id int64) (*models.EntryPoint, error) {
	query := `
		SELECT id, identifier, name, created_at, updated_at
		FROM entry_points
		WHERE id = $1
	`

	var ep models.EntryPoint
	err := r.db.QueryRow(query, id).Scan(
		&ep.ID,
		&ep.Identifier,
		&ep.Name,
		&ep.CreatedAt,
		&ep.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get entry point: %w", err)
	}

	return &ep, nil
}

// List retrieves all entry points
func (r *EntryPointRepository) List() ([]*models.EntryPoint, error) {
	query := `
		SELECT id, identifier, name, created_at, updated_at
		FROM entry_points
		ORDER BY identifier
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to list entry points: %w", err)
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
			return nil, fmt.Errorf("failed to scan entry point: %w", err)
		}
		entryPoints = append(entryPoints, &ep)
	}

	return entryPoints, nil
}

// Create creates a new entry point
func (r *EntryPointRepository) Create(ep *models.EntryPoint) (*models.EntryPoint, error) {
	newEP := &models.EntryPoint{
		Identifier: ep.Identifier,
		Name:       ep.Name,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	query := `
		INSERT INTO entry_points (identifier, name, created_at, updated_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, identifier, name, created_at, updated_at
	`

	err := r.db.QueryRow(
		query,
		newEP.Identifier,
		newEP.Name,
		newEP.CreatedAt,
		newEP.UpdatedAt,
	).Scan(
		&newEP.ID,
		&newEP.Identifier,
		&newEP.Name,
		&newEP.CreatedAt,
		&newEP.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create entry point: %w", err)
	}

	return newEP, nil
}

// Update updates an entry point
func (r *EntryPointRepository) Update(ep *models.EntryPoint) error {
	ep.UpdatedAt = time.Now()

	query := `
		UPDATE entry_points
		SET identifier = $1, name = $2, updated_at = $3
		WHERE id = $4
	`

	_, err := r.db.Exec(
		query,
		ep.Identifier,
		ep.Name,
		ep.UpdatedAt,
		ep.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update entry point: %w", err)
	}

	return nil
}

// Delete deletes an entry point (idempotent - always returns success)
func (r *EntryPointRepository) Delete(id int64) error {
	query := `DELETE FROM entry_points WHERE id = $1`
	result, err := r.db.Exec(query, id)
	if err != nil {
		// Check if error is due to foreign key constraint
		if strings.Contains(err.Error(), "foreign key") || strings.Contains(err.Error(), "violates foreign key") {
			return fmt.Errorf("cannot delete entry point with associated sessions")
		}
		// Return the error directly without wrapping so handler can detect it
		return err
	}

	// Always return success for idempotency (like Ruby backend)
	// Even if record doesn't exist, consider the operation successful
	_ = result
	return nil
}

// FindOrCreate finds an entry point by identifier or creates a new one (idempotent)
func (r *EntryPointRepository) FindOrCreate(identifier, name string) (*models.EntryPoint, error) {
	// Try to find existing entry point by identifier
	existingEP, err := r.GetByIDentifier(identifier)
	if err != nil {
		// If error is "no rows" (possibly wrapped), proceed to create entry point
		// Otherwise, return the error
		if !errors.Is(err, sql.ErrNoRows) && !strings.Contains(err.Error(), "no rows") {
			return nil, fmt.Errorf("failed to check entry point: %w", err)
		}
	}

	if existingEP != nil {
		// Entry point exists, update name if different
		if existingEP.Name != name {
			existingEP.Name = name
			existingEP.UpdatedAt = time.Now()
			if err := r.Update(existingEP); err != nil {
				return nil, fmt.Errorf("failed to update entry point: %w", err)
			}
		}
		return existingEP, nil
	}

	// Entry point doesn't exist, create it
	newEP := &models.EntryPoint{
		Identifier: identifier,
		Name:       name,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	query := `
		INSERT INTO entry_points (identifier, name, created_at, updated_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, identifier, name, created_at, updated_at
	`

	err = r.db.QueryRow(
		query,
		newEP.Identifier,
		newEP.Name,
		newEP.CreatedAt,
		newEP.UpdatedAt,
	).Scan(
		&newEP.ID,
		&newEP.Identifier,
		&newEP.Name,
		&newEP.CreatedAt,
		&newEP.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create entry point: %w", err)
	}

	return newEP, nil
}

// DeleteAll deletes all entry points (for test database reset)
func (r *EntryPointRepository) DeleteAll() error {
	_, err := r.db.Exec("DELETE FROM entry_points")
	if err != nil {
		return fmt.Errorf("failed to delete all entry points: %w", err)
	}
	return nil
}

// CreateWithTx creates a new entry point within a transaction
func (r *EntryPointRepository) CreateWithTx(tx *sql.Tx, ep *models.EntryPoint) (*models.EntryPoint, error) {
	newEP := &models.EntryPoint{
		Identifier: ep.Identifier,
		Name:       ep.Name,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	query := `
		INSERT INTO entry_points (identifier, name, created_at, updated_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, identifier, name, created_at, updated_at
	`

	err := tx.QueryRow(
		query,
		newEP.Identifier,
		newEP.Name,
		newEP.CreatedAt,
		newEP.UpdatedAt,
	).Scan(
		&newEP.ID,
		&newEP.Identifier,
		&newEP.Name,
		&newEP.CreatedAt,
		&newEP.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create entry point: %w", err)
	}

	return newEP, nil
}

// UpdateWithTx updates an entry point within a transaction
func (r *EntryPointRepository) UpdateWithTx(tx *sql.Tx, ep *models.EntryPoint) error {
	ep.UpdatedAt = time.Now()

	query := `
		UPDATE entry_points
		SET identifier = $1, name = $2, updated_at = $3
		WHERE id = $4
	`

	_, err := tx.Exec(
		query,
		ep.Identifier,
		ep.Name,
		ep.UpdatedAt,
		ep.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update entry point: %w", err)
	}

	return nil
}

// GetByIDentifierWithTx retrieves an entry point by identifier within a transaction
func (r *EntryPointRepository) GetByIDentifierWithTx(tx *sql.Tx, identifier string) (*models.EntryPoint, error) {
	// Trim whitespace and use case-insensitive matching for robust lookup
	trimmedIdentifier := strings.TrimSpace(identifier)
	query := `
		SELECT id, identifier, name, created_at, updated_at
		FROM entry_points
		WHERE LOWER(TRIM(identifier)) = LOWER($1)
	`

	var ep models.EntryPoint
	err := tx.QueryRow(query, trimmedIdentifier).Scan(
		&ep.ID,
		&ep.Identifier,
		&ep.Name,
		&ep.CreatedAt,
		&ep.UpdatedAt,
	)

	if err != nil {
		// Don't wrap sql.ErrNoRows so service can detect "not found" properly
		if err == sql.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get entry point: %w", err)
	}

	return &ep, nil
}
