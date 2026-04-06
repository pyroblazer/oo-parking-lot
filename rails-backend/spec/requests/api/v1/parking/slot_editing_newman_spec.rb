require 'rails_helper'

RSpec.describe 'Api::V1::SlotsController - Slot Editing (Newman Scenarios)', type: :request do
  let(:entry_point) { create(:entry_point, identifier: 'A') }

  # ============================================================================
  # NEWMAN SCENARIO TESTS - MIRRORING NEWMAN TEST COLLECTION
  # ============================================================================

  describe 'PUT /api/v1/slots/:id - Newman Scenarios' do
    # ============================================================================
    # FULL UPDATE TESTS
    # ============================================================================

    context 'when doing full update with unwrapped format (frontend)' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns HTTP 200 OK' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-UNWRAPPED',
          slot_type: 'MP',
          distances: [15, 25, 35]
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-UNWRAPPED',
          slot_type: 'MP',
          distances: [15, 25, 35]
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with all updated values' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-UNWRAPPED',
          slot_type: 'MP',
          distances: [15, 25, 35]
        }, as: :json

        json = response.parsed_body
        expect(json['data']['slot_label']).to eq('UPDATED-UNWRAPPED')
        expect(json['data']['slot_type']).to eq('MP')
        expect(json['data']['distances']).to eq([15, 25, 35])
      end

      it 'updates the slot in database' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-UNWRAPPED',
          slot_type: 'MP',
          distances: [15, 25, 35]
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq('UPDATED-UNWRAPPED')
        expect(@slot.slot_type).to eq('MP')
        expect(@slot.distances).to eq([15, 25, 35])
      end
    end

    context 'when doing full update with wrapped format (Postman)' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns HTTP 200 OK' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-WRAPPED',
            slot_type: 'MP',
            distances: [15, 25, 35]
          }
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-WRAPPED',
            slot_type: 'MP',
            distances: [15, 25, 35]
          }
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with all updated values' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-WRAPPED',
            slot_type: 'MP',
            distances: [15, 25, 35]
          }
        }, as: :json

        json = response.parsed_body
        expect(json['data']['slot_label']).to eq('UPDATED-WRAPPED')
        expect(json['data']['slot_type']).to eq('MP')
        expect(json['data']['distances']).to eq([15, 25, 35])
      end

      it 'updates the slot in database' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-WRAPPED',
            slot_type: 'MP',
            distances: [15, 25, 35]
          }
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq('UPDATED-WRAPPED')
        expect(@slot.slot_type).to eq('MP')
        expect(@slot.distances).to eq([15, 25, 35])
      end
    end

    # ============================================================================
    # PARTIAL UPDATE TESTS - UNWRAPPED FORMAT
    # ============================================================================

    context 'when doing partial update with unwrapped format - slot_label only' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns HTTP 200 OK' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-PARTIAL-LABEL'
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-PARTIAL-LABEL'
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with updated slot_label' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-PARTIAL-LABEL'
        }, as: :json

        json = response.parsed_body
        expect(json['data']['slot_label']).to eq('UPDATED-PARTIAL-LABEL')
      end

      it 'updates only slot_label in database' do
        original_type = @slot.slot_type
        original_distances = @slot.distances

        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-PARTIAL-LABEL'
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq('UPDATED-PARTIAL-LABEL')
        expect(@slot.slot_type).to eq(original_type)
        expect(@slot.distances).to eq(original_distances)
      end
    end

    context 'when doing partial update with unwrapped format - slot_type only' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns HTTP 200 OK' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_type: 'MP'
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_type: 'MP'
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with updated slot_type' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_type: 'MP'
        }, as: :json

        json = response.parsed_body
        expect(json['data']['slot_type']).to eq('MP')
      end

      it 'updates only slot_type in database' do
        original_label = @slot.slot_label
        original_distances = @slot.distances

        put "/api/v1/slots/#{@slot.id}", params: {
          slot_type: 'MP'
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq(original_label)
        expect(@slot.slot_type).to eq('MP')
        expect(@slot.distances).to eq(original_distances)
      end
    end

    context 'when doing partial update with unwrapped format - distances only' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns HTTP 200 OK' do
        put "/api/v1/slots/#{@slot.id}", params: {
          distances: [100, 200, 300]
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        put "/api/v1/slots/#{@slot.id}", params: {
          distances: [100, 200, 300]
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with updated distances' do
        put "/api/v1/slots/#{@slot.id}", params: {
          distances: [100, 200, 300]
        }, as: :json

        json = response.parsed_body
        expect(json['data']['distances']).to eq([100, 200, 300])
      end

      it 'updates only distances in database' do
        original_label = @slot.slot_label
        original_type = @slot.slot_type

        put "/api/v1/slots/#{@slot.id}", params: {
          distances: [100, 200, 300]
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq(original_label)
        expect(@slot.slot_type).to eq(original_type)
        expect(@slot.distances).to eq([100, 200, 300])
      end
    end

    # ============================================================================
    # PARTIAL UPDATE TESTS - WRAPPED FORMAT
    # ============================================================================

    context 'when doing partial update with wrapped format - slot_label only' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns HTTP 200 OK' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-PARTIAL-LABEL-WRAPPED'
          }
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-PARTIAL-LABEL-WRAPPED'
          }
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with updated slot_label' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-PARTIAL-LABEL-WRAPPED'
          }
        }, as: :json

        json = response.parsed_body
        expect(json['data']['slot_label']).to eq('UPDATED-PARTIAL-LABEL-WRAPPED')
      end

      it 'updates only slot_label in database' do
        original_type = @slot.slot_type
        original_distances = @slot.distances

        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-PARTIAL-LABEL-WRAPPED'
          }
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq('UPDATED-PARTIAL-LABEL-WRAPPED')
        expect(@slot.slot_type).to eq(original_type)
        expect(@slot.distances).to eq(original_distances)
      end
    end

    context 'when doing partial update with wrapped format - slot_type only' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns HTTP 200 OK' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_type: 'MP'
          }
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_type: 'MP'
          }
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with updated slot_type' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_type: 'MP'
          }
        }, as: :json

        json = response.parsed_body
        expect(json['data']['slot_type']).to eq('MP')
      end

      it 'updates only slot_type in database' do
        original_label = @slot.slot_label
        original_distances = @slot.distances

        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_type: 'MP'
          }
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq(original_label)
        expect(@slot.slot_type).to eq('MP')
        expect(@slot.distances).to eq(original_distances)
      end
    end

    context 'when doing partial update with wrapped format - distances only' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns HTTP 200 OK' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            distances: [100, 200, 300]
          }
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            distances: [100, 200, 300]
          }
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with updated distances' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            distances: [100, 200, 300]
          }
        }, as: :json

        json = response.parsed_body
        expect(json['data']['distances']).to eq([100, 200, 300])
      end

      it 'updates only distances in database' do
        original_label = @slot.slot_label
        original_type = @slot.slot_type

        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            distances: [100, 200, 300]
          }
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq(original_label)
        expect(@slot.slot_type).to eq(original_type)
        expect(@slot.distances).to eq([100, 200, 300])
      end
    end

    # ============================================================================
    # ERROR HANDLING TESTS - NON-EXISTENT SLOT
    # ============================================================================

    context 'when updating non-existent slot' do
      it 'returns HTTP 404 Not Found' do
        put '/api/v1/slots/999999', params: {
          slot_label: 'UPDATED-NONEXISTENT'
        }, as: :json

        expect(response).to have_http_status(:not_found)
      end

      it 'returns success field as false' do
        put '/api/v1/slots/999999', params: {
          slot_label: 'UPDATED-NONEXISTENT'
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        put '/api/v1/slots/999999', params: {
          slot_label: 'UPDATED-NONEXISTENT'
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'error message mentions not found' do
        put '/api/v1/slots/999999', params: {
          slot_label: 'UPDATED-NONEXISTENT'
        }, as: :json

        json = response.parsed_body
        expect(json['error'].downcase).to include('not found')
      end

      it 'works with unwrapped format' do
        put '/api/v1/slots/999999', params: {
          slot_label: 'UPDATED-NONEXISTENT-UNWRAPPED'
        }, as: :json

        expect(response).to have_http_status(:not_found)
      end

      it 'works with wrapped format' do
        put '/api/v1/slots/999999', params: {
          parking_slot: {
            slot_label: 'UPDATED-NONEXISTENT-WRAPPED'
          }
        }, as: :json

        expect(response).to have_http_status(:not_found)
      end
    end

    # ============================================================================
    # ERROR HANDLING TESTS - INVALID SLOT TYPE
    # ============================================================================

    context 'when updating with invalid slot type' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns HTTP 400 Bad Request' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-INVALID-TYPE',
          slot_type: 'INVALID'
        }, as: :json

        expect(response).to have_http_status(:bad_request)
      end

      it 'returns success field as false' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-INVALID-TYPE',
          slot_type: 'INVALID'
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-INVALID-TYPE',
          slot_type: 'INVALID'
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'error message mentions slot type' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-INVALID-TYPE',
          slot_type: 'INVALID'
        }, as: :json

        json = response.parsed_body
        expect(json['error'].downcase).to include('slot type')
      end

      it 'error message mentions invalid' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-INVALID-TYPE',
          slot_type: 'INVALID'
        }, as: :json

        json = response.parsed_body
        expect(json['error'].downcase).to include('invalid')
      end

      it 'works with unwrapped format' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-INVALID-TYPE-UNWRAPPED',
          slot_type: 'INVALID-TYPE'
        }, as: :json

        expect(response).to have_http_status(:bad_request)
      end

      it 'works with wrapped format' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-INVALID-TYPE-WRAPPED',
            slot_type: 'INVALID-TYPE'
          }
        }, as: :json

        expect(response).to have_http_status(:bad_request)
      end
    end

    # ============================================================================
    # ERROR HANDLING TESTS - EMPTY FIELDS
    # ============================================================================

    context 'when updating with empty slot label' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns HTTP 400 Bad Request' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: ''
        }, as: :json

        expect(response).to have_http_status(:bad_request)
      end

      it 'returns success field as false' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: ''
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: ''
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'error message mentions slot label' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: ''
        }, as: :json

        json = response.parsed_body
        expect(json['error'].downcase).to include('slot label')
      end
    end

    context 'when updating with empty slot type' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns HTTP 400 Bad Request' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_type: ''
        }, as: :json

        expect(response).to have_http_status(:bad_request)
      end

      it 'returns success field as false' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_type: ''
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_type: ''
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'error message mentions slot type' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_type: ''
        }, as: :json

        json = response.parsed_body
        expect(json['error'].downcase).to include('slot type')
      end
    end

    # ============================================================================
    # EDGE CASE TESTS - INVALID SLOT IDS
    # ============================================================================

    context 'when updating with invalid slot ID - string ID' do
      it 'returns HTTP 404 Not Found' do
        put '/api/v1/slots/invalid', params: {
          slot_label: 'UPDATED-INVALID-ID'
        }, as: :json

        expect(response).to have_http_status(:not_found)
      end

      it 'returns success field as false' do
        put '/api/v1/slots/invalid', params: {
          slot_label: 'UPDATED-INVALID-ID'
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        put '/api/v1/slots/invalid', params: {
          slot_label: 'UPDATED-INVALID-ID'
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end
    end

    context 'when updating with invalid slot ID - zero ID' do
      it 'returns HTTP 404 Not Found' do
        put '/api/v1/slots/0', params: {
          slot_label: 'UPDATED-ZERO-ID'
        }, as: :json

        expect(response).to have_http_status(:not_found)
      end

      it 'returns success field as false' do
        put '/api/v1/slots/0', params: {
          slot_label: 'UPDATED-ZERO-ID'
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        put '/api/v1/slots/0', params: {
          slot_label: 'UPDATED-ZERO-ID'
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end
    end

    context 'when updating with invalid slot ID - negative ID' do
      it 'returns HTTP 404 Not Found' do
        put '/api/v1/slots/-1', params: {
          slot_label: 'UPDATED-NEGATIVE-ID'
        }, as: :json

        expect(response).to have_http_status(:not_found)
      end

      it 'returns success field as false' do
        put '/api/v1/slots/-1', params: {
          slot_label: 'UPDATED-NEGATIVE-ID'
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        put '/api/v1/slots/-1', params: {
          slot_label: 'UPDATED-NEGATIVE-ID'
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end
    end

    # ============================================================================
    # EDGE CASE TESTS - EMPTY DISTANCES ARRAY
    # ============================================================================

    context 'when updating with empty distances array' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns HTTP 200 OK (empty distances are accepted)' do
        put "/api/v1/slots/#{@slot.id}", params: {
          distances: []
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        put "/api/v1/slots/#{@slot.id}", params: {
          distances: []
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with empty distances' do
        put "/api/v1/slots/#{@slot.id}", params: {
          distances: []
        }, as: :json

        json = response.parsed_body
        expect(json['data']['distances']).to eq([])
      end

      it 'updates distances in database' do
        put "/api/v1/slots/#{@slot.id}", params: {
          distances: []
        }, as: :json

        @slot.reload
        expect(@slot.distances).to eq([])
      end
    end

    # ============================================================================
    # EDGE CASE TESTS - WRONG-SIZED DISTANCES ARRAY
    # ============================================================================

    context 'when updating with wrong-sized distances array' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns HTTP 200 OK (wrong size distances are accepted)' do
        put "/api/v1/slots/#{@slot.id}", params: {
          distances: [10, 20]
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        put "/api/v1/slots/#{@slot.id}", params: {
          distances: [10, 20]
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with wrong-sized distances' do
        put "/api/v1/slots/#{@slot.id}", params: {
          distances: [10, 20]
        }, as: :json

        json = response.parsed_body
        expect(json['data']['distances']).to eq([10, 20])
      end

      it 'updates distances in database' do
        put "/api/v1/slots/#{@slot.id}", params: {
          distances: [10, 20]
        }, as: :json

        @slot.reload
        expect(@slot.distances).to eq([10, 20])
      end
    end

    # ============================================================================
    # EDGE CASE TESTS - EMPTY REQUEST BODY
    # ============================================================================

    context 'when updating with empty request body' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns HTTP 200 OK (empty update is allowed)' do
        put "/api/v1/slots/#{@slot.id}", params: {}, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        put "/api/v1/slots/#{@slot.id}", params: {}, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'does not change the slot in database' do
        original_label = @slot.slot_label
        original_type = @slot.slot_type
        original_distances = @slot.distances

        put "/api/v1/slots/#{@slot.id}", params: {}, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq(original_label)
        expect(@slot.slot_type).to eq(original_type)
        expect(@slot.distances).to eq(original_distances)
      end
    end

    # ============================================================================
    # EDGE CASE TESTS - UPDATING WITH ACTIVE SESSIONS
    # ============================================================================

    context 'when updating slot with active parking sessions' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'occupied')
        create(:parking_session, parking_slot: @slot, entry_point: entry_point, vehicle_type: 'S', exited_at: nil)
      end

      it 'successfully updates the slot (editing is allowed even with active sessions)' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-WITH-ACTIVE-SESSION',
          slot_type: 'MP',
          distances: [15, 25, 35]
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-WITH-ACTIVE-SESSION',
          slot_type: 'MP',
          distances: [15, 25, 35]
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'updates the slot in database' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-WITH-ACTIVE-SESSION',
          slot_type: 'MP',
          distances: [15, 25, 35]
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq('UPDATED-WITH-ACTIVE-SESSION')
        expect(@slot.slot_type).to eq('MP')
        expect(@slot.distances).to eq([15, 25, 35])
      end

      it 'works with unwrapped format' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-ACTIVE-UNWRAPPED'
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'works with wrapped format' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-ACTIVE-WRAPPED'
          }
        }, as: :json

        expect(response).to have_http_status(:ok)
      end
    end

    # ============================================================================
    # EDGE CASE TESTS - UPDATING WITH HISTORICAL SESSIONS
    # ============================================================================

    context 'when updating slot with historical/completed parking sessions' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
        create(:parking_session, :completed, parking_slot: @slot, entry_point: entry_point, vehicle_type: 'S')
      end

      it 'successfully updates the slot (editing is allowed even with historical sessions)' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-WITH-HISTORICAL-SESSION',
          slot_type: 'MP',
          distances: [15, 25, 35]
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-WITH-HISTORICAL-SESSION',
          slot_type: 'MP',
          distances: [15, 25, 35]
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'updates the slot in database' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-WITH-HISTORICAL-SESSION',
          slot_type: 'MP',
          distances: [15, 25, 35]
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq('UPDATED-WITH-HISTORICAL-SESSION')
        expect(@slot.slot_type).to eq('MP')
        expect(@slot.distances).to eq([15, 25, 35])
      end

      it 'works with unwrapped format' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-HISTORICAL-UNWRAPPED'
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'works with wrapped format' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-HISTORICAL-WRAPPED'
          }
        }, as: :json

        expect(response).to have_http_status(:ok)
      end
    end
  end
end
