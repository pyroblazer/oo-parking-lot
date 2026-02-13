# rubocop:disable Naming/VariableNumber
require 'rails_helper'

RSpec.describe 'Debug Small Vehicle Flow', type: :request do
  before do
    @entry_point_a = create(:entry_point, identifier: 'A', name: 'Entry Point A')
    @sp_slot_1 = create(:parking_slot, slot_type: 'SP', slot_label: 'SP-1',
                                       entry_point: @entry_point_a, distances: [1, 4, 5], status: 'available')
  end

  after do
    Timecop.return
  end

  it 'debugs small vehicle flow with 2 hours' do
    # Park small vehicle at entry point A
    post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: @entry_point_a.identifier }

    expect(response).to have_http_status(:created)
    json = JSON.parse(response.body)
    expect(json['success']).to be true
    expect(json['data']['vehicle_type']).to eq('S')
    expect(json['data']['parking_slot']['slot_type']).to eq('SP')
    expect(json['data']['parking_slot']['slot_label']).to eq('SP-1')
    expect(json['data']['is_active']).to be true

    session_id = json['data']['session_id']

    # Freeze time at the session's parked_at time, then travel 2 hours forward
    session_parked_at = ParkingSession.find(session_id).parked_at
    puts "Session parked_at: #{session_parked_at}"

    Timecop.freeze(session_parked_at)
    Timecop.travel(2.hours)

    current_time = Time.current
    puts "Current time after travel: #{current_time}"

    # Unpark vehicle
    post "/api/v1/sessions/#{session_id}/unpark"

    expect(response).to have_http_status(:ok)
    json = JSON.parse(response.body)
    expect(json['success']).to be true

    # Check the session directly
    session = ParkingSession.find(session_id)
    puts "Session parked_at: #{session.parked_at}"
    puts "Session exited_at: #{session.exited_at}"
    puts "Session duration_hours: #{session.duration_hours}"
    puts "Session total_continuous_duration: #{session.total_continuous_duration}"

    # Check the pricing calculation
    pricing_engine = PricingEngine.new(session)
    breakdown = pricing_engine.breakdown
    puts 'Pricing breakdown:'
    puts "Total fee: #{breakdown[:total_fee]}"
    puts "Duration hours: #{breakdown[:duration_hours]}"
    puts "Remaining total: #{breakdown[:breakdown][:remaining][:total]}"
    puts "Remaining base fee: #{breakdown[:breakdown][:remaining][:base_fee]}"
    puts "Remaining exceeding hours: #{breakdown[:breakdown][:remaining][:exceeding_hours]}"
    puts "Remaining exceeding fee: #{breakdown[:breakdown][:remaining][:exceeding_fee]}"
    puts "Remaining hourly rate: #{breakdown[:breakdown][:remaining][:hourly_rate]}"
  end
end
# rubocop:enable Naming/VariableNumber
