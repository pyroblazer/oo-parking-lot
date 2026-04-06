require 'rails_helper'

RSpec.describe 'Api::V1::HealthController', type: :request do
  describe 'GET /health' do
    context 'when database is healthy' do
      it 'returns status 200' do
        get '/health', as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns success status' do
        get '/health', as: :json

        json = response.parsed_body
        expect(json['status']).to eq('ok')
      end

      it 'returns service name' do
        get '/health', as: :json

        json = response.parsed_body
        expect(json['service']).to eq('parking-lot-api')
      end

      it 'returns version' do
        get '/health', as: :json

        json = response.parsed_body
        expect(json['version']).to be_present
      end

      it 'returns timestamp in ISO format' do
        get '/health', as: :json

        json = response.parsed_body
        expect(json['timestamp']).to match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      end

      it 'returns checks object' do
        get '/health', as: :json

        json = response.parsed_body
        expect(json['checks']).to be_present
      end

      it 'returns database check status as healthy' do
        get '/health', as: :json

        json = response.parsed_body
        expect(json['checks']['database']['status']).to eq('healthy')
      end

      it 'returns JSON content type' do
        get '/health', as: :json

        expect(response.content_type).to include('application/json')
      end
    end

    context 'when database is unhealthy' do
      before do
        # Stub the controller's check_database method to simulate database failure
        allow_any_instance_of(Api::V1::HealthController).to receive(:check_database).and_return('unhealthy')
      end

      it 'returns status 503' do
        get '/health', as: :json

        expect(response).to have_http_status(:service_unavailable)
      end

      it 'returns error status' do
        get '/health', as: :json

        json = response.parsed_body
        expect(json['status']).to eq('error')
      end

      it 'returns database check status as unhealthy' do
        get '/health', as: :json

        json = response.parsed_body
        expect(json['checks']['database']['status']).to eq('unhealthy')
      end
    end
  end
end
