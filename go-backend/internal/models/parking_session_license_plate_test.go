package models

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestParkingSession_IsContinuous_WithLicensePlate tests license plate matching in continuous parking
func TestParkingSession_IsContinuous_WithLicensePlate(t *testing.T) {
	baseTime := time.Date(2024, 12, 31, 20, 0, 0, 0, time.UTC)

	testCases := []struct {
		name      string
		current   *ParkingSession
		previous  []*ParkingSession
		expected  bool
		scenario  string
	}{
		{
			name: "Same license plate - continuous",
			scenario: "Previous session exited 30 min ago with plate ABC123, current session parks with same plate ABC123",
			current: &ParkingSession{
				ID:       2,
				ParkedAt: baseTime.Add(30 * time.Minute),
				LicensePlate: stringPtr("ABC123"),
			},
			previous: []*ParkingSession{
				{
					ID:           1,
					ExitedAt:     timePtr(baseTime),
					LicensePlate: stringPtr("ABC123"),
				},
			},
			expected: true,
		},
		{
			name: "Different license plate - not continuous",
			scenario: "Previous session exited 30 min ago with plate ABC123, current session parks with different plate XYZ789",
			current: &ParkingSession{
				ID:       2,
				ParkedAt: baseTime.Add(30 * time.Minute),
				LicensePlate: stringPtr("XYZ789"),
			},
			previous: []*ParkingSession{
				{
					ID:           1,
					ExitedAt:     timePtr(baseTime),
					LicensePlate: stringPtr("ABC123"),
				},
			},
			expected: false,
		},
		{
			name: "Previous has no plate, current has plate - continuous (backward compatible)",
			scenario: "Previous session (no plate tracking) exited 30 min ago, current session parks with plate ABC123",
			current: &ParkingSession{
				ID:       2,
				ParkedAt: baseTime.Add(30 * time.Minute),
				LicensePlate: stringPtr("ABC123"),
			},
			previous: []*ParkingSession{
				{
					ID:           1,
					ExitedAt:     timePtr(baseTime),
					LicensePlate: nil,
				},
			},
			expected: true,
		},
		{
			name: "Previous has plate, current has no plate - not continuous",
			scenario: "Previous session with plate ABC123 exited 30 min ago, current session parks without plate",
			current: &ParkingSession{
				ID:       2,
				ParkedAt: baseTime.Add(30 * time.Minute),
				LicensePlate: nil,
			},
			previous: []*ParkingSession{
				{
					ID:           1,
					ExitedAt:     timePtr(baseTime),
					LicensePlate: stringPtr("ABC123"),
				},
			},
			expected: false,
		},
		{
			name: "Both have no plate - continuous (backward compatible)",
			scenario: "Previous session (no plate) exited 30 min ago, current session parks without plate",
			current: &ParkingSession{
				ID:       2,
				ParkedAt: baseTime.Add(30 * time.Minute),
				LicensePlate: nil,
			},
			previous: []*ParkingSession{
				{
					ID:           1,
					ExitedAt:     timePtr(baseTime),
					LicensePlate: nil,
				},
			},
			expected: true,
		},
		{
			name: "Same license plate but outside 1-hour threshold - not continuous",
			scenario: "Previous session with plate ABC123 exited 90 min ago, current session parks with same plate",
			current: &ParkingSession{
				ID:       2,
				ParkedAt: baseTime.Add(90 * time.Minute),
				LicensePlate: stringPtr("ABC123"),
			},
			previous: []*ParkingSession{
				{
					ID:           1,
					ExitedAt:     timePtr(baseTime),
					LicensePlate: stringPtr("ABC123"),
				},
			},
			expected: false,
		},
		{
			name: "Multiple previous sessions - picks correct matching one",
			scenario: "Two previous sessions exist. First (plate DEF456) exited 50 min ago. Second (plate ABC123) exited 20 min ago. Current parks with plate ABC123.",
			current: &ParkingSession{
				ID:       3,
				ParkedAt: baseTime.Add(70 * time.Minute),
				LicensePlate: stringPtr("ABC123"),
			},
			previous: []*ParkingSession{
				{
					ID:           1,
					ExitedAt:     timePtr(baseTime.Add(20 * time.Minute)),
					LicensePlate: stringPtr("DEF456"),
				},
				{
					ID:           2,
					ExitedAt:     timePtr(baseTime.Add(50 * time.Minute)),
					LicensePlate: stringPtr("ABC123"),
				},
			},
			expected: true,
		},
		{
			name: "No matching license plate in multiple sessions - not continuous",
			scenario: "Two previous sessions exist with plates ABC123 and DEF456. Current parks with plate XYZ789.",
			current: &ParkingSession{
				ID:       3,
				ParkedAt: baseTime.Add(70 * time.Minute),
				LicensePlate: stringPtr("XYZ789"),
			},
			previous: []*ParkingSession{
				{
					ID:           1,
					ExitedAt:     timePtr(baseTime.Add(20 * time.Minute)),
					LicensePlate: stringPtr("ABC123"),
				},
				{
					ID:           2,
					ExitedAt:     timePtr(baseTime.Add(50 * time.Minute)),
					LicensePlate: stringPtr("DEF456"),
				},
			},
			expected: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := tc.current.IsContinuous(tc.previous)
			assert.Equal(t, tc.expected, result, "Scenario: %s", tc.scenario)
		})
	}
}

