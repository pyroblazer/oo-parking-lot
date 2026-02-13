require 'rails_helper'

RSpec.describe 'Api::V1::EntryPointsController', type: :request do
  describe 'GET /api/v1/entry_points' do
    before do
      # Clear existing entry points to ensure clean state
      EntryPoint.delete_all
      # Create entry points with specific identifiers
      create(:entry_point, identifier: 'A', name: 'Entry Point A')
      create(:entry_point, identifier: 'B', name: 'Entry Point B')
      create(:entry_point, identifier: 'C', name: 'Entry Point C')
    end

    # Postman collection tests
    it 'returns status 200' do
      get '/api/v1/entry_points', as: :json

      expect(response).to have_http_status(:ok)
    end

    it 'returns JSON content type' do
      get '/api/v1/entry_points', as: :json

      expect(response.content_type).to include('application/json')
    end

    it 'returns success field' do
      get '/api/v1/entry_points', as: :json

      json = JSON.parse(response.body)
      expect(json['success']).to be true
    end

    it 'returns data field' do
      get '/api/v1/entry_points', as: :json

      json = JSON.parse(response.body)
      expect(json['data']).to be_present
    end

    it 'returns data as array' do
      get '/api/v1/entry_points', as: :json

      json = JSON.parse(response.body)
      expect(json['data']).to be_an(Array)
    end

    it 'returns at least one entry point' do
      get '/api/v1/entry_points', as: :json

      json = JSON.parse(response.body)
      expect(json['data'].length).to be >= 1
    end

    it 'returns entry points with required fields' do
      get '/api/v1/entry_points', as: :json

      json = JSON.parse(response.body)
      json['data'].each do |entry_point|
        expect(entry_point).to have_key('id')
        expect(entry_point).to have_key('identifier')
        expect(entry_point).to have_key('name')
        expect(entry_point).to have_key('created_at')
        expect(entry_point).to have_key('updated_at')
      end
    end

    it 'returns valid entry point identifiers' do
      get '/api/v1/entry_points', as: :json

      json = JSON.parse(response.body)
      valid_identifiers = %w[A B C]
      json['data'].each do |entry_point|
        expect(valid_identifiers).to include(entry_point['identifier'])
      end
    end

    it 'returns no duplicate identifiers' do
      get '/api/v1/entry_points', as: :json

      json = JSON.parse(response.body)
      identifiers = json['data'].map { |ep| ep['identifier'] }
      expect(identifiers.length).to eq(identifiers.uniq.length)
    end

    # Additional tests
    it 'returns entry points in order' do
      get '/api/v1/entry_points', as: :json

      json = JSON.parse(response.body)
      identifiers = json['data'].map { |ep| ep['identifier'] }
      expect(identifiers).to eq(%w[A B C])
    end

    context 'when no entry points exist' do
      before do
        # Delete parking sessions first to avoid foreign key constraint violations
        ParkingSession.delete_all
        EntryPoint.delete_all
      end

      it 'returns empty array' do
        get '/api/v1/entry_points', as: :json

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['data']).to eq([])
      end
    end
  end

  describe 'POST /api/v1/entry_points' do
    context 'with valid parameters' do
      it 'creates a new entry point' do
        params = {
          entry_point: {
            identifier: 'F',
            name: 'Entry Point F'
          }
        }

        post '/api/v1/entry_points', params: params, as: :json
        expect(response).to have_http_status(:created)
      end

      it 'returns status 201' do
        params = {
          entry_point: {
            identifier: 'F',
            name: 'Entry Point F'
          }
        }

        post '/api/v1/entry_points', params: params, as: :json
        expect(response).to have_http_status(:created)
      end

      it 'returns JSON content type' do
        params = {
          entry_point: {
            identifier: 'F',
            name: 'Entry Point F'
          }
        }

        post '/api/v1/entry_points', params: params, as: :json
        expect(response.content_type).to include('application/json')
      end

      it 'returns success field' do
        params = {
          entry_point: {
            identifier: 'F',
            name: 'Entry Point F'
          }
        }

        post '/api/v1/entry_points', params: params, as: :json
        json = JSON.parse(response.body)
        expect(json['success']).to be true
      end

      it 'returns data field' do
        params = {
          entry_point: {
            identifier: 'F',
            name: 'Entry Point F'
          }
        }

        post '/api/v1/entry_points', params: params, as: :json
        json = JSON.parse(response.body)
        expect(json['data']).to be_present
      end

      it 'returns data with required fields' do
        params = {
          entry_point: {
            identifier: 'F',
            name: 'Entry Point F'
          }
        }

        post '/api/v1/entry_points', params: params, as: :json
        json = JSON.parse(response.body)
        expect(json['data']).to have_key('id')
        expect(json['data']).to have_key('identifier')
        expect(json['data']).to have_key('name')
        expect(json['data']).to have_key('created_at')
        expect(json['data']).to have_key('updated_at')
      end
    end

    context 'with invalid parameters' do
      it 'returns 400 when identifier is missing' do
        params = {
          entry_point: {
            name: 'Entry Point Missing Identifier'
          }
        }

        post '/api/v1/entry_points', params: params, as: :json
        expect(response).to have_http_status(:bad_request)
      end

      it 'returns 400 when name is missing' do
        params = {
          entry_point: {
            identifier: 'X'
          }
        }

        post '/api/v1/entry_points', params: params, as: :json
        expect(response).to have_http_status(:bad_request)
      end
    end
  end

  describe 'PUT /api/v1/entry_points/:id' do
    before do
      @entry_point = create(:entry_point, identifier: 'A', name: 'Entry Point A')
    end

    context 'with valid parameters' do
      it 'updates an existing entry point' do
        params = {
          entry_point: {
            name: 'Updated Entry Point A'
          }
        }

        put "/api/v1/entry_points/#{@entry_point.id}", params: params, as: :json
        expect(response).to have_http_status(:ok)
      end

      it 'returns status 200' do
        params = {
          entry_point: {
            name: 'Updated Entry Point A'
          }
        }

        put "/api/v1/entry_points/#{@entry_point.id}", params: params, as: :json
        expect(response).to have_http_status(:ok)
      end

      it 'returns JSON content type' do
        params = {
          entry_point: {
            name: 'Updated Entry Point A'
          }
        }

        put "/api/v1/entry_points/#{@entry_point.id}", params: params, as: :json
        expect(response.content_type).to include('application/json')
      end

      it 'returns success field' do
        params = {
          entry_point: {
            name: 'Updated Entry Point A'
          }
        }

        put "/api/v1/entry_points/#{@entry_point.id}", params: params, as: :json
        json = JSON.parse(response.body)
        expect(json['success']).to be true
      end

      it 'returns data field' do
        params = {
          entry_point: {
            name: 'Updated Entry Point A'
          }
        }

        put "/api/v1/entry_points/#{@entry_point.id}", params: params, as: :json
        json = JSON.parse(response.body)
        expect(json['data']).to be_present
      end

      it 'returns data with required fields' do
        params = {
          entry_point: {
            name: 'Updated Entry Point A'
          }
        }

        put "/api/v1/entry_points/#{@entry_point.id}", params: params, as: :json
        json = JSON.parse(response.body)
        expect(json['data']).to have_key('id')
        expect(json['data']).to have_key('identifier')
        expect(json['data']).to have_key('name')
        expect(json['data']).to have_key('created_at')
        expect(json['data']).to have_key('updated_at')
      end
    end

    context 'with invalid parameters' do
      it 'returns 404 when entry point not found' do
        params = {
          entry_point: {
            name: 'Non-existent Entry Point'
          }
        }

        put '/api/v1/entry_points/999999', params: params, as: :json
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe 'DELETE /api/v1/entry_points/:id' do
    before do
      @entry_point = create(:entry_point, identifier: 'A', name: 'Entry Point A')
    end

    it 'deletes an existing entry point' do
      expect do
        delete "/api/v1/entry_points/#{@entry_point.id}",
               as: :json
      end.to change(EntryPoint, :count).by(-1)
    end

    it 'returns status 204' do
      delete "/api/v1/entry_points/#{@entry_point.id}", as: :json
      expect(response).to have_http_status(:no_content)
    end

    it 'returns empty body' do
      delete "/api/v1/entry_points/#{@entry_point.id}", as: :json
      expect(response.body).to be_empty
    end

    context 'with invalid parameters' do
      it 'returns 204 when entry point not found' do
        delete '/api/v1/entry_points/999999', as: :json
        expect(response).to have_http_status(:no_content)
      end
    end
  end
end
