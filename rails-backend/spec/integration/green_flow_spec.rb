require 'rails_helper'

# Green Flow Integration Test
#
# This test implements the complete happy path flow for the parking system
# based on the specification requirements. It includes initialization of the
# parking lot with entry points and slots, then tests the complete parking
# lifecycle from entry to exit with fee calculation.
#
# Specification Requirements Covered:
# 1. Three entry points (minimum) with distance-based slot allocation
# 2. Three vehicle types (S, M, L) and three slot types (SP, MP, LP)
# 3. Vehicle-slot compatibility rules
# 4. Fee calculation with flat rate and hourly rates
# 5. Long-term parking (24+ hours) with 5,000 pesos per 24-hour chunk
# 6. Continuous parking detection (return within 1 hour)
# 7. Rounding up of hours for fee calculation
RSpec.describe 'Green Flow Integration', type: :request do
  # ============================================================================
  # INITIALIZATION
  # ============================================================================

  # ============================================================================
  # CLEANUP
  # ============================================================================

  after do
    Timecop.return
  end

  describe 'System Initialization' do
    context 'Entry Points Setup' do
      it 'initializes three entry points (A, B, C)' do
        # Create three entry points as per specification
        entry_point_a = create(:entry_point, identifier: 'A', name: 'Entry Point A')
        entry_point_b = create(:entry_point, identifier: 'B', name: 'Entry Point B')
        entry_point_c = create(:entry_point, identifier: 'C', name: 'Entry Point C')

        # Verify entry points exist
        expect(entry_point_a).to be_present
        expect(entry_point_b).to be_present
        expect(entry_point_c).to be_present

        # Verify identifiers are unique and present (factory generates them)
        expect(entry_point_a.identifier).to be_present
        expect(entry_point_b.identifier).to be_present
        expect(entry_point_c.identifier).to be_present
        expect([entry_point_a.identifier, entry_point_b.identifier, entry_point_c.identifier].uniq.length).to eq(3)

        # Verify we have at least 3 entry points
        expect(EntryPoint.count).to be >= 3
      end
    end

    context 'Parking Slots Setup' do
      before do
        # Create entry points with explicit identifiers
        @entry_point_a = create(:entry_point, identifier: 'A', name: 'Entry Point A')
        @entry_point_b = create(:entry_point, identifier: 'B', name: 'Entry Point B')
        @entry_point_c = create(:entry_point, identifier: 'C', name: 'Entry Point C')
      end

      it 'initializes parking slots with distances and sizes' do
        # Create parking slots with distances from each entry point
        # Format: [distance_from_A, distance_from_B, distance_from_C]
        # Slot sizes: 0=SP (small), 1=MP (medium), 2=LP (large)

        # Small Parking (SP) slots - distance tuples and size 0
        create(:parking_slot, slot_type: 'SP', slot_label: 'SP-1',
                              entry_point: @entry_point_a, distances: [1, 4, 5], status: 'available')
        create(:parking_slot, slot_type: 'SP', slot_label: 'SP-2',
                              entry_point: @entry_point_a, distances: [3, 2, 4], status: 'available')
        create(:parking_slot, slot_type: 'SP', slot_label: 'SP-3',
                              entry_point: @entry_point_b, distances: [4, 1, 3], status: 'available')

        # Medium Parking (MP) slots - distance tuples and size 1
        create(:parking_slot, slot_type: 'MP', slot_label: 'MP-1',
                              entry_point: @entry_point_b, distances: [5, 2, 3], status: 'available')
        create(:parking_slot, slot_type: 'MP', slot_label: 'MP-2',
                              entry_point: @entry_point_c, distances: [6, 3, 1], status: 'available')

        # Large Parking (LP) slots - distance tuples and size 2
        create(:parking_slot, slot_type: 'LP', slot_label: 'LP-1',
                              entry_point: @entry_point_c, distances: [7, 4, 2], status: 'available')
        create(:parking_slot, slot_type: 'LP', slot_label: 'LP-2',
                              entry_point: @entry_point_a, distances: [2, 5, 6], status: 'available')

        # Verify slots were created
        expect(ParkingSlot.count).to eq(7)

        # Verify slot types
        expect(ParkingSlot.where(slot_type: 'SP').count).to eq(3)
        expect(ParkingSlot.where(slot_type: 'MP').count).to eq(2)
        expect(ParkingSlot.where(slot_type: 'LP').count).to eq(2)

        # Verify all slots are available
        expect(ParkingSlot.where(status: 'available').count).to eq(7)
      end
    end
  end

  # ============================================================================
  # GREEN FLOW: COMPLETE HAPPY PATH
  # ============================================================================

  describe 'Complete Green Flow' do
    before do
      # Initialize system with entry points (use explicit identifiers for determinism)
      @entry_point_a = create(:entry_point, identifier: 'A', name: 'Entry Point A')
      @entry_point_b = create(:entry_point, identifier: 'B', name: 'Entry Point B')
      @entry_point_c = create(:entry_point, identifier: 'C', name: 'Entry Point C')

      # Initialize parking slots with distances
      # SP slots
      @sp_slot_1 = create(:parking_slot, slot_type: 'SP', slot_label: 'SP-1',
                                         entry_point: @entry_point_a, distances: [1, 4, 5], status: 'available')
      @sp_slot_2 = create(:parking_slot, slot_type: 'SP', slot_label: 'SP-2',
                                         entry_point: @entry_point_a, distances: [3, 2, 4], status: 'available')

      # MP slots
      @mp_slot_1 = create(:parking_slot, slot_type: 'MP', slot_label: 'MP-1',
                                         entry_point: @entry_point_b, distances: [5, 2, 3], status: 'available')

      # LP slots
      @lp_slot_1 = create(:parking_slot, slot_type: 'LP', slot_label: 'LP-1',
                                         entry_point: @entry_point_c, distances: [7, 4, 2], status: 'available')
    end

    context 'Small Vehicle Flow' do
      # Verify slot is available again
      after do
        @sp_slot_1.reload
        expect(@sp_slot_1.status).to eq('available')
      end

      it 'successfully parks and unparks a small vehicle' do
        # Step 1: Park small vehicle at entry point A
        # Should get closest SP slot (SP-1 at distance 1)
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: @entry_point_a.identifier }

        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        expect(json['success']).to be true
        expect(json['data']['vehicle_type']).to eq('S')
        expect(json['data']['parking_slot']['slot_type']).to eq('SP')
        expect(json['data']['parking_slot']['slot_label']).to eq('SP-1')
        expect(json['data']['is_active']).to be true

        session_id = json['data']['session_id']

        # Verify slot is now occupied
        @sp_slot_1.reload
        expect(@sp_slot_1.status).to eq('occupied')

        # Step 2: Wait 2 hours (within flat rate period)
        # Freeze time at the session's parked_at time, then travel 2 hours forward
        session_parked_at = ParkingSession.find(session_id).parked_at
        Timecop.freeze(session_parked_at)
        Timecop.travel(2.hours)

        # Step 3: Unpark vehicle
        post "/api/v1/sessions/#{session_id}/unpark"

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['success']).to be true

        # Verify fee calculation: flat rate of 40 pesos for first 3 hours
        expect(json['data']['total_fee']).to eq(40.0)
        expect(json['data']['duration_hours']).to eq(2)
        expect(json['data']['fee_breakdown']['remaining']['base_fee']).to eq(40.0)
        expect(json['data']['fee_breakdown']['remaining']['exceeding_hours']).to eq(0)
        expect(json['data']['fee_breakdown']['remaining']['exceeding_fee']).to eq(0.0)
        expect(json['data']['fee_breakdown']['remaining']['hourly_rate']).to be_present
      end
    end

    context 'Medium Vehicle Flow' do
      it 'successfully parks and unparks a medium vehicle' do
        # Step 1: Park medium vehicle at entry point B
        # Should get closest MP slot (MP-1 at distance 2)
        post '/api/v1/sessions', params: { vehicle_type: 'M', entry_point_id: @entry_point_b.identifier }

        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        expect(json['success']).to be true
        expect(json['data']['vehicle_type']).to eq('M')
        expect(json['data']['parking_slot']['slot_type']).to eq('MP')
        expect(json['data']['parking_slot']['slot_label']).to eq('MP-1')

        session_id = json['data']['session_id']

        # Step 2: Wait 5 hours (exceeds flat rate)
        # Fee calculation: 40 (base) + 2 * 60 (2 hours at 60/hour for MP) = 160
        # Freeze time at the session's parked_at time, then travel 5 hours forward
        session_parked_at = ParkingSession.find(session_id).parked_at
        Timecop.freeze(session_parked_at)
        Timecop.travel(5.hours)

        # Step 3: Unpark vehicle
        post "/api/v1/sessions/#{session_id}/unpark"

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['success']).to be true

        # Verify fee calculation (billed duration: 5 hours with ceiling rounding)
        expect(json['data']['total_fee']).to eq(160.0)
        expect(json['data']['duration_hours']).to eq(5)
        expect(json['data']['fee_breakdown']['remaining']['base_fee']).to eq(40.0)
        expect(json['data']['fee_breakdown']['remaining']['exceeding_hours']).to eq(2)
        expect(json['data']['fee_breakdown']['remaining']['exceeding_fee']).to eq(120.0)
        expect(json['data']['fee_breakdown']['remaining']['hourly_rate']).to be_present
      end
    end

    context 'Large Vehicle Flow' do
      it 'successfully parks and unparks a large vehicle' do
        # Step 1: Park large vehicle at entry point C
        # Should get LP slot (LP-1 at distance 2)
        post '/api/v1/sessions', params: { vehicle_type: 'L', entry_point_id: @entry_point_c.identifier }

        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        expect(json['success']).to be true
        expect(json['data']['vehicle_type']).to eq('L')
        expect(json['data']['parking_slot']['slot_type']).to eq('LP')
        expect(json['data']['parking_slot']['slot_label']).to eq('LP-1')

        session_id = json['data']['session_id']

        # Step 2: Wait 4 hours (exceeds flat rate)
        # Fee calculation: 40 (base) + 1 * 100 (1 hour at 100/hour for LP) = 140
        # Freeze time at the session's parked_at time, then travel 4 hours forward
        session_parked_at = ParkingSession.find(session_id).parked_at
        Timecop.freeze(session_parked_at)
        Timecop.travel(4.hours)

        # Step 3: Unpark vehicle
        post "/api/v1/sessions/#{session_id}/unpark"

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['success']).to be true

        # Verify fee calculation (billed duration: 4 hours with ceiling rounding)
        expect(json['data']['total_fee']).to eq(140.0)
        expect(json['data']['duration_hours']).to eq(4)
        expect(json['data']['fee_breakdown']['remaining']['base_fee']).to eq(40.0)
        expect(json['data']['fee_breakdown']['remaining']['exceeding_hours']).to eq(1)
        expect(json['data']['fee_breakdown']['remaining']['exceeding_fee']).to eq(100.0)
        expect(json['data']['fee_breakdown']['remaining']['hourly_rate']).to be_present
      end
    end

    context 'Long-term Parking Flow' do
      it 'correctly calculates fee for parking exceeding 24 hours' do
        # Create additional LP slot for long-term test
        create(:parking_slot, slot_type: 'LP', slot_label: 'LP-2',
                              entry_point: @entry_point_a, distances: [2, 5, 6], status: 'available')

        # Park large vehicle
        post '/api/v1/sessions', params: { vehicle_type: 'L', entry_point_id: 'A' }
        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        session_id = json['data']['session_id']

        # Park for 26 hours (1 full 24-hour chunk + 2 hours)
        # Fee: 5000 (24 hours) + 40 (base for remaining) = 5040
        # Freeze time at the session's parked_at time, then travel 26 hours forward
        session_parked_at = ParkingSession.find(session_id).parked_at
        Timecop.freeze(session_parked_at)
        Timecop.travel(26.hours)

        # Step 3: Unpark vehicle
        post "/api/v1/sessions/#{session_id}/unpark"

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['success']).to be true

        # Verify long-term fee calculation
        expect(json['data']['total_fee']).to eq(5040.0)
        expect(json['data']['duration_hours']).to eq(26)
        expect(json['data']['fee_breakdown']['long_term']['days']).to eq(1)
        expect(json['data']['fee_breakdown']['long_term']['fee']).to eq(5000.0)
        expect(json['data']['fee_breakdown']['long_term']['rate']).to be_present
        expect(json['data']['fee_breakdown']['remaining']['total']).to eq(40.0)
        expect(json['data']['fee_breakdown']['remaining']['hourly_rate']).to be_present
      end

      it 'correctly calculates fee for parking exceeding 48 hours' do
        # Create additional LP slot
        create(:parking_slot, slot_type: 'LP', slot_label: 'LP-2',
                              entry_point: @entry_point_a, distances: [2, 5, 6], status: 'available')

        # Park large vehicle
        post '/api/v1/sessions', params: { vehicle_type: 'L', entry_point_id: 'A' }
        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        session_id = json['data']['session_id']

        # Park for 50 hours (2 full 24-hour chunks + 2 hours)
        # Fee: 2 * 5000 (48 hours) + 40 (base for remaining) = 10040
        # Freeze time at the session's parked_at time, then travel 50 hours forward
        session_parked_at = ParkingSession.find(session_id).parked_at
        Timecop.freeze(session_parked_at)
        Timecop.travel(50.hours)

        # Step 3: Unpark vehicle
        post "/api/v1/sessions/#{session_id}/unpark"

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['success']).to be true

        # Verify long-term fee calculation
        expect(json['data']['total_fee']).to eq(10_040.0)
        expect(json['data']['duration_hours']).to eq(50)
        expect(json['data']['fee_breakdown']['long_term']['days']).to eq(2)
        expect(json['data']['fee_breakdown']['long_term']['fee']).to eq(10_000.0)
        expect(json['data']['fee_breakdown']['long_term']['rate']).to be_present
        expect(json['data']['fee_breakdown']['remaining']['total']).to eq(40.0)
        expect(json['data']['fee_breakdown']['remaining']['hourly_rate']).to be_present
      end
    end

    context 'Continuous Parking Flow' do
      it 'applies continuous rate when vehicle returns within 1 hour' do
        # Create additional SP slot (using unique label to avoid conflict with before block)
        create(:parking_slot, slot_type: 'SP', slot_label: 'SP-3',
                              entry_point: @entry_point_a, distances: [3, 2, 4], status: 'available')

        # First parking session
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: 'A' }
        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        first_session_id = json['data']['session_id']

        # Unpark after 30 minutes
        Timecop.travel(30.minutes.from_now) do
          post "/api/v1/sessions/#{first_session_id}/unpark"
          expect(response).to have_http_status(:ok)
        end

        # Return within 1 hour (45 minutes after exit)
        second_session_id = nil
        Timecop.travel(45.minutes.from_now) do
          post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: 'A' }
          expect(response).to have_http_status(:created)
          json = JSON.parse(response.body)
          second_session_id = json['data']['session_id']

          # Verify continuous parking is detected
          second_session = ParkingSession.find(second_session_id)
          expect(second_session.continuous?).to be true
          expect(json['data']['is_continuous']).to be true
        end

        # Unpark second session and verify base_start_time in fee breakdown
        Timecop.travel(30.minutes.from_now) do
          post "/api/v1/sessions/#{second_session_id}/unpark"
          expect(response).to have_http_status(:ok)
          json = JSON.parse(response.body)
          # For continuous parking, base_start_time should be present in fee breakdown
          expect(json['data']['fee_breakdown']['base_start_time']).to be_present
        end
      end

      it 'does not apply continuous rate when vehicle returns after 1 hour' do
        # Create additional SP slot (using unique label to avoid conflict with before block)
        create(:parking_slot, slot_type: 'SP', slot_label: 'SP-3',
                              entry_point: @entry_point_a, distances: [3, 2, 4], status: 'available')

        # First parking session
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: 'A' }
        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        first_session_id = json['data']['session_id']

        # Unpark after 30 minutes
        Timecop.travel(30.minutes.from_now) do
          post "/api/v1/sessions/#{first_session_id}/unpark"
          expect(response).to have_http_status(:ok)
        end

        # Return after 1 hour (90 minutes after exit)
        Timecop.travel(90.minutes.from_now) do
          post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: 'A' }
          expect(response).to have_http_status(:created)
          json = JSON.parse(response.body)
          second_session_id = json['data']['session_id']

          # Verify continuous parking is NOT detected
          second_session = ParkingSession.find(second_session_id)
          expect(second_session.continuous?).to be false
          expect(json['data']['is_continuous']).to be false
        end
      end
    end

    context 'Hour Rounding Flow' do
      it 'rounds up hours for fee calculation' do
        # Create additional SP slot (using unique label to avoid conflict with before block)
        create(:parking_slot, slot_type: 'SP', slot_label: 'SP-3',
                              entry_point: @entry_point_a, distances: [3, 2, 4], status: 'available')

        # Park small vehicle
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: 'A' }
        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        session_id = json['data']['session_id']

        # Park for 6.4 hours (should round up to 7 hours)
        # Fee: 40 (base) + 4 * 20 (4 hours at 20/hour for SP) = 120
        # Freeze time at the session's parked_at time, then travel 6.4 hours forward
        session_parked_at = ParkingSession.find(session_id).parked_at
        Timecop.freeze(session_parked_at)
        Timecop.travel(6.4.hours)

        # Step 3: Unpark vehicle
        post "/api/v1/sessions/#{session_id}/unpark"

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['success']).to be true

        # Verify rounding up (billed duration: 6.4 hours with ceiling rounding = 7 hours)
        expect(json['data']['duration_hours']).to eq(7)
        expect(json['data']['total_fee']).to eq(120.0)
        expect(json['data']['fee_breakdown']['remaining']['base_fee']).to eq(40.0)
        expect(json['data']['fee_breakdown']['remaining']['exceeding_hours']).to eq(4)
        expect(json['data']['fee_breakdown']['remaining']['exceeding_fee']).to eq(80.0)
        expect(json['data']['fee_breakdown']['remaining']['hourly_rate']).to be_present
      end
    end

    context 'Closest Slot Allocation Flow' do
      it 'assigns closest available slot to vehicle' do
        # Clear existing slots to ensure clean test state
        ParkingSlot.destroy_all

        # Create multiple SP slots at different distances from entry point A
        sp_close = create(:parking_slot, slot_type: 'SP', slot_label: 'SP-Close',
                                         entry_point: @entry_point_a, distances: [1, 10, 10], status: 'available')
        create(:parking_slot, slot_type: 'SP', slot_label: 'SP-Medium',
                              entry_point: @entry_point_a, distances: [5, 10, 10], status: 'available')
        create(:parking_slot, slot_type: 'SP', slot_label: 'SP-Far',
                              entry_point: @entry_point_a, distances: [10, 10, 10], status: 'available')

        # Park vehicle at entry point A
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: 'A' }

        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)

        # Verify closest slot was assigned
        expect(json['data']['parking_slot']['slot_label']).to eq('SP-Close')
        expect(json['data']['parking_slot']['id']).to eq(sp_close.id)
      end
    end

    context 'Vehicle-Slot Compatibility Flow' do
      it 'allows small vehicle to park in SP, MP, or LP slots' do
        # Clear existing slots to test compatibility in isolation
        ParkingSlot.destroy_all

        # Create all slot types with unique labels
        create(:parking_slot, slot_type: 'SP', slot_label: 'SP-Test',
                              entry_point: @entry_point_a, distances: [1, 4, 5], status: 'available')
        create(:parking_slot, slot_type: 'MP', slot_label: 'MP-Test',
                              entry_point: @entry_point_a, distances: [2, 5, 6], status: 'available')
        create(:parking_slot, slot_type: 'LP', slot_label: 'LP-Test',
                              entry_point: @entry_point_a, distances: [3, 6, 7], status: 'available')

        # Small vehicle should be able to park in any slot type
        # It should prefer the closest compatible slot (SP at distance 1)
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: 'A' }

        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)

        # Verify small vehicle got SP slot (closest compatible)
        expect(json['data']['parking_slot']['slot_type']).to eq('SP')
      end

      it 'allows medium vehicle to park in MP or LP slots only' do
        # Clear existing slots to test compatibility in isolation
        ParkingSlot.destroy_all

        # Create MP and LP slots with unique labels
        create(:parking_slot, slot_type: 'MP', slot_label: 'MP-Test',
                              entry_point: @entry_point_a, distances: [2, 5, 6], status: 'available')
        create(:parking_slot, slot_type: 'LP', slot_label: 'LP-Test',
                              entry_point: @entry_point_a, distances: [3, 6, 7], status: 'available')

        # Medium vehicle should prefer MP slot (closest compatible)
        post '/api/v1/sessions', params: { vehicle_type: 'M', entry_point_id: 'A' }

        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)

        # Verify medium vehicle got MP slot
        expect(json['data']['parking_slot']['slot_type']).to eq('MP')
      end

      it 'allows large vehicle to park in LP slots only' do
        # Clear existing slots to test compatibility in isolation
        ParkingSlot.destroy_all

        # Create LP slot with unique label
        create(:parking_slot, slot_type: 'LP', slot_label: 'LP-Test',
                              entry_point: @entry_point_a, distances: [3, 6, 7], status: 'available')

        # Large vehicle should get LP slot
        post '/api/v1/sessions', params: { vehicle_type: 'L', entry_point_id: 'A' }

        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)

        # Verify large vehicle got LP slot
        expect(json['data']['parking_slot']['slot_type']).to eq('LP')
      end
    end
  end

  # ============================================================================
  # API ENDPOINT VERIFICATION
  # ============================================================================

  describe 'API Endpoint Verification' do
    before do
      # Initialize system (use explicit identifiers for determinism)
      @entry_point_a = create(:entry_point, identifier: 'A', name: 'Entry Point A')
      @entry_point_b = create(:entry_point, identifier: 'B', name: 'Entry Point B')
      @entry_point_c = create(:entry_point, identifier: 'C', name: 'Entry Point C')

      create(:parking_slot, slot_type: 'SP', slot_label: 'SP-1',
                            entry_point: @entry_point_a, distances: [1, 4, 5], status: 'available')
      create(:parking_slot, slot_type: 'MP', slot_label: 'MP-1',
                            entry_point: @entry_point_b, distances: [5, 2, 3], status: 'available')
      create(:parking_slot, slot_type: 'LP', slot_label: 'LP-1',
                            entry_point: @entry_point_c, distances: [7, 4, 2], status: 'available')
    end

    it 'successfully retrieves entry points via API' do
      get '/api/v1/entry_points'

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['success']).to be true
      expect(json['data'].length).to be >= 3

      # Verify entry point identifiers exist (don't hardcode specific values)
      identifiers = json['data'].pluck('identifier')
      expect(identifiers).to include(@entry_point_a.identifier, @entry_point_b.identifier, @entry_point_c.identifier)
    end

    it 'successfully retrieves available slots via API' do
      get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: @entry_point_a.identifier }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['success']).to be true
      expect(json['data']['total_available']).to be > 0
      expect(json['data']['available_slots']).to be_an(Array)
    end

    it 'successfully retrieves session details via API' do
      # Park a vehicle first
      post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: @entry_point_a.identifier }
      json = JSON.parse(response.body)
      session_id = json['data']['session_id']

      # Get session details
      get "/api/v1/sessions/#{session_id}"

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['success']).to be true
      expect(json['data']['session_id']).to eq(session_id)
      expect(json['data']['vehicle_type']).to eq('S')
      expect(json['data']['is_active']).to be true
    end
  end
end
# rubocop:enable Naming/VariableNumber
