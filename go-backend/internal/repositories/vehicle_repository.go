// Package repositories provides data access layer for parking lot system.
package repositories

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/models"
)

// VehicleRepository handles vehicle data operations
type VehicleRepository struct {
	db *sql.DB
}

// NewVehicleRepository creates a new vehicle repository
func NewVehicleRepository(db *sql.DB) *VehicleRepository {
	return &VehicleRepository{db: db}
}

// GetByID retrieves a vehicle by ID
func (r *VehicleRepository) GetByID(id string) (*models.Vehicle, error) {
	fmt.Printf("DEBUG: GetByID - Attempting to get vehicle with ID: %s (type: %T)\n", id, id)
	
	query := `
		SELECT id, license_plate, vehicle_type, color, brand, model, year, metadata,
			first_seen_at, last_seen_at, total_sessions, total_spent, total_hours_parked,
			is_frequent, created_at, updated_at
		FROM vehicles
		WHERE id = $1
	`

	var vehicle models.Vehicle
	var metadataJSON []byte
	
	fmt.Printf("DEBUG: GetByID - About to execute query and scan into vehicle.ID (type: string)\n")
	err := r.db.QueryRow(query, id).Scan(
		&vehicle.ID,
		&vehicle.LicensePlate,
		&vehicle.VehicleType,
		&vehicle.Color,
		&vehicle.Brand,
		&vehicle.Model,
		&vehicle.Year,
		&metadataJSON,
		&vehicle.FirstSeenAt,
		&vehicle.LastSeenAt,
		&vehicle.TotalSessions,
		&vehicle.TotalSpent,
		&vehicle.TotalHoursParked,
		&vehicle.IsFrequent,
		&vehicle.CreatedAt,
		&vehicle.UpdatedAt,
	)
	
	if err != nil {
		fmt.Printf("DEBUG: GetByID - Scan failed with error: %v (type: %T)\n", err, err)
		return nil, fmt.Errorf("failed to get vehicle: %w", err)
	}
	
	fmt.Printf("DEBUG: GetByID - Successfully scanned vehicle with ID: %s\n", vehicle.ID)

	if metadataJSON != nil {
		if err := json.Unmarshal(metadataJSON, &vehicle.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}
	}

	return &vehicle, nil
}

// GetByLicensePlate retrieves a vehicle by license plate
func (r *VehicleRepository) GetByLicensePlate(licensePlate string) (*models.Vehicle, error) {
	query := `
		SELECT id, license_plate, vehicle_type, color, brand, model, year, metadata,
			first_seen_at, last_seen_at, total_sessions, total_spent, total_hours_parked,
			is_frequent, created_at, updated_at
		FROM vehicles
		WHERE license_plate = $1
	`

	var vehicle models.Vehicle
	var metadataJSON []byte
	err := r.db.QueryRow(query, licensePlate).Scan(
		&vehicle.ID,
		&vehicle.LicensePlate,
		&vehicle.VehicleType,
		&vehicle.Color,
		&vehicle.Brand,
		&vehicle.Model,
		&vehicle.Year,
		&metadataJSON,
		&vehicle.FirstSeenAt,
		&vehicle.LastSeenAt,
		&vehicle.TotalSessions,
		&vehicle.TotalSpent,
		&vehicle.TotalHoursParked,
		&vehicle.IsFrequent,
		&vehicle.CreatedAt,
		&vehicle.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get vehicle: %w", err)
	}

	if metadataJSON != nil {
		if err := json.Unmarshal(metadataJSON, &vehicle.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}
	}

	return &vehicle, nil
}

