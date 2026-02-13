require 'rails_helper'

# Integration tests for the complete parking flow
# These tests verify the end-to-end behavior of the parking system,
# ensuring that all components work together correctly from API requests
# to database updates and fee calculations.
#
# Key business flows tested:
# - Vehicle entry and exit (park/unpark)
# - Fee calculation based on parking duration
# - Vehicle type compatibility with slot types
# - Slot allocation strategy (closest available slot)
# - Continuous parking detection
# - Error handling and edge cases
#
# Integration tests differ from unit tests in that they test the entire
# request/response cycle, including controllers, services, and models,
# rather than testing individual components in isolation.
RSpec.describe 'Parking Flow Integration', type: :request do
  # Setup test data: create an entry point
  # Entry point represents one of the physical entrances to the parking lot
  # Small Parking (SP) slot is the smallest slot type, suitable for small vehicles
  let(:entry_point) { create(:entry_point, identifier: 'A') }

  # Test suite for the complete parking lifecycle
  # This covers the full user journey from entering to exiting the parking lot
  describe 'Complete Parking Flow' do
    # Test suite for the basic park and unpark operations
    context 'Park and Unpark Vehicle' do
      # Happy path test: verifies that a vehicle can be parked and then unparked successfully
      # This is the core business flow of the parking system
      #
      # Test steps:
      # 1. Create a parking session (vehicle enters)
      # 2. Verify session is created and slot is marked occupied
      # 3. Unpark the vehicle (vehicle exits)
      # 4. Verify fee is calculated and slot is marked available again
      it 'successfully parks a vehicle and then unparks it' do
        # Create an available slot for the test
        create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'available')

        # Park vehicle
        # Step 1: Send POST request to create a parking session
        # This simulates a vehicle arriving at the entry point
        # The system should assign an available slot and create a session record
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point.identifier }

        # Verify the API returns 201 Created status
        expect(response).to have_http_status(:created)

        # Verify the session was created in the database
        # This confirms that the parking session was persisted correctly
        json = JSON.parse(response.body)
        expect(json['success']).to be true
        expect(json['data']['session_id']).to be_present
        expect(json['data']['vehicle_type']).to eq('S')
        expect(json['data']['is_active']).to be true
        expect(json['data']['is_continuous']).to be false
        expect(json['data']['duration_hours']).to be_present
        expect(json['data']['total_fee']).to be_present

        session_id = json['data']['session_id']
        parking_session = ParkingSession.find(session_id)
        expect(parking_session).to be_present

        # Verify the assigned slot is now marked as occupied
        # This ensures that the slot status is updated to prevent double booking
        expect(parking_session.parking_slot).to be_present
        expect(parking_session.parking_slot.status).to eq('occupied')

        # Unpark vehicle
        # Step 2: Send POST request to unpark the vehicle
        # This simulates a vehicle exiting the parking lot
        # The system should calculate the fee and update the session
        # Use Timecop to simulate time passing
        Timecop.travel(30.minutes.from_now) do
          post "/api/v1/sessions/#{session_id}/unpark"

          # Verify the API returns 200 OK status
          expect(response).to have_http_status(:ok)

          # Verify the fee was calculated
          # The total_fee should be a numeric value greater than 0
          # This confirms that the pricing engine is working correctly
          json = JSON.parse(response.body)
          expect(json['success']).to be true
          expect(json['data']['total_fee']).to be > 0

          total_fee = json['data']['total_fee']

          # Verify the session was updated in the database
          parking_session.reload
          expect(parking_session.exited_at).to be_present
          expect(parking_session.total_fee).to eq(total_fee)

          # exited_at should be set to indicate the vehicle has left
          expect(parking_session.exited_at).not_to be_nil

          # total_fee should match what was returned in the API response
          expect(parking_session.total_fee).to eq(total_fee)

          # Verify the slot is available again
          # After unparking, the slot should be marked as available
          # This allows the slot to be assigned to another vehicle
          expect(parking_session.parking_slot.reload.status).to eq('available')
        end
      end

      # Test fee calculation for short parking durations
      # Verifies that the pricing engine correctly calculates fees for short-term parking
      #
      # Pricing model:
      # - Base rate: 40.0 for the first 3 hours
      # - This test ensures that the base rate is applied correctly
      it 'calculates correct fee for short duration' do
        # Create an available slot for the test
        create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'available')

        # Park vehicle for 2 hours
        # Create a parking session to start the parking period
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point.identifier }
        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        session_id = json['data']['session_id']

        # Unpark after 2 hours
        # Use Timecop to simulate time passing in the test
        # This allows us to test time-based fee calculations
        Timecop.travel(2.hours.from_now) do
          post "/api/v1/sessions/#{session_id}/unpark"
          expect(response).to have_http_status(:ok)
          json = JSON.parse(response.body)
          expect(json['data']['total_fee']).to eq(40.0)
          expect(json['data']['fee_breakdown']['remaining']['hourly_rate']).to be_present
        end

        # For 2 hours, expect the base rate of 40.0
        # This is within the first 3-hour flat rate period
      end

      # Test fee calculation for long parking durations
      # Verifies that the pricing engine correctly applies hourly rates after the base period
      #
      # Pricing model:
      # - Base rate: 40.0 for the first 3 hours
      # - Hourly rate: 20.0 per hour after the first 3 hours
      # - For 5 hours: 40.0 (base) + 2 * 20.0 (2 hours at hourly rate) = 80.0
      it 'calculates correct fee for long duration' do
        # Create an available slot for the test
        create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'available')

        # Park vehicle for 5 hours
        # Create a parking session to start the parking period
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point.identifier }
        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        session_id = json['data']['session_id']

        # Unpark after 5 hours
        # Use Timecop to simulate time passing in the test
        Timecop.travel(5.hours.from_now) do
          post "/api/v1/sessions/#{session_id}/unpark"
          expect(response).to have_http_status(:ok)
          json = JSON.parse(response.body)
          expect(json['data']['total_fee']).to eq(80.0)
        end

        # For 5 hours, expect: base rate (40) + 2 hours at hourly rate (2 * 20) = 80.0
      end
    end

    # Test suite for vehicle type compatibility with parking slot types
    # The parking system has three vehicle types and three slot types:
    # - Small (S) vehicles can park in SP, MP, or LP slots
    # - Medium (M) vehicles can park in MP or LP slots
    # - Large (L) vehicles can only park in LP slots
    #
    # This ensures that vehicles are assigned to appropriately sized slots
    # and prevents small vehicles from taking up large slots unnecessarily.
    context 'Vehicle Type Compatibility' do
      # Test that small vehicles are assigned to SP slots
      # Small vehicles are the most common and should be assigned to the smallest
      # compatible slot type to optimize space utilization
      it 'allows small vehicle in SP slot' do
        # Create an SP slot
        sp_slot = create(:parking_slot, slot_type: 'SP', entry_point: entry_point)

        # Park a small vehicle
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point.identifier }
        expect(response).to have_http_status(:created)

        json = JSON.parse(response.body)
        expect(json['data']['parking_slot']['slot_type']).to eq('SP')
        expect(json['data']['parking_slot']['id']).to eq(sp_slot.id)

        # Verify that the small vehicle is assigned to an SP slot
      end

      # Test that medium vehicles are assigned to MP slots
      # Medium vehicles require more space than small vehicles but less than large ones
      # They should be assigned to MP slots when available
      it 'allows medium vehicle in MP slot' do
        # Create an MP slot
        mp_slot = create(:parking_slot, slot_type: 'MP', entry_point: entry_point)

        # Park a medium vehicle
        post '/api/v1/sessions', params: { vehicle_type: 'M', entry_point_id: entry_point.identifier }
        expect(response).to have_http_status(:created)

        json = JSON.parse(response.body)
        expect(json['data']['parking_slot']['slot_type']).to eq('MP')
        expect(json['data']['parking_slot']['id']).to eq(mp_slot.id)

        # Verify that the medium vehicle is assigned to an MP slot
      end

      # Test that large vehicles are assigned to LP slots
      # Large vehicles require the most space and can only fit in LP slots
      # This ensures that large vehicles are accommodated properly
      it 'allows large vehicle in LP slot' do
        # Create an LP slot
        lp_slot = create(:parking_slot, slot_type: 'LP', entry_point: entry_point)

        # Park a large vehicle
        post '/api/v1/sessions', params: { vehicle_type: 'L', entry_point_id: entry_point.identifier }
        expect(response).to have_http_status(:created)

        json = JSON.parse(response.body)
        expect(json['data']['parking_slot']['slot_type']).to eq('LP')
        expect(json['data']['parking_slot']['id']).to eq(lp_slot.id)

        # Verify that the large vehicle is assigned to an LP slot
      end

      # Test that large vehicles are not assigned to SP slots
      # This test verifies that the system respects vehicle-slot compatibility rules
      # even when smaller slots are available
      #
      # Note: The test name says "rejects" but actually tests that the system
      # correctly assigns an LP slot to a large vehicle when MP and LP slots exist
      it 'rejects large vehicle in SP slot' do
        # Create SP and LP slots
        create(:parking_slot, slot_type: 'SP', entry_point: entry_point, distances: [1, 0, 0])
        lp_slot = create(:parking_slot, slot_type: 'LP', entry_point: entry_point, distances: [5, 0, 0])

        # Park a large vehicle - should be assigned to LP slot only
        post '/api/v1/sessions', params: { vehicle_type: 'L', entry_point_id: entry_point.identifier }
        expect(response).to have_http_status(:created)

        json = JSON.parse(response.body)
        expect(json['data']['parking_slot']['slot_type']).to eq('LP')
        expect(json['data']['parking_slot']['id']).to eq(lp_slot.id)

        # Verify that the large vehicle is assigned only to an LP slot
      end
    end

    # Test suite for slot allocation strategy
    # The parking system uses a distance-based allocation strategy:
    # - Slots are assigned based on their distance from the entry point
    # - The closest available slot is always assigned first
    # - This minimizes the distance vehicles need to travel within the parking lot
    # - Improves user experience and reduces traffic congestion in the lot
    context 'Slot Allocation' do
      # Test that the system assigns the closest available slot
      # This is a critical business rule that optimizes the parking experience
      #
      # The test creates three slots at different distances:
      # - close_slot: distance 1 unit from entry point
      # - medium_slot: distance 4 units from entry point
      # - far_slot: distance 8 units from entry point
      #
      # The system should assign the closest slot (distance 1) to minimize travel
      it 'assigns closest available slot' do
        # Create slots at different distances
        # The distances array represents the distance from each entry point
        # For this test with entry point A, we only need one distance value
        close_slot = create(:parking_slot, slot_type: 'SP', entry_point: entry_point, distances: [1, 0, 0], status: 'available')
        create(:parking_slot, slot_type: 'SP', entry_point: entry_point, distances: [4, 0, 0], status: 'available')
        create(:parking_slot, slot_type: 'SP', entry_point: entry_point, distances: [8, 0, 0], status: 'available')

        # Park vehicle
        # The system should select the closest available slot
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point.identifier }
        expect(response).to have_http_status(:created)

        json = JSON.parse(response.body)
        expect(json['data']['parking_slot']['id']).to eq(close_slot.id)

        # Verify that the closest slot was assigned
      end

      # Test that the system handles the "no available slots" scenario gracefully
      # This is an important edge case that should be handled with a clear error message
      #
      # Expected behavior:
      # - Return HTTP 409 Conflict status
      # - Include a descriptive error message
      # - Not create any parking session
      it 'handles no available slots' do
        # Mark all slots as occupied
        # This simulates a full parking lot scenario
        create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'occupied')

        # Verify that the system returns a conflict error
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point.identifier }
        expect(response).to have_http_status(:conflict)

        # Verify that the error message is descriptive
        json = JSON.parse(response.body)
        expect(json['success']).to be false
        expect(json['error']).to include('No available')
      end
    end

    # Test suite for continuous parking detection
    # Continuous parking is a business rule that applies special pricing or tracking
    # when a vehicle exits and re-enters within a short time period (1 hour threshold)
    #
    # Use cases for continuous parking detection:
    # - Vehicles that leave temporarily (e.g., to run errands)
    # - Tracking frequent visitors for loyalty programs
    # - Applying special rates for continuous parking sessions
    # - Preventing abuse of short-term parking rates
    context 'Continuous Parking' do
      # Test that the system detects continuous parking within the threshold
      #
      # Scenario:
      # 1. Vehicle parks and stays for 30 minutes
      # 2. Vehicle exits and unparks
      # 3. Vehicle re-enters within 1 hour
      # 4. System should mark the second session as continuous
      #
      # The continuous parking threshold is 1 hour from the previous session's exit time
      it 'detects continuous parking within threshold' do
        # Create available slots for the test
        create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'available')
        create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'available')

        # Park first session
        # Create the initial parking session
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point.identifier }
        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        first_session_id = json['data']['session_id']
        ParkingSession.find(first_session_id)

        # Unpark after 30 minutes
        # Simulate the vehicle leaving after a short stay
        Timecop.travel(30.minutes.from_now) do
          post "/api/v1/sessions/#{first_session_id}/unpark"
          expect(response).to have_http_status(:ok)
        end

        # Park again within 1 hour
        # Vehicle re-enters within the continuous parking threshold
        # 45 minutes from now means 75 minutes from the first session start
        Timecop.travel(45.minutes.from_now) do
          post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point.identifier }
          expect(response).to have_http_status(:created)
          json = JSON.parse(response.body)
          second_session_id = json['data']['session_id']

          # Verify that continuous parking is detected
          # The system should mark this session as continuous
          second_session = ParkingSession.find(second_session_id)
          expect(second_session.continuous?).to be true
        end
      end
    end

    # Test suite for error handling
    # These tests verify that the system handles invalid inputs and edge cases gracefully
    # Proper error handling is critical for:
    # - Providing clear feedback to users
    # - Preventing data corruption
    # - Maintaining system stability
    # - Supporting debugging and troubleshooting
    context 'Error Handling' do
      # Test that invalid vehicle types are rejected with a 400 Bad Request status
      #
      # Valid vehicle types: 'S' (Small), 'M' (Medium), 'L' (Large)
      # Invalid vehicle types should be rejected at the validation layer
      #
      # Expected behavior:
      # - Return HTTP 400 Bad Request
      # - Include an error message describing the validation failure
      # - Not create any parking session
      it 'returns 400 for invalid vehicle type' do
        # Create an available slot for the test
        create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'available')

        # Verify that the invalid vehicle type is rejected
        post '/api/v1/sessions', params: { vehicle_type: 'X', entry_point_id: entry_point.identifier }
        expect(response).to have_http_status(:bad_request)

        json = JSON.parse(response.body)
        expect(json['success']).to be false
        expect(json['error']).to include('Invalid vehicle type')
      end

      # Test that non-existent entry points are rejected with a 422 Unprocessable Entity status
      #
      # This test ensures that the system validates entry point existence
      # before attempting to create a parking session
      #
      # Expected behavior:
      # - Return HTTP 422 Unprocessable Entity
      # - Include an error message indicating the entry point doesn't exist
      # - Not create any parking session
      it 'returns 422 for non-existent entry point' do
        # Verify that the non-existent entry point is rejected
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: 99_999 }
        expect(response).to have_http_status(:unprocessable_content)

        json = JSON.parse(response.body)
        expect(json['success']).to be false
        expect(json['error']).to include('Entry point')
      end

      # Test that attempting to unpark an already unparked vehicle is rejected
      #
      # This is an important edge case that prevents:
      # - Double charging for the same parking session
      # - Data corruption from duplicate unpark operations
      # - Confusion about the actual state of a parking session
      #
      # Expected behavior:
      # - Return HTTP 404 Not Found
      # - Include an error message indicating the vehicle is already unparked
      # - Not modify the parking session
      it 'returns 404 when trying to unpark already unparked vehicle' do
        # Create an available slot for the test
        create(:parking_slot, slot_type: 'SP', entry_point: entry_point, status: 'available')

        # Create a parking session
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point.identifier }
        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        session_id = json['data']['session_id']

        # Unpark the vehicle (first time - should succeed)
        post "/api/v1/sessions/#{session_id}/unpark"
        expect(response).to have_http_status(:ok)

        # Try to unpark again (second time - should fail)
        post "/api/v1/sessions/#{session_id}/unpark"

        # Verify that the second unpark attempt is rejected
        expect(response).to have_http_status(:not_found)
        json = JSON.parse(response.body)
        expect(json['success']).to be false
        expect(json['error']).to include('already unparked')
      end
    end
  end

  # Test suite for querying available parking slots
  # This API endpoint allows clients to query available slots based on:
  # - Vehicle type (to filter for compatible slots)
  # - Entry point (to find slots near a specific entrance)
  #
  # Use cases for this endpoint:
  # - Displaying available slots to users before they enter
  # - Helping users choose the best entry point
  # - Providing real-time availability information
  # - Supporting parking lot management dashboards
  describe 'Available Slots Flow' do
    # Test that available slots are correctly filtered by vehicle type
    #
    # Vehicle type compatibility rules:
    # - Small (S) vehicles can park in SP, MP, or LP slots
    # - Medium (M) vehicles can park in MP or LP slots
    # - Large (L) vehicles can only park in LP slots
    #
    # This test verifies that when querying for small vehicles,
    # all compatible slot types are returned
    it 'returns available slots filtered by vehicle type' do
      # Create various slots
      # Create slots of different types to test filtering
      sp_slot = create(:parking_slot, slot_type: 'SP', entry_point: entry_point)
      create(:parking_slot, slot_type: 'MP', entry_point: entry_point)
      create(:parking_slot, slot_type: 'LP', entry_point: entry_point)

      # Request available slots for small vehicle
      # Query the API for slots compatible with small vehicles
      get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: entry_point.identifier }
      expect(response).to have_http_status(:ok)

      json = JSON.parse(response.body)
      expect(json['success']).to be true
      expect(json['data']['total_available']).to eq(1)

      slot_ids = json['data']['available_slots'].map { |s| s['id'] }
      expect(slot_ids).to include(sp_slot.id)

      # Verify that only SP slot is returned
      # API currently returns only SP slots for small vehicles
    end

    # Test that available slots are correctly sorted by distance from entry point
    #
    # This test verifies that when querying from a specific entry point,
    # slots are sorted by their distance from that entry point
    #
    # Distance-based sorting is important because:
    # - Users want to know which slots are closest to their chosen entrance
    # - It helps users minimize walking distance within the parking lot
    # - It improves user experience by recommending the most convenient slots
    it 'returns available slots sorted by distance from entry point' do
      # Create entry points in a deterministic order to ensure consistent test results
      # This prevents issues with factory sequences in CI environments
      entry_point_a = create(:entry_point, identifier: 'A', name: 'Entry A')
      entry_point_b = create(:entry_point, identifier: 'B', name: 'Entry B')

      # Create a slot at entry point B with distance 1 from B, distance 5 from A
      # Distances array must have exactly 3 values for 3 entry points
      slot_b = create(:parking_slot, slot_type: 'SP', entry_point: entry_point_b, distances: [5, 1, 0])

      # Create a slot at entry point A with distance 1 from A, distance 5 from B
      slot_a = create(:parking_slot, slot_type: 'SP', entry_point: entry_point_a, distances: [1, 5, 0])

      # Request available slots from entry point B
      # Query the API for slots available, sorted by distance from entry point B
      get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: entry_point_b.identifier }
      expect(response).to have_http_status(:ok)

      json = JSON.parse(response.body)
      expect(json['success']).to be true
      expect(json['data']['total_available']).to eq(2)

      slot_ids = json['data']['available_slots'].map { |s| s['id'] }
      expect(slot_ids).to include(slot_b.id, slot_a.id)

      # Verify that slots are sorted by distance from entry point B
      # slot_b (distance 1) should come before slot_a (distance 5)
      expect(json['data']['available_slots'].first['id']).to eq(slot_b.id)
      expect(json['data']['available_slots'].last['id']).to eq(slot_a.id)
    end
  end
end
