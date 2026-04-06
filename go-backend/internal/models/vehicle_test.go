package models

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestVehicle_IsValidVehicleType(t *testing.T) {
	tests := []struct {
		name       string
		vehicleType string
		expected   bool
	}{
		{
			name:       "small vehicle type is valid",
			vehicleType: "S",
			expected:   true,
		},
		{
			name:       "medium vehicle type is valid",
			vehicleType: "M",
			expected:   true,
		},
		{
			name:       "large vehicle type is valid",
			vehicleType: "L",
			expected:   true,
		},
		{
			name:       "invalid vehicle type",
			vehicleType: "X",
			expected:   false,
		},
		{
			name:       "empty vehicle type",
			vehicleType: "",
			expected:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			vehicle := &Vehicle{VehicleType: tt.vehicleType}
			result := vehicle.IsValidVehicleType()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestVehicle_IsSmallVehicle(t *testing.T) {
	tests := []struct {
		name       string
		vehicleType string
		expected   bool
	}{
		{
			name:       "small vehicle",
			vehicleType: "S",
			expected:   true,
		},
		{
			name:       "medium vehicle",
			vehicleType: "M",
			expected:   false,
		},
		{
			name:       "large vehicle",
			vehicleType: "L",
			expected:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			vehicle := &Vehicle{VehicleType: tt.vehicleType}
			result := vehicle.IsSmallVehicle()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestVehicle_IsMediumVehicle(t *testing.T) {
	tests := []struct {
		name       string
		vehicleType string
		expected   bool
	}{
		{
			name:       "small vehicle",
			vehicleType: "S",
			expected:   false,
		},
		{
			name:       "medium vehicle",
			vehicleType: "M",
			expected:   true,
		},
		{
			name:       "large vehicle",
			vehicleType: "L",
			expected:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			vehicle := &Vehicle{VehicleType: tt.vehicleType}
			result := vehicle.IsMediumVehicle()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestVehicle_IsLargeVehicle(t *testing.T) {
	tests := []struct {
		name       string
		vehicleType string
		expected   bool
	}{
		{
			name:       "small vehicle",
			vehicleType: "S",
			expected:   false,
		},
		{
			name:       "medium vehicle",
			vehicleType: "M",
			expected:   false,
		},
		{
			name:       "large vehicle",
			vehicleType: "L",
			expected:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			vehicle := &Vehicle{VehicleType: tt.vehicleType}
			result := vehicle.IsLargeVehicle()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestVehicle_UpdateLastSeen(t *testing.T) {
	vehicle := &Vehicle{
		LastSeenAt: nil,
	}

	vehicle.UpdateLastSeen()

	assert.NotNil(t, vehicle.LastSeenAt)
	assert.WithinDuration(t, time.Now(), *vehicle.LastSeenAt, time.Second)
}

func TestVehicle_IncrementSessions(t *testing.T) {
	tests := []struct {
		name         string
		initialCount int
		expected     int
	}{
		{
			name:         "increment from 0",
			initialCount: 0,
			expected:     1,
		},
		{
			name:         "increment from 5",
			initialCount: 5,
			expected:     6,
		},
		{
			name:         "increment from 10",
			initialCount: 10,
			expected:     11,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			vehicle := &Vehicle{TotalSessions: tt.initialCount}
			vehicle.IncrementSessions()
			assert.Equal(t, tt.expected, vehicle.TotalSessions)
		})
	}
}

func TestVehicle_AddSpending(t *testing.T) {
	tests := []struct {
		name         string
		initialSpent float64
		amount       float64
		expected     float64
	}{
		{
			name:         "add to zero spent",
			initialSpent: 0,
			amount:       40.0,
			expected:     40.0,
		},
		{
			name:         "add to existing spent",
			initialSpent: 100.0,
			amount:       50.0,
			expected:     150.0,
		},
		{
			name:         "add zero amount",
			initialSpent: 100.0,
			amount:       0,
			expected:     100.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			vehicle := &Vehicle{TotalSpent: tt.initialSpent}
			vehicle.AddSpending(tt.amount)
			assert.Equal(t, tt.expected, vehicle.TotalSpent)
		})
	}
}

func TestVehicle_AddHours(t *testing.T) {
	tests := []struct {
		name         string
		initialHours float64
		hours        float64
		expected     float64
	}{
		{
			name:         "add to zero hours",
			initialHours: 0,
			hours:        2,
			expected:     2,
		},
		{
			name:         "add to existing hours",
			initialHours: 10,
			hours:        5,
			expected:     15,
		},
		{
			name:         "add zero hours",
			initialHours: 10,
			hours:        0,
			expected:     10,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			vehicle := &Vehicle{TotalHoursParked: tt.initialHours}
			vehicle.AddHours(tt.hours)
			assert.Equal(t, tt.expected, vehicle.TotalHoursParked)
		})
	}
}

func TestVehicle_MarkAsFrequent(t *testing.T) {
	vehicle := &Vehicle{IsFrequent: false}
	vehicle.MarkAsFrequent()
	assert.True(t, vehicle.IsFrequent)
}

func TestVehicle_GetDisplayName(t *testing.T) {
	tests := []struct {
		name     string
		brand    *string
		model    *string
		plate    string
		expected string
	}{
		{
			name:     "with brand and model",
			brand:    func() *string { s := "Toyota"; return &s }(),
			model:    func() *string { s := "Camry"; return &s }(),
			plate:    "ABC-123",
			expected: "Toyota Camry",
		},
		{
			name:     "without brand and model",
			brand:    nil,
			model:    nil,
			plate:    "ABC-123",
			expected: "ABC-123",
		},
		{
			name:     "with brand only",
			brand:    func() *string { s := "Honda"; return &s }(),
			model:    nil,
			plate:    "XYZ-789",
			expected: "XYZ-789",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			vehicle := &Vehicle{
				Brand:        tt.brand,
				Model:        tt.model,
				LicensePlate: tt.plate,
			}
			result := vehicle.GetDisplayName()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestVehicle_Metadata(t *testing.T) {
	t.Run("empty metadata", func(t *testing.T) {
		metadata := VehicleMetadata{}
		vehicle := &Vehicle{Metadata: metadata}
		assert.NotNil(t, vehicle.Metadata)
		assert.Equal(t, 0, len(vehicle.Metadata))
	})

	t.Run("metadata with values", func(t *testing.T) {
		metadata := VehicleMetadata{
			"color": "red",
			"year":  2020,
		}
		vehicle := &Vehicle{Metadata: metadata}
		assert.NotNil(t, vehicle.Metadata)
		assert.Equal(t, 2, len(vehicle.Metadata))
		assert.Equal(t, "red", vehicle.Metadata["color"])
		assert.Equal(t, 2020, vehicle.Metadata["year"])
	})
}

func TestVehicle_Timestamps(t *testing.T) {
	now := time.Now()

	vehicle := &Vehicle{
		FirstSeenAt: now,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	assert.Equal(t, now, vehicle.FirstSeenAt)
	assert.Equal(t, now, vehicle.CreatedAt)
	assert.Equal(t, now, vehicle.UpdatedAt)
}

func TestVehicle_OptionalFields(t *testing.T) {
	color := "red"
	brand := "Toyota"
	model := "Camry"
	year := 2020

	vehicle := &Vehicle{
		Color: &color,
		Brand: &brand,
		Model: &model,
		Year:  &year,
	}

	assert.NotNil(t, vehicle.Color)
	assert.Equal(t, "red", *vehicle.Color)
	assert.NotNil(t, vehicle.Brand)
	assert.Equal(t, "Toyota", *vehicle.Brand)
	assert.NotNil(t, vehicle.Model)
	assert.Equal(t, "Camry", *vehicle.Model)
	assert.NotNil(t, vehicle.Year)
	assert.Equal(t, 2020, *vehicle.Year)
}

func TestVehicle_NilOptionalFields(t *testing.T) {
	vehicle := &Vehicle{
		Color: nil,
		Brand: nil,
		Model: nil,
		Year:  nil,
	}

	assert.Nil(t, vehicle.Color)
	assert.Nil(t, vehicle.Brand)
	assert.Nil(t, vehicle.Model)
	assert.Nil(t, vehicle.Year)
}
