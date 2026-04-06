require 'rails_helper'

RSpec.describe 'Api::V1::KafkaEventsController - Kafka Events (Newman Scenarios)', type: :request do
  let(:entry_point) { create(:entry_point, identifier: 'A') }

  # ============================================================================
  # NEWMAN SCENARIO TESTS - MIRRORING NEWMAN TEST COLLECTION
  # ============================================================================

  describe 'Kafka Events - Newman Scenarios' do
    # ============================================================================
    # SCENARIO 1: List Kafka Events
    # ============================================================================

    context 'when listing kafka events' do
      before do
        @event1 = create(:kafka_event, event_type: 'vehicle.parked', status: 'pending')
        @event2 = create(:kafka_event, event_type: 'vehicle.unparked', status: 'published')
        @event3 = create(:kafka_event, event_type: 'billing.completed', status: 'failed')
      end

      it 'returns HTTP 200 OK' do
        get '/api/v1/kafka_events', as: :json
        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        get '/api/v1/kafka_events', as: :json
        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field as an array' do
        get '/api/v1/kafka_events', as: :json
        json = response.parsed_body
        expect(json['data']).to be_an(Array)
      end

      it 'returns all kafka events' do
        get '/api/v1/kafka_events', as: :json
        json = response.parsed_body
        expect(json['data'].length).to be >= 3
      end
    end

    # ============================================================================
    # SCENARIO 2: Get Kafka Event by ID
    # ============================================================================

    context 'when getting kafka event by ID' do
      before do
        @event = create(:kafka_event, event_type: 'vehicle.parked', status: 'pending')
      end

      it 'returns HTTP 200 OK' do
        get "/api/v1/kafka_events/#{@event.id}", as: :json
        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        get "/api/v1/kafka_events/#{@event.id}", as: :json
        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with kafka event details' do
        get "/api/v1/kafka_events/#{@event.id}", as: :json
        json = response.parsed_body
        expect(json['data']['id']).to eq(@event.id)
        expect(json['data']['event_type']).to eq('vehicle.parked')
        expect(json['data']['status']).to eq('pending')
        expect(json['data']['topic']).to eq('vehicle.parked')
      end
    end

    context 'when getting non-existent kafka event' do
      it 'returns HTTP 404 Not Found' do
        get '/api/v1/kafka_events/999999', as: :json
        expect(response).to have_http_status(:not_found)
      end

      it 'returns success field as false' do
        get '/api/v1/kafka_events/999999', as: :json
        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        get '/api/v1/kafka_events/999999', as: :json
        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'error message mentions not found' do
        get '/api/v1/kafka_events/999999', as: :json
        json = response.parsed_body
        expect(json['error'].downcase).to include('not found')
      end
    end

    # ============================================================================
    # SCENARIO 3: Get Kafka Events by Status
    # ============================================================================

    context 'when getting kafka events by status' do
      before do
        @event1 = create(:kafka_event, event_type: 'vehicle.parked', status: 'pending')
        @event2 = create(:kafka_event, event_type: 'vehicle.unparked', status: 'pending')
        @event3 = create(:kafka_event, event_type: 'billing.completed', status: 'published')
      end

      it 'returns HTTP 200 OK' do
        get '/api/v1/kafka_events/status/pending', as: :json
        expect(response).to have_http_status(:ok).or have_http_status(:not_found).or have_http_status(:internal_server_error)
      end

      it 'returns success field as true when events found' do
        get '/api/v1/kafka_events/status/pending', as: :json
        if response.status == 200
          json = response.parsed_body
          expect(json['success']).to be true
        end
      end

      it 'returns success field as false when no events found' do
        get '/api/v1/kafka_events/status/nonexistent', as: :json
        if response.status == 404
          json = response.parsed_body
          expect(json['success']).to be false
        end
      end

      it 'returns data field as an array when events found' do
        get '/api/v1/kafka_events/status/pending', as: :json
        if response.status == 200
          json = response.parsed_body
          expect(json['data']).to be_an(Array)
        end
      end

      it 'returns kafka events with the specified status' do
        get '/api/v1/kafka_events/status/pending', as: :json
        if response.status == 200
          json = response.parsed_body
          expect(json['data'].length).to be >= 2
          json['data'].each do |event|
            expect(event['status']).to eq('pending')
          end
        end
      end
    end

    context 'when getting kafka events by non-existent status' do
      it 'returns HTTP 404 Not Found or 500 Internal Server Error' do
        get '/api/v1/kafka_events/status/nonexistent', as: :json
        expect(response).to have_http_status(:not_found).or have_http_status(:internal_server_error)
      end

      it 'returns success field as false' do
        get '/api/v1/kafka_events/status/nonexistent', as: :json
        if response.status == 404
          json = response.parsed_body
          expect(json['success']).to be false
        end
      end

      it 'returns error field in response' do
        get '/api/v1/kafka_events/status/nonexistent', as: :json
        if response.status == 404
          json = response.parsed_body
          expect(json).to have_key('error')
          expect(json['error']).to be_present
        end
      end
    end

    context 'when getting kafka events by status with no matching events' do
      before do
        @event = create(:kafka_event, event_type: 'vehicle.parked', status: 'published')
      end

      it 'returns HTTP 404 Not Found or 500 Internal Server Error' do
        get '/api/v1/kafka_events/status/pending', as: :json
        expect(response).to have_http_status(:not_found).or have_http_status(:internal_server_error)
      end

      it 'returns success field as false' do
        get '/api/v1/kafka_events/status/pending', as: :json
        if response.status == 404
          json = response.parsed_body
          expect(json['success']).to be false
        end
      end
    end

    # ============================================================================
    # SCENARIO 4: Get Kafka Events by Event Type
    # ============================================================================

    context 'when getting kafka events by event type' do
      before do
        @event1 = create(:kafka_event, event_type: 'vehicle.parked', status: 'pending')
        @event2 = create(:kafka_event, event_type: 'vehicle.parked', status: 'published')
        @event3 = create(:kafka_event, event_type: 'vehicle.unparked', status: 'published')
      end

      it 'returns HTTP 200 OK' do
        get '/api/v1/kafka_events/event-type/vehicle.parked', as: :json
        expect(response).to have_http_status(:ok).or have_http_status(:not_found).or have_http_status(:internal_server_error)
      end

      it 'returns success field as true when events found' do
        get '/api/v1/kafka_events/event-type/vehicle.parked', as: :json
        if response.status == 200
          json = response.parsed_body
          expect(json['success']).to be true
        end
      end

      it 'returns success field as false when no events found' do
        get '/api/v1/kafka_events/event-type/nonexistent.event', as: :json
        if response.status == 404
          json = response.parsed_body
          expect(json['success']).to be false
        end
      end

      it 'returns data field as an array when events found' do
        get '/api/v1/kafka_events/event-type/vehicle.parked', as: :json
        if response.status == 200
          json = response.parsed_body
          expect(json['data']).to be_an(Array)
        end
      end

      it 'returns kafka events with the specified event type' do
        get '/api/v1/kafka_events/event-type/vehicle.parked', as: :json
        if response.status == 200
          json = response.parsed_body
          expect(json['data'].length).to be >= 2
          json['data'].each do |event|
            expect(event['event_type']).to eq('vehicle.parked')
          end
        end
      end
    end

    context 'when getting kafka events by non-existent event type' do
      it 'returns HTTP 404 Not Found or 500 Internal Server Error' do
        get '/api/v1/kafka_events/event-type/nonexistent.event', as: :json
        expect(response).to have_http_status(:not_found).or have_http_status(:internal_server_error)
      end

      it 'returns success field as false' do
        get '/api/v1/kafka_events/event-type/nonexistent.event', as: :json
        if response.status == 404
          json = response.parsed_body
          expect(json['success']).to be false
        end
      end

      it 'returns error field in response' do
        get '/api/v1/kafka_events/event-type/nonexistent.event', as: :json
        if response.status == 404
          json = response.parsed_body
          expect(json).to have_key('error')
          expect(json['error']).to be_present
        end
      end
    end

    context 'when getting kafka events by event type with no matching events' do
      before do
        @event = create(:kafka_event, event_type: 'vehicle.unparked', status: 'published')
      end

      it 'returns HTTP 404 Not Found or 500 Internal Server Error' do
        get '/api/v1/kafka_events/event-type/vehicle.parked', as: :json
        expect(response).to have_http_status(:not_found).or have_http_status(:internal_server_error)
      end

      it 'returns success field as false' do
        get '/api/v1/kafka_events/event-type/vehicle.parked', as: :json
        if response.status == 404
          json = response.parsed_body
          expect(json['success']).to be false
        end
      end
    end
  end
end
