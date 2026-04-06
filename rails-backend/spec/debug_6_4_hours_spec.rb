require 'rails_helper'

RSpec.describe 'Debug 6.4 Hours Fee Calculation', type: :request do
  before do
    @entry_point_c = create(:entry_point, identifier: 'C', name: 'Entry Point C')
    @sp_slot_1 = create(:parking_slot, slot_type: 'SP', slot_label: 'SP-1',
                                       entry_point: @entry_point_c, distances: [7, 4, 2], status: 'available')
  end

  after do
    Timecop.return
  end

  it 'debugs fee calculation for 6.4 hours (rounded to 7 hours)' do
    # Park small vehicle at entry point C
    post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: @entry_point_c.identifier }

    expect(response).to have_http_status(:created)
    json = JSON.parse(response.body)
    session_id = json['data']['session_id']

    # Set specific times: parked_at at 10:30, exited_at at 17:24 (6.4 hours)
    session = ParkingSession.find(session_id)

    # DEBUG: Log session state before update

    parked_at = Time.parse('2024-01-15T10:30:00Z')
    Time.parse('2024-01-15T17:24:00Z')

    session.update!(parked_at: parked_at)
    session.reload

    # DEBUG: Log session state after update

    pricing_engine = PricingEngine.new(session)
    pricing_engine.breakdown

    # Unpark vehicle to get API response
    post "/api/v1/sessions/#{session_id}/unpark"

    expect(response).to have_http_status(:ok)
    JSON.parse(response.body)
  end
end
# rubocop:enable Naming/VariableNumber
