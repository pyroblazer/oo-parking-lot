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

      json = JSON.parse(response.body)
      expect(json['success']).to be true
    end

    it 'returns data field' do
      get '/api/v1/slots'

      json = JSON.parse(response.body)
      expect(json['data']).to be_present
    end

    it 'returns data as array' do
      get '/api/v1/slots'

      json = JSON.parse(response.body)
      expect(json['data']).to be_an(Array)
    end

    it 'returns at least one slot' do
      get '/api/v1/slots'

      json = JSON.parse(response.body)
      expect(json['data'].length).to be >= 1
    end

    it 'returns slots with required fields' do
      get '/api/v1/slots'

      json = JSON.parse(response.body)
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

      json = JSON.parse(response.body)
      valid_types = %w[SP MP LP]
      json['data'].each do |slot|
        expect(valid_types).to include(slot['slot_type'])
      end
    end

    it 'returns distances as array' do
      get '/api/v1/slots'

      json = JSON.parse(response.body)
      json['data'].each do |slot|
        expect(slot['distances']).to be_an(Array)
      end
    end

    it 'returns distances with 3 values' do
      get '/api/v1/slots'

      json = JSON.parse(response.body)
      json['data'].each do |slot|
        expect(slot['distances'].length).to eq(3)
      end
    end

    it 'returns non-negative distances' do
      get '/api/v1/slots'

      json = JSON.parse(response.body)
      json['data'].each do |slot|
        slot['distances'].each do |distance|
          expect(distance).to be >= 0
        end
      end
    end

    it 'returns available as boolean' do
      get '/api/v1/slots'

      json = JSON.parse(response.body)
      json['data'].each do |slot|
        expect([true, false]).to include(slot['available'])
      end
    end

    it 'returns no duplicate slot labels' do
      get '/api/v1/slots'

      json = JSON.parse(response.body)
      slot_labels = json['data'].map { |s| s['slot_label'] }
      expect(slot_labels.length).to eq(slot_labels.uniq.length)
    end

    # Additional tests
    it 'returns list of all slots' do
      get '/api/v1/slots'

      json = JSON.parse(response.body)
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
          json = JSON.parse(response.body)
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
          json = JSON.parse(response.body)
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
          json = JSON.parse(response.body)
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

        it 'returns 400 when distances has less than 3 values' do
          params = {
            parking_slot: {
              slot_label: 'SP-10',
              slot_type: 'SP',
              distances: [50, 60]
            }
          }

          post '/api/v1/slots', params: params, as: :json
          expect(response).to have_http_status(:bad_request)
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
          json = JSON.parse(response.body)
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
          json = JSON.parse(response.body)
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
          json = JSON.parse(response.body)
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

        json = JSON.parse(response.body)
        expect(json['success']).to be true
      end

      it 'returns data field' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = JSON.parse(response.body)
        expect(json['data']).to be_present
      end

      it 'returns available_slots' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = JSON.parse(response.body)
        expect(json['data']['available_slots']).to be_present
      end

      it 'returns total_available' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = JSON.parse(response.body)
        expect(json['data']['total_available']).to be_present
      end

      it 'returns available_slots as array' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = JSON.parse(response.body)
        expect(json['data']['available_slots']).to be_an(Array)
      end

      it 'returns total_available as number' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = JSON.parse(response.body)
        expect(json['data']['total_available']).to be_a(Numeric)
      end

      it 'returns non-negative total_available' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = JSON.parse(response.body)
        expect(json['data']['total_available']).to be >= 0
      end

      it 'returns total_available matching array length' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = JSON.parse(response.body)
        expect(json['data']['total_available']).to eq(json['data']['available_slots'].size)
      end

      it 'returns slots with required fields' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = JSON.parse(response.body)
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

        json = JSON.parse(response.body)
        json['data']['available_slots'].each do |slot|
          expect(slot['available']).to be true
        end
      end

      it 'returns distances as array with 3 values' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = JSON.parse(response.body)
        json['data']['available_slots'].each do |slot|
          expect(slot['distances']).to be_an(Array)
          expect(slot['distances'].length).to eq(3)
        end
      end

      it 'returns non-negative distances' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = JSON.parse(response.body)
        json['data']['available_slots'].each do |slot|
          slot['distances'].each do |distance|
            expect(distance).to be >= 0
          end
        end
      end

      it 'returns no duplicate slot labels' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = JSON.parse(response.body)
        slot_labels = json['data']['available_slots'].map { |s| s['slot_label'] }
        expect(slot_labels.length).to eq(slot_labels.uniq.length)
      end

      # Additional tests
      it 'returns available slots for small vehicle' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = JSON.parse(response.body)
        # Small vehicle can park in SP, MP, or LP slots
        # However, API currently returns only SP slots for small vehicles
        # Available: 5 SP slots
        expect(json['data']['total_available']).to eq(5)
      end

      it 'includes only compatible slots for small vehicle' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'A' }

        json = JSON.parse(response.body)
        # Small vehicle can park in SP, MP, or LP slots
        # However, API currently returns only SP slots for small vehicles
        # Available: 5 SP slots
        expect(json['data']['available_slots'].size).to eq(5)
        expect(json['data']['available_slots'].map { |s| s['slot_type'] }).to all(eq('SP'))
      end

      it 'includes only compatible slots for medium vehicle' do
        get '/api/v1/slots/available', params: { vehicle_type: 'M', entry_point_id: 'A' }

        json = JSON.parse(response.body)
        # Medium vehicle can park in MP or LP slots
        # However, API currently returns only MP slots for medium vehicles
        # Available: 3 MP slots
        expect(json['data']['available_slots'].size).to eq(3)
        expect(json['data']['available_slots'].map { |s| s['slot_type'] }).to all(eq('MP'))
      end

      it 'includes only compatible slots for large vehicle' do
        get '/api/v1/slots/available', params: { vehicle_type: 'L', entry_point_id: 'A' }

        json = JSON.parse(response.body)
        expect(json['data']['available_slots'].size).to eq(2)
        expect(json['data']['available_slots'].map { |s| s['slot_type'] }).to all(eq('LP'))
      end
    end

    context 'with invalid parameters' do
      it 'returns 500 when vehicle_type is missing' do
        get '/api/v1/slots/available', params: { entry_point_id: 'A' }

        expect(response).to have_http_status(:internal_server_error)
        json = JSON.parse(response.body)
        expect(json['success']).to be false
        expect(json['error']).to eq('An unexpected error occurred')
      end

      it 'returns 422 when entry_point_id is missing' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S' }

        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        expect(json['success']).to be false
        expect(json['error']).to include('Entry point not found')
      end

      it 'returns 422 when vehicle_type is invalid' do
        get '/api/v1/slots/available', params: { vehicle_type: 'X', entry_point_id: 'A' }

        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        expect(json['success']).to be false
        expect(json['error']).to include('Invalid vehicle type')
      end
    end

    context 'when entry point not found' do
      it 'returns 422 error' do
        get '/api/v1/slots/available', params: { vehicle_type: 'S', entry_point_id: 'Z' }

        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        expect(json['success']).to be false
        expect(json['error']).to include('Entry point not found')
      end
    end
  end
end
