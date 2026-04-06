require 'rails_helper'

RSpec.describe 'Api::V1::InitializationsController', type: :request do
  describe 'POST /api/v1/initialize' do
    context 'with valid parameters' do
      let(:valid_params) do
        {
          entry_points: [
            { identifier: 'A', name: 'Entry Point A' },
            { identifier: 'B', name: 'Entry Point B' },
            { identifier: 'C', name: 'Entry Point C' }
          ],
          parking_slots: [
            { slot_label: 'SP-1', slot_type: 'SP', distances: [1, 4, 5] },
            { slot_label: 'SP-2', slot_type: 'SP', distances: [3, 2, 4] },
            { slot_label: 'SP-3', slot_type: 'SP', distances: [4, 1, 3] },
            { slot_label: 'MP-1', slot_type: 'MP', distances: [5, 2, 3] },
            { slot_label: 'MP-2', slot_type: 'MP', distances: [6, 3, 1] },
            { slot_label: 'LP-1', slot_type: 'LP', distances: [7, 4, 2] },
            { slot_label: 'LP-2', slot_type: 'LP', distances: [2, 5, 6] }
          ]
        }
      end

      # Postman collection tests
      it 'returns status 201' do
        post '/api/v1/initialize', params: valid_params, as: :json

        expect(response).to have_http_status(:created)
      end

      it 'returns JSON content type' do
        post '/api/v1/initialize', params: valid_params, as: :json

        expect(response.content_type).to include('application/json')
      end

      it 'returns success field' do
        post '/api/v1/initialize', params: valid_params, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field' do
        post '/api/v1/initialize', params: valid_params, as: :json

        json = response.parsed_body
        expect(json['data']).to be_present
      end

      it 'creates entry points' do
        expect do
          post '/api/v1/initialize', params: valid_params, as: :json
        end.to change(EntryPoint, :count).by(3)
      end

      it 'creates parking slots' do
        expect do
          post '/api/v1/initialize', params: valid_params, as: :json
        end.to change(ParkingSlot, :count).by(7)
      end

      it 'is idempotent - does not clear existing data' do
        # Create some existing data
        create(:entry_point, identifier: 'X', name: 'Old Entry Point')
        create(:parking_slot, slot_label: 'OLD-1', slot_type: 'SP', entry_point: nil)

        # Creates 3 new, doesn't delete old
        expect do
          post '/api/v1/initialize', params: valid_params, as: :json
        end.to change(EntryPoint, :count).by(3)
      end

      it 'returns entry_points_created field' do
        post '/api/v1/initialize', params: valid_params, as: :json

        json = response.parsed_body
        expect(json['data']).to have_key('entry_points_created')
      end

      it 'returns parking_slots_created field' do
        post '/api/v1/initialize', params: valid_params, as: :json

        json = response.parsed_body
        expect(json['data']).to have_key('parking_slots_created')
      end

      it 'returns message field' do
        post '/api/v1/initialize', params: valid_params, as: :json

        json = response.parsed_body
        expect(json['data']).to have_key('message')
      end

      it 'returns correct entry_points_created count' do
        post '/api/v1/initialize', params: valid_params, as: :json

        json = response.parsed_body
        expect(json['data']['entry_points_created']).to eq(3)
      end

      it 'returns correct parking_slots_created count' do
        post '/api/v1/initialize', params: valid_params, as: :json

        json = response.parsed_body
        expect(json['data']['parking_slots_created']).to eq(7)
      end

      it 'returns initialization message' do
        post '/api/v1/initialize', params: valid_params, as: :json

        json = response.parsed_body
        expect(json['data']['message']).to be_present
      end
    end

    context 'with partial parameters' do
      it 'creates only entry points when parking_slots not provided' do
        params = {
          entry_points: [
            { identifier: 'A', name: 'Entry Point A' }
          ]
        }

        expect do
          post '/api/v1/initialize', params: params, as: :json
        end.to change(EntryPoint, :count).by(1)
      end

      it 'creates only parking slots when entry_points not provided' do
        create(:entry_point, identifier: 'A', name: 'Entry Point A')

        params = {
          parking_slots: [
            { slot_label: 'SP-1', slot_type: 'SP', distances: [1, 2, 3] }
          ]
        }

        post '/api/v1/initialize', params: params, as: :json
        expect(response).to have_http_status(:unprocessable_content)
      end
    end

    context 'with invalid parameters' do
      it 'returns 400 when entry_points has missing identifier' do
        params = {
          entry_points: [
            { name: 'Entry Point Without Identifier' }
          ]
        }

        post '/api/v1/initialize', params: params, as: :json
        expect(response).to have_http_status(:bad_request)
      end

      it 'returns 422 when parking_slots has missing slot_label' do
        params = {
          parking_slots: [
            { slot_type: 'SP', distances: [1, 2, 3] }
          ]
        }

        post '/api/v1/initialize', params: params, as: :json
        expect(response).to have_http_status(:unprocessable_content)
      end

      it 'returns 422 when parking_slots has missing slot_type' do
        params = {
          parking_slots: [
            { slot_label: 'SP-1', distances: [1, 2, 3] }
          ]
        }

        post '/api/v1/initialize', params: params, as: :json
        expect(response).to have_http_status(:unprocessable_content)
      end

      it 'returns 422 when parking_slots has missing distances' do
        params = {
          parking_slots: [
            { slot_label: 'SP-1', slot_type: 'SP' }
          ]
        }

        post '/api/v1/initialize', params: params, as: :json
        expect(response).to have_http_status(:unprocessable_content)
      end
    end

    context 'with empty parameters' do
      it 'does not clear existing data' do
        # Create some existing data
        create(:entry_point, identifier: 'X', name: 'Old Entry Point')
        create(:parking_slot, slot_label: 'OLD-1', slot_type: 'SP', entry_point: nil)

        expect do
          post '/api/v1/initialize', params: {}, as: :json
        end.not_to change(EntryPoint, :count)
      end

      it 'returns 422 when nothing is created' do
        post '/api/v1/initialize', params: {}, as: :json

        expect(response).to have_http_status(:unprocessable_content)
        json = response.parsed_body
        expect(json['success']).to be false
        expect(json['error']).to be_present
      end
    end
  end
end
