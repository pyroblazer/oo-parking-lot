package models

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestParkingSession_Active(t *testing.T) {
	tests := []struct {
		session  *ParkingSession
		name     string
		expected bool
	}{
		{
			name: "active session with no exit time",
			session: &ParkingSession{
				ExitedAt: nil,
			},
			expected: true,
		},
		{
			name: "completed session with exit time",
			session: &ParkingSession{
				ExitedAt: func() *time.Time { t := time.Now(); return &t }(),
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.session.Active()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestParkingSession_DurationHours(t *testing.T) {
	// Use fixed times for deterministic test results
	baseTime := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		session  *ParkingSession
		name     string
		expected float64
	}{
		{
			name: "1 hour duration",
			session: &ParkingSession{
				ParkedAt: baseTime.Add(-1 * time.Hour),
				ExitedAt: func() *time.Time { t := baseTime; return &t }(),
			},
			expected: 1.0, // ceil(1.0) = 1
		},
		{
			name: "2.5 hours rounded up",
			session: &ParkingSession{
				ParkedAt: baseTime.Add(-2*time.Hour - 30*time.Minute),
				ExitedAt: func() *time.Time { t := baseTime; return &t }(),
			},
			expected: 3.0, // ceil(2.5) = 3
		},
		{
			name: "active session (with exit time)",
			session: &ParkingSession{
				ParkedAt: baseTime.Add(-2 * time.Hour),
				ExitedAt: func() *time.Time { t := baseTime; return &t }(),
			},
			expected: 2.0, // ceil(2.0) = 2
		},
		{
			name: "zero duration",
			session: &ParkingSession{
				ParkedAt: baseTime,
				ExitedAt: func() *time.Time { t := baseTime; return &t }(),
			},
			expected: 0.0, // no parking
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.session.DurationHours()
			assert.InDelta(t, tt.expected, result, 0.01)
		})
	}
}

func TestParkingSession_IsContinuous(t *testing.T) {
	now := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	previousSession := &ParkingSession{
		ID:            1,
		ParkingSlotID: 1,
		ExitedAt:      func() *time.Time { t := now.Add(-2 * time.Hour); return &t }(),
	}

	tests := []struct {
		name             string
		session          *ParkingSession
		previousSessions []*ParkingSession
		expected         bool
	}{
		{
			name: "continuous parking within threshold",
			session: &ParkingSession{
				ID:            2,
				ParkingSlotID: 1,
				ParkedAt:      now.Add(-1*time.Hour - 30*time.Minute),
			},
			previousSessions: []*ParkingSession{previousSession},
			expected:         true,
		},
		{
			name: "not continuous - different slot",
			session: &ParkingSession{
				ID:            2,
				ParkingSlotID: 2,
				ParkedAt:      now.Add(-1*time.Hour - 30*time.Minute),
			},
			previousSessions: []*ParkingSession{previousSession},
			expected:         true, // Changed to true to match Ruby/Postman logic (continuous is time-based, not slot-based)
		},
		{
			name: "not continuous - outside threshold",
			session: &ParkingSession{
				ID:            2,
				ParkingSlotID: 1,
				ParkedAt:      now.Add(-30 * time.Minute),
			},
			previousSessions: []*ParkingSession{previousSession},
			expected:         false,
		},
		{
			name: "no previous sessions",
			session: &ParkingSession{
				ID:            2,
				ParkingSlotID: 1,
				ParkedAt:      now.Add(-30 * time.Minute),
			},
			previousSessions: []*ParkingSession{},
			expected:         false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.session.IsContinuous(tt.previousSessions)
			assert.Equal(t, tt.expected, result)
		})
	}
}