// TestParkingSession_CalculateBaseStartTime_WithLicensePlate tests license plate matching in base start time calculation
func TestParkingSession_CalculateBaseStartTime_WithLicensePlate(t *testing.T) {
	baseTime := time.Date(2024, 12, 31, 10, 0, 0, 0, time.UTC)

	testCases := []struct {
		name      string
		current   *ParkingSession
		previous  []*ParkingSession
		expected  time.Time
		scenario  string
	}{
		{
			name: "Single session - same license plate",
			scenario: "Current parks at 11:30 with plate ABC123. Previous session with same plate exited at 11:00.",
			current: &ParkingSession{
				ID:           2,
				ParkedAt:     baseTime.Add(90 * time.Minute),
				LicensePlate: stringPtr("ABC123"),
			},
			previous: []*ParkingSession{
				{
					ID:           1,
					ParkedAt:     baseTime,
					ExitedAt:     timePtr(baseTime.Add(60 * time.Minute)),
					LicensePlate: stringPtr("ABC123"),
				},
			},
			expected: baseTime,
		},
		{
			name: "Chained continuous sessions - tracing back",
			scenario: "Three sessions: S1 (10:00-10:30), S2 (10:45-11:15), S3 parks at 11:20. All have plate ABC123. S3 is within 1h of S2 exit.",
			current: &ParkingSession{
				ID:           3,
				ParkedAt:     baseTime.Add(80 * time.Minute),
				LicensePlate: stringPtr("ABC123"),
			},
			previous: []*ParkingSession{
				{
					ID:           1,
					ParkedAt:     baseTime,
					ExitedAt:     timePtr(baseTime.Add(30 * time.Minute)),
					LicensePlate: stringPtr("ABC123"),
				},
				{
					ID:           2,
					ParkedAt:     baseTime.Add(45 * time.Minute),
					ExitedAt:     timePtr(baseTime.Add(75 * time.Minute)),
					LicensePlate: stringPtr("ABC123"),
				},
			},
			expected: baseTime,
		},
		{
			name: "Different license plate - stops chain",
			scenario: "S1 (plate ABC123) exited at 11:00. S2 (different plate) parked at 11:30. S1 is not considered continuous.",
			current: &ParkingSession{
				ID:           2,
				ParkedAt:     baseTime.Add(90 * time.Minute),
				LicensePlate: stringPtr("XYZ789"),
			},
			previous: []*ParkingSession{
				{
					ID:           1,
					ParkedAt:     baseTime,
					ExitedAt:     timePtr(baseTime.Add(60 * time.Minute)),
					LicensePlate: stringPtr("ABC123"),
				},
			},
			expected: baseTime.Add(90 * time.Minute),
		},
		{
			name: "No previous sessions",
			scenario: "Current session is the first one with no previous sessions to trace.",
			current: &ParkingSession{
				ID:           1,
				ParkedAt:     baseTime,
				LicensePlate: stringPtr("ABC123"),
			},
			previous:  []*ParkingSession{},
			expected:  baseTime,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := tc.current.CalculateBaseStartTime(tc.previous, []int64{})
			assert.Equal(t, tc.expected, result, "Scenario: %s", tc.scenario)
		})
	}
}

// TestLicensePlateDifferentiatesSamVehicleType tests that different vehicles of the same type are distinguished by license plate
func TestLicensePlateDifferentiatesSameVehicleType(t *testing.T) {
	baseTime := time.Date(2024, 12, 31, 10, 0, 0, 0, time.UTC)

	t.Run("two small vehicles with different plates parked in sequence", func(t *testing.T) {
		// First small vehicle (plate ABC123) parks and exits
		vehicle1 := &ParkingSession{
			ID:           1,
			VehicleType:  "S",
			ParkedAt:     baseTime,
			ExitedAt:     timePtr(baseTime.Add(60 * time.Minute)),
			LicensePlate: stringPtr("ABC123"),
		}

		// Second small vehicle (plate XYZ789) parks 20 minutes after first exited
		vehicle2 := &ParkingSession{
			ID:           2,
			VehicleType:  "S",
			ParkedAt:     baseTime.Add(80 * time.Minute),
			LicensePlate: stringPtr("XYZ789"),
		}

		// Vehicle 2 should NOT be marked as continuous because license plate doesn't match
		require.False(t, vehicle2.IsContinuous([]*ParkingSession{vehicle1}),
			"Different vehicles (different plates) of same type should NOT be continuous parking")
	})

	t.Run("two small vehicles with same license plate are continuous", func(t *testing.T) {
		// First parking session
		session1 := &ParkingSession{
			ID:           1,
			VehicleType:  "S",
			ParkedAt:     baseTime,
			ExitedAt:     timePtr(baseTime.Add(60 * time.Minute)),
			LicensePlate: stringPtr("ABC123"),
		}

		// Same vehicle parks again 20 minutes later
		session2 := &ParkingSession{
			ID:           2,
			VehicleType:  "S",
			ParkedAt:     baseTime.Add(80 * time.Minute),
			LicensePlate: stringPtr("ABC123"),
		}

		// Same vehicle should be continuous
		require.True(t, session2.IsContinuous([]*ParkingSession{session1}),
			"Same vehicle (same license plate) parking within 1 hour should be continuous")
	})
}

// Helpers
func stringPtr(s string) *string {
	return &s
}

func timePtr(t time.Time) *time.Time {
	return &t
}
