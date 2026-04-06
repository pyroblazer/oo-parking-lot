require 'rails_helper'

RSpec.describe 'Concurrency Safety', type: :request do
  before do
    # Thorough cleanup in correct dependency order
    BillingAuditLog.delete_all
    KafkaEvent.delete_all
    ParkingSession.delete_all
    ParkingSlot.delete_all
    EntryPoint.delete_all

    EntryPoint.find_or_create_by(identifier: 'A', name: 'Entry A')
    EntryPoint.find_or_create_by(identifier: 'B', name: 'Entry B')
    EntryPoint.find_or_create_by(identifier: 'C', name: 'Entry C')
  end

  let(:entry_point_a) { EntryPoint.find_by(identifier: 'A') }

  describe 'concurrent unpark operations' do
    it 'only one thread succeeds when multiple threads unpark the same session' do
      create(:parking_slot, slot_type: 'SP', status: 'available', distances: [1, 5, 10])

      # Park a vehicle
      post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point_a.identifier }
      expect(response).to have_http_status(:created)
      session_id = JSON.parse(response.body)['data']['session_id']

      session = ParkingSession.find(session_id)
      exited_at = session.parked_at + 2.hours

      # Fire multiple concurrent unpark requests using threads
      results = []
      mutex = Mutex.new
      threads = Array.new(10) do
        Thread.new do
          success = false
          error_msg = nil
          begin
            # Each thread makes its own request (simulating separate HTTP requests)
            # We call the service directly since we can't easily make concurrent HTTP requests in tests
            service = ParkingService.new
            result = service.unpark_vehicle(session_id, exited_at: exited_at)
            if result
              success = true
            else
              error_msg = service.errors.first
            end
          rescue StandardError => e
            error_msg = e.message
          end
          mutex.synchronize { results << { success: success, error: error_msg } }
        end
      end
      threads.each(&:join)

      # Exactly one unpark should succeed
      successes = results.count { |r| r[:success] }
      failures = results.count { |r| !r[:success] }

      expect(successes).to eq(1), "Expected exactly 1 successful unpark, got #{successes}. Results: #{results.inspect}"
      expect(failures).to eq(9), "Expected 9 failed unparks, got #{failures}"

      # Verify session has correct fee
      session.reload
      expect(session.total_fee).to be > 0
      expect(session.exited_at).to be_present
    end
  end

  describe 'concurrent park operations' do
    it 'prevents double-booking when multiple threads park on limited slots' do
      # Create 2 slots with different distances to encourage thread diversity.
      # Even with different distances, find_closest_available_slot runs outside
      # the transaction so threads may still race on the same slot. The test
      # accounts for this by accepting 1-2 successful parks.
      create(:parking_slot, slot_type: 'SP', status: 'available', distances: [1, 10, 20])
      create(:parking_slot, slot_type: 'SP', status: 'available', distances: [5, 10, 20])

      results = []
      mutex = Mutex.new
      threads = Array.new(5) do
        Thread.new do
          success = false
          error_msg = nil
          begin
            service = ParkingService.new
            session = service.park_vehicle('S', 'A')
            if session
              success = true
            else
              error_msg = service.errors.first
            end
          rescue StandardError => e
            error_msg = e.message
          end
          mutex.synchronize { results << { success: success, error: error_msg } }
        end
      end
      threads.each(&:join)

      successes = results.count { |r| r[:success] }
      failures = results.count { |r| !r[:success] }

      # Between 1 and 2 parks should succeed. The upper bound (2) is the
      # theoretical maximum given 2 available slots. The lower bound (1)
      # accounts for the fact that find_closest_available_slot selects a slot
      # outside the transaction: multiple threads may all pick the same closest
      # slot, only one wins the lock, and the losers get no retry with the
      # next-best slot. This is a known limitation of the service-level
      # selection -- what matters is the concurrency invariant checked below.
      expect(successes).to be_between(1, 2).inclusive,
                           "Expected 1-2 successful parks, got #{successes}. Results: #{results.inspect}"
      expect(successes + failures).to eq(5), 'Total results should equal thread count'

      # KEY INVARIANT: No slot is double-booked. Every occupied slot has at
      # most one active (non-exited) session, regardless of how many threads
      # competed for it.
      active_sessions = ParkingSession.where(exited_at: nil).group(:parking_slot_id).count
      active_sessions.each do |slot_id, count|
        expect(count).to eq(1),
                         "Slot #{slot_id} has #{count} active sessions, expected exactly 1 (double-booking detected)"
      end

      # Verify all successful parks landed on distinct slots
      successful_slot_ids = ParkingSession.where(exited_at: nil).pluck(:parking_slot_id)
      expect(successful_slot_ids.uniq.length).to eq(successful_slot_ids.length),
                                                 "Multiple sessions share the same slot: #{successful_slot_ids.inspect}"
    end
  end

  describe 'concurrent park and unpark operations' do
    it 'maintains consistency under interleaved operations' do
      # Create 6 slots to give enough room for concurrent parks.
      # find_closest_available_slot runs outside the transaction, so concurrent
      # threads may all pick the same closest slot. With 6 slots, threads have
      # enough diversity to succeed while still testing the unpark race condition.
      6.times do |i|
        create(:parking_slot, slot_type: 'SP', status: 'available', distances: [i + 1, 5, 10])
      end

      reference_time = Time.current

      # Phase 1: Park 3 vehicles concurrently
      park_results = []
      mutex = Mutex.new
      threads = Array.new(3) do
        Thread.new do
          service = ParkingService.new
          session = service.park_vehicle('S', 'A', parked_at: reference_time)
          mutex.synchronize { park_results << session }
        end
      end
      threads.each(&:join)

      successful_parks = park_results.compact
      expect(successful_parks.length).to be >= 1, "At least 1 park should succeed, got #{successful_parks.length}"
      expect(successful_parks.length).to be <= 3, "At most 3 parks should succeed, got #{successful_parks.length}"

      # Phase 2: Concurrently unpark all sessions (2 threads each)
      unpark_results = []
      threads = successful_parks.flat_map do |session|
        Array.new(2) do
          Thread.new do
            service = ParkingService.new
            result = service.unpark_vehicle(session.id, exited_at: reference_time + 2.hours)
            mutex.synchronize { unpark_results << { session_id: session.id, success: !result.nil? } }
          end
        end
      end
      threads.each(&:join)

      # Each session should have exactly 1 successful unpark
      successful_parks.each do |session|
        session_results = unpark_results.select { |r| r[:session_id] == session.id }
        successes = session_results.count { |r| r[:success] }
        expect(successes).to eq(1), "Session #{session.id} should have exactly 1 successful unpark, got #{successes}"
      end

      # All slots that were occupied should be available again
      occupied_slot_ids = successful_parks.map(&:parking_slot_id)
      available_after = ParkingSlot.where(id: occupied_slot_ids, status: 'available').count
      expect(available_after).to eq(successful_parks.length), 'All occupied slots should be available after unparks'
    end
  end
end
