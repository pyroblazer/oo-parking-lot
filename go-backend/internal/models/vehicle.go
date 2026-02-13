// Package models provides data models for the parking lot system.
package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// VehicleMetadata represents additional metadata for vehicles
type VehicleMetadata map[string]interface{}

// Scan implements the sql.Scanner interface for VehicleMetadata
func (vm *VehicleMetadata) Scan(value interface{}) error {
	if value == nil {
		*vm = VehicleMetadata{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, vm)
}

// Value implements the driver.Valuer interface for VehicleMetadata
func (vm VehicleMetadata) Value() (driver.Value, error) {
	return json.Marshal(vm)
}

// Vehicle represents a vehicle in the parking lot system
type Vehicle struct {
	ID              string           `json:"id" db:"id"`
	LicensePlate    string           `json:"license_plate" db:"license_plate"`
	VehicleType     string           `json:"vehicle_type" db:"vehicle_type"`
	Color           *string          `json:"color" db:"color"`
	Brand           *string          `json:"brand" db:"brand"`
	Model           *string          `json:"model" db:"model"`
	Year            *int             `json:"year" db:"year"`
	Metadata        VehicleMetadata  `json:"metadata" db:"metadata"`
	FirstSeenAt     time.Time        `json:"first_seen_at" db:"first_seen_at"`
	LastSeenAt      *time.Time       `json:"last_seen_at" db:"last_seen_at"`
	TotalSessions   int              `json:"total_sessions" db:"total_sessions"`
	TotalSpent      float64          `json:"total_spent" db:"total_spent"`
	TotalHoursParked int             `json:"total_hours_parked" db:"total_hours_parked"`
	IsFrequent      bool             `json:"is_frequent" db:"is_frequent"`
	CreatedAt       time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at" db:"updated_at"`
}

// IsValidVehicleType checks if the vehicle type is valid
func (v *Vehicle) IsValidVehicleType() bool {
	return v.VehicleType == "S" || v.VehicleType == "M" || v.VehicleType == "L"
}

// IsSmallVehicle checks if this is a small vehicle
func (v *Vehicle) IsSmallVehicle() bool {
	return v.VehicleType == "S"
}

// IsMediumVehicle checks if this is a medium vehicle
func (v *Vehicle) IsMediumVehicle() bool {
	return v.VehicleType == "M"
}

// IsLargeVehicle checks if this is a large vehicle
func (v *Vehicle) IsLargeVehicle() bool {
	return v.VehicleType == "L"
}

// UpdateLastSeen updates the last seen timestamp
func (v *Vehicle) UpdateLastSeen() {
	now := time.Now()
	v.LastSeenAt = &now
}

// IncrementSessions increments the total session count
func (v *Vehicle) IncrementSessions() {
	v.TotalSessions++
}

// AddSpending adds to the total spent amount
func (v *Vehicle) AddSpending(amount float64) {
	v.TotalSpent += amount
}

// AddHours adds to the total hours parked
func (v *Vehicle) AddHours(hours int) {
	v.TotalHoursParked += hours
}

// MarkAsFrequent marks the vehicle as frequent
func (v *Vehicle) MarkAsFrequent() {
	v.IsFrequent = true
}

// GetDisplayName returns a display name for the vehicle
func (v *Vehicle) GetDisplayName() string {
	if v.Brand != nil && v.Model != nil {
		return *v.Brand + " " + *v.Model
	}
	return v.LicensePlate
}
