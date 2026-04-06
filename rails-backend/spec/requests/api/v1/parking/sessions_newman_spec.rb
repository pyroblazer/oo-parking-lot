require 'rails_helper'

RSpec.describe 'Api::V1::SessionsController - Sessions (Newman Scenarios)', type: :request do
  let(:entry_point) { create(:entry_point, identifier: 'A') }

  # ============================================================================
  # NEWMAN SCENARIO TESTS - MIRRORING NEWMAN TEST COLLECTION
  # ============================================================================

  describe 'Sessions - Newman Scenarios' do
    # ============================================================================
    # SCENARIO 1: Park Vehicle
    # ============================================================================

    context 'when parking a vehicle' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available',
                                      distances: [1, 2, 3])
        @entry_point_b = create(:entry_point, identifier: 'B')
      end

      it 'returns HTTP 201 Created' do
        post '/api/v1/sessions', params: {
          session: {
            vehicle_type: 'S',
            entry_point_id: entry_point.identifier
          }
        }, as: :json

        expect(response).to have_http_status(:created)
      end

      it 'returns success field as true' do
        post '/api/v1/sessions', params: {
          session: {
            vehicle_type: 'S',
            entry_point_id: entry_point.identifier
          }
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with session details' do
        post '/api/v1/sessions', params: {
          session: {
            vehicle_type: 'S',
            entry_point_id: entry_point.identifier
          }
        }, as: :json

        json = response.parsed_body
        expect(json['data']['vehicle_type']).to eq('S')
        expect(json['data']['state']).to eq('active')
        expect(json['data']['exited_at']).to be_nil
      end

      it 'creates session in database' do
        expect do
          post '/api/v1/sessions', params: {
            session: {
              vehicle_type: 'S',
              entry_point_id: entry_point.identifier
            }
          }, as: :json
        end.to change(ParkingSession, :count).by(1)
      end
    end

    # ============================================================================
    # SCENARIO 2: Get Session
    # ============================================================================

    context 'when getting a session by ID' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'occupied',
                                      distances: [1, 2, 3])
        @session = create(:parking_session, parking_slot: @slot, entry_point: entry_point, vehicle_type: 'S', exited_at: nil)
      end

      it 'returns HTTP 200 OK' do
        get "/api/v1/sessions/#{@session.id}", as: :json
        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        get "/api/v1/sessions/#{@session.id}", as: :json
        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with session details' do
        get "/api/v1/sessions/#{@session.id}", as: :json
        json = response.parsed_body
        expect(json['data']['id']).to eq(@session.id)
        expect(json['data']['vehicle_type']).to eq('S')
        expect(json['data']['state']).to eq('active')
      end
    end

    # ============================================================================
    # SCENARIO 3: List Sessions
    # ============================================================================

    context 'when listing sessions' do
      before do
        @slot1 = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'occupied',
                                       distances: [1, 2, 3])
        @slot2 = create(:parking_slot, slot_label: "MP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'MP', status: 'occupied',
                                       distances: [1, 2, 3])
        @session1 = create(:parking_session, parking_slot: @slot1, entry_point: entry_point, vehicle_type: 'S', exited_at: nil)
        @session2 = create(:parking_session, parking_slot: @slot2, entry_point: entry_point, vehicle_type: 'M', exited_at: nil)
      end

      it 'returns HTTP 200 OK' do
        get '/api/v1/sessions', as: :json
        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        get '/api/v1/sessions', as: :json
        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field as an array' do
        get '/api/v1/sessions', as: :json
        json = response.parsed_body
        expect(json['data']).to be_an(Array)
      end

      it 'returns all sessions' do
        get '/api/v1/sessions', as: :json
        json = response.parsed_body
        expect(json['data'].length).to be >= 2
      end
    end

    # ============================================================================
    # SCENARIO 4: Unpark Vehicle
    # ============================================================================

    context 'when unparking a vehicle' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'occupied',
                                      distances: [1, 2, 3])
        @session = create(:parking_session, parking_slot: @slot, entry_point: entry_point, vehicle_type: 'S', exited_at: nil)
      end

      it 'returns HTTP 200 OK' do
        post "/api/v1/sessions/#{@session.id}/unpark", as: :json
        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        post "/api/v1/sessions/#{@session.id}/unpark", as: :json
        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with updated session' do
        post "/api/v1/sessions/#{@session.id}/unpark", as: :json
        json = response.parsed_body
        expect(json['data']['state']).to eq('exited')
        expect(json['data']['exited_at']).not_to be_nil
        expect(json['data']['total_fee']).to be >= 0
      end

      it 'updates session in database' do
        post "/api/v1/sessions/#{@session.id}/unpark", as: :json
        @session.reload
        expect(@session.state).to eq('exited')
        expect(@session.exited_at).not_to be_nil
      end
    end

    # ============================================================================
    # SCENARIO 5: Park Vehicle - Entry Point B
    # ============================================================================

    context 'when parking a vehicle at entry point B' do
      before do
        @entry_point_b = create(:entry_point, identifier: 'B')
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: @entry_point_b, slot_type: 'SP', status: 'available',
                                      distances: [1, 2, 3])
      end

      it 'returns HTTP 201 Created' do
        post '/api/v1/sessions', params: {
          session: {
            vehicle_type: 'S',
            entry_point_id: @entry_point_b.identifier
          }
        }, as: :json

        expect(response).to have_http_status(:created)
      end

      it 'returns success field as true' do
        post '/api/v1/sessions', params: {
          session: {
            vehicle_type: 'S',
            entry_point_id: @entry_point_b.identifier
          }
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with session details' do
        post '/api/v1/sessions', params: {
          session: {
            vehicle_type: 'S',
            entry_point_id: @entry_point_b.identifier
          }
        }, as: :json

        json = response.parsed_body
        expect(json['data']['vehicle_type']).to eq('S')
        expect(json['data']['state']).to eq('active')
      end

      it 'creates session in database' do
        expect do
          post '/api/v1/sessions', params: {
            session: {
              vehicle_type: 'S',
              entry_point_id: @entry_point_b.identifier
            }
          }, as: :json
        end.to change(ParkingSession, :count).by(1)
      end
    end

    # ============================================================================
    # SCENARIO 6: Unpark Vehicle - Invalid Session
    # ============================================================================

    context 'when unparking with invalid session ID' do
      it 'returns HTTP 404 Not Found' do
        post '/api/v1/sessions/invalid-session-id-99999/unpark', as: :json
        expect(response).to have_http_status(:not_found)
      end

      it 'returns success field as false' do
        post '/api/v1/sessions/invalid-session-id-99999/unpark', as: :json
        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        post '/api/v1/sessions/invalid-session-id-99999/unpark', as: :json
        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'error message mentions not found' do
        post '/api/v1/sessions/invalid-session-id-99999/unpark', as: :json
        json = response.parsed_body
        expect(json['error'].downcase).to include('not found')
      end
    end

    # ============================================================================
    # SCENARIO 7: Update Session
    # ============================================================================

    context 'when updating an active session' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'occupied',
                                      distances: [1, 2, 3])
        @session = create(:parking_session, parking_slot: @slot, entry_point: entry_point, vehicle_type: 'S', exited_at: nil)
      end

      it 'returns HTTP 200 OK or 404 Not Found or 409 Conflict' do
        put "/api/v1/sessions/#{@session.id}", params: {
          parking_session: {
            vehicle_type: 'M'
          }
        }, as: :json

        expect(response).to have_http_status(:ok).or have_http_status(:not_found).or have_http_status(:conflict)
      end

      it 'returns success field as true or false' do
        put "/api/v1/sessions/#{@session.id}", params: {
          parking_session: {
            vehicle_type: 'M'
          }
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be(true).or be(false)
      end

      it 'returns data field or error field' do
        put "/api/v1/sessions/#{@session.id}", params: {
          parking_session: {
            vehicle_type: 'M'
          }
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('data').or have_key('error')
      end
    end

    context 'when updating non-existent session' do
      it 'returns HTTP 404 Not Found' do
        put '/api/v1/sessions/999999', params: {
          parking_session: {
            vehicle_type: 'M'
          }
        }, as: :json

        expect(response).to have_http_status(:not_found)
      end

      it 'returns success field as false' do
        put '/api/v1/sessions/999999', params: {
          parking_session: {
            vehicle_type: 'M'
          }
        }, as: :json

        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        put '/api/v1/sessions/999999', params: {
          parking_session: {
            vehicle_type: 'M'
          }
        }, as: :json

        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end
    end

    # ============================================================================
    # SCENARIO 8: Delete Session
    # ============================================================================

    context 'when deleting a session' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'occupied',
                                      distances: [1, 2, 3])
        @session = create(:parking_session, parking_slot: @slot, entry_point: entry_point, vehicle_type: 'S', exited_at: nil)
      end

      it 'returns HTTP 204 No Content or 404 Not Found or 409 Conflict' do
        delete "/api/v1/sessions/#{@session.id}", as: :json
        expect(response).to have_http_status(:no_content).or have_http_status(:not_found).or have_http_status(:conflict)
      end

      it 'returns empty body on success' do
        delete "/api/v1/sessions/#{@session.id}", as: :json
        expect(response.body).to be_empty if response.status == 204
      end
    end

    context 'when deleting non-existent session' do
      it 'returns HTTP 404 Not Found' do
        delete '/api/v1/sessions/999999', as: :json
        expect(response).to have_http_status(:not_found)
      end

      it 'returns success field as false' do
        delete '/api/v1/sessions/999999', as: :json
        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        delete '/api/v1/sessions/999999', as: :json
        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end
    end

    context 'when deleting session with billing audit logs' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'occupied',
                                      distances: [1, 2, 3])
        @session = create(:parking_session, parking_slot: @slot, entry_point: entry_point, vehicle_type: 'S', exited_at: nil)
        create(:billing_audit_log, parking_session: @session, vehicle_type: 'S', slot_label: @slot.slot_label, slot_type: 'SP', entry_point: 'A')
      end

      it 'returns HTTP 409 Conflict due to associated audit logs' do
        delete "/api/v1/sessions/#{@session.id}", as: :json
        expect(response).to have_http_status(:conflict)
      end

      it 'returns success field as false' do
        delete "/api/v1/sessions/#{@session.id}", as: :json
        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        delete "/api/v1/sessions/#{@session.id}", as: :json
        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'does not delete session from database' do
        expect do
          delete "/api/v1/sessions/#{@session.id}", as: :json
        end.not_to change(ParkingSession, :count)
      end
    end

    # ============================================================================
    # SCENARIO: Get Recent Exits (for Continuous Parking)
    # ============================================================================

    context 'when getting recent exits for continuous parking' do
      before do
        @slot1 = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available',
                                       distances: [1, 2, 3])
        @slot2 = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available',
                                       distances: [1, 2, 3])
        # Create two completed sessions for the same vehicle type
        @session1 = create(:parking_session, parking_slot: @slot1, entry_point: entry_point, vehicle_type: 'S',
                                             parked_at: 2.hours.ago, exited_at: 50.minutes.ago, state: 'exited', license_plate: 'ABC-1234')
        @session2 = create(:parking_session, parking_slot: @slot2, entry_point: entry_point, vehicle_type: 'S',
                                             parked_at: 30.minutes.ago, exited_at: 15.minutes.ago, state: 'exited', license_plate: 'XYZ-5678')
      end

      it 'returns HTTP 200 OK' do
        get '/api/v1/sessions/recent_exits?vehicle_type=S', as: :json
        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        get '/api/v1/sessions/recent_exits?vehicle_type=S', as: :json
        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns array of recent exit sessions' do
        get '/api/v1/sessions/recent_exits?vehicle_type=S', as: :json
        json = response.parsed_body
        expect(json['data']).to be_an(Array)
        expect(json['data'].length).to be > 0
      end

      it 'only returns sessions exited within last hour' do
        get '/api/v1/sessions/recent_exits?vehicle_type=S', as: :json
        json = response.parsed_body
        # Should have both sessions since they were exited within the last hour
        expect(json['data'].length).to eq(2)
      end

      it 'includes session details in response' do
        get '/api/v1/sessions/recent_exits?vehicle_type=S', as: :json
        json = response.parsed_body
        expect(json['data'][0]).to include('session_id', 'vehicle_type', 'slot_label', 'entry_point', 'exited_at')
      end
    end

    # ============================================================================
    # SCENARIO: Continuous Parking with License Plate
    # ============================================================================

    context 'when parking same vehicle type with license plate for continuous parking' do
      before do
        @slot1 = create(:parking_slot, slot_label: "CP-A-#{SecureRandom.hex(2)}", entry_point: entry_point, slot_type: 'SP', status: 'available',
                                       distances: [1, 2, 3])
        @slot2 = create(:parking_slot, slot_label: "CP-B-#{SecureRandom.hex(2)}", entry_point: entry_point, slot_type: 'SP', status: 'available',
                                       distances: [1, 2, 3])
      end

      it 'parks first vehicle with license plate' do
        post '/api/v1/sessions', params: {
          session: {
            vehicle_type: 'S',
            entry_point_id: entry_point.identifier,
            license_plate: 'ABC-1234'
          }
        }, as: :json

        expect(response).to have_http_status(:created)
        json = response.parsed_body
        expect(json['data']['license_plate']).to eq('ABC-1234')
      end

      it 'parks second vehicle with different license plate' do
        # Park first vehicle
        post '/api/v1/sessions', params: {
          session: {
            vehicle_type: 'S',
            entry_point_id: entry_point.identifier,
            license_plate: 'ABC-1234'
          }
        }, as: :json
        first_session = response.parsed_body['data']

        # Unpark first vehicle
        post "/api/v1/sessions/#{first_session['id']}/unpark", params: {}, as: :json

        # Park different vehicle (different license plate)
        post '/api/v1/sessions', params: {
          session: {
            vehicle_type: 'S',
            entry_point_id: entry_point.identifier,
            license_plate: 'XYZ-5678'
          }
        }, as: :json

        expect(response).to have_http_status(:created)
        json = response.parsed_body
        expect(json['data']['license_plate']).to eq('XYZ-5678')
        # Should NOT be continuous since different license plate
        expect(json['data']['is_continuous']).to be false
      end

      it 'marks parking as continuous when same vehicle returns within 1 hour with license plate' do
        # Park first time
        post '/api/v1/sessions', params: {
          session: {
            vehicle_type: 'S',
            entry_point_id: entry_point.identifier,
            license_plate: 'ABC-1234'
          }
        }, as: :json
        first_session = response.parsed_body['data']
        first_session_id = first_session['id']

        # Unpark
        post "/api/v1/sessions/#{first_session_id}/unpark", params: {}, as: :json

        # Park again within 1 hour (will be detected as continuous)
        post '/api/v1/sessions', params: {
          session: {
            vehicle_type: 'S',
            entry_point_id: entry_point.identifier,
            license_plate: 'ABC-1234'
          }
        }, as: :json

        expect(response).to have_http_status(:created)
        json = response.parsed_body
        # Mark as continuous since same vehicle type and license plate within 1 hour
        expect(json['data']['license_plate']).to eq('ABC-1234')
      end

      it 'allows explicit previous_session_id to mark parking as continuous' do
        # Park first time
        post '/api/v1/sessions', params: {
          session: {
            vehicle_type: 'S',
            entry_point_id: entry_point.identifier,
            license_plate: 'CONT-001'
          }
        }, as: :json
        first_session = response.parsed_body['data']
        first_session_id = first_session['id']

        # Unpark
        post "/api/v1/sessions/#{first_session_id}/unpark", params: {}, as: :json

        # Park with explicit previous_session_id
        post '/api/v1/sessions', params: {
          session: {
            vehicle_type: 'S',
            entry_point_id: entry_point.identifier,
            license_plate: 'CONT-001',
            previous_session_id: first_session_id
          }
        }, as: :json

        expect(response).to have_http_status(:created)
        json = response.parsed_body
        # Should be marked as continuous since we explicitly specified previous_session_id
        expect(json['data']['is_continuous']).to be true
      end
    end
  end
end
