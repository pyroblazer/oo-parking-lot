require 'rails_helper'

RSpec.describe 'Api::V1::Parking::SessionsController', type: :request do
  let!(:entry_point) { create(:entry_point, identifier: 'A') }
  let!(:parking_slot) { create(:parking_slot, entry_point: entry_point, status: 'available') }

  describe 'POST /api/v1/sessions' do
    context 'with valid parameters' do
      it 'creates a parking session' do
        expect do
          post '/api/v1/sessions', params: {
            vehicle_type: 'S',
            entry_point_id: entry_point.identifier
          }, as: :json
        end.to change(ParkingSession, :count).by(1)
      end

      it 'returns session details' do
        post '/api/v1/sessions', params: {
          vehicle_type: 'S',
          entry_point_id: entry_point.identifier
        }, as: :json

        expect(response).to have_http_status(:created)
        json = response.parsed_body
        expect(json['data']['vehicle_type']).to eq('S')
        expect(json['data']['parking_slot']['slot_type']).to eq('SP')
        expect(json['data']['is_active']).to be true
        expect(json['data']['is_continuous']).to be false
        expect(json['data']['duration_hours']).to be_present
        expect(json['data']['total_fee']).to be_present
      end

      it 'includes session_id in response' do
        post '/api/v1/sessions', params: {
          vehicle_type: 'S',
          entry_point_id: entry_point.identifier
        }, as: :json

        json = response.parsed_body
        expect(json['data']['session_id']).to be_present
      end
    end

    context 'with invalid vehicle type' do
      it 'returns 400 error' do
        post '/api/v1/sessions', params: {
          vehicle_type: 'X',
          entry_point_id: entry_point.identifier
        }, as: :json

        expect(response).to have_http_status(:bad_request)
        json = response.parsed_body
        expect(json['error']).to be_present
      end
    end

    context 'with missing parameters' do
      it 'returns 400 error when vehicle_type is missing' do
        post '/api/v1/sessions', params: {
          entry_point_id: entry_point.identifier
        }, as: :json

        expect(response).to have_http_status(:bad_request)
      end

      it 'returns 400 error when entry_point_id is missing' do
        post '/api/v1/sessions', params: {
          vehicle_type: 'S'
        }, as: :json

        expect(response).to have_http_status(:bad_request)
      end

      it 'returns 422 error when entry_point_id is invalid (non-existent entry point)' do
        post '/api/v1/sessions', params: {
          vehicle_type: 'S',
          entry_point_id: 'INVALID'
        }, as: :json

        expect(response).to have_http_status(:unprocessable_content)
        json = response.parsed_body
        expect(json['error']).to include('Entry point not found')
      end
    end

    context 'when no slots available' do
      before do
        parking_slot.update!(status: 'occupied')
      end

      it 'returns 409 conflict' do
        post '/api/v1/sessions', params: {
          vehicle_type: 'S',
          entry_point_id: entry_point.identifier
        }, as: :json

        expect(response).to have_http_status(:conflict)
        json = response.parsed_body
        expect(json['error']).to include('No available parking slot')
      end
    end
  end

  describe 'POST /api/v1/sessions/:id/unpark' do
    let!(:session) do
      create(:parking_session,
             vehicle_type: 'S',
             parking_slot: parking_slot,
             entry_point: entry_point,
             parked_at: 2.hours.ago)
    end

    context 'with valid session' do
      it 'updates session with exit time' do
        post "/api/v1/sessions/#{session.id}/unpark", as: :json

        session.reload
        expect(session.exited_at).to be_present
      end

      it 'returns fee calculation' do
        post "/api/v1/sessions/#{session.id}/unpark", as: :json

        expect(response).to have_http_status(:ok)
        json = response.parsed_body
        expect(json['data']['total_fee']).to be_a(Numeric)
      end

      it 'returns fee breakdown' do
        post "/api/v1/sessions/#{session.id}/unpark", as: :json

        json = response.parsed_body
        expect(json['data']['fee_breakdown']).to be_present
        expect(json['data']['duration_hours']).to be_present
        expect(json['data']['fee_breakdown']['long_term']).to be_present
        expect(json['data']['fee_breakdown']['remaining']).to be_present
        expect(json['data']['fee_breakdown']['remaining']['hourly_rate']).to be_present
      end
    end

    context 'when session already unparked' do
      before do
        session.update!(exited_at: 1.hour.ago)
      end

      it 'returns 404 error' do
        post "/api/v1/sessions/#{session.id}/unpark", as: :json

        expect(response).to have_http_status(:not_found)
        json = response.parsed_body
        expect(json['error']).to include('already unparked')
      end
    end

    context 'when session not found' do
      it 'returns 404 error' do
        post '/api/v1/sessions/nonexistent-id/unpark', as: :json

        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe 'GET /api/v1/sessions/:id' do
    let!(:session) do
      create(:parking_session,
             vehicle_type: 'S',
             parking_slot: parking_slot,
             entry_point: entry_point,
             parked_at: 2.hours.ago)
    end

    context 'with valid session' do
      it 'returns session details' do
        get "/api/v1/sessions/#{session.id}", as: :json

        expect(response).to have_http_status(:ok)
        json = response.parsed_body
        expect(json['data']['session_id']).to eq(session.id)
        expect(json['data']['vehicle_type']).to eq('S')
        expect(json['data']['is_active']).to be true
        expect(json['data']['is_continuous']).to be false
        expect(json['data']['duration_hours']).to be_present
        expect(json['data']['total_fee']).to be_present
      end

      it 'includes parking slot information' do
        get "/api/v1/sessions/#{session.id}", as: :json

        json = response.parsed_body
        expect(json['data']['parking_slot']).to be_present
        expect(json['data']['parking_slot']['slot_label']).to eq(parking_slot.slot_label)
      end

      it 'includes entry point information' do
        get "/api/v1/sessions/#{session.id}", as: :json

        json = response.parsed_body
        expect(json['data']['entry_point']).to be_present
        expect(json['data']['entry_point']).to eq(entry_point.identifier)
      end
    end

    context 'when session not found' do
      it 'returns 404 error' do
        get '/api/v1/sessions/nonexistent-id', as: :json

        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe 'GET /api/v1/sessions' do
    before do
      create_list(:parking_session, 3,
                  vehicle_type: 'S',
                  parking_slot: parking_slot,
                  entry_point: entry_point,
                  parked_at: 2.hours.ago)
    end

    it 'returns list of sessions' do
      get '/api/v1/sessions', as: :json

      expect(response).to have_http_status(:ok)
      json = response.parsed_body
      expect(json['data']).to be_an(Array)
      expect(json['data'].length).to eq(3)
      json['data'].each do |session|
        expect(session).to have_key('is_active')
        expect(session).to have_key('is_continuous')
        expect(session).to have_key('duration_hours')
        expect(session).to have_key('total_fee')
      end
    end

    it 'orders sessions by parked_at desc' do
      get '/api/v1/sessions', as: :json

      json = response.parsed_body
      timestamps = json['data'].pluck('parked_at')
      expect(timestamps).to eq(timestamps.sort.reverse)
    end
  end
end
