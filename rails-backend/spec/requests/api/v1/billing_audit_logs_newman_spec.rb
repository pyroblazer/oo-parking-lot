require 'rails_helper'

RSpec.describe 'Api::V1::BillingAuditLogsController - Billing Audit Logs (Newman Scenarios)', type: :request do
  let(:entry_point) { create(:entry_point, identifier: 'A') }

  # ============================================================================
  # NEWMAN SCENARIO TESTS - MIRRORING NEWMAN TEST COLLECTION
  # ============================================================================

  describe 'Billing Audit Logs - Newman Scenarios' do
    # ============================================================================
    # SCENARIO 1: List Billing Audit Logs
    # ============================================================================

    context 'when listing billing audit logs' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
        @session1 = create(:parking_session, :completed, parking_slot: @slot, entry_point: entry_point, vehicle_type: 'S')
        @session2 = create(:parking_session, :completed, parking_slot: @slot, entry_point: entry_point, vehicle_type: 'M')
        @audit_log1 = create(:billing_audit_log, parking_session: @session1, vehicle_type: 'S', slot_label: @slot.slot_label, slot_type: 'SP',
                                                 entry_point: 'A')
        @audit_log2 = create(:billing_audit_log, parking_session: @session2, vehicle_type: 'M', slot_label: @slot.slot_label, slot_type: 'SP',
                                                 entry_point: 'A')
      end

      it 'returns HTTP 200 OK' do
        get '/api/v1/billing_audit_logs', as: :json
        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        get '/api/v1/billing_audit_logs', as: :json
        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field as an array' do
        get '/api/v1/billing_audit_logs', as: :json
        json = response.parsed_body
        expect(json['data']).to be_an(Array)
      end

      it 'returns all billing audit logs' do
        get '/api/v1/billing_audit_logs', as: :json
        json = response.parsed_body
        expect(json['data'].length).to be >= 2
      end
    end

    # ============================================================================
    # SCENARIO 2: Get Billing Audit Log by ID
    # ============================================================================

    context 'when getting billing audit log by ID' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
        @session = create(:parking_session, :completed, parking_slot: @slot, entry_point: entry_point, vehicle_type: 'S')
        @audit_log = create(:billing_audit_log, parking_session: @session, vehicle_type: 'S', slot_label: @slot.slot_label, slot_type: 'SP',
                                                entry_point: 'A')
      end

      it 'returns HTTP 200 OK' do
        get "/api/v1/billing_audit_logs/#{@audit_log.id}", as: :json
        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        get "/api/v1/billing_audit_logs/#{@audit_log.id}", as: :json
        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field with billing audit log details' do
        get "/api/v1/billing_audit_logs/#{@audit_log.id}", as: :json
        json = response.parsed_body
        expect(json['data']['id']).to eq(@audit_log.id)
        expect(json['data']['vehicle_type']).to eq('S')
        expect(json['data']['slot_label']).to eq(@slot.slot_label)
        expect(json['data']['slot_type']).to eq('SP')
        expect(json['data']['entry_point']).to eq('A')
      end
    end

    context 'when getting non-existent billing audit log' do
      it 'returns HTTP 404 Not Found' do
        get '/api/v1/billing_audit_logs/999999', as: :json
        expect(response).to have_http_status(:not_found)
      end

      it 'returns success field as false' do
        get '/api/v1/billing_audit_logs/999999', as: :json
        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        get '/api/v1/billing_audit_logs/999999', as: :json
        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'error message mentions not found' do
        get '/api/v1/billing_audit_logs/999999', as: :json
        json = response.parsed_body
        expect(json['error'].downcase).to include('not found')
      end
    end

    # ============================================================================
    # SCENARIO 3: Get Billing Audit Logs by Session ID
    # ============================================================================

    context 'when getting billing audit logs by session ID' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
        @session = create(:parking_session, :completed, parking_slot: @slot, entry_point: entry_point, vehicle_type: 'S')
        @audit_log = create(:billing_audit_log, parking_session: @session, vehicle_type: 'S', slot_label: @slot.slot_label, slot_type: 'SP',
                                                entry_point: 'A')
      end

      it 'returns HTTP 200 OK' do
        get "/api/v1/billing_audit_logs/session/#{@session.id}", as: :json
        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        get "/api/v1/billing_audit_logs/session/#{@session.id}", as: :json
        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns data field as an array' do
        get "/api/v1/billing_audit_logs/session/#{@session.id}", as: :json
        json = response.parsed_body
        expect(json['data']).to be_an(Array)
      end

      it 'returns billing audit logs for the specified session' do
        get "/api/v1/billing_audit_logs/session/#{@session.id}", as: :json
        json = response.parsed_body
        expect(json['data'].length).to be >= 1
        expect(json['data'].first['id']).to eq(@audit_log.id)
      end
    end

    context 'when getting billing audit logs for non-existent session' do
      it 'returns HTTP 404 Not Found' do
        get '/api/v1/billing_audit_logs/session/999999', as: :json
        expect(response).to have_http_status(:not_found)
      end

      it 'returns success field as false' do
        get '/api/v1/billing_audit_logs/session/999999', as: :json
        json = response.parsed_body
        expect(json['success']).to be false
      end

      it 'returns error field in response' do
        get '/api/v1/billing_audit_logs/session/999999', as: :json
        json = response.parsed_body
        expect(json).to have_key('error')
        expect(json['error']).to be_present
      end

      it 'error message mentions not found' do
        get '/api/v1/billing_audit_logs/session/999999', as: :json
        json = response.parsed_body
        expect(json['error'].downcase).to include('not found')
      end
    end

    context 'when getting billing audit logs for session with no audit logs' do
      before do
        @slot = create(:parking_slot, slot_label: "SP-#{SecureRandom.hex(4)}", entry_point: entry_point, slot_type: 'SP', status: 'available')
        @session = create(:parking_session, :completed, parking_slot: @slot, entry_point: entry_point, vehicle_type: 'S')
        # Do not create any billing audit logs for this session
      end

      it 'returns HTTP 200 OK' do
        get "/api/v1/billing_audit_logs/session/#{@session.id}", as: :json
        expect(response).to have_http_status(:ok)
      end

      it 'returns success field as true' do
        get "/api/v1/billing_audit_logs/session/#{@session.id}", as: :json
        json = response.parsed_body
        expect(json['success']).to be true
      end

      it 'returns empty data array' do
        get "/api/v1/billing_audit_logs/session/#{@session.id}", as: :json
        json = response.parsed_body
        expect(json['data']).to eq([])
      end
    end
  end
end
