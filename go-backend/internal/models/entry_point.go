// Package models provides data models for the parking lot system.
package models

import (
	"time"
)

// EntryPoint represents a parking entry point
type EntryPoint struct {
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
	ID         int64     `json:"id" db:"id"`
	Identifier string    `json:"identifier" db:"identifier"`
	Name       string    `json:"name" db:"name"`
}

// Index returns the index of this entry point for distance calculations
// Entry points are ordered by their identifier (A=0, B=1, C=2, etc.)
func (ep *EntryPoint) Index() int {
	return int(ep.Identifier[0] - 'A')
}
