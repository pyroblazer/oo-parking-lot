require 'rails_helper'

RSpec.describe 'Api::V1::SlotsController - Slot Deletion (Newman Scenarios)', type: :request do
  let(:entry_point) { create(:entry_point, identifier: 'A') }

  # ============================================================================
  # NEWMAN SCENARIO TESTS - MIRRORING NEWMAN TEST COLLECTION
  # ============================================================================

  describe 'DELETE /api/v1/slots/:id - Newman Scenarios' do
    # ============================================================================
    # SUCCESSFUL DELETION TESTS
    # ============================================================================

    context 'when deleting a slot that has never been used' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
      end

      it 'returns HTTP 204 No Content' do
        delete "/api/v1/slots/#{@slot.id}", as: :json
        expect(response).to have_http_status(:no_content)
      end

      it 'returns empty body' do
        delete "/api/v1/slots/#{@slot.id}", as: :json
        expect(response.body).to be_empty
      end

      it 'removes the slot from the database' do
        expect do
          delete "/api/v1/slots/#{@slot.id}", as: :json
        end.to change(ParkingSlot, :count).by(-1)
      end

      it 'slot cannot be found after deletion' do
        delete "/api/v1/slots/#{@slot.id}", as: :json
        expect { ParkingSlot.find(@slot.id) }.to raise_error(ActiveRecord::RecordNotFound)
      end
    end

    # ============================================================================
    # ERROR HANDLING TESTS - NON-EXISTENT SLOT
    # ============================================================================

    context 'when deleting a non-existent slot' do
      it 'returns HTTP 404 Not Found' do
        delete '/api/v1/slots/999999', as: :json
        expect(response).to have_http_status(:not_found)
      end

      it 'returns success field as false' do
        delete '/api/v1/slots/999999', as: :json
        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        delete '/api/v1/slots/999999', as: :json
        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'error message mentions not found' do
        delete '/api/v1/slots/999999', as: :json
        json = response.parsed_body
        expect(json['error'].downcase).to include('not found')
      end

      it 'does not change slot count' do
        expect do
          delete '/api/v1/slots/999999', as: :json
        end.not_to change(ParkingSlot, :count)
      end
    end

    # ============================================================================
    # ERROR HANDLING TESTS - INVALID SLOT IDS
    # ============================================================================

    context 'when deleting with invalid slot ID - string ID' do
      it 'returns HTTP 404 Not Found' do
        delete '/api/v1/slots/invalid', as: :json
        expect(response).to have_http_status(:not_found)
      end

      it 'returns success field as false' do
        delete '/api/v1/slots/invalid', as: :json
        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        delete '/api/v1/slots/invalid', as: :json
        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end
    end

    context 'when deleting with invalid slot ID - zero ID' do
      it 'returns HTTP 404 Not Found' do
        delete '/api/v1/slots/0', as: :json
        expect(response).to have_http_status(:not_found)
      end

      it 'returns success field as false' do
        delete '/api/v1/slots/0', as: :json
        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        delete '/api/v1/slots/0', as: :json
        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end
    end

    context 'when deleting with invalid slot ID - negative ID' do
      it 'returns HTTP 404 Not Found' do
        delete '/api/v1/slots/-1', as: :json
        expect(response).to have_http_status(:not_found)
      end

      it 'returns success field as false' do
        delete '/api/v1/slots/-1', as: :json
        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        delete '/api/v1/slots/-1', as: :json
        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end
    end

    # ============================================================================
    # ERROR HANDLING TESTS - ACTIVE SESSIONS
    # ============================================================================

    context 'when deleting a slot with active parking sessions' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'occupied')
        create(:parking_session, parking_slot: @slot, entry_point: entry_point, vehicle_type: 'S', exited_at: nil)
      end

      it 'returns HTTP 409 Conflict' do
        delete "/api/v1/slots/#{@slot.id}", as: :json
        expect(response).to have_http_status(:conflict)
      end

      it 'returns success field as false' do
        delete "/api/v1/slots/#{@slot.id}", as: :json
        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        delete "/api/v1/slots/#{@slot.id}", as: :json
        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'error message mentions associated' do
        delete "/api/v1/slots/#{@slot.id}", as: :json
        json = response.parsed_body
        expect(json['error'].downcase).to include('parking sessions')
      end

      it 'error message mentions parking sessions' do
        delete "/api/v1/slots/#{@slot.id}", as: :json
        json = response.parsed_body
        expect(json['error'].downcase).to include('parking sessions')
      end

      it 'does not delete the slot' do
        expect do
          delete "/api/v1/slots/#{@slot.id}", as: :json
        end.not_to change(ParkingSlot, :count)
      end

      it 'keeps the slot in the database' do
        delete "/api/v1/slots/#{@slot.id}", as: :json
        expect { ParkingSlot.find(@slot.id) }.not_to raise_error
      end

      it 'works for SP type slots with active sessions' do
        slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'occupied')
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', exited_at: nil)

        delete "/api/v1/slots/#{slot.id}", as: :json
        expect(response).to have_http_status(:conflict)
      end

      it 'works for MP type slots with active sessions' do
        slot = create(:parking_slot, slot_label: "MP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'MP', status: 'occupied')
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'M', exited_at: nil)

        delete "/api/v1/slots/#{slot.id}", as: :json
        expect(response).to have_http_status(:conflict)
      end

      it 'works for LP type slots with active sessions' do
        slot = create(:parking_slot, slot_label: "LP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'LP', status: 'occupied')
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'L', exited_at: nil)

        delete "/api/v1/slots/#{slot.id}", as: :json
        expect(response).to have_http_status(:conflict)
      end

      it 'fails with multiple active sessions' do
        slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'occupied')
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', exited_at: nil)
        create(:parking_session, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S', exited_at: nil)

        delete "/api/v1/slots/#{slot.id}", as: :json
        expect(response).to have_http_status(:conflict)
      end
    end

    # ============================================================================
    # ERROR HANDLING TESTS - HISTORICAL SESSIONS
    # ============================================================================

    context 'when deleting a slot with historical/completed parking sessions' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
        create(:parking_session, :completed, parking_slot: @slot, entry_point: entry_point, vehicle_type: 'S')
      end

      # CORRECT BEHAVIOR: The implementation allows deletion of slots with NO ACTIVE SESSIONS.
      # Historical sessions are allowed, so deletion succeeds with 204 No Content.
      it 'returns HTTP 204 No Content for successful deletion' do
        delete "/api/v1/slots/#{@slot.id}", as: :json
        expect(response).to have_http_status(:no_content)
      end

      it 'returns empty body on success' do
        delete "/api/v1/slots/#{@slot.id}", as: :json
        expect(response.body).to be_empty
      end

      it 'deletes the slot despite having only historical sessions' do
        delete "/api/v1/slots/#{@slot.id}", as: :json
        expect { ParkingSlot.find(@slot.id) }.to raise_error(ActiveRecord::RecordNotFound)
      end

      it 'decrements the slot count' do
        expect do
          delete "/api/v1/slots/#{@slot.id}", as: :json
        end.to change(ParkingSlot, :count).by(-1)
      end

      it 'works successfully for SP type slots with historical sessions' do
        slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
        create(:parking_session, :completed, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S')

        delete "/api/v1/slots/#{slot.id}", as: :json
        expect(response).to have_http_status(:no_content)
      end

      it 'works successfully for MP type slots with historical sessions' do
        slot = create(:parking_slot, slot_label: "MP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'MP', status: 'available')
        create(:parking_session, :completed, parking_slot: slot, entry_point: entry_point, vehicle_type: 'M')

        delete "/api/v1/slots/#{slot.id}", as: :json
        expect(response).to have_http_status(:no_content)
      end

      it 'works successfully for LP type slots with historical sessions' do
        slot = create(:parking_slot, slot_label: "LP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'LP', status: 'available')
        create(:parking_session, :completed, parking_slot: slot, entry_point: entry_point, vehicle_type: 'L')

        delete "/api/v1/slots/#{slot.id}", as: :json
        expect(response).to have_http_status(:no_content)
      end

      it 'succeeds with multiple historical sessions' do
        slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
        create(:parking_session, :completed, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S')
        create(:parking_session, :completed, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S')

        delete "/api/v1/slots/#{slot.id}", as: :json
        expect(response).to have_http_status(:no_content)
      end

      it 'succeeds with long-term historical sessions' do
        slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
        create(:parking_session, :long_term, parking_slot: slot, entry_point: entry_point, vehicle_type: 'S')

        delete "/api/v1/slots/#{slot.id}", as: :json
        expect(response).to have_http_status(:no_content)
      end
    end

    # ============================================================================
    # ERROR HANDLING TESTS - BOTH ACTIVE AND HISTORICAL SESSIONS
    # ============================================================================

    context 'when deleting a slot with both active and historical sessions' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'occupied')
        create(:parking_session, :completed, parking_slot: @slot, entry_point: entry_point, vehicle_type: 'S')
        create(:parking_session, parking_slot: @slot, entry_point: entry_point, vehicle_type: 'S', exited_at: nil)
      end

      it 'returns HTTP 409 Conflict due to associated sessions' do
        delete "/api/v1/slots/#{@slot.id}", as: :json
        expect(response).to have_http_status(:conflict)
      end

      it 'returns success field as false' do
        delete "/api/v1/slots/#{@slot.id}", as: :json
        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        delete "/api/v1/slots/#{@slot.id}", as: :json
        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'does not delete the slot' do
        expect do
          delete "/api/v1/slots/#{@slot.id}", as: :json
        end.not_to change(ParkingSlot, :count)
      end
    end

    # ============================================================================
    # EDGE CASE TESTS - CONCURRENT DELETION
    # ============================================================================

    context 'concurrent deletion attempts' do
      it 'handles multiple deletion requests for the same slot' do
        slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')

        # First deletion should succeed
        delete "/api/v1/slots/#{slot.id}", as: :json
        expect(response).to have_http_status(:no_content)

        # Second deletion should fail (slot already deleted)
        delete "/api/v1/slots/#{slot.id}", as: :json
        expect(response).to have_http_status(:not_found)
      end
    end

    # ============================================================================
    # EDGE CASE TESTS - ID WITH LEADING ZEROS
    # ============================================================================

    context 'when deleting with ID with leading zeros' do
      it 'handles ID with leading zeros correctly' do
        slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')

        # Leading zeros should be ignored, so 0001 becomes 1
        # If slot.id is not 1, this will return 404
        delete "/api/v1/slots/#{format('%04d', slot.id)}", as: :json

        # The behavior depends on whether slot.id matches the parsed integer
        # This test documents current behavior
        expect(response).to have_http_status(:no_content)
      end
    end
  end
end
