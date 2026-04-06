// Package internal provides concurrency tests that verify the parking service
// handles simultaneous park, unpark, and interleaved operations correctly
// without double-booking, double-unparking, or data corruption.
//
// These tests use the real PostgreSQL database (oo_parking_lot_test) to
// exercise the actual row-level locking (UPDATE ... WHERE available = TRUE
// RETURNING) and atomic conditional UPDATE (WHERE exited_at IS NULL) that
// prevent race conditions.
//
// Run with: go test -race -count=1 -run TestConcurrent ./internal/...
package internal

import (
	"database/sql"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/repositories"
	"github.com/pyroblazer/oo-parking-lot/go-backend/internal/services"
)

// --------------------------------------------------------------------------
// Test database setup (follows setupTestDB pattern from green_flow_integration_test.go)
// --------------------------------------------------------------------------

// setupConcurrencyTestDB connects to the test database and ensures schema exists.
func setupConcurrencyTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db := setupTestDB(t)
	sqlDB := db.GetDB()

	// Clean slate using DELETE in FK order
	cleanAllTestTables(t, sqlDB)

	t.Cleanup(func() {
		cleanAllTestTables(t, sqlDB)
	})

	return sqlDB
}

// cleanAllTestTables deletes data from all tables in FK order.
func cleanAllTestTables(t *testing.T, sqlDB *sql.DB) {
	t.Helper()
	deleteOrder := []string{
		"DELETE FROM billing_audit_logs",
		"DELETE FROM kafka_events",
		"DELETE FROM parking_sessions",
		"DELETE FROM parking_slots",
		"DELETE FROM entry_points",
	}
	for _, stmt := range deleteOrder {
		_, err := sqlDB.Exec(stmt)
		require.NoError(t, err, "Failed to clean table: %s", stmt)
	}
}

