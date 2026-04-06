require 'rails_helper'

RSpec.describe 'Api::V1::HealthController - Health Check (Newman Scenarios)', type: :request do
  # ============================================================================
  # NEWMAN SCENARIO TESTS - MIRRORING NEWMAN TEST COLLECTION
  # ============================================================================

  describe 'Health Check - Newman Scenarios' do
    # ============================================================================
    # SCENARIO 1: Health Check
    # ============================================================================

    context 'when checking health status' do
      it 'returns HTTP 200 OK or 503 Service Unavailable' do
        get '/health', as: :json
        expect(response).to have_http_status(:ok).or have_http_status(:service_unavailable)
      end

      it 'returns success field as true when healthy' do
        get '/health', as: :json
        if response.status == 200
          json = response.parsed_body
          expect(json['success']).to be true
        end
      end

      it 'returns success field as false when unhealthy' do
        get '/health', as: :json
        if response.status == 503
          json = response.parsed_body
          expect(json['success']).to be false
        end
      end

      it 'returns data field with health status' do
        get '/health', as: :json
        json = response.parsed_body
        expect(json).to have_key('data')
        expect(json['data']).to be_present
      end

      it 'returns status field in data' do
        get '/health', as: :json
        json = response.parsed_body
        expect(json['data']).to have_key('status')
        expect(json['data']['status']).to eq('healthy').or eq('unhealthy')
      end

      it 'returns timestamp field in data' do
        get '/health', as: :json
        json = response.parsed_body
        expect(json['data']).to have_key('timestamp')
        expect(json['data']['timestamp']).to be_present
      end
    end
  end
end
