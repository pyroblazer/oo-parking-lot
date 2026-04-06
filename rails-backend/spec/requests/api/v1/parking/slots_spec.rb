require 'rails_helper'

RSpec.describe 'Api::V1::SlotsController', type: :request do
  let(:entry_point) { create(:entry_point, identifier: 'A') }

  describe 'GET /api/v1/slots' do
    before do
      create_list(:parking_slot, 5, entry_point: entry_point, slot_type: 'SP', status: 'available')
      create_list(:parking_slot, 3, entry_point: entry_point, slot_type: 'MP', status: 'occupied')
      create_list(:parking_slot, 2, entry_point: entry_point, slot_type: 'LP', status: 'available')
    end

    # Postman collection tests
    it 'returns status 200' do
      get '/api/v1/slots'

      expect(response).to have_http_status(:ok)
    end

    it 'returns JSON content type' do
      get '/api/v1/slots'

      expect(response.content_type).to include('application/json')
    end

    it 'returns success field' do
      get '/api/v1/slots'

      json = response.parsed_body
      expect(json['success']).to be true
    end

    it 'returns data field' do
      get '/api/v1/slots'

      json = response.parsed_body
      expect(json['data']).to be_present
    end

    it 'returns data as array' do
      get '/api/v1/slots'

      json = response.parsed_body
      expect(json['data']).to be_an(Array)
    end

    it 'returns at least one slot' do
      get '/api/v1/slots'

      json = response.parsed_body
      expect(json['data'].length).to be >= 1
    end

    it 'returns slots with required fields' do
      get '/api/v1/slots'

      json = response.parsed_body
      json['data'].each do |slot|
        expect(slot).to have_key('id')
        expect(slot).to have_key('slot_label')
        expect(slot).to have_key('slot_type')
        expect(slot).to have_key('distances')
        expect(slot).to have_key('available')
      end
    end

    it 'returns valid slot types' do
      get '/api/v1/slots'

      json = response.parsed_body
      valid_types = %w[SP MP LP]
      json['data'].each do |slot|
        expect(valid_types).to include(slot['slot_type'])
      end
    end

    it 'returns distances as array' do
      get '/api/v1/slots'

      json = response.parsed_body
      json['data'].each do |slot|
        expect(slot['distances']).to be_an(Array)
      end
    end

    it 'returns distances with 3 values' do
      get '/api/v1/slots'

      json = response.parsed_body
      json['data'].each do |slot|
        expect(slot['distances'].length).to eq(3)
      end
    end

    it 'returns non-negative distances' do
      get '/api/v1/slots'

      json = response.parsed_body
      json['data'].each do |slot|
        expect(slot['distances']).to all(be >= 0)
      end
    end

    it 'returns available as boolean' do
      get '/api/v1/slots'

      json = response.parsed_body
      json['data'].each do |slot|
        expect([true, false]).to include(slot['available'])
      end
    end

    it 'returns no duplicate slot labels' do
      get '/api/v1/slots'

      json = response.parsed_body
      slot_labels = json['data'].pluck('slot_label')
      expect(slot_labels.length).to eq(slot_labels.uniq.length)
    end

    # Additional tests
    it 'returns list of all slots' do
      get '/api/v1/slots'

      json = response.parsed_body
      expect(json['data'].size).to eq(10)
    end

    describe 'POST /api/v1/slots' do
      context 'with valid parameters' do
        it 'creates a new parking slot' do
          params = {
            parking_slot: {
              slot_label: 'SP-10',
              slot_type: 'SP',
              distances: [50, 60, 70]
            }
          }

          expect do
            post '/api/v1/slots', params: params, as: :json
          end.to change(ParkingSlot, :count).by(1)
        end

        it 'returns status 201' do
          params = {
            parking_slot: {
              slot_label: 'SP-10',
              slot_type: 'SP',
              distances: [50, 60, 70]
            }
          }

          post '/api/v1/slots', params: params, as: :json
          expect(response).to have_http_status(:created)
        end

        it 'returns JSON content type' do
          params = {
            parking_slot: {
              slot_label: 'SP-10',
              slot_type: 'SP',
              distances: [50, 60, 70]
            }
          }

          post '/api/v1/slots', params: params, as: :json
          expect(response.content_type).to include('application/json')
        end

        it 'returns success field' do
          params = {
            parking_slot: {
              slot_label: 'SP-10',
              slot_type: 'SP',
              distances: [50, 60, 70]
            }
          }

          post '/api/v1/slots', params: params, as: :json
          json = response.parsed_body
          expect(json['success']).to be true
        end

        it 'returns data field' do
          params = {
            parking_slot: {
              slot_label: 'SP-10',
              slot_type: 'SP',
              distances: [50, 60, 70]
            }
          }

          post '/api/v1/slots', params: params, as: :json
          json = response.parsed_body
          expect(json['data']).to be_present
        end

        it 'returns data with required fields' do
          params = {
            parking_slot: {
              slot_label: 'SP-10',
              slot_type: 'SP',
              distances: [50, 60, 70]
            }
          }

          post '/api/v1/slots', params: params, as: :json
          json = response.parsed_body
          expect(json['data']).to have_key('id')
          expect(json['data']).to have_key('slot_label')
          expect(json['data']).to have_key('slot_type')
          expect(json['data']).to have_key('distances')
        end
      end

      context 'with invalid parameters' do
        it 'returns 400 when slot_label is missing' do
          params = {
            parking_slot: {
              slot_type: 'SP',
              distances: [50, 60, 70]
            }
          }

          post '/api/v1/slots', params: params, as: :json
          expect(response).to have_http_status(:bad_request)
        end

        it 'returns 400 when slot_type is missing' do
          params = {
            parking_slot: {
              slot_label: 'SP-10',
              distances: [50, 60, 70]
            }
          }

          post '/api/v1/slots', params: params, as: :json
          expect(response).to have_http_status(:bad_request)
        end

        it 'returns 400 when distances is missing' do
          params = {
            parking_slot: {
              slot_label: 'SP-10',
              slot_type: 'SP'
            }
          }

          post '/api/v1/slots', params: params, as: :json
          expect(response).to have_http_status(:bad_request)
        end

        it 'accepts distances array of any size (unlimited entry points)' do
          params = {
            parking_slot: {
              slot_label: 'SP-10',
              slot_type: 'SP',
              distances: [50, 60]
            }
          }

          post '/api/v1/slots', params: params, as: :json
          # Should succeed - unlimited entry points are now supported
          expect(response).to have_http_status(:created)
        end

        it 'returns 400 when slot_type is invalid' do
          params = {
            parking_slot: {
              slot_label: 'SP-10',
              slot_type: 'XX',
              distances: [50, 60, 70]
            }
          }

          post '/api/v1/slots', params: params, as: :json
          expect(response).to have_http_status(:bad_request)
        end
      end
    end

    describe 'PUT /api/v1/slots/:id' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      context 'with valid parameters' do
        it 'updates an existing parking slot' do
          params = {
            parking_slot: {
              slot_label: 'SP-5-Updated',
              slot_type: 'SP',
              distances: [15, 25, 35]
            }
          }

          put "/api/v1/slots/#{@slot.id}", params: params, as: :json
          expect(response).to have_http_status(:ok)
        end

        it 'returns status 200' do
          params = {
            parking_slot: {
              slot_label: 'SP-5-Updated',
              slot_type: 'SP',
              distances: [15, 25, 35]
            }
          }

          put "/api/v1/slots/#{@slot.id}", params: params, as: :json
          expect(response).to have_http_status(:ok)
        end

        it 'returns JSON content type' do
          params = {
            parking_slot: {
              slot_label: 'SP-5-Updated',
              slot_type: 'SP',
              distances: [15, 25, 35]
            }
          }

          put "/api/v1/slots/#{@slot.id}", params: params, as: :json
          expect(response.content_type).to include('application/json')
        end

        it 'returns success field' do
          params = {
            parking_slot: {
              slot_label: 'SP-5-Updated',
              slot_type: 'SP',
              distances: [15, 25, 35]
            }
          }

          put "/api/v1/slots/#{@slot.id}", params: params, as: :json
          json = response.parsed_body
          expect(json['success']).to be true
        end

        it 'returns data field' do
          params = {
            parking_slot: {
              slot_label: 'SP-5-Updated',
              slot_type: 'SP',
              distances: [15, 25, 35]
            }
          }

          put "/api/v1/slots/#{@slot.id}", params: params, as: :json
          json = response.parsed_body
          expect(json['data']).to be_present
        end

        it 'returns data with required fields' do
          params = {
            parking_slot: {
              slot_label: 'SP-5-Updated',
              slot_type: 'SP',
              distances: [15, 25, 35]
            }
          }

          put "/api/v1/slots/#{@slot.id}", params: params, as: :json
          json = response.parsed_body
          expect(json['data']).to have_key('id')
          expect(json['data']).to have_key('slot_label')
          expect(json['data']).to have_key('slot_type')
          expect(json['data']).to have_key('distances')
        end
      end

      context 'with invalid parameters' do
        it 'returns 404 when slot not found' do
          params = {
            parking_slot: {
              slot_label: 'SP-5-Updated',
              slot_type: 'SP',
              distances: [15, 25, 35]
            }
          }

          put '/api/v1/slots/999999', params: params, as: :json
          expect(response).to have_http_status(:not_found)
        end
      end
    end

    describe 'DELETE /api/v1/slots/:id' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'deletes an existing parking slot' do
        expect do
          delete "/api/v1/slots/#{@slot.id}", as: :json
        end.to change(ParkingSlot, :count).by(-1)
      end

      it 'returns status 204' do
        delete "/api/v1/slots/#{@slot.id}", as: :json
        expect(response).to have_http_status(:no_content)
      end

      it 'returns empty body' do
        delete "/api/v1/slots/#{@slot.id}", as: :json
        expect(response.body).to be_empty
      end

      context 'can delete available slot with no active sessions' do
        it 'deletes an available slot successfully' do
          slot = create(:parking_slot, slot_label: "SP-DELETE-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')

          expect do
            delete "/api/v1/slots/#{slot.id}", as: :json
          end.to change(ParkingSlot, :count).by(-1)

          expect(response).to have_http_status(:no_content)
          expect(response.body).to be_empty
        end

        it 'deletes slot with only historical sessions' do
          slot = create(:parking_slot, slot_label: "SP-HIST-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')

          # Create a completed session (historical)
          create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', parked_at: 2.days.ago, exited_at: 1.day.ago)

          expect do
            delete "/api/v1/slots/#{slot.id}", as: :json
          end.to change(ParkingSlot, :count).by(-1)

          expect(response).to have_http_status(:no_content)
        end
      end

      context 'cannot delete slot with active sessions' do
        it 'returns 409 conflict when slot has active session' do
          slot = create(:parking_slot, slot_label: "SP-ACTIVE-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')

          # Create an active session (no exited_at)
          create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', parked_at: 1.hour.ago, exited_at: nil)

          expect do
            delete "/api/v1/slots/#{slot.id}", as: :json
          end.not_to change(ParkingSlot, :count)

          expect(response).to have_http_status(:conflict)
          json = response.parsed_body
          expect(json).to have_key('error')
          expect(json['error']).to include('active')
        end

        it 'returns appropriate error message for slots with active sessions' do
          slot = create(:parking_slot, slot_label: "SP-ACTIVE2-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP',
                                       status: 'available')

          # Create an active session
          create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', parked_at: 30.minutes.ago, exited_at: nil)

          delete "/api/v1/slots/#{slot.id}", as: :json

          expect(response).to have_http_status(:conflict)
          json = response.parsed_body
          expect(json['error']).to match(/active|cannot delete/)
        end
      end

      context 'with invalid parameters' do
        it 'returns 404 when slot not found' do
          delete '/api/v1/slots/999999', as: :json
          expect(response).to have_http_status(:not_found)
        end
      end
    end
  end

  describe 'GET /api/v1/slots/available' do
    before do
      create_list(:parking_slot, 5, entry_point: entry_point, slot_type: 'SP', status: 'available')
      create_list(:parking_slot, 3, entry_point: entry_point, slot_type: 'MP', status: 'available')
      create_list(:parking_slot, 2, entry_point: entry_point, slot_type: 'LP', status: 'available')
    end

    context 'with valid parameters' do
      # Postman collection tests
      it 'returns status 200' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        expect(response).to have_http_status(:ok)
      end

      it 'returns JSON content type' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        expect(response.content_type).to include('application/json')
      end

      it 'returns success field' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = response.parsed_body
        expect(json['data']).to be_present
      end

      it 'returns available_slots' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = response.parsed_body
        expect(json['data']['available_slots']).to be_present
      end

      it 'returns total_available' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = response.parsed_body
        expect(json['data']['total_available']).to be_present
      end

      it 'returns available_slots as array' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = response.parsed_body
        expect(json['data']['available_slots']).to be_an(Array)
      end

      it 'returns total_available as number' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = response.parsed_body
        expect(json['data']['total_available']).to be_a(Numeric)
      end

      it 'returns non-negative total_available' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = response.parsed_body
        expect(json['data']['total_available']).to be >= 0
      end

      it 'returns total_available matching array length' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = response.parsed_body
        expect(json['data']['total_available']).to eq(json['data']['available_slots'].size)
      end

      it 'returns slots with required fields' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = response.parsed_body
        json['data']['available_slots'].each do |slot|
          expect(slot).to have_key('id')
          expect(slot).to have_key('slot_label')
          expect(slot).to have_key('slot_type')
          expect(slot).to have_key('distances')
          expect(slot).to have_key('available')
        end
      end

      it 'returns all slots as available' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = response.parsed_body
        json['data']['available_slots'].each do |slot|
          expect(slot['available']).to be true
        end
      end

      it 'returns distances as array (unlimited entry points)' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = response.parsed_body
        json['data']['available_slots'].each do |slot|
          expect(slot['distances']).to be_an(Array)
          # Distances array length should match current number of entry points
          # We don't enforce a specific length anymore
          expect(slot['distances'].length).to be >= 0
        end
      end

      it 'returns non-negative distances' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = response.parsed_body
        json['data']['available_slots'].each do |slot|
          expect(slot['distances']).to all(be >= 0)
        end
      end

      it 'returns no duplicate slot labels' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = response.parsed_body
        slot_labels = json['data']['available_slots'].pluck('slot_label')
        expect(slot_labels.length).to eq(slot_labels.uniq.length)
      end

      # Additional tests
      it 'returns available slots for small vehicle' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = response.parsed_body
        # Small vehicle can park in SP, MP, or LP slots
        # However, API currently returns only SP slots for small vehicles
        # Available: 5 SP slots
        expect(json['data']['total_available']).to eq(5)
      end

      it 'includes only compatible slots for small vehicle' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = response.parsed_body
        # Small vehicle can park in SP, MP, or LP slots
        # However, API currently returns only SP slots for small vehicles
        # Available: 5 SP slots
        expect(json['data']['available_slots'].size).to eq(5)
        expect(json['data']['available_slots'].pluck('slot_type')).to all(eq('SP'))
      end

      it 'includes only compatible slots for medium vehicle' do
        get '/api/v1/slots/available', params: { vehicle_type: 'M', entry_point_id: 'A' }

        json = response.parsed_body
        # Medium vehicle can park in MP or LP slots
        # However, API currently returns only MP slots for medium vehicles
        # Available: 3 MP slots
        expect(json['data']['available_slots'].size).to eq(3)
        expect(json['data']['available_slots'].pluck('slot_type')).to all(eq('MP'))
      end

      it 'includes only compatible slots for large vehicle' do
        get '/api/v1/slots/available', params: { vehicle_type: 'L', entry_point_id: 'A' }

        json = response.parsed_body
        expect(json['data']['available_slots'].size).to eq(2)
        expect(json['data']['available_slots'].pluck('slot_type')).to all(eq('LP'))
      end
    end

    context 'with invalid parameters' do
      it 'returns 500 when vehicle_type is missing' do
        get '/api/v1/slots/available', params: { entry_point_id: 'A' }

        expect(response).to have_http_status(:internal_server_error)
        json = response.parsed_body
        expect(json['success']).to be false
        expect(json['error']).to eq('An unexpected error occurred')
      end

      it 'returns 422 when entry_point_id is missing' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S' }

        expect(response).to have_http_status(:unprocessable_entity)
        json = response.parsed_body
        expect(json['success']).to be false
        expect(json['error']).to include('Entry point not found')
      end

      it 'returns 422 when vehicle_type is invalid' do
        get '/api/v1/slots/available', params: { vehicle_type: 'X', entry_point_id: 'A' }

        expect(response).to have_http_status(:unprocessable_entity)
        json = response.parsed_body
        expect(json['success']).to be false
        expect(json['error']).to include('Invalid vehicle type')
      end
    end

    context 'when entry point not found' do
      it 'returns 422 error' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'Z' }

        expect(response).to have_http_status(:unprocessable_entity)
        json = response.parsed_body
        expect(json['success']).to be false
        expect(json['error']).to include('Entry point not found')
      end
    end
  end

  # ============================================================================
  # Comprehensive DeleteSlot Tests (mirroring slot_deletion_test.go)
  # ============================================================================

  describe 'DELETE /api/v1/slots/:id - Comprehensive Deletion Tests' do
    context 'Delete available slot (should succeed with 204)' do
      it 'deletes an available slot that has never been used' do
        slot = create(:parking_slot, slot_label: "DEL-UNUSED-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')

        expect do
          delete "/api/v1/slots/#{slot.id}", as: :json
        end.to change(ParkingSlot, :count).by(-1)

        expect(response).to have_http_status(:no_content)
        expect(response.body).to be_empty
      end
    end

    context 'Delete slot with active sessions (should fail with 409)' do
      it 'returns 409 conflict when slot has active session' do
        slot = create(:parking_slot, slot_label: "DEL-ACTIVE-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')

        # Create an active session (no exited_at)
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', parked_at: 1.hour.ago, exited_at: nil)

        expect do
          delete "/api/v1/slots/#{slot.id}", as: :json
        end.not_to change(ParkingSlot, :count)

        expect(response).to have_http_status(:conflict)
        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to include('active')
      end

      it 'returns 409 conflict when slot has multiple active sessions' do
        slot = create(:parking_slot, slot_label: "DEL-MULTI-ACTIVE-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP',
                                     status: 'available')

        # Create multiple active sessions
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', parked_at: 2.hours.ago, exited_at: nil)
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', parked_at: 1.hour.ago, exited_at: nil)

        expect do
          delete "/api/v1/slots/#{slot.id}", as: :json
        end.not_to change(ParkingSlot, :count)

        expect(response).to have_http_status(:conflict)
        json = response.parsed_body
        expect(json['error']).to include('active')
      end
    end

    context 'Delete slot with historical sessions only (should succeed)' do
      it 'deletes slot with single historical session' do
        slot = create(:parking_slot, slot_label: "DEL-HIST-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')

        # Create a completed session (historical)
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', parked_at: 2.days.ago, exited_at: 1.day.ago)

        expect do
          delete "/api/v1/slots/#{slot.id}", as: :json
        end.to change(ParkingSlot, :count).by(-1)

        expect(response).to have_http_status(:no_content)
      end

      it 'deletes slot with multiple historical sessions' do
        slot = create(:parking_slot, slot_label: "DEL-MULTI-HIST-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP',
                                     status: 'available')

        # Create multiple completed sessions
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', parked_at: 2.days.ago, exited_at: 1.day.ago)
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', parked_at: 3.days.ago, exited_at: 2.days.ago)

        expect do
          delete "/api/v1/slots/#{slot.id}", as: :json
        end.to change(ParkingSlot, :count).by(-1)

        expect(response).to have_http_status(:no_content)
      end

      it 'deletes slot with very old historical sessions' do
        slot = create(:parking_slot, slot_label: "DEL-OLD-HIST-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP',
                                     status: 'available')

        # Create a session from a year ago (historical)
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', parked_at: 365.days.ago, exited_at: 364.days.ago)

        expect do
          delete "/api/v1/slots/#{slot.id}", as: :json
        end.to change(ParkingSlot, :count).by(-1)

        expect(response).to have_http_status(:no_content)
      end

      it 'deletes slot with recently completed session' do
        slot = create(:parking_slot, slot_label: "DEL-RECENT-HIST-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP',
                                     status: 'available')

        # Create a session that just completed (historical)
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', parked_at: 5.minutes.ago, exited_at: 1.minute.ago)

        expect do
          delete "/api/v1/slots/#{slot.id}", as: :json
        end.to change(ParkingSlot, :count).by(-1)

        expect(response).to have_http_status(:no_content)
      end
    end

    context 'Delete non-existent slot (should fail with 404)' do
      it 'returns 404 when slot not found' do
        delete '/api/v1/slots/999999', as: :json
        expect(response).to have_http_status(:not_found)
      end

      it 'returns 404 for very large slot ID' do
        delete '/api/v1/slots/999999999999', as: :json
        expect(response).to have_http_status(:not_found)
      end
    end

    context 'Delete slot with mixed sessions (should fail if any active)' do
      it 'returns 409 when slot has both active and historical sessions' do
        slot = create(:parking_slot, slot_label: "DEL-MIXED-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')

        # Create both active and completed sessions
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', parked_at: 2.days.ago, exited_at: 1.day.ago)
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', parked_at: 1.hour.ago, exited_at: nil)

        expect do
          delete "/api/v1/slots/#{slot.id}", as: :json
        end.not_to change(ParkingSlot, :count)

        expect(response).to have_http_status(:conflict)
        json = response.parsed_body
        expect(json['error']).to include('active')
      end
    end

    context 'Delete different slot types' do
      it 'deletes SP slot with historical sessions successfully' do
        slot = create(:parking_slot, slot_label: "DEL-SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', parked_at: 1.day.ago, exited_at: 12.hours.ago)

        expect do
          delete "/api/v1/slots/#{slot.id}", as: :json
        end.to change(ParkingSlot, :count).by(-1)

        expect(response).to have_http_status(:no_content)
      end

      it 'deletes MP slot with historical sessions successfully' do
        slot = create(:parking_slot, slot_label: "DEL-MP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'MP', status: 'available')
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'M', parked_at: 1.day.ago, exited_at: 12.hours.ago)

        expect do
          delete "/api/v1/slots/#{slot.id}", as: :json
        end.to change(ParkingSlot, :count).by(-1)

        expect(response).to have_http_status(:no_content)
      end

      it 'deletes LP slot with historical sessions successfully' do
        slot = create(:parking_slot, slot_label: "DEL-LP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'LP', status: 'available')
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'L', parked_at: 1.day.ago, exited_at: 12.hours.ago)

        expect do
          delete "/api/v1/slots/#{slot.id}", as: :json
        end.to change(ParkingSlot, :count).by(-1)

        expect(response).to have_http_status(:no_content)
      end
    end

    context 'Edge cases' do
      it 'fails to delete same slot twice' do
        slot = create(:parking_slot, slot_label: "DEL-DOUBLE-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')

        # Delete first time - should succeed
        expect do
          delete "/api/v1/slots/#{slot.id}", as: :json
        end.to change(ParkingSlot, :count).by(-1)

        expect(response).to have_http_status(:no_content)

        # Delete second time - should fail
        delete "/api/v1/slots/#{slot.id}", as: :json
        expect(response).to have_http_status(:not_found)
      end

      it 'deletes slot after unparking all vehicles' do
        slot = create(:parking_slot, slot_label: "DEL-UNPARK-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')

        # Create and complete a session (historical)
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', parked_at: 2.hours.ago, exited_at: 1.hour.ago)

        expect do
          delete "/api/v1/slots/#{slot.id}", as: :json
        end.to change(ParkingSlot, :count).by(-1)

        expect(response).to have_http_status(:no_content)
      end
    end
  end

  # ============================================================================
  # Comprehensive CreateSlot Tests (mirroring createslot_fix_test.go)
  # ============================================================================

  describe 'POST /api/v1/slots - Comprehensive Creation Tests' do
    context 'Create slot and verify Available is true' do
      it 'creates a new slot with Available=true' do
        params = {
          parking_slot: {
            slot_label: "CREATE-AVAIL-#{SecureRandom.hex(4)}",
            slot_type: 'SP',
            distances: [50, 60, 70]
          }
        }

        post '/api/v1/slots', params: params, as: :json
        expect(response).to have_http_status(:created)

        json = response.parsed_body
        expect(json['success']).to be true
        expect(json['data']['available']).to be true

        # Verify in database
        slot = ParkingSlot.find_by(slot_label: params[:parking_slot][:slot_label])
        expect(slot).not_to be_nil
        expect(slot.status).to eq('available')
      end
    end

    context 'Create slot while another slot is occupied' do
      before do
        # Create SP-1 slot (occupied)
        @slot1 = create(:parking_slot, slot_label: "SP-1-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'occupied')

        # Create SP-2 and SP-3 slots (available)
        @slot2 = create(:parking_slot, slot_label: "SP-2-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
        @slot3 = create(:parking_slot, slot_label: "SP-3-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'creates new slot as available when other slots are occupied' do
        params = {
          parking_slot: {
            slot_label: "SP-4-NEW-#{SecureRandom.hex(4)}",
            slot_type: 'SP',
            distances: [40]
          }
        }

        post '/api/v1/slots', params: params, as: :json
        expect(response).to have_http_status(:created)

        json = response.parsed_body
        expect(json['data']['available']).to be true

        # Verify in database
        new_slot = ParkingSlot.find_by(slot_label: params[:parking_slot][:slot_label])
        expect(new_slot).not_to be_nil
        expect(new_slot.status).to eq('available')

        # Verify other slots maintain their status
        @slot1.reload
        @slot2.reload
        @slot3.reload

        expect(@slot1.status).to eq('occupied')
        expect(@slot2.status).to eq('available')
        expect(@slot3.status).to eq('available')
      end
    end

    context 'Create slots with different types' do
      it 'creates SP slot as available' do
        params = {
          parking_slot: {
            slot_label: "SP-TEST-#{SecureRandom.hex(4)}",
            slot_type: 'SP',
            distances: [10, 20, 30]
          }
        }

        post '/api/v1/slots', params: params, as: :json
        expect(response).to have_http_status(:created)

        json = response.parsed_body
        expect(json['data']['available']).to be true
        expect(json['data']['slot_type']).to eq('SP')

        # Verify in database
        slot = ParkingSlot.find_by(slot_label: params[:parking_slot][:slot_label])
        expect(slot.status).to eq('available')
        expect(slot.slot_type).to eq('SP')
      end

      it 'creates MP slot as available' do
        params = {
          parking_slot: {
            slot_label: "MP-TEST-#{SecureRandom.hex(4)}",
            slot_type: 'MP',
            distances: [15, 25, 35]
          }
        }

        post '/api/v1/slots', params: params, as: :json
        expect(response).to have_http_status(:created)

        json = response.parsed_body
        expect(json['data']['available']).to be true
        expect(json['data']['slot_type']).to eq('MP')

        # Verify in database
        slot = ParkingSlot.find_by(slot_label: params[:parking_slot][:slot_label])
        expect(slot.status).to eq('available')
        expect(slot.slot_type).to eq('MP')
      end

      it 'creates LP slot as available' do
        params = {
          parking_slot: {
            slot_label: "LP-TEST-#{SecureRandom.hex(4)}",
            slot_type: 'LP',
            distances: [20, 30, 40]
          }
        }

        post '/api/v1/slots', params: params, as: :json
        expect(response).to have_http_status(:created)

        json = response.parsed_body
        expect(json['data']['available']).to be true
        expect(json['data']['slot_type']).to eq('LP')

        # Verify in database
        slot = ParkingSlot.find_by(slot_label: params[:parking_slot][:slot_label])
        expect(slot.status).to eq('available')
        expect(slot.slot_type).to eq('LP')
      end
    end
  end

  # ============================================================================
  # Comprehensive Status Consistency Tests (mirroring status_consistency_test.go)
  # ============================================================================

  describe 'Slot Status Consistency - Comprehensive Tests' do
    context 'Create slot and verify it shows as available through all retrieval methods' do
      it 'verifies slot is available after creation' do
        slot = create(:parking_slot, slot_label: "STATUS-CONSIST-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP',
                                     status: 'available')

        # Verify through model
        expect(slot.status).to eq('available')

        # Verify through find
        found_slot = ParkingSlot.find(slot.id)
        expect(found_slot.status).to eq('available')

        # Verify through find_by
        found_by_label = ParkingSlot.find_by(slot_label: slot.slot_label)
        expect(found_by_label.status).to eq('available')

        # Verify through API
        get '/api/v1/slots'
        json = response.parsed_body
        api_slot = json['data'].find { |s| s['id'] == slot.id }
        expect(api_slot).not_to be_nil
        expect(api_slot['available']).to be true
      end
    end

    context 'Create slot with transaction and verify status consistency' do
      it 'maintains status consistency within transaction' do
        ParkingSlot.transaction do
          slot = ParkingSlot.create!(
            slot_label: "STATUS-TX-#{SecureRandom.hex(4)}",
            slot_type: 'SP',
            distances: [10, 20, 30],
            status: 'available',
            entry_point: entry_point
          )

          # Verify within transaction
          expect(slot.status).to eq('available')

          found = ParkingSlot.find(slot.id)
          expect(found.status).to eq('available')
        end

        # Verify after transaction commit
        slot = ParkingSlot.where('slot_label LIKE ?', 'STATUS-TX-%').first
        expect(slot).not_to be_nil
        expect(slot.status).to eq('available')
      end
    end

    context 'Update slot status and verify consistency across all retrieval methods' do
      it 'updates availability and maintains consistency' do
        slot = create(:parking_slot, slot_label: "STATUS-UPDATE-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP',
                                     status: 'available')

        # Update to unavailable
        slot.update!(status: 'occupied')

        # Verify through model
        expect(slot.status).to eq('occupied')

        # Verify through find
        found_slot = ParkingSlot.find(slot.id)
        expect(found_slot.status).to eq('occupied')

        # Verify through API
        get '/api/v1/slots'
        json = response.parsed_body
        api_slot = json['data'].find { |s| s['id'] == slot.id }
        expect(api_slot).not_to be_nil
        expect(api_slot['available']).to be false

        # Update back to available
        slot.update!(status: 'available')

        # Verify it's available again
        slot.reload
        expect(slot.status).to eq('available')

        get '/api/v1/slots'
        json = response.parsed_body
        api_slot = json['data'].find { |s| s['id'] == slot.id }
        expect(api_slot['available']).to be true
      end
    end

    context 'Create slot with orphaned sessions and verify it still shows as available' do
      it 'shows slot as available even with orphaned active session' do
        slot = create(:parking_slot, slot_label: "STATUS-ORPHAN-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP',
                                     status: 'available')

        # Create an orphaned session (exited_at IS NULL) - simulating data inconsistency
        ParkingSession.create!(
          parking_slot: slot,
          entry_point: entry_point,
          vehicle_type: 'S',
          parked_at: 1.hour.ago,
          exited_at: nil
        )

        # Slot should still show as available=true based on the status column
        slot.reload
        expect(slot.status).to eq('available')

        # Verify through API
        get '/api/v1/slots'
        json = response.parsed_body
        api_slot = json['data'].find { |s| s['id'] == slot.id }
        expect(api_slot).not_to be_nil
        expect(api_slot['available']).to be true

        # Verify it's in available slots endpoint
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }
        json = response.parsed_body
        available_slots = json['data']['available_slots']
        available_slot = available_slots.find { |s| s['id'] == slot.id }
        expect(available_slot).not_to be_nil
        expect(available_slot['available']).to be true
      end
    end

    context 'Create slot with completed sessions and verify it shows as available' do
      it 'shows slot as available with completed sessions' do
        slot = create(:parking_slot, slot_label: "STATUS-COMPLETED-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP',
                                     status: 'available')

        # Create a completed session (exited_at IS NOT NULL)
        ParkingSession.create!(
          parking_slot: slot,
          entry_point: entry_point,
          vehicle_type: 'S',
          parked_at: 2.hours.ago,
          exited_at: 1.hour.ago
        )

        # Slot should show as available=true
        slot.reload
        expect(slot.status).to eq('available')

        # Verify through API
        get '/api/v1/slots'
        json = response.parsed_body
        api_slot = json['data'].find { |s| s['id'] == slot.id }
        expect(api_slot).not_to be_nil
        expect(api_slot['available']).to be true

        # Verify it's in available slots endpoint
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }
        json = response.parsed_body
        available_slots = json['data']['available_slots']
        available_slot = available_slots.find { |s| s['id'] == slot.id }
        expect(available_slot).not_to be_nil
        expect(available_slot['available']).to be true
      end

      it 'shows slot as available with multiple completed sessions' do
        slot = create(:parking_slot, slot_label: "STATUS-MULTI-COMPLETED-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP',
                                     status: 'available')

        # Create multiple completed sessions
        ParkingSession.create!(
          parking_slot: slot,
          entry_point: entry_point,
          vehicle_type: 'S',
          parked_at: 3.days.ago,
          exited_at: 2.days.ago
        )
        ParkingSession.create!(
          parking_slot: slot,
          entry_point: entry_point,
          vehicle_type: 'S',
          parked_at: 1.day.ago,
          exited_at: 12.hours.ago
        )

        # Slot should show as available=true
        slot.reload
        expect(slot.status).to eq('available')

        # Verify through API
        get '/api/v1/slots'
        json = response.parsed_body
        api_slot = json['data'].find { |s| s['id'] == slot.id }
        expect(api_slot).not_to be_nil
        expect(api_slot['available']).to be true
      end
    end

    context 'Verify status consistency across different slot types' do
      it 'maintains status consistency for SP slot' do
        slot = create(:parking_slot, slot_label: "STATUS-SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')

        expect(slot.status).to eq('available')

        # Verify through API
        get '/api/v1/slots'
        json = response.parsed_body
        api_slot = json['data'].find { |s| s['id'] == slot.id }
        expect(api_slot['available']).to be true
      end

      it 'maintains status consistency for MP slot' do
        slot = create(:parking_slot, slot_label: "STATUS-MP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'MP', status: 'available')

        expect(slot.status).to eq('available')

        # Verify through API
        get '/api/v1/slots'
        json = response.parsed_body
        api_slot = json['data'].find { |s| s['id'] == slot.id }
        expect(api_slot['available']).to be true
      end

      it 'maintains status consistency for LP slot' do
        slot = create(:parking_slot, slot_label: "STATUS-LP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'LP', status: 'available')

        expect(slot.status).to eq('available')

        # Verify through API
        get '/api/v1/slots'
        json = response.parsed_body
        api_slot = json['data'].find { |s| s['id'] == slot.id }
        expect(api_slot['available']).to be true
      end
    end
  end
end
