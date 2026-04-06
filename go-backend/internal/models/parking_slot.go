// Package models provides data models for parking lot system.
package models

import (
	"encoding/json"
	"time"
)

// SlotType represents type of parking slot
type SlotType string

const (
	// SlotTypeSmall represents a small parking slot
	SlotTypeSmall SlotType = "SP"
	// SlotTypeMedium represents a medium parking slot
	SlotTypeMedium SlotType = "MP"
	// SlotTypeLarge represents a large parking slot
	SlotTypeLarge SlotType = "LP"
)

// ParkingSlot represents a parking slot
type ParkingSlot struct {
	Distances []int     `json:"distances" db:"distances"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
	ID        int64     `json:"id" db:"id"`
	SlotLabel string    `json:"slot_label" db:"slot_label"`
	SlotType  SlotType  `json:"slot_type" db:"slot_type"`
	Available bool      `json:"available" db:"-"`
}

// Scan implements sql.Scanner for Distances
func (ps *ParkingSlot) Scan(value interface{}) error {
	if value == nil {
		ps.Distances = []int{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, &ps.Distances)
}

// DistanceFrom returns distance from a specific entry point
// Supports dynamic entry point configuration with variable-length distance arrays
// Uses entry point Index() to look up the correct distance regardless of entry point order
func (ps *ParkingSlot) DistanceFrom(entryPoint *EntryPoint) int {
	// Use entry point Index() for lookup (based on identifier position)
	// This supports dynamic entry points while maintaining backward compatibility
	// FIX: Use Index() method to get correct array index, don't assume loop order
	idx := entryPoint.Index()
	if idx >= 0 && idx < len(ps.Distances) {
		return ps.Distances[idx]
	}
	return 999 // Large default distance if index out of bounds
}

// CompatibleWith checks if a vehicle type can park in this slot
// Matches Ruby backend logic for compatibility:
// - Small (S) vehicles can park in SP, MP, or LP slots
// - Medium (M) vehicles can park in MP or LP slots
// - Large (L) vehicles can only park in LP slots
func (ps *ParkingSlot) CompatibleWith(vehicleType string) bool {
	switch vehicleType {
	case "S":
		// Small vehicles can park in SP, MP, or LP slots
		return ps.SlotType == SlotTypeSmall || ps.SlotType == SlotTypeMedium || ps.SlotType == SlotTypeLarge
	case "M":
		// Medium vehicles can park in MP or LP slots
		return ps.SlotType == SlotTypeMedium || ps.SlotType == SlotTypeLarge
	case "L":
		// Large vehicles can only park in LP slots
		return ps.SlotType == SlotTypeLarge
	default:
		return false
	}
}
