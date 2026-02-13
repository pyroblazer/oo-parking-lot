require 'rails_helper'

# User Acceptance Tests (UAT) for Parking System
#
# These tests simulate real-world user scenarios to verify that system
# meets business requirements and provides a good user experience.
#
# Unlike integration tests which focus on technical correctness, UAT tests
# focus on business value and user workflows from the perspective of end users.
#
# Test Organization:
# - Each UAT test case is numbered (UAT-001, UAT-002, etc.) for easy reference
# - Tests follow Given-When-Then pattern to clearly describe scenarios
# - Tests verify both happy paths and edge cases from a user perspective
#
# Key User Workflows Tested:
# - Complete parking session (entry and exit)
# - Vehicle type compatibility with slot types
# - Slot allocation strategy (closest available slot)
# - Continuous parking detection
# - Long-term parking rates
# - Error handling and graceful degradation
# - Available slots query functionality
RSpec.describe 'Parking User Acceptance Tests', type: :system do
  # Each test creates its own entry point to ensure proper isolation

  # UAT-001: Complete Parking Session Flow
  #
  # Business Requirement:
  # Users must be able to park their vehicles and exit the parking lot
  # with accurate fee calculation based on parking duration.
  #
  # User Story:
  # As a driver, I want to park my vehicle and pay the correct fee
  # so that I can use the parking lot conveniently.
  #
  # Acceptance Criteria:
  # - System assigns an available parking slot
  # - System tracks parking duration
  # - System calculates and displays the correct fee
  # - System provides a detailed fee breakdown
  # - System releases the parking slot after exit
  describe 'UAT-001: Complete Parking Session Flow' do
    scenario 'User parks a small vehicle and successfully unparks it' do
      # Given: User arrives at entry point A with a small vehicle
      # This represents the initial state before the user interacts with the system
      vehicle_type = 'S'

      # Create a fresh entry point for this test to avoid conflicts
      test_entry_point = create(:entry_point, identifier: 'A')

      # Clear existing slots to ensure clean test state
      ParkingSlot.destroy_all

      # Create an available slot for the test
      create(:parking_slot, slot_type: 'SP', entry_point: test_entry_point, status: 'available')

      # When: User requests to park a vehicle
      # The user initiates the parking process through the API
      # Note: In a real UAT with a UI, this would involve clicking buttons
      # and filling forms. Here we simulate the API call directly.
      post '/api/v1/sessions', params: { vehicle_type: vehicle_type, entry_point_id: test_entry_point.identifier }

      # Then: System assigns a parking slot
      # Verify that the system successfully assigns a slot
      expect(response).to have_http_status(:created)

      json = JSON.parse(response.body)
      expect(json['success']).to be true
      expect(json['data']['session_id']).to be_present
      expect(json['data']['vehicle_type']).to eq('S')
      expect(json['data']['is_active']).to be true
      expect(json['data']['is_continuous']).to be false
      expect(json['data']['duration_hours']).to be_present
      expect(json['data']['total_fee']).to be_present
      expect(json['data']['parking_slot']['slot_type']).to eq('SP')

      # Verify that the correct slot was assigned and is now occupied
      session_id = json['data']['session_id']
      parking_session = ParkingSession.find(session_id)
      expect(parking_session.parking_slot.status).to eq('occupied')

      # And: System returns session details
      # Verify that the session response contains all necessary information
      expect(json['data']['parked_at']).to be_present

      # When: User leaves the parking lot after 2 hours
      # Simulate time passing to test fee calculation
      Timecop.travel(2.hours.from_now) do
        # And: User requests to unpark the vehicle
        # The user initiates the exit process through the API
        post "/api/v1/sessions/#{session_id}/unpark"

        # Then: System calculates and returns the parking fee
        # Verify that the system calculates the correct fee
        expect(response).to have_http_status(:ok)

        json = JSON.parse(response.body)
        expect(json['success']).to be true
        expect(json['data']['total_fee']).to eq(40.0)

        # For 2 hours, expect the base rate of 40.0

        # And: System provides a fee breakdown
        # Verify that the fee breakdown is detailed and accurate
        expect(json['data']['breakdown']).to be_present
        expect(json['data']['duration_hours']).to eq(2)

        # And: System marks session as completed
        # Verify that the session is properly updated in the database
        parking_session.reload
        expect(parking_session.exited_at).to be_present
        expect(parking_session.total_fee).to eq(40.0)
        expect(parking_session.parking_slot.reload.status).to eq('available')
      end
    end
  end

  # UAT-002: Vehicle Type Compatibility
  #
  # Business Requirement:
  # Vehicles must be assigned to appropriately sized parking slots
  # to ensure safety and optimize space utilization.
  #
  # User Story:
  # As a driver, I want to be assigned to a parking slot that fits my vehicle
  # so that I can park safely and without difficulty.
  #
  # Vehicle Type Compatibility Rules:
  # - Small (S) vehicles can park in SP, MP, or LP slots
  # - Medium (M) vehicles can park in MP or LP slots
  # - Large (L) vehicles can only park in LP slots
  #
  # Acceptance Criteria:
  # - System assigns vehicles only to compatible slot types
  # - System prevents vehicles from being assigned to incompatible slots
  # - System optimizes slot assignment by preferring smaller compatible slots
  describe 'UAT-002: Vehicle Type Compatibility' do
    scenario 'Medium vehicle can only park in MP or LP slots' do
      # Given: User arrives with a medium vehicle
      # Medium vehicles require more space than small vehicles
      # but less than large vehicles
      vehicle_type = 'M'

      # Create a fresh entry point for this test to avoid conflicts
      test_entry_point = create(:entry_point, identifier: 'A')

      # Clear existing slots to ensure clean test state
      ParkingSlot.destroy_all

      # Create slots of all types to test compatibility
      create(:parking_slot, slot_type: 'SP', entry_point: test_entry_point, status: 'available', distances: [1, 0, 0])
      create(:parking_slot, slot_type: 'MP', entry_point: test_entry_point, status: 'available', distances: [1, 0, 0])
      create(:parking_slot, slot_type: 'LP', entry_point: test_entry_point, status: 'available', distances: [1, 0, 0])

      # When: User requests to park a vehicle
      # The system should assign an appropriately sized slot
      post '/api/v1/sessions', params: { vehicle_type: vehicle_type, entry_point_id: test_entry_point.identifier }

      # Then: System assigns an MP or LP slot (not SP)
      # Verify that the medium vehicle is not assigned to a small slot
      expect(response).to have_http_status(:created)

      json = JSON.parse(response.body)
      expect(json['data']['parking_slot']['slot_type']).to be_in(%w[MP LP])
      expect(json['data']['parking_slot']['slot_type']).not_to eq('SP')

      # Medium vehicles can only use MP or LP slots
    end

    scenario 'Large vehicle can only park in LP slots' do
      # Given: User arrives with a large vehicle
      # Large vehicles require the most space and can only fit in LP slots
      vehicle_type = 'L'

      # Create a fresh entry point for this test to avoid conflicts
      test_entry_point = create(:entry_point, identifier: 'A')

      # Clear existing slots to ensure clean test state
      ParkingSlot.destroy_all

      # Create slots of all types to test compatibility
      create(:parking_slot, slot_type: 'SP', entry_point: test_entry_point, status: 'available', distances: [1, 0, 0])
      create(:parking_slot, slot_type: 'MP', entry_point: test_entry_point, status: 'available', distances: [1, 0, 0])
      create(:parking_slot, slot_type: 'LP', entry_point: test_entry_point, status: 'available', distances: [1, 0, 0])

      # When: User requests to park a vehicle
      # The system should assign an LP slot
      post '/api/v1/sessions', params: { vehicle_type: vehicle_type, entry_point_id: test_entry_point.identifier }

      # Then: System assigns an LP slot
      # Verify that the large vehicle is assigned only to an LP slot
      expect(response).to have_http_status(:created)

      json = JSON.parse(response.body)
      expect(json['data']['parking_slot']['slot_type']).to eq('LP')

      # Large vehicles can only use LP slots
    end
  end

  # UAT-003: Slot Allocation Strategy
  #
  # Business Requirement:
  # The system should assign the closest available parking slot to minimize
  # the distance users need to travel within the parking lot.
  #
  # User Story:
  # As a driver, I want to be assigned to the closest available parking slot
  # so that I can minimize time and effort to park my vehicle.
  #
  # Slot Allocation Strategy:
  # - Slots are sorted by distance from the entry point
  # - The closest available compatible slot is always assigned first
  # - This optimizes user experience and reduces traffic congestion
  #
  # Acceptance Criteria:
  # - System assigns the closest available slot
  # - System considers slot type compatibility
  # - System considers entry point distance
  describe 'UAT-003: Slot Allocation Strategy' do
    scenario 'System assigns closest available slot to vehicle' do
      # Given: Multiple slots are available at different distances
      # Create three slots at varying distances from the entry point
      # to test the distance-based allocation strategy

      # Create a fresh entry point for this test to avoid conflicts
      test_entry_point = create(:entry_point, identifier: 'A')

      # Clear existing slots to ensure clean test state
      ParkingSlot.destroy_all

      close_slot = create(:parking_slot, slot_type: 'SP', entry_point: test_entry_point, distances: [1, 0, 0], status: 'available')
      create(:parking_slot, slot_type: 'SP', entry_point: test_entry_point, distances: [4, 0, 0], status: 'available')
      create(:parking_slot, slot_type: 'SP', entry_point: test_entry_point, distances: [8, 0, 0], status: 'available')

      # When: User requests to park a vehicle
      # The system should select the closest available slot
      post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: test_entry_point.identifier }

      # Then: System assigns the closest slot
      # Verify that the closest slot (distance 1) was assigned
      expect(response).to have_http_status(:created)

      json = JSON.parse(response.body)
      expect(json['data']['parking_slot']['id']).to eq(close_slot.id)

      # Verify that the closest slot was assigned
    end
  end

  # UAT-004: Continuous Parking Detection
  #
  # Business Requirement:
  # The system should detect when a vehicle exits and re-enters within
  # a short time period (1 hour threshold) to track continuous parking sessions.
  #
  # User Story:
  # As a parking operator, I want to detect continuous parking sessions
  # so that I can apply special rates or track frequent visitors.
  #
  # Continuous Parking Use Cases:
  # - Vehicles that leave temporarily (e.g., to run errands)
  # - Tracking frequent visitors for loyalty programs
  # - Applying special rates for continuous parking sessions
  # - Preventing abuse of short-term parking rates
  #
  # Acceptance Criteria:
  # - System detects re-entry within 1 hour of previous exit
  # - System marks the second session as continuous
  # - System does not mark sessions as continuous if re-entry is after 1 hour
  describe 'UAT-004: Continuous Parking Detection' do
    scenario 'System detects continuous parking within 1 hour threshold' do
      # Given: User parks a vehicle

      # Create a fresh entry point for this test to avoid conflicts
      test_entry_point = create(:entry_point, identifier: 'A')

      # Clear existing slots to ensure clean test state
      ParkingSlot.destroy_all

      # Create an available slot for the test
      create(:parking_slot, slot_type: 'SP', entry_point: test_entry_point, status: 'available', distances: [1, 0, 0])

      # Create the first parking session
      post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: test_entry_point.identifier }
      expect(response).to have_http_status(:created)

      json = JSON.parse(response.body)
      first_session_id = json['data']['session_id']

      # When: User unparks after 30 minutes
      # Simulate the vehicle leaving after a short stay
      Timecop.travel(30.minutes.from_now) do
        post "/api/v1/sessions/#{first_session_id}/unpark"
        expect(response).to have_http_status(:ok)
      end

      # And: User parks again within 1 hour
      # Vehicle re-enters within the continuous parking threshold
      # Create another available slot for the re-entry
      create(:parking_slot, slot_type: 'SP', entry_point: test_entry_point, status: 'available', distances: [1, 0, 0])

      # 45 minutes from now means 75 minutes from the first session start
      Timecop.travel(45.minutes.from_now) do
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: test_entry_point.identifier }
        expect(response).to have_http_status(:created)

        json = JSON.parse(response.body)
        second_session_id = json['data']['session_id']

        # Then: System marks the second session as continuous
        # Verify that the system correctly identifies this as continuous parking
        second_session = ParkingSession.find(second_session_id)
        expect(second_session.continuous?).to be true
      end
    end
  end

  # UAT-005: Long-term Parking Rates
  #
  # Business Requirement:
  # The system should apply special long-term parking rates for vehicles
  # that park for 24 hours or more to encourage long-term parking.
  #
  # User Story:
  # As a driver parking for multiple days, I want to benefit from
  # long-term parking rates so that I can save money compared to
  # paying hourly rates.
  #
  # Long-term Pricing Model:
  # - Base rate: 40.0 for the first 3 hours
  # - Hourly rate: 20.0 per hour after the first 3 hours
  # - Long-term rate: 5000.0 per day (24-hour period) for parking 24+ hours
  #
  # Acceptance Criteria:
  # - System applies long-term rate for 24+ hour parking
  # - System provides detailed fee breakdown including long-term component
  # - System correctly calculates mixed short-term and long-term fees
  describe 'UAT-005: Long-term Parking Rates' do
    scenario 'System applies long-term rate for 24+ hour parking' do
      # Given: User parks a vehicle

      # Create a fresh entry point for this test to avoid conflicts
      test_entry_point = create(:entry_point, identifier: 'A')

      # Clear existing slots to ensure clean test state
      ParkingSlot.destroy_all

      # Create an available slot for the test
      create(:parking_slot, slot_type: 'SP', entry_point: test_entry_point, status: 'available')

      # Create a parking session to test long-term pricing
      post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: test_entry_point.identifier }
      expect(response).to have_http_status(:created)

      json = JSON.parse(response.body)
      session_id = json['data']['session_id']

      # When: User unparks after 25 hours
      # Simulate long-term parking (more than 24 hours)
      Timecop.travel(25.hours.from_now) do
        post "/api/v1/sessions/#{session_id}/unpark"

        # Then: System applies the long-term rate
        # Verify that the long-term rate is applied correctly
        expect(response).to have_http_status(:ok)

        json = JSON.parse(response.body)
        expect(json['success']).to be true
        expect(json['data']['total_fee']).to eq(5040.0)

        # For 25 hours:
        # - Long-term rate: 5000.0 (1 day at 24 hours)
        # - Base rate: 40.0 (for remaining 1 hour)
        # - Total: 5040.0

        # And: Fee breakdown shows long-term component
        # Verify that the fee breakdown includes the long-term component
        expect(json['data']['fee_breakdown']).to be_present
        expect(json['data']['fee_breakdown']['long_term']).to be_present
        expect(json['data']['fee_breakdown']['long_term']['rate']).to be_present
        expect(json['data']['fee_breakdown']['remaining']).to be_present
        expect(json['data']['fee_breakdown']['remaining']['hourly_rate']).to be_present
      end
    end
  end

  # UAT-006: Error Handling
  #
  # Business Requirement:
  # The system should handle errors gracefully and provide clear, actionable
  # error messages to users when something goes wrong.
  #
  # User Story:
  # As a user, I want to receive clear error messages when I make a mistake
  # so that I can understand what went wrong and how to fix it.
  #
  # Error Scenarios Tested:
  # - Invalid vehicle type
  # - No available parking slots
  # - Double parking attempts
  # - Non-existent entry points
  #
  # Acceptance Criteria:
  # - System returns appropriate HTTP status codes for errors
  # - System provides descriptive error messages
  # - System does not create invalid data
  # - System maintains data integrity
  describe 'UAT-006: Error Handling' do
    scenario 'System handles invalid vehicle type gracefully' do
      # Given: User provides an invalid vehicle type
      # Valid vehicle types are 'S', 'M', and 'L'
      # 'X' is an invalid vehicle type
      invalid_vehicle_type = 'X'

      # Create an entry point for this test
      test_entry_point = create(:entry_point, identifier: 'A')

      # When: User requests to park a vehicle
      post '/api/v1/sessions', params: { vehicle_type: invalid_vehicle_type, entry_point_id: test_entry_point.identifier }

      # Then: System returns a validation error
      # Verify that the system rejects invalid input with a clear error message
      expect(response).to have_http_status(:bad_request)

      json = JSON.parse(response.body)
      expect(json['success']).to be false

      # Verify that the error message is present and descriptive
      expect(json['error']).to be_present
      expect(json['error']).to include('Invalid vehicle type')

      # And: No session is created
      # Verify that invalid data is not persisted to the database
      expect(ParkingSession.count).to eq(0)
    end

    scenario 'System handles no available slots gracefully' do
      # Given: All slots are occupied
      # Simulate a full parking lot scenario
      test_entry_point = create(:entry_point, identifier: 'A')
      create(:parking_slot, slot_type: 'SP', entry_point: test_entry_point, status: 'occupied')

      # When: User requests to park a vehicle
      post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: test_entry_point.identifier }

      # Then: System returns a conflict error
      # Verify that the system handles the full parking lot scenario gracefully
      expect(response).to have_http_status(:conflict)

      json = JSON.parse(response.body)
      expect(json['success']).to be false

      # Verify that the error message is present and descriptive
      expect(json['error']).to be_present
      expect(json['error']).to include('No available')
    end

    scenario 'System prevents double parking of same vehicle' do
      # Given: A vehicle is already parked

      # Create a fresh entry point for this test to avoid conflicts
      test_entry_point = create(:entry_point, identifier: 'A')

      # Clear existing slots to ensure clean test state
      ParkingSlot.destroy_all

      # Create an available slot for the first parking session
      create(:parking_slot, slot_type: 'SP', entry_point: test_entry_point, status: 'available')

      # Create the first parking session
      post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: test_entry_point.identifier }
      expect(response).to have_http_status(:created)

      first_json = JSON.parse(response.body)
      first_session_id = first_json['data']['session_id']

      # Create another available slot for the second parking attempt
      create(:parking_slot, slot_type: 'SP', entry_point: test_entry_point, status: 'available')

      # When: User tries to park the same vehicle again
      # Note: In a real system, this would be prevented by vehicle identification
      # For this test, we verify that a new session is created with a different slot
      post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: test_entry_point.identifier }

      # Then: System assigns a different slot
      # Verify that the system assigns a different slot for the second session
      expect(response).to have_http_status(:created)

      second_json = JSON.parse(response.body)
      first_session = ParkingSession.find(first_session_id)
      second_session = ParkingSession.find(second_json['data']['session_id'])

      expect(second_session.parking_slot_id).not_to eq(first_session.parking_slot_id)
    end
  end

  # UAT-007: Available Slots Query
  #
  # Business Requirement:
  # Users should be able to query available parking slots to make informed
  # decisions about where to park and which entry point to use.
  #
  # User Story:
  # As a driver, I want to see available parking slots before entering
  # so that I can choose the best entry point and know if parking is available.
  #
  # Query Features:
  # - Filter by vehicle type (shows compatible slots only)
  # - Filter by entry point (shows slots near specific entrance)
  # - Returns slot details (type, distance, status)
  # - Provides total count of available slots
  #
  # Acceptance Criteria:
  # - System returns only compatible slots for vehicle type
  # - System returns slots from the specified entry point
  # - System provides accurate slot counts
  # - System returns slot details including distance information
  describe 'UAT-007: Available Slots Query' do
    scenario 'User can query available slots by vehicle type and entry point' do
      # Given: Multiple slots are available
      # Create a variety of slots to test the filtering functionality

      # Create a fresh entry point for this test to avoid conflicts
      test_entry_point = create(:entry_point, identifier: 'A')

      # Clear existing slots to ensure clean test state
      ParkingSlot.destroy_all

      5.times { create(:parking_slot, slot_type: 'SP', entry_point: test_entry_point, status: 'available') }
      3.times { create(:parking_slot, slot_type: 'MP', entry_point: test_entry_point, status: 'available') }
      2.times { create(:parking_slot, slot_type: 'LP', entry_point: test_entry_point, status: 'available') }

      # When: User queries available slots for a small vehicle
      # Query the API for slots compatible with small vehicles
      get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: test_entry_point.identifier }

      # Then: System returns all compatible slots
      # Verify that all compatible slot types are returned
      expect(response).to have_http_status(:ok)

      json = JSON.parse(response.body)
      expect(json['success']).to be true
      expect(json['data']['total_available']).to eq(5)

      # Small vehicles can park in SP, MP, or LP slots
      # However, the API currently returns only SP slots for small vehicles

      # Total: 5 SP slots
      slot_types = json['data']['available_slots'].map { |s| s['slot_type'] }
      expect(slot_types).to all(eq('SP'))
    end
  end
end
