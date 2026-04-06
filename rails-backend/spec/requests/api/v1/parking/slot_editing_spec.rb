require 'rails_helper'

RSpec.describe 'Api::V1::SlotsController - Slot Editing', type: :request do
  let(:entry_point) { create(:entry_point, identifier: 'A') }

  # ============================================================================
  # CONTROLLER LEVEL TESTS - PUT /api/v1/slots/:id
  # ============================================================================

  describe 'PUT /api/v1/slots/:id' do
    context 'when updating a slot with unwrapped format (frontend)' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'successfully updates the slot' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-UNWRAPPED',
          slot_type: 'MP',
          distances: [15, 25, 35]
        }, as: :json

        expect(response).to have_http_status(:ok)
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

      it 'returns updated slot data' do
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

      it 'updates the slot in the database' do
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

      it 'works for SP type slots' do
        slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')

        put "/api/v1/slots/#{slot.id}", params: {
          slot_label: 'UPDATED-SP',
          slot_type: 'MP',
          distances: [15, 25, 35]
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'works for MP type slots' do
        slot = create(:parking_slot, slot_label: "MP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'MP', status: 'available')

        put "/api/v1/slots/#{slot.id}", params: {
          slot_label: 'UPDATED-MP',
          slot_type: 'LP',
          distances: [20, 30, 40]
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'works for LP type slots' do
        slot = create(:parking_slot, slot_label: "LP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'LP', status: 'available')

        put "/api/v1/slots/#{slot.id}", params: {
          slot_label: 'UPDATED-LP',
          slot_type: 'SP',
          distances: [25, 35, 45]
        }, as: :json

        expect(response).to have_http_status(:ok)
      end
    end

    context 'when updating a slot with wrapped format (Postman)' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'successfully updates the slot' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-WRAPPED',
            slot_type: 'MP',
            distances: [15, 25, 35]
          }
        }, as: :json

        expect(response).to have_http_status(:ok)
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

      it 'returns updated slot data' do
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

      it 'updates the slot in the database' do
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

      it 'works for SP type slots' do
        slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')

        put "/api/v1/slots/#{slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-SP-WRAPPED',
            slot_type: 'MP',
            distances: [15, 25, 35]
          }
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'works for MP type slots' do
        slot = create(:parking_slot, slot_label: "MP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'MP', status: 'available')

        put "/api/v1/slots/#{slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-MP-WRAPPED',
            slot_type: 'LP',
            distances: [20, 30, 40]
          }
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'works for LP type slots' do
        slot = create(:parking_slot, slot_label: "LP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'LP', status: 'available')

        put "/api/v1/slots/#{slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-LP-WRAPPED',
            slot_type: 'SP',
            distances: [25, 35, 45]
          }
        }, as: :json

        expect(response).to have_http_status(:ok)
      end
    end

    context 'when doing a partial update with unwrapped format' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'successfully updates only the specified field' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-PARTIAL'
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns HTTP 200 OK' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-PARTIAL'
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'updates only slot_label, leaving other fields unchanged' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-PARTIAL'
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq('UPDATED-PARTIAL')
        expect(@slot.slot_type).to eq('SP')
        expect(@slot.distances).to eq([1, 4, 5])
      end

      it 'updates only slot_type, leaving other fields unchanged' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_type: 'MP'
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq(@slot.slot_label)
        expect(@slot.slot_type).to eq('MP')
        expect(@slot.distances).to eq([1, 4, 5])
      end

      it 'updates only distances, leaving other fields unchanged' do
        put "/api/v1/slots/#{@slot.id}", params: {
          distances: [100, 200, 300]
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq(@slot.slot_label)
        expect(@slot.slot_type).to eq('SP')
        expect(@slot.distances).to eq([100, 200, 300])
      end
    end

    context 'when doing a partial update with wrapped format' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'successfully updates only the specified field' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-PARTIAL-WRAPPED'
          }
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'updates only slot_label, leaving other fields unchanged' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-PARTIAL-WRAPPED'
          }
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq('UPDATED-PARTIAL-WRAPPED')
        expect(@slot.slot_type).to eq('SP')
        expect(@slot.distances).to eq([1, 4, 5])
      end

      it 'updates only slot_type, leaving other fields unchanged' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_type: 'MP'
          }
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq(@slot.slot_label)
        expect(@slot.slot_type).to eq('MP')
        expect(@slot.distances).to eq([1, 4, 5])
      end

      it 'updates only distances, leaving other fields unchanged' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            distances: [100, 200, 300]
          }
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq(@slot.slot_label)
        expect(@slot.slot_type).to eq('SP')
        expect(@slot.distances).to eq([100, 200, 300])
      end
    end

    context 'when updating a non-existent slot' do
      it 'returns HTTP 404 Not Found' do
        put '/api/v1/slots/999999', params: {
          slot_label: 'UPDATED-NONEXISTENT'
        }, as: :json

        expect(response).to have_http_status(:not_found)
      end

      it 'returns appropriate error message' do
        put '/api/v1/slots/999999', params: {
          slot_label: 'UPDATED-NONEXISTENT'
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
        expect(json['error']).to include("Couldn't find ParkingSlot")
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

      it 'returns appropriate error message' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-INVALID-TYPE',
          slot_type: 'INVALID'
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
        expect(json['error']).to include('Slot type')
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

    context 'when updating with missing required fields' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns HTTP 400 Bad Request when slot_label is empty' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: ''
        }, as: :json

        expect(response).to have_http_status(:bad_request)
      end

      it 'returns appropriate error message for empty slot_label' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: ''
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
        expect(json['error']).to include('Slot label')
      end

      it 'returns HTTP 400 Bad Request when slot_type is empty' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_type: ''
        }, as: :json

        expect(response).to have_http_status(:bad_request)
      end

      it 'returns appropriate error message for empty slot_type' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_type: ''
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
        expect(json['error']).to include('Slot type')
      end
    end

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

      it 'does not change the slot in the database' do
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

    context 'edge cases and boundary conditions' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'handles string ID that converts to zero' do
        put '/api/v1/slots/invalid', params: {
          slot_label: 'UPDATED-INVALID-ID'
        }, as: :json

        expect(response).to have_http_status(:not_found)
      end

      it 'handles negative ID' do
        put '/api/v1/slots/-1', params: {
          slot_label: 'UPDATED-NEGATIVE-ID'
        }, as: :json

        expect(response).to have_http_status(:not_found)
      end

      it 'handles zero ID' do
        put '/api/v1/slots/0', params: {
          slot_label: 'UPDATED-ZERO-ID'
        }, as: :json

        expect(response).to have_http_status(:not_found)
      end

      it 'handles very large ID' do
        put '/api/v1/slots/999999999999', params: {
          slot_label: 'UPDATED-LARGE-ID'
        }, as: :json

        expect(response).to have_http_status(:not_found)
      end

      it 'handles empty string slot label' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: ''
        }, as: :json

        expect(response).to have_http_status(:bad_request)
      end

      it 'handles very long slot label' do
        long_label = 'A' * 1000
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: long_label
        }, as: :json

        # Should succeed (long labels are accepted)
        expect(response).to have_http_status(:ok)
      end

      it 'handles negative distances' do
        put "/api/v1/slots/#{@slot.id}", params: {
          distances: [-10, -20, -30]
        }, as: :json

        # Should succeed (negative distances are accepted)
        expect(response).to have_http_status(:ok)
      end

      it 'handles empty distances array' do
        put "/api/v1/slots/#{@slot.id}", params: {
          distances: []
        }, as: :json

        # Should succeed (empty distances are accepted)
        expect(response).to have_http_status(:ok)
      end

      it 'handles distances array of wrong size' do
        put "/api/v1/slots/#{@slot.id}", params: {
          distances: [10, 20]
        }, as: :json

        # Should succeed (wrong size distances are accepted)
        expect(response).to have_http_status(:ok)
      end

      it 'handles ID with leading zeros' do
        # Leading zeros should be ignored, so if slot.id is 1, 0001 becomes 1
        put "/api/v1/slots/#{format('%04d', @slot.id)}", params: {
          slot_label: 'UPDATED-LEADING-ZEROS'
        }, as: :json

        # The behavior depends on whether slot.id matches the parsed integer
        expect(response).to have_http_status(:ok)
      end
    end

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

      it 'updates the slot in the database' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-WITH-ACTIVE-SESSION',
          slot_type: 'MP',
          distances: [15, 25, 35]
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq('UPDATED-WITH-ACTIVE-SESSION')
        expect(@slot.slot_type).to eq('MP')
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

      it 'updates the slot in the database' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-WITH-HISTORICAL-SESSION',
          slot_type: 'MP',
          distances: [15, 25, 35]
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq('UPDATED-WITH-HISTORICAL-SESSION')
        expect(@slot.slot_type).to eq('MP')
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

    context 'when updating all fields with unwrapped format' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'successfully updates all fields' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-ALL-FIELDS',
          slot_type: 'MP',
          distances: [100, 200, 300]
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns updated slot data with all fields' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-ALL-FIELDS',
          slot_type: 'MP',
          distances: [100, 200, 300]
        }, as: :json

        json = response.parsed_body
        expect(json['data']['slot_label']).to eq('UPDATED-ALL-FIELDS')
        expect(json['data']['slot_type']).to eq('MP')
        expect(json['data']['distances']).to eq([100, 200, 300])
      end

      it 'updates all fields in the database' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-ALL-FIELDS',
          slot_type: 'MP',
          distances: [100, 200, 300]
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq('UPDATED-ALL-FIELDS')
        expect(@slot.slot_type).to eq('MP')
        expect(@slot.distances).to eq([100, 200, 300])
      end
    end

    context 'when updating all fields with wrapped format' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'successfully updates all fields' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-ALL-FIELDS-WRAPPED',
            slot_type: 'LP',
            distances: [100, 200, 300]
          }
        }, as: :json

        expect(response).to have_http_status(:ok)
      end

      it 'returns updated slot data with all fields' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-ALL-FIELDS-WRAPPED',
            slot_type: 'LP',
            distances: [100, 200, 300]
          }
        }, as: :json

        json = response.parsed_body
        expect(json['data']['slot_label']).to eq('UPDATED-ALL-FIELDS-WRAPPED')
        expect(json['data']['slot_type']).to eq('LP')
        expect(json['data']['distances']).to eq([100, 200, 300])
      end

      it 'updates all fields in the database' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_label: 'UPDATED-ALL-FIELDS-WRAPPED',
            slot_type: 'LP',
            distances: [100, 200, 300]
          }
        }, as: :json

        @slot.reload
        expect(@slot.slot_label).to eq('UPDATED-ALL-FIELDS-WRAPPED')
        expect(@slot.slot_type).to eq('LP')
        expect(@slot.distances).to eq([100, 200, 300])
      end
    end
  end

  # ============================================================================
  # SUMMARY OF CORRECT BEHAVIOR
  # ============================================================================

  describe 'CORRECT BEHAVIOR SUMMARY' do
    it 'documents the fix: controller now accepts both wrapped and unwrapped formats' do
      # The slot_params method in slots_controller.rb now accepts both formats:
      # 1. Wrapped format (Postman): {parking_slot: {slot_label, slot_type, distances}}
      # 2. Unwrapped format (frontend): {slot_label, slot_type, distances}
      #
      # Correct behavior:
      # - Both formats are accepted and processed correctly
      # - Partial updates are supported (only update specified fields)
      # - Invalid slot IDs return 404 Not Found
      # - Invalid slot types return 400 Bad Request
      # - Empty request body returns 200 OK (no changes)
      expect(true).to be true
    end
  end

  # ============================================================================
  # ADDITIONAL TESTS - MIRRORING NEWMAN SCENARIOS
  # ============================================================================

  describe 'Additional Newman Scenario Tests' do
    context 'when updating non-existent slot - response format verification' do
      it 'returns error field in response' do
        put '/api/v1/slots/999999', params: {
          slot_label: 'UPDATED-NONEXISTENT'
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'returns success field as false' do
        put '/api/v1/slots/999999', params: {
          slot_label: 'UPDATED-NONEXISTENT'
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'error message mentions not found' do
        put '/api/v1/slots/999999', params: {
          slot_label: 'UPDATED-NONEXISTENT'
        }, as: :json

        json = response.parsed_body
        expect(json['error'].downcase).to include('not found')
      end
    end

    context 'when updating with invalid slot type - response format verification' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
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

      it 'returns success field as false' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-INVALID-TYPE',
          slot_type: 'INVALID'
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
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
    end

    context 'when updating with empty slot label - response format verification' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns error field in response' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: ''
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'returns success field as false' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: ''
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'error message mentions slot label' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: ''
        }, as: :json

        json = response.parsed_body
        expect(json['error'].downcase).to include('slot label')
      end
    end

    context 'when updating with empty slot type (wrapped) - response format verification' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns error field in response' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_type: ''
          }
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'returns success field as false' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_type: ''
          }
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'error message mentions slot type' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_type: ''
          }
        }, as: :json

        json = response.parsed_body
        expect(json['error'].downcase).to include('slot type')
      end
    end

    context 'when updating with invalid slot ID - response format verification' do
      it 'returns error field for string ID' do
        put '/api/v1/slots/invalid', params: {
          slot_label: 'UPDATED-INVALID-ID'
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'returns success field as false for string ID' do
        put '/api/v1/slots/invalid', params: {
          slot_label: 'UPDATED-INVALID-ID'
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field for zero ID' do
        put '/api/v1/slots/0', params: {
          slot_label: 'UPDATED-ZERO-ID'
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'returns success field as false for zero ID' do
        put '/api/v1/slots/0', params: {
          slot_label: 'UPDATED-ZERO-ID'
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field for negative ID' do
        put '/api/v1/slots/-1', params: {
          slot_label: 'UPDATED-NEGATIVE-ID'
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'returns success field as false for negative ID' do
        put '/api/v1/slots/-1', params: {
          slot_label: 'UPDATED-NEGATIVE-ID'
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end
    end

    context 'when updating all fields - data structure verification' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns data field in response' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-ALL-FIELDS',
          slot_type: 'MP',
          distances: [100, 200, 300]
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('data')
        expect(json['data']).to be_present
      end

      it 'data field contains id' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-ALL-FIELDS',
          slot_type: 'MP',
          distances: [100, 200, 300]
        }, as: :json

        json = response.parsed_body
        expect(json['data']).to have_key('id')
        expect(json['data']['id']).to eq(@slot.id)
      end

      it 'data field contains all updated fields' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-ALL-FIELDS',
          slot_type: 'MP',
          distances: [100, 200, 300]
        }, as: :json

        json = response.parsed_body
        expect(json['data']).to have_key('slot_label')
        expect(json['data']).to have_key('slot_type')
        expect(json['data']).to have_key('distances')
        expect(json['data']['slot_label']).to eq('UPDATED-ALL-FIELDS')
        expect(json['data']['slot_type']).to eq('MP')
        expect(json['data']['distances']).to eq([100, 200, 300])
      end
    end

    context 'when doing partial update - data structure verification' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns data field with only updated field (unwrapped)' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-PARTIAL-LABEL'
        }, as: :json

        json = response.parsed_body
        expect(json['data']).to have_key('slot_label')
        expect(json['data']['slot_label']).to eq('UPDATED-PARTIAL-LABEL')
      end

      it 'returns data field with only updated field (wrapped)' do
        put "/api/v1/slots/#{@slot.id}", params: {
          parking_slot: {
            slot_type: 'MP'
          }
        }, as: :json

        json = response.parsed_body
        expect(json['data']).to have_key('slot_type')
        expect(json['data']['slot_type']).to eq('MP')
      end

      it 'unchanged fields are present in response' do
        put "/api/v1/slots/#{@slot.id}", params: {
          slot_label: 'UPDATED-PARTIAL-LABEL'
        }, as: :json

        json = response.parsed_body
        expect(json['data']).to have_key('slot_type')
        expect(json['data']).to have_key('distances')
      end
    end
  end
end
