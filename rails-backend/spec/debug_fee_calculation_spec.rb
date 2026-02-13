# rubocop:disable Naming/VariableNumber
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
    puts "Session parked at: #{session_parked_at}"

    Timecop.freeze(session_parked_at)
    Timecop.travel(4.hours)

    puts "Current time after travel: #{Time.current}"

    # Unpark vehicle
    post "/api/v1/sessions/#{session_id}/unpark"

    expect(response).to have_http_status(:ok)
    json = JSON.parse(response.body)

    puts "Total fee: #{json['data']['total_fee']}"
    puts "Duration hours: #{json['data']['duration_hours']}"
    puts "Base fee: #{json['data']['fee_breakdown']['remaining']['base_fee']}"
    puts "Exceeding hours: #{json['data']['fee_breakdown']['remaining']['exceeding_hours']}"
    puts "Exceeding fee: #{json['data']['fee_breakdown']['remaining']['exceeding_fee']}"
    puts "Hourly rate: #{json['data']['fee_breakdown']['remaining']['hourly_rate']}"

    # Check the session directly
    session = ParkingSession.find(session_id)
    puts "\nSession debug:"
    puts "Session parked_at: #{session.parked_at}"
    puts "Session exited_at: #{session.exited_at}"
    puts "Session duration_hours: #{session.duration_hours}"
    puts "Session total_continuous_duration: #{session.total_continuous_duration}"

    # Check the pricing calculation
    pricing_engine = PricingEngine.new(session)
    breakdown = pricing_engine.breakdown
    puts "\nPricing breakdown:"
    puts "Total fee: #{breakdown[:total_fee]}"
    puts "Duration hours: #{breakdown[:duration_hours]}"
    puts "Remaining total: #{breakdown[:breakdown][:remaining][:total]}"
    puts "Remaining base fee: #{breakdown[:breakdown][:remaining][:base_fee]}"
    puts "Remaining exceeding hours: #{breakdown[:breakdown][:remaining][:exceeding_hours]}"
    puts "Remaining exceeding fee: #{breakdown[:breakdown][:remaining][:exceeding_fee]}"
  end
end
# rubocop:enable Naming/VariableNumber
