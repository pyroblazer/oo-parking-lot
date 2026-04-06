package models

import (
	"math"
	"time"
)

// ParkingSession represents a parking session
type ParkingSession struct {
	ExitedAt      *time.Time   `json:"exited_at" db:"exited_at"`
	ParkingSlot   *ParkingSlot `json:"parking_slot,omitempty" db:"-"`
	EntryPoint    *EntryPoint  `json:"entry_point,omitempty" db:"-"`
	ParkedAt      time.Time    `json:"parked_at" db:"parked_at"`
	CreatedAt     time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time    `json:"updated_at" db:"updated_at"`
	TotalFee      float64      `json:"total_fee" db:"total_fee"`
	ID            int64        `json:"id" db:"id"`
	VehicleType   string       `json:"vehicle_type" db:"vehicle_type"`
	ParkingSlotID int64        `json:"parking_slot_id" db:"parking_slot_id"`
	EntryPointID  int64        `json:"entry_point_id" db:"entry_point_id"`
	LicensePlate  *string      `json:"license_plate" db:"license_plate"`
	// BaseStartTime is the start time for continuous parking calculation
	// If this is a continuous session, it uses the previous session's parked_at
	BaseStartTime *time.Time `json:"base_start_time,omitempty" db:"-"`
}

// Active checks if session is active (vehicle still parked)
func (ps *ParkingSession) Active() bool {
	return ps.ExitedAt == nil
}

// DurationHours calculates parking duration in hours (rounded up per spec)
func (ps *ParkingSession) DurationHours() float64 {
	exitTime := time.Now()
	if ps.ExitedAt != nil {
		exitTime = *ps.ExitedAt
	}
	duration := exitTime.Sub(ps.ParkedAt).Hours()
	if duration <= 0 {
		return 0
	}
	return math.Ceil(duration)
}

// ContinuousParkingThreshold is the threshold for continuous parking (1 hour)
const ContinuousParkingThreshold = 1 * time.Hour

// IsContinuous checks if this is a continuous parking session
// Checks if any previous session of the same vehicle type exited within 1 hour before this session started.
// If previous session has a license_plate, REQUIRES the current session to have a matching one
// (prevents different vehicles of same type from being incorrectly marked continuous).
// Does NOT require the same parking slot.
func (ps *ParkingSession) IsContinuous(previousSessions []*ParkingSession) bool {
	for _, prev := range previousSessions {
		if prev.ExitedAt != nil {
			timeSinceExit := ps.ParkedAt.Sub(*prev.ExitedAt)

			// Check if time threshold is met
			if timeSinceExit < ContinuousParkingThreshold && prev.ID != ps.ID {
				// If previous session has a license_plate, REQUIRE current session's license_plate to match
				if prev.LicensePlate != nil {
					if ps.LicensePlate != nil && *prev.LicensePlate == *ps.LicensePlate {
						return true
					}
					// Previous session has a license plate but current doesn't match - not continuous
				} else {
					// Previous session has no license plate - allow match (backward compatibility)
					return true
				}
			}
		}
	}
	return false
}

// CalculateBaseStartTime calculates base start time for continuous parking
// Matches Ruby backend logic: recursively traces back through the continuous parking chain
// to find the true base start time (the first session in the chain).
func (ps *ParkingSession) CalculateBaseStartTime(previousSessions []*ParkingSession, visitedIDs []int64) time.Time {
	// Add current session ID to visited to prevent infinite loops
	visitedIDs = append(visitedIDs, ps.ID)

	// Find previous session for continuous parking check
	// Finds most recent completed session that exited within 1 hour before this session started
	// If previous session has a license_plate, REQUIRES current session's license_plate to match
	var previousSession *ParkingSession
	for _, prev := range previousSessions {
		if prev.ExitedAt != nil {
			timeSinceExit := ps.ParkedAt.Sub(*prev.ExitedAt)
			if timeSinceExit < ContinuousParkingThreshold && timeSinceExit >= 0 && prev.ID != ps.ID {
				// Check license plate matching: if previous session has a plate, require current to match
				if prev.LicensePlate != nil {
					if ps.LicensePlate == nil || *prev.LicensePlate != *ps.LicensePlate {
						// License plate mismatch - skip this candidate
						continue
					}
				}

				// Check if this previous session has already been visited to prevent infinite loops
				alreadyVisited := false
				for _, visitedID := range visitedIDs {
					if prev.ID == visitedID {
						alreadyVisited = true
						break
					}
				}
				if alreadyVisited {
					continue
				}
				// Find the most recent one
				if previousSession == nil || prev.ExitedAt.After(*previousSession.ExitedAt) {
					previousSession = prev
				}
			}
		}
	}

	// If no previous continuous session, return this session's parked_at
	if previousSession == nil {
		return ps.ParkedAt
	}

	// Recursively trace back to find the true base start time
	return previousSession.CalculateBaseStartTime(previousSessions, visitedIDs)
}
