require 'rails_helper'

RSpec.describe 'Api::V1::EntryPointsController - Entry Points (Newman Scenarios)', type: :request do
  let(:entry_point) { create(:entry_point, identifier: 'A') }

  # ============================================================================
  # NEWMAN SCENARIO TESTS - MIRRORING NEWMAN TEST COLLECTION
  # ============================================================================

  describe 'Entry Points - Newman Scenarios' do
    # ============================================================================
    # SCENARIO 1: List Entry Points
    # ============================================================================

    context 'when listing entry points' do
      before do
        @entry_point1 = create(:entry_point, identifier: 'A', name: 'Main Entrance')
        @entry_point2 = create(:entry_point, identifier: 'B', name: 'Side Entrance')
      end

      it 'returns HTTP 200 OK' do
        get '/api/v1/entry_points', as: :json
        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        get '/api/v1/entry_points', as: :json
        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field as an array' do
        get '/api/v1/entry_points', as: :json
        json = response.parsed_body
        expect(json['data']).to be_an(Array)
      end

      it 'returns all entry points' do
        get '/api/v1/entry_points', as: :json
        json = response.parsed_body
        expect(json['data'].length).to be >= 2
      end
    end

    # ============================================================================
    # SCENARIO 2: Create Entry Point
    # ============================================================================

    context 'when creating entry point with valid data' do
      it 'returns HTTP 201 Created' do
        post '/api/v1/entry_points', params: {
          entry_point: {
            identifier: 'C',
            name: 'Test Entrance'
          }
        }, as: :json

        expect(response).to have_http_status(:created)
      end

      it 'returns success field as true' do
        post '/api/v1/entry_points', params: {
          entry_point: {
            identifier: 'C',
            name: 'Test Entrance'
          }
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with created entry point' do
        post '/api/v1/entry_points', params: {
          entry_point: {
            identifier: 'C',
            name: 'Test Entrance'
          }
        }, as: :json

        json = response.parsed_body
        expect(json['data']['identifier']).to eq('C')
        expect(json['data']['name']).to eq('Test Entrance')
      end

      it 'creates entry point in database' do
        expect do
          post '/api/v1/entry_points', params: {
            entry_point: {
              identifier: 'C',
              name: 'Test Entrance'
            }
          }, as: :json
        end.to change(EntryPoint, :count).by(1)
      end
    end

    # ============================================================================
    # SCENARIO 3: Get Entry Point by ID
    # ============================================================================

    context 'when getting entry point by ID' do
      before do
        @entry_point = create(:entry_point, identifier: 'A', name: 'Main Entrance')
      end

      it 'returns HTTP 200 OK' do
        get "/api/v1/entry_points/#{@entry_point.id}", as: :json
        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        get "/api/v1/entry_points/#{@entry_point.id}", as: :json
        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with entry point details' do
        get "/api/v1/entry_points/#{@entry_point.id}", as: :json
        json = response.parsed_body
        expect(json['data']['id']).to eq(@entry_point.id)
        expect(json['data']['identifier']).to eq('A')
        expect(json['data']['name']).to eq('Main Entrance')
      end
    end

    # ============================================================================
    # SCENARIO 4: Update Entry Point
    # ============================================================================

    context 'when updating entry point with valid data' do
      before do
        @entry_point = create(:entry_point, identifier: 'A', name: 'Main Entrance')
      end

      it 'returns HTTP 200 OK' do
        put "/api/v1/entry_points/#{@entry_point.id}", params: {
          entry_point: {
            name: 'Updated Entrance'
          }
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        put "/api/v1/entry_points/#{@entry_point.id}", params: {
          entry_point: {
            name: 'Updated Entrance'
          }
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with updated entry point' do
        put "/api/v1/entry_points/#{@entry_point.id}", params: {
          entry_point: {
            name: 'Updated Entrance'
          }
        }, as: :json

        json = response.parsed_body
        expect(json['data']['name']).to eq('Updated Entrance')
      end

      it 'updates entry point in database' do
        put "/api/v1/entry_points/#{@entry_point.id}", params: {
          entry_point: {
            name: 'Updated Entrance'
          }
        }, as: :json

        @entry_point.reload
        expect(@entry_point.name).to eq('Updated Entrance')
      end
    end

    # ============================================================================
    # SCENARIO 5: Delete Entry Point
    # ============================================================================

    context 'when deleting entry point' do
      before do
        @entry_point = create(:entry_point, identifier: 'A', name: 'Main Entrance')
      end

      it 'returns HTTP 204 No Content' do
        delete "/api/v1/entry_points/#{@entry_point.id}", as: :json
        expect(response).to have_http_status(:no_content)
      end

      it 'returns empty body' do
        delete "/api/v1/entry_points/#{@entry_point.id}", as: :json
        expect(response.body).to be_empty
      end

      it 'removes entry point from database' do
        expect do
          delete "/api/v1/entry_points/#{@entry_point.id}", as: :json
        end.to change(EntryPoint, :count).by(-1)
      end

      it 'entry point cannot be found after deletion' do
        delete "/api/v1/entry_points/#{@entry_point.id}", as: :json
        expect { EntryPoint.find(@entry_point.id) }.to raise_error(ActiveRecord::RecordNotFound)
      end
    end

    # ============================================================================
    # SCENARIO 6: Create Entry Point - Missing Wrapper
    # ============================================================================

    context 'when creating entry point without wrapper' do
      it 'returns HTTP 201 Created (API accepts both wrapped and unwrapped parameters)' do
        post '/api/v1/entry_points', params: {
          identifier: 'C',
          name: 'Test Entrance'
        }, as: :json

        expect(response).to have_http_status(:created)
      end

      it 'returns success field as true (API accepts both wrapped and unwrapped parameters)' do
        post '/api/v1/entry_points', params: {
          identifier: 'C',
          name: 'Test Entrance'
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with created entry point (API accepts both wrapped and unwrapped parameters)' do
        post '/api/v1/entry_points', params: {
          identifier: 'C',
          name: 'Test Entrance'
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('data')
        expect(json['data']['identifier']).to eq('C')
        expect(json['data']['name']).to eq('Test Entrance')
      end
    end

    # ============================================================================
    # SCENARIO 7: Create Entry Point - Missing Identifier
    # ============================================================================

    context 'when creating entry point without identifier' do
      it 'returns HTTP 400 Bad Request or 422 Unprocessable Entity' do
        post '/api/v1/entry_points', params: {
          entry_point: {
            name: 'Test Entrance'
          }
        }, as: :json

        expect(response).to have_http_status(:bad_request).or have_http_status(:unprocessable_entity)
      end

      it 'returns success field as false' do
        post '/api/v1/entry_points', params: {
          entry_point: {
            name: 'Test Entrance'
          }
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        post '/api/v1/entry_points', params: {
          entry_point: {
            name: 'Test Entrance'
          }
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'does not create entry point in database' do
        expect do
          post '/api/v1/entry_points', params: {
            entry_point: {
              name: 'Test Entrance'
            }
          }, as: :json
        end.not_to change(EntryPoint, :count)
      end
    end

    # ============================================================================
    # SCENARIO 8: Create Entry Point - Missing Name
    # ============================================================================

    context 'when creating entry point without name' do
      it 'returns HTTP 400 Bad Request or 422 Unprocessable Entity' do
        post '/api/v1/entry_points', params: {
          entry_point: {
            identifier: 'C'
          }
        }, as: :json

        expect(response).to have_http_status(:bad_request).or have_http_status(:unprocessable_entity)
      end

      it 'returns success field as false' do
        post '/api/v1/entry_points', params: {
          entry_point: {
            identifier: 'C'
          }
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        post '/api/v1/entry_points', params: {
          entry_point: {
            identifier: 'C'
          }
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'does not create entry point in database' do
        expect do
          post '/api/v1/entry_points', params: {
            entry_point: {
              identifier: 'C'
            }
          }, as: :json
        end.not_to change(EntryPoint, :count)
      end
    end

    # ============================================================================
    # SCENARIO 9: Create Entry Point - Duplicate Identifier
    # ============================================================================

    context 'when creating entry point with duplicate identifier' do
      before do
        create(:entry_point, identifier: 'A', name: 'Main Entrance')
      end

      it 'returns HTTP 409 Conflict or 422 Unprocessable Entity' do
        post '/api/v1/entry_points', params: {
          entry_point: {
            identifier: 'A',
            name: 'Duplicate Entrance'
          }
        }, as: :json

        expect(response).to have_http_status(:conflict).or have_http_status(:unprocessable_entity)
      end

      it 'returns success field as false' do
        post '/api/v1/entry_points', params: {
          entry_point: {
            identifier: 'A',
            name: 'Duplicate Entrance'
          }
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        post '/api/v1/entry_points', params: {
          entry_point: {
            identifier: 'A',
            name: 'Duplicate Entrance'
          }
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'does not create entry point in database' do
        expect do
          post '/api/v1/entry_points', params: {
            entry_point: {
              identifier: 'A',
              name: 'Duplicate Entrance'
            }
          }, as: :json
        end.not_to change(EntryPoint, :count)
      end
    end

    # ============================================================================
    # SCENARIO 10: Update Entry Point - Not Found
    # ============================================================================

    context 'when updating non-existent entry point' do
      it 'returns HTTP 404 Not Found' do
        put '/api/v1/entry_points/999999', params: {
          entry_point: {
            name: 'Updated Entrance'
          }
        }, as: :json

        expect(response).to have_http_status(:not_found)
      end

      it 'returns success field as false' do
        put '/api/v1/entry_points/999999', params: {
          entry_point: {
            name: 'Updated Entrance'
          }
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        put '/api/v1/entry_points/999999', params: {
          entry_point: {
            name: 'Updated Entrance'
          }
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'error message mentions not found' do
        put '/api/v1/entry_points/999999', params: {
          entry_point: {
            name: 'Updated Entrance'
          }
        }, as: :json

        json = response.parsed_body
        expect(json['error'].downcase).to include('not found')
      end
    end

    # ============================================================================
    # SCENARIO 11: Delete Entry Point - Not Found
    # ============================================================================

    context 'when deleting non-existent entry point' do
      it 'returns HTTP 404 Not Found' do
        delete '/api/v1/entry_points/999999', as: :json
        expect(response).to have_http_status(:not_found)
      end

      it 'returns success field as false' do
        delete '/api/v1/entry_points/999999', as: :json
        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        delete '/api/v1/entry_points/999999', as: :json
        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'error message mentions not found' do
        delete '/api/v1/entry_points/999999', as: :json
        json = response.parsed_body
        expect(json['error'].downcase).to include('not found')
      end

      it 'does not change entry point count' do
        expect do
          delete '/api/v1/entry_points/999999', as: :json
        end.not_to change(EntryPoint, :count)
      end
    end

    # ============================================================================
    # SCENARIO 12: Get Entry Point by ID - Not Found
    # ============================================================================

    context 'when getting non-existent entry point' do
      it 'returns HTTP 404 Not Found' do
        get '/api/v1/entry_points/999999', as: :json
        expect(response).to have_http_status(:not_found)
      end

      it 'returns success field as false' do
        get '/api/v1/entry_points/999999', as: :json
        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        get '/api/v1/entry_points/999999', as: :json
        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'error message mentions not found' do
        get '/api/v1/entry_points/999999', as: :json
        json = response.parsed_body
        expect(json['error'].downcase).to include('not found')
      end
    end
  end
end
