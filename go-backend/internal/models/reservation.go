// Package models defines the data structures for parking lot system.
package models

import "time"

// ReservationStatus describes the lifecycle of a booking.
type ReservationStatus string

const (
	ReservationActive     ReservationStatus = "active"
	ReservationCancelled  ReservationStatus = "cancelled"
	ReservationCheckedIn  ReservationStatus = "checked_in"
	ReservationExpired    ReservationStatus = "expired"
)

// Reservation is a booking for a parking slot at a future time.
type Reservation struct {
	ID          int64             `json:"id"`
	ParkingSlot ParkingSlot       `json:"parking_slot"`
	VehicleType string            `json:"vehicle_type"`
	LicensePlate *string          `json:"license_plate,omitempty"`
	StartTime   time.Time         `json:"start_time"`
	EndTime     time.Time         `json:"end_time"`
	Status      ReservationStatus `json:"status"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}
