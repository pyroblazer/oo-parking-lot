require 'rails_helper'

RSpec.describe 'Debug Fee Calculation', type: :request do
  before do
    @entry_point_c = create(:entry_point, identifier: 'C', name: 'Entry Point C')
    @lp_slot_1 = create(:parking_slot, slot_type: 'LP', slot_label: 'LP-1',
                                       entry_point: @entry_point_c, distances: [7, 4, 2], status: 'available')
  end

  after do
    Timecop.return
  end

  it 'debugs fee calculation for LP slot with 4 hours' do
    # Park large vehicle at entry point C
    post '/api/v1/sessions', params: { vehicle_type: 'L', entry_point_id: @entry_point_c.identifier }

    expect(response).to have_http_status(:created)
    json = JSON.parse(response.body)
    session_id = json['data']['session_id']

    # Freeze time at the session's parked_at time, then travel 4 hours forward
    session_parked_at = ParkingSession.find(session_id).parked_at

    Timecop.freeze(session_parked_at)
    Timecop.travel(4.hours)

    # Unpark vehicle
    post "/api/v1/sessions/#{session_id}/unpark"

    expect(response).to have_http_status(:ok)
    JSON.parse(response.body)

    # Check the session directly
    session = ParkingSession.find(session_id)

    # Check the pricing calculation
    pricing_engine = PricingEngine.new(session)
    pricing_engine.breakdown
  end
end
# rubocop:enable Naming/VariableNumber