// setupConcurrencyTestService truncates all tables, seeds entry points and
// parking slots, then returns a ParkingService wired to real repositories
// and the underlying *sql.DB.
//
// numSlots controls how many SP-type slots are created. All slots are at
// distance 1 from entry point A so that concurrent goroutines compete for
// the same closest slot.
func setupConcurrencyTestService(t *testing.T, numSlots int) (*services.ParkingService, *sql.DB) {
	t.Helper()
	sqlDB := setupConcurrencyTestDB(t)

	// Seed entry points A, B, C with different distances for variety.
	createTestEntryPoint(t, sqlDB, "A", "Entry Point A")

	// Seed SP slots. Each slot has unique distances to avoid all goroutines
	// hitting the exact same row, but they are all compatible with vehicle type S.
	for i := 1; i <= numSlots; i++ {
		label := fmt.Sprintf("SP-%d", i)
		distances := []int{i} // distance i from entry point A
		createTestParkingSlot(t, sqlDB, label, "SP", distances, true)
	}

	entryPointRepo := repositories.NewEntryPointRepository(sqlDB)
	parkingSlotRepo := repositories.NewParkingSlotRepository(sqlDB)
	sessionRepo := repositories.NewParkingSessionRepository(sqlDB)

	svc := services.NewParkingService(entryPointRepo, parkingSlotRepo, sessionRepo)
	return svc, sqlDB
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

// countActiveSessions queries the database for sessions with exited_at IS NULL.
func countActiveSessions(t *testing.T, sqlDB *sql.DB) int {
	t.Helper()
	var count int
	err := sqlDB.QueryRow(`SELECT COUNT(*) FROM parking_sessions WHERE exited_at IS NULL`).Scan(&count)
	require.NoError(t, err)
	return count
}

// countAvailableSlots queries for slots with available = true.
func countAvailableSlots(t *testing.T, sqlDB *sql.DB) int {
	t.Helper()
	var count int
	err := sqlDB.QueryRow(`SELECT COUNT(*) FROM parking_slots WHERE available = TRUE`).Scan(&count)
	require.NoError(t, err)
	return count
}

// parkResult holds the outcome of a single ParkVehicle call.
type parkResult struct {
	sessionID int64
	slotID    int64
	err       error
}

// unparkResult holds the outcome of a single UnparkVehicle call.
type unparkResult struct {
	err error
}

// --------------------------------------------------------------------------
// Test 1: Concurrent Park — no double-booking
// --------------------------------------------------------------------------

// TestConcurrentPark_NoDoubleBooking verifies that when N goroutines
// simultaneously try to park a vehicle but only M < N slots exist,
// exactly M succeed and N-M receive ErrNoAvailableSlot.
// No slot is assigned to more than one session.
func TestConcurrentPark_NoDoubleBooking(t *testing.T) {
	const totalGoroutines = 20
	const totalSlots = 5

	svc, sqlDB := setupConcurrencyTestService(t, totalSlots)

	parkTime := time.Now().UTC().Add(-1 * time.Hour)
	var wg sync.WaitGroup
	results := make(chan parkResult, totalGoroutines)

	for i := 0; i < totalGoroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			sess, err := svc.ParkVehicle("S", "A", "", "", &parkTime)
			r := parkResult{err: err}
			if sess != nil {
				r.sessionID = sess.ID
				r.slotID = sess.ParkingSlotID
			}
			results <- r
		}()
	}

	wg.Wait()
	close(results)

	var successCount int
	var noSlotCount int
	slotUsage := make(map[int64]int) // slotID → how many sessions assigned to it

	for r := range results {
		if r.err != nil {
			assert.ErrorIs(t, r.err, services.ErrNoAvailableSlot,
				"expected ErrNoAvailableSlot for failed park, got: %v", r.err)
			noSlotCount++
		} else {
			require.NotZero(t, r.sessionID, "successful park should return a session ID")
			successCount++
			slotUsage[r.slotID]++
		}
	}

	assert.Equal(t, totalSlots, successCount,
		"exactly %d parks should succeed (one per slot)", totalSlots)
	assert.Equal(t, totalGoroutines-totalSlots, noSlotCount,
		"remaining goroutines should get ErrNoAvailableSlot")

	// Verify no slot was double-booked.
	for slotID, count := range slotUsage {
		assert.Equal(t, 1, count,
			"slot %d should be assigned to exactly 1 session, got %d", slotID, count)
	}

	// Verify database state: all slots should now be unavailable
	avail := countAvailableSlots(t, sqlDB)
	assert.Equal(t, 0, avail, "all %d slots should be marked unavailable after concurrent parks", totalSlots)

	// Verify the correct number of active sessions.
	active := countActiveSessions(t, sqlDB)
	assert.Equal(t, totalSlots, active, "should have %d active sessions", totalSlots)
}

// --------------------------------------------------------------------------
// Test 2: Concurrent Unpark — only one succeeds
// --------------------------------------------------------------------------

// TestConcurrentUnpark_OnlyOneSucceeds creates a single active session and
// then fires N concurrent unpark requests. Exactly one should succeed; the
// rest should receive ErrVehicleAlreadyUnparked.
func TestConcurrentUnpark_OnlyOneSucceeds(t *testing.T) {
	const totalGoroutines = 20

	svc, sqlDB := setupConcurrencyTestService(t, 1)

	// Park one vehicle to create an active session.
	parkTime := time.Now().UTC().Add(-2 * time.Hour)
	session, err := svc.ParkVehicle("S", "A", "", "", &parkTime)
	require.NoError(t, err, "setup: park should succeed")
	require.NotNil(t, session)

	sessionIDStr := fmt.Sprintf("%d", session.ID)
	exitTime := time.Now().UTC()

	var wg sync.WaitGroup
	results := make(chan unparkResult, totalGoroutines)

	for i := 0; i < totalGoroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := svc.UnparkVehicle(sessionIDStr, &exitTime)
			results <- unparkResult{err: err}
		}()
	}

	wg.Wait()
	close(results)

	var successCount int
	var alreadyUnparkedCount int

	for r := range results {
		if r.err != nil {
			assert.ErrorIs(t, r.err, services.ErrVehicleAlreadyUnparked,
				"failed unpark should be ErrVehicleAlreadyUnparked, got: %v", r.err)
			alreadyUnparkedCount++
		} else {
			successCount++
		}
	}

	assert.Equal(t, 1, successCount, "exactly 1 unpark should succeed")
	assert.Equal(t, totalGoroutines-1, alreadyUnparkedCount,
		"remaining goroutines should get ErrVehicleAlreadyUnparked")

	// Verify database state: no active sessions.
	active := countActiveSessions(t, sqlDB)
	assert.Equal(t, 0, active, "should have 0 active sessions after unpark")

	// Verify slot is available again.
	avail := countAvailableSlots(t, sqlDB)
	assert.Equal(t, 1, avail, "slot should be available again after unpark")
}

