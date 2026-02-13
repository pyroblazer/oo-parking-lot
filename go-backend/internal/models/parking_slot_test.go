package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParkingSlot_CompatibleWith(t *testing.T) {
	spSlot := &ParkingSlot{SlotType: SlotTypeSmall}
	mpSlot := &ParkingSlot{SlotType: SlotTypeMedium}
	lpSlot := &ParkingSlot{SlotType: SlotTypeLarge}

	tests := []struct {
		slot        *ParkingSlot
		name        string
		vehicleType string
		expected    bool
	}{
		{
			name:        "Small vehicle in SP slot",
			slot:        spSlot,
			vehicleType: "S",
			expected:    true,
		},
		{
			name:        "Small vehicle in MP slot",
			slot:        mpSlot,
			vehicleType: "S",
			expected:    true,
		},
		{
			name:        "Small vehicle in LP slot",
			slot:        lpSlot,
			vehicleType: "S",
			expected:    true,
		},
		{
			name:        "Medium vehicle in SP slot",
			slot:        spSlot,
			vehicleType: "M",
			expected:    false,
		},
		{
			name:        "Medium vehicle in MP slot",
			slot:        mpSlot,
			vehicleType: "M",
			expected:    true,
		},
		{
			name:        "Medium vehicle in LP slot",
			slot:        lpSlot,
			vehicleType: "M",
			expected:    true,
		},
		{
			name:        "Large vehicle in SP slot",
			slot:        spSlot,
			vehicleType: "L",
			expected:    false,
		},
		{
			name:        "Large vehicle in MP slot",
			slot:        mpSlot,
			vehicleType: "L",
			expected:    false,
		},
		{
			name:        "Large vehicle in LP slot",
			slot:        lpSlot,
			vehicleType: "L",
			expected:    true,
		},
		{
			name:        "Invalid vehicle type",
			slot:        spSlot,
			vehicleType: "X",
			expected:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.slot.CompatibleWith(tt.vehicleType)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestParkingSlot_DistanceFrom(t *testing.T) {
	entryPointA := &EntryPoint{Identifier: "A"}
	entryPointB := &EntryPoint{Identifier: "B"}
	entryPointC := &EntryPoint{Identifier: "C"}

	slot := &ParkingSlot{
		Distances: []int{1, 4, 5},
	}

	tests := []struct {
		entryPoint *EntryPoint
		name       string
		expected   int
	}{
		{
			name:       "distance from entry point A",
			entryPoint: entryPointA,
			expected:   1,
		},
		{
			name:       "distance from entry point B",
			entryPoint: entryPointB,
			expected:   4,
		},
		{
			name:       "distance from entry point C",
			entryPoint: entryPointC,
			expected:   5,
		},
		{
			name:       "entry point with index out of range",
			entryPoint: &EntryPoint{Identifier: "Z"},
			expected:   999,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := slot.DistanceFrom(tt.entryPoint)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestEntryPoint_Index(t *testing.T) {
	tests := []struct {
		name       string
		identifier string
		expected   int
	}{
		{
			name:       "Entry point A",
			identifier: "A",
			expected:   0,
		},
		{
			name:       "Entry point B",
			identifier: "B",
			expected:   1,
		},
		{
			name:       "Entry point C",
			identifier: "C",
			expected:   2,
		},
		{
			name:       "Entry point Z",
			identifier: "Z",
			expected:   25,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			entryPoint := &EntryPoint{Identifier: tt.identifier}
			result := entryPoint.Index()
			assert.Equal(t, tt.expected, result)
		})
	}
}
