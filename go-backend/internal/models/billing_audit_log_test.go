package models

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestBillingAuditLog_IsValidVehicleType(t *testing.T) {
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
			auditLog := &BillingAuditLog{VehicleType: tt.vehicleType}
			result := auditLog.IsValidVehicleType()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestBillingAuditLog_IsValidSlotType(t *testing.T) {
	tests := []struct {
		name     string
		slotType string
		expected bool
	}{
		{
			name:     "SP slot type is valid",
			slotType: "SP",
			expected: true,
		},
		{
			name:     "MP slot type is valid",
			slotType: "MP",
			expected: true,
		},
		{
			name:     "LP slot type is valid",
			slotType: "LP",
			expected: true,
		},
		{
			name:     "invalid slot type",
			slotType: "XL",
			expected: false,
		},
		{
			name:     "empty slot type",
			slotType: "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			auditLog := &BillingAuditLog{SlotType: tt.slotType}
			result := auditLog.IsValidSlotType()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestBillingAuditLog_IsLongTerm(t *testing.T) {
	tests := []struct {
		name         string
		longTermDays int
		expected     bool
	}{
		{
			name:         "long-term parking with 1 day",
			longTermDays: 1,
			expected:     true,
		},
		{
			name:         "long-term parking with multiple days",
			longTermDays: 10,
			expected:     true,
		},
		{
			name:         "not long-term with 0 days",
			longTermDays: 0,
			expected:     false,
		},
		{
			name:         "not long-term with negative days",
			longTermDays: -1,
			expected:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			auditLog := &BillingAuditLog{LongTermDays: tt.longTermDays}
			result := auditLog.IsLongTerm()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestBillingAuditLog_GetBreakdown(t *testing.T) {
	breakdown := FeeBreakdown{
		BaseFee:       40.0,
		ExceedingFee:  20.0,
		LongTermFee:   100.0,
		TotalFee:      160.0,
		DurationHours: 5.0,
	}

	auditLog := &BillingAuditLog{FeeBreakdown: breakdown}
	result := auditLog.GetBreakdown()

	assert.Equal(t, breakdown.BaseFee, result.BaseFee)
	assert.Equal(t, breakdown.ExceedingFee, result.ExceedingFee)
	assert.Equal(t, breakdown.LongTermFee, result.LongTermFee)
	assert.Equal(t, breakdown.TotalFee, result.TotalFee)
	assert.Equal(t, breakdown.DurationHours, result.DurationHours)
}

func TestBillingAuditLog_ToHash(t *testing.T) {
	now := time.Now()
	correlationID := "test-correlation-123"
	idempotencyKey := "audit:session-123"
	baseStartTime := now.Add(-2 * time.Hour)

	auditLog := &BillingAuditLog{
		ID:              1,
		ParkingSessionID: 100,
		VehicleType:     "S",
		SlotLabel:       "SP-1",
		SlotType:        "SP",
		EntryPoint:      "A",
		ParkedAt:        now.Add(-2 * time.Hour),
		ExitedAt:        now,
		TotalFee:        40.0,
		BaseFee:         40.0,
		ExceedingFee:    0.0,
		ExceedingHours:  0,
		LongTermDays:    0,
		LongTermFee:     0.0,
		DurationHours:   2.0,
		IsContinuous:    false,
		BaseStartTime:   &baseStartTime,
		FeeBreakdown: FeeBreakdown{
			BaseFee:       40.0,
			ExceedingFee:  0.0,
			LongTermFee:   0.0,
			TotalFee:      40.0,
			DurationHours: 2.0,
		},
		CorrelationID:   &correlationID,
		IdempotencyKey:  &idempotencyKey,
		BillingVersion:  "1.0",
		CalculatedAt:    now,
	}

	result := auditLog.ToHash()

	assert.Equal(t, int64(1), result["id"])
	assert.Equal(t, int64(100), result["parking_session_id"])
	assert.Equal(t, "S", result["vehicle_type"])
	assert.Equal(t, "SP-1", result["slot_label"])
	assert.Equal(t, "SP", result["slot_type"])
	assert.Equal(t, "A", result["entry_point"])
	assert.Equal(t, 40.0, result["total_fee"])
	assert.Equal(t, 40.0, result["base_fee"])
	assert.Equal(t, 0.0, result["exceeding_fee"])
	assert.Equal(t, 0, result["exceeding_hours"])
	assert.Equal(t, 0, result["long_term_days"])
	assert.Equal(t, 0.0, result["long_term_fee"])
	assert.Equal(t, 2.0, result["duration_hours"])
	assert.Equal(t, false, result["is_continuous"])
	assert.Equal(t, "1.0", result["billing_version"])
	assert.Equal(t, &correlationID, result["correlation_id"])
	assert.Equal(t, &idempotencyKey, result["idempotency_key"])
}

func TestBillingAuditLog_EdgeCases(t *testing.T) {
	t.Run("zero duration", func(t *testing.T) {
		auditLog := &BillingAuditLog{
			DurationHours: 0,
			TotalFee:      40.0,
		}
		assert.Equal(t, 0.0, auditLog.DurationHours)
		assert.Equal(t, 40.0, auditLog.TotalFee)
	})

	t.Run("very short duration", func(t *testing.T) {
		auditLog := &BillingAuditLog{
			DurationHours: 0.1,
			TotalFee:      40.0,
		}
		assert.Equal(t, 0.1, auditLog.DurationHours)
		assert.Equal(t, 40.0, auditLog.TotalFee)
	})

	t.Run("very long duration", func(t *testing.T) {
		auditLog := &BillingAuditLog{
			DurationHours: 1000,
			TotalFee:      50000.0,
		}
		assert.Equal(t, 1000.0, auditLog.DurationHours)
		assert.Equal(t, 50000.0, auditLog.TotalFee)
	})

	t.Run("zero fee", func(t *testing.T) {
		auditLog := &BillingAuditLog{
			DurationHours: 1,
			TotalFee:      0.0,
		}
		assert.Equal(t, 1.0, auditLog.DurationHours)
		assert.Equal(t, 0.0, auditLog.TotalFee)
	})

	t.Run("very large fee", func(t *testing.T) {
		auditLog := &BillingAuditLog{
			DurationHours: 100,
			TotalFee:      100000.0,
		}
		assert.Equal(t, 100.0, auditLog.DurationHours)
		assert.Equal(t, 100000.0, auditLog.TotalFee)
	})

	t.Run("negative fee should be handled", func(t *testing.T) {
		auditLog := &BillingAuditLog{
			DurationHours: 1,
			TotalFee:      -10.0,
		}
		assert.Equal(t, -10.0, auditLog.TotalFee)
	})

	t.Run("negative duration should be handled", func(t *testing.T) {
		auditLog := &BillingAuditLog{
			DurationHours: -1,
			TotalFee:      40.0,
		}
		assert.Equal(t, -1.0, auditLog.DurationHours)
	})

	t.Run("maximum long-term days", func(t *testing.T) {
		auditLog := &BillingAuditLog{
			DurationHours: 1000,
			LongTermDays: 41,
			LongTermFee:   205000.0,
		}
		assert.Equal(t, 41, auditLog.LongTermDays)
		assert.Equal(t, 205000.0, auditLog.LongTermFee)
	})

	t.Run("default long-term values", func(t *testing.T) {
		auditLog := &BillingAuditLog{
			DurationHours: 2,
			LongTermDays: 0,
			LongTermFee:   0,
		}
		assert.Equal(t, 0, auditLog.LongTermDays)
		assert.Equal(t, 0.0, auditLog.LongTermFee)
	})
}

func TestBillingAuditLog_FeeBreakdownTracking(t *testing.T) {
	t.Run("base fee only", func(t *testing.T) {
		breakdown := FeeBreakdown{
			BaseFee:       40.0,
			ExceedingFee:  0.0,
			LongTermFee:   0.0,
			TotalFee:      40.0,
			DurationHours: 2.0,
		}

		auditLog := &BillingAuditLog{
			FeeBreakdown:   breakdown,
			BaseFee:        40.0,
			ExceedingFee:   0.0,
			ExceedingHours: 0,
		}

		assert.Equal(t, 40.0, auditLog.BaseFee)
		assert.Equal(t, 0.0, auditLog.ExceedingFee)
		assert.Equal(t, 0, auditLog.ExceedingHours)
	})

	t.Run("with exceeding fee", func(t *testing.T) {
		breakdown := FeeBreakdown{
			BaseFee:       40.0,
			ExceedingFee:  40.0,
			LongTermFee:   0.0,
			TotalFee:      80.0,
			DurationHours: 5.0,
		}

		auditLog := &BillingAuditLog{
			FeeBreakdown:    breakdown,
			BaseFee:         40.0,
			ExceedingFee:    40.0,
			ExceedingHours:  2,
		}

		assert.Equal(t, 40.0, auditLog.BaseFee)
		assert.Equal(t, 40.0, auditLog.ExceedingFee)
		assert.Equal(t, 2, auditLog.ExceedingHours)
	})

	t.Run("with long-term fee", func(t *testing.T) {
		breakdown := FeeBreakdown{
			BaseFee:       40.0,
			ExceedingFee:  0.0,
			LongTermFee:   5000.0,
			TotalFee:      5040.0,
			DurationHours: 25.0,
		}

		auditLog := &BillingAuditLog{
			FeeBreakdown: breakdown,
			LongTermDays: 1,
			LongTermFee:  5000.0,
		}

		assert.Equal(t, 1, auditLog.LongTermDays)
		assert.Equal(t, 5000.0, auditLog.LongTermFee)
	})
}

func TestBillingAuditLog_DataIntegrity(t *testing.T) {
	t.Run("with correlation id", func(t *testing.T) {
		correlationID := "test-correlation-123"
		auditLog := &BillingAuditLog{
			CorrelationID: &correlationID,
		}
		assert.Equal(t, &correlationID, auditLog.CorrelationID)
		assert.Equal(t, "test-correlation-123", *auditLog.CorrelationID)
	})

	t.Run("with idempotency key", func(t *testing.T) {
		idempotencyKey := "audit:session-123"
		auditLog := &BillingAuditLog{
			IdempotencyKey: &idempotencyKey,
		}
		assert.Equal(t, &idempotencyKey, auditLog.IdempotencyKey)
		assert.Equal(t, "audit:session-123", *auditLog.IdempotencyKey)
	})

	t.Run("with nil correlation id", func(t *testing.T) {
		auditLog := &BillingAuditLog{
			CorrelationID: nil,
		}
		assert.Nil(t, auditLog.CorrelationID)
	})

	t.Run("with nil idempotency key", func(t *testing.T) {
		auditLog := &BillingAuditLog{
			IdempotencyKey: nil,
		}
		assert.Nil(t, auditLog.IdempotencyKey)
	})
}

func TestBillingAuditLog_TimestampTracking(t *testing.T) {
	now := time.Now()

	auditLog := &BillingAuditLog{
		CreatedAt:    now,
		UpdatedAt:    now,
		CalculatedAt: now,
	}

	assert.Equal(t, now, auditLog.CreatedAt)
	assert.Equal(t, now, auditLog.UpdatedAt)
	assert.Equal(t, now, auditLog.CalculatedAt)
}

func TestBillingAuditLog_ContinuousParking(t *testing.T) {
	t.Run("continuous parking", func(t *testing.T) {
		auditLog := &BillingAuditLog{
			IsContinuous: true,
		}
		assert.True(t, auditLog.IsContinuous)
	})

	t.Run("non-continuous parking", func(t *testing.T) {
		auditLog := &BillingAuditLog{
			IsContinuous: false,
		}
		assert.False(t, auditLog.IsContinuous)
	})
}

func TestBillingAuditLog_BillingVersion(t *testing.T) {
	t.Run("default billing version", func(t *testing.T) {
		auditLog := &BillingAuditLog{
			BillingVersion: "1.0",
		}
		assert.Equal(t, "1.0", auditLog.BillingVersion)
	})

	t.Run("custom billing version", func(t *testing.T) {
		auditLog := &BillingAuditLog{
			BillingVersion: "2.0",
		}
		assert.Equal(t, "2.0", auditLog.BillingVersion)
	})
}