// List retrieves all vehicles with pagination
func (r *VehicleRepository) List(page, perPage int) ([]*models.Vehicle, error) {
	fmt.Printf("DEBUG: List - Attempting to list vehicles with page=%d, perPage=%d\n", page, perPage)
	
	offset := (page - 1) * perPage

	query := `
		SELECT id, license_plate, vehicle_type, color, brand, model, year, metadata,
			first_seen_at, last_seen_at, total_sessions, total_spent, total_hours_parked,
			is_frequent, created_at, updated_at
		FROM vehicles
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	fmt.Printf("DEBUG: List - About to execute query and scan rows\n")
	rows, err := r.db.Query(query, perPage, offset)
	if err != nil {
		fmt.Printf("DEBUG: List - Query failed with error: %v\n", err)
		return nil, fmt.Errorf("failed to list vehicles: %w", err)
	}
	defer func() {
		_ = rows.Close()
	}()

	var vehicles []*models.Vehicle
	rowCount := 0
	for rows.Next() {
		rowCount++
		var vehicle models.Vehicle
		var metadataJSON []byte
		
		fmt.Printf("DEBUG: List - About to scan row %d into vehicle.ID (type: string)\n", rowCount)
		err := rows.Scan(
			&vehicle.ID,
			&vehicle.LicensePlate,
			&vehicle.VehicleType,
			&vehicle.Color,
			&vehicle.Brand,
			&vehicle.Model,
			&vehicle.Year,
			&metadataJSON,
			&vehicle.FirstSeenAt,
			&vehicle.LastSeenAt,
			&vehicle.TotalSessions,
			&vehicle.TotalSpent,
			&vehicle.TotalHoursParked,
			&vehicle.IsFrequent,
			&vehicle.CreatedAt,
			&vehicle.UpdatedAt,
		)
		if err != nil {
			fmt.Printf("DEBUG: List - Scan failed on row %d with error: %v (type: %T)\n", rowCount, err, err)
			return nil, fmt.Errorf("failed to scan vehicle: %w", err)
		}

		if metadataJSON != nil {
			if err := json.Unmarshal(metadataJSON, &vehicle.Metadata); err != nil {
				return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
		}

		vehicles = append(vehicles, &vehicle)
	}

	return vehicles, nil
}

// Create creates a new vehicle
func (r *VehicleRepository) Create(vehicle *models.Vehicle) (*models.Vehicle, error) {
	fmt.Printf("DEBUG: Create - Attempting to create vehicle with license_plate: %s\n", vehicle.LicensePlate)
	
	newVehicle := &models.Vehicle{
		LicensePlate: vehicle.LicensePlate,
		VehicleType:  vehicle.VehicleType,
		Color:        vehicle.Color,
		Brand:        vehicle.Brand,
		Model:        vehicle.Model,
		Year:         vehicle.Year,
		Metadata:     vehicle.Metadata,
		FirstSeenAt:  time.Now(),
		LastSeenAt:   vehicle.LastSeenAt,
		TotalSessions: 0,
		TotalSpent:   0,
		TotalHoursParked: 0,
		IsFrequent:    false,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	metadataJSON, err := json.Marshal(newVehicle.Metadata)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		INSERT INTO vehicles (license_plate, vehicle_type, color, brand, model, year, metadata,
			first_seen_at, last_seen_at, total_sessions, total_spent, total_hours_parked,
			is_frequent, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id, license_plate, vehicle_type, color, brand, model, year, metadata,
			first_seen_at, last_seen_at, total_sessions, total_spent, total_hours_parked,
			is_frequent, created_at, updated_at
	`

	fmt.Printf("DEBUG: Create - About to execute INSERT and scan into newVehicle.ID (type: string)\n")
	err = r.db.QueryRow(
		query,
		newVehicle.LicensePlate,
		newVehicle.VehicleType,
		newVehicle.Color,
		newVehicle.Brand,
		newVehicle.Model,
		newVehicle.Year,
		metadataJSON,
		newVehicle.FirstSeenAt,
		newVehicle.LastSeenAt,
		newVehicle.TotalSessions,
		newVehicle.TotalSpent,
		newVehicle.TotalHoursParked,
		newVehicle.IsFrequent,
		newVehicle.CreatedAt,
		newVehicle.UpdatedAt,
	).Scan(
		&newVehicle.ID,
		&newVehicle.LicensePlate,
		&newVehicle.VehicleType,
		&newVehicle.Color,
		&newVehicle.Brand,
		&newVehicle.Model,
		&newVehicle.Year,
		&metadataJSON,
		&newVehicle.FirstSeenAt,
		&newVehicle.LastSeenAt,
		&newVehicle.TotalSessions,
		&newVehicle.TotalSpent,
		&newVehicle.TotalHoursParked,
		&newVehicle.IsFrequent,
		&newVehicle.CreatedAt,
		&newVehicle.UpdatedAt,
	)

	if err != nil {
		fmt.Printf("DEBUG: Create - Scan failed with error: %v (type: %T)\n", err, err)
		return nil, fmt.Errorf("failed to create vehicle: %w", err)
	}
	
	fmt.Printf("DEBUG: Create - Successfully created vehicle with ID: %s\n", newVehicle.ID)

	if metadataJSON != nil {
		if err := json.Unmarshal(metadataJSON, &newVehicle.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}
	}

	return newVehicle, nil
}

// Update updates a vehicle
func (r *VehicleRepository) Update(vehicle *models.Vehicle) error {
	vehicle.UpdatedAt = time.Now()

	metadataJSON, err := json.Marshal(vehicle.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		UPDATE vehicles
		SET license_plate = $1, vehicle_type = $2, color = $3, brand = $4, model = $5,
			year = $6, metadata = $7, last_seen_at = $8, total_sessions = $9,
			total_spent = $10, total_hours_parked = $11, is_frequent = $12, updated_at = $13
		WHERE id = $14
	`

	_, err = r.db.Exec(
		query,
		vehicle.LicensePlate,
		vehicle.VehicleType,
		vehicle.Color,
		vehicle.Brand,
		vehicle.Model,
		vehicle.Year,
		metadataJSON,
		vehicle.LastSeenAt,
		vehicle.TotalSessions,
		vehicle.TotalSpent,
		vehicle.TotalHoursParked,
		vehicle.IsFrequent,
		vehicle.UpdatedAt,
		vehicle.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update vehicle: %w", err)
	}

	return nil
}

// Delete deletes a vehicle from the database by ID
func (r *VehicleRepository) Delete(id string) error {
	query := `DELETE FROM vehicles WHERE id = $1`

	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete vehicle: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("vehicle not found")
	}

	return nil
}

// Count returns the total number of vehicles
func (r *VehicleRepository) Count() (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM vehicles`
	err := r.db.QueryRow(query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count vehicles: %w", err)
	}
	return count, nil
}

// FindOrCreate finds a vehicle by license plate or creates a new one
func (r *VehicleRepository) FindOrCreate(licensePlate, vehicleType string) (*models.Vehicle, error) {
	// Try to find existing vehicle
	existingVehicle, err := r.GetByLicensePlate(licensePlate)
	if err == nil {
		// Vehicle exists, update last seen time
		now := time.Now()
		existingVehicle.LastSeenAt = &now
		existingVehicle.UpdatedAt = now
		if err := r.Update(existingVehicle); err != nil {
			return nil, fmt.Errorf("failed to update vehicle: %w", err)
		}
		return existingVehicle, nil
	}

	// Vehicle doesn't exist, create it
	newVehicle := &models.Vehicle{
		LicensePlate: licensePlate,
		VehicleType:  vehicleType,
		FirstSeenAt:  time.Now(),
		TotalSessions: 0,
		TotalSpent:   0,
		TotalHoursParked: 0,
		IsFrequent:    false,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	return r.Create(newVehicle)
}
