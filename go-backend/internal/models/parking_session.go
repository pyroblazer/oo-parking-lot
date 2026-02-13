package models

import (
	"fmt"
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
// Matches Ruby backend logic: checks if any previous session of the same vehicle type
// exited within 1 hour before this session started.
// Does NOT require the same parking slot.
func (ps *ParkingSession) IsContinuous(previousSessions []*ParkingSession) bool {
	for _, prev := range previousSessions {
		if prev.ExitedAt != nil {
			timeSinceExit := ps.ParkedAt.Sub(*prev.ExitedAt)
			// Log for debugging
			fmt.Printf("DEBUG: IsContinuous - Checking session ID=%d: exitedAt=%s, timeSinceExit=%.2f minutes, threshold=%.2f minutes, prev.ID=%d, ps.ID=%d\n",
				prev.ID, prev.ExitedAt.Format(time.RFC3339), timeSinceExit.Minutes(), ContinuousParkingThreshold.Minutes(), prev.ID, ps.ID)
			if timeSinceExit < ContinuousParkingThreshold && prev.ID != ps.ID {
				fmt.Printf("DEBUG: IsContinuous - RETURNING TRUE: session ID=%d is continuous (timeSinceExit=%.2f minutes < threshold=%.2f minutes)\n",
					ps.ID, timeSinceExit.Minutes(), ContinuousParkingThreshold.Minutes())
				return true
			}
		}
	}
	fmt.Printf("DEBUG: IsContinuous - RETURNING FALSE: session ID=%d is not continuous\n", ps.ID)
	return false
}

// CalculateBaseStartTime calculates the base start time for continuous parking
// Matches Ruby backend logic: recursively finds the first session in a continuous chain
// Prevents infinite recursion by tracking visited session IDs
func (ps *ParkingSession) CalculateBaseStartTime(previousSessions []*ParkingSession, visitedIDs []int64) time.Time {
	// Prevent infinite recursion by tracking visited session IDs
	for _, id := range visitedIDs {
		if id == ps.ID {
			return ps.ParkedAt
		}
	}

	// Find previous session for continuous parking check
	// Finds most recent completed session that exited within 1 hour before this session started
	var previousSession *ParkingSession
	for _, prev := range previousSessions {
		if prev.ExitedAt != nil {
			timeSinceExit := ps.ParkedAt.Sub(*prev.ExitedAt)
			if timeSinceExit < ContinuousParkingThreshold && timeSinceExit >= 0 && prev.ID != ps.ID {
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

	// Recursively find the base start time of the previous session
	// Add this session's ID to visited list to prevent infinite recursion
	return previousSession.CalculateBaseStartTime(previousSessions, append(visitedIDs, ps.ID))
}
