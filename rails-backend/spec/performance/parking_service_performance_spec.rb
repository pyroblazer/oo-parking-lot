# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Parking Service Performance', type: :request do
  describe 'Fee Calculation Performance' do
    let(:entry_point) { create(:entry_point) }
    let(:parking_slot) { create(:parking_slot, entry_point: entry_point) }

    it 'calculates fees efficiently for short durations' do
      session = create(:parking_session,
                       parking_slot: parking_slot,
                       entry_point: entry_point,
                       parked_at: 2.hours.ago,
                       exited_at: 1.hour.ago)

      # Measure performance
      time = Benchmark.measure do
        100.times do
          FeeCalculator.new(session).calculate
        end
      end

      # Should complete 100 calculations in less than 1 second
      expect(time.real).to be < 1.0
    end

    it 'calculates fees efficiently for long durations' do
      session = create(:parking_session,
                       parking_slot: parking_slot,
                       entry_point: entry_point,
                       parked_at: 25.hours.ago,
                       exited_at: 1.hour.ago)

      # Measure performance
      time = Benchmark.measure do
        100.times do
          FeeCalculator.new(session).calculate
        end
      end

      # Should complete 100 calculations in less than 1 second
      expect(time.real).to be < 1.0
    end
  end

  describe 'Database Query Performance' do
    let(:entry_point) { create(:entry_point) }
    let(:parking_slot) { create(:parking_slot, entry_point: entry_point) }

    it 'queries available slots efficiently' do
      # Create 100 slots
      100.times do
        create(:parking_slot, entry_point: entry_point)
      end

      # Measure performance
      time = Benchmark.measure do
        10.times do
          ParkingSlot.available
        end
      end

      # Should complete 10 queries in less than 0.5 seconds
      expect(time.real).to be < 0.5
    end

    it 'creates sessions efficiently' do
      # Measure performance
      time = Benchmark.measure do
        50.times do |i|
          create(:parking_session,
                 parking_slot: parking_slot,
                 entry_point: entry_point,
                 parked_at: i.hours.ago)
        end
      end

      # Should complete 50 creations in less than 2 seconds
      expect(time.real).to be < 2.0
    end
  end

  describe 'Pricing Engine Performance' do
    let(:entry_point) { create(:entry_point) }
    let(:parking_slot) { create(:parking_slot, entry_point: entry_point) }
    let(:session) { create(:parking_session, parking_slot: parking_slot, entry_point: entry_point, parked_at: 2.hours.ago, exited_at: 1.hour.ago) }
    let(:pricing_engine) { PricingEngine.new(session) }

    it 'calculates fees efficiently for various durations' do
      durations = [1, 2, 3, 4, 5, 6, 12, 24, 25, 48]

      time = Benchmark.measure do
        100.times do
          durations.each do
            pricing_engine.calculate
          end
        end
      end

      # Should complete 1000 calculations in less than 1 second
      expect(time.real).to be < 1.0
    end
  end
end