// --------------------------------------------------------------------------
// Test 3: Interleaved Park and Unpark operations
// --------------------------------------------------------------------------

// TestConcurrentInterleaved_ParkAndUnpark verifies correctness when park and
// unpark operations run concurrently. It creates a pool of slots, then
// repeatedly parks and unparks in parallel, checking that invariants hold
// at the end of each round.
func TestConcurrentInterleaved_ParkAndUnpark(t *testing.T) {
	const slotCount = 6
	const iterations = 3
	const extraGoroutines = 2 // extra park goroutines to create contention

	svc, sqlDB := setupConcurrencyTestService(t, slotCount)

	var parkSuccesses int
	var unparkSuccesses int
	var parkFailures int
	var unparkFailures int

	for round := 0; round < iterations; round++ {
		// Phase 1: Concurrent parks — launch extra goroutines to contend.
		parkResults := make(chan parkResult, slotCount+extraGoroutines)
		func() {
			var wg sync.WaitGroup
			for i := 0; i < slotCount+extraGoroutines; i++ {
				wg.Add(1)
				go func() {
					defer wg.Done()
					parkTime := time.Now().UTC().Add(-1 * time.Hour)
					sess, err := svc.ParkVehicle("S", "A", "", "", &parkTime)
					r := parkResult{err: err}
					if sess != nil {
						r.sessionID = sess.ID
						r.slotID = sess.ParkingSlotID
					}
					parkResults <- r
				}()
			}
			wg.Wait()
			close(parkResults)
		}()

		// Collect park results.
		var sessionIDs []string
		for r := range parkResults {
			if r.err != nil {
				parkFailures++
			} else {
				parkSuccesses++
				sessionIDs = append(sessionIDs, fmt.Sprintf("%d", r.sessionID))
			}
		}

		// Phase 2: Concurrent unparks for the sessions that were created.
		// Each session gets 2 competing unpark goroutines.
		unparkResults := make(chan unparkResult, len(sessionIDs)*2)
		func() {
			var wg sync.WaitGroup
			for _, sid := range sessionIDs {
				for j := 0; j < 2; j++ {
					wg.Add(1)
					go func(sessionID string) {
						defer wg.Done()
						exitTime := time.Now().UTC()
						_, err := svc.UnparkVehicle(sessionID, &exitTime)
						unparkResults <- unparkResult{err: err}
					}(sid)
				}
			}
			wg.Wait()
			close(unparkResults)
		}()

		for r := range unparkResults {
			if r.err != nil {
				unparkFailures++
			} else {
				unparkSuccesses++
			}
		}
	}

	// Invariant checks.
	assert.Equal(t, slotCount*iterations, parkSuccesses,
		"total park successes across all rounds should equal slotCount * iterations")
	assert.Equal(t, extraGoroutines*iterations, parkFailures,
		"total park failures (%d extra goroutines per round * %d rounds)", extraGoroutines, iterations)

	// Each round should produce exactly slotCount successful unparks (1 per session).
	assert.Equal(t, slotCount*iterations, unparkSuccesses,
		"total unpark successes across all rounds")
	assert.Equal(t, slotCount*iterations, unparkFailures,
		"total unpark failures (one duplicate per session per round)")

	// Final state: no active sessions.
	active := countActiveSessions(t, sqlDB)
	assert.Equal(t, 0, active, "should have 0 active sessions after all rounds")
}
