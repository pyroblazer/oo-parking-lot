require 'rails_helper'

RSpec.describe Pricing::BasePricingStrategy, type: :service do
  let(:entry_point) { create(:entry_point, identifier: 'A') }
  let(:parking_slot) { create(:parking_slot, slot_type: 'SP', entry_point: entry_point) }
  let(:session) do
    create(:parking_session,
           vehicle_type: 'S',
           parking_slot: parking_slot,
           entry_point: entry_point,
           parked_at: 2.hours.ago,
           exited_at: 1.hour.ago)
  end

  let(:strategy_class) do
    Class.new(Pricing::BasePricingStrategy) do
      def calculate
        100.0
      end

      def breakdown
        {
          total_fee: 100.0,
          duration_hours: 2,
          is_continuous: false,
          breakdown: {}
        }
      end
    end
  end

  let(:strategy) { strategy_class.new(session) }

  describe '#initialize' do
    it 'stores the session' do
      expect(strategy.session).to eq(session)
    end
  end

  describe '#calculate' do
    it 'raises NotImplementedError by default' do
      base_strategy = described_class.new(session)
      expect do
        base_strategy.calculate
      end.to raise_error(NotImplementedError, 'Subclasses must implement #calculate')
    end

    it 'can be overridden by subclass' do
      result = strategy.calculate
      expect(result).to eq(100.0)
    end
  end

  describe '#breakdown' do
    it 'raises NotImplementedError by default' do
      base_strategy = described_class.new(session)
      expect do
        base_strategy.breakdown
      end.to raise_error(NotImplementedError, 'Subclasses must implement #breakdown')
    end

    it 'can be overridden by subclass' do
      result = strategy.breakdown
      expect(result).to be_a(Hash)
      expect(result).to have_key(:total_fee)
      expect(result).to have_key(:duration_hours)
      expect(result).to have_key(:is_continuous)
      expect(result).to have_key(:breakdown)
    end
  end

  describe '#duration_hours' do
    let(:base_strategy) { described_class.new(session) }

    context 'with completed session' do
      it 'calculates duration in hours' do
        duration = base_strategy.send(:duration_hours)
        expect(duration).to be_a(Numeric)
        expect(duration).to be >= 1
      end
    end

    context 'with active session (no exit time)' do
      let(:active_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 2.hours.ago,
               exited_at: nil)
      end

      it 'calculates duration from parked_at to now' do
        base_strategy = described_class.new(active_session)
        duration = base_strategy.send(:duration_hours)
        expect(duration).to be_a(Numeric)
        expect(duration).to be >= 2
      end
    end

    context 'with zero duration' do
      let(:zero_duration_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: Time.current,
               exited_at: Time.current)
      end

      it 'calculates zero duration' do
        base_strategy = described_class.new(zero_duration_session)
        duration = base_strategy.send(:duration_hours)
        expect(duration).to eq(0)
      end
    end

    context 'with fractional duration' do
      let(:fractional_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 2.5.hours.ago,
               exited_at: Time.current)
      end

      it 'returns the actual fractional duration' do
        base_strategy = described_class.new(fractional_session)
        duration = base_strategy.send(:duration_hours)
        # The implementation returns the raw BigDecimal duration without rounding
        # Use be_within to handle floating point precision differences
        expect(duration).to be_a(Numeric)
        expect(duration).to be_within(0.01).of(2.5)
      end
    end
  end

  describe '#total_continuous_duration' do
    let(:base_strategy) { described_class.new(session) }

    context 'with continuous parking' do
      before do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 5.hours.ago,
               exited_at: 45.minutes.ago)
      end

      let(:continuous_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 30.minutes.ago,
               exited_at: nil)
      end

      it 'calculates duration from base start time' do
        base_strategy = described_class.new(continuous_session)
        duration = base_strategy.send(:total_continuous_duration)
        expect(duration).to be >= 4.5
      end
    end

    context 'without continuous parking' do
      it 'calculates duration from current parked_at' do
        base_strategy = described_class.new(session)
        duration = base_strategy.send(:total_continuous_duration)
        # For non-continuous parking, total_continuous_duration equals duration_hours
        # Use be_within to handle floating point precision differences
        expect(duration).to be_within(0.001).of(base_strategy.send(:duration_hours))
      end
    end
  end

  describe '#calculate_long_term' do
    let(:base_strategy) { described_class.new(session) }

    context 'with duration less than 24 hours' do
      it 'returns 0 days and full duration' do
        duration = 10.5
        days, remaining = base_strategy.send(:calculate_long_term, duration)
        expect(days).to eq(0)
        expect(remaining).to eq(10.5)
      end
    end

    context 'with exactly 24 hours' do
      it 'returns 1 day and 0 remaining' do
        duration = 24.0
        days, remaining = base_strategy.send(:calculate_long_term, duration)
        expect(days).to eq(1)
        expect(remaining).to eq(0)
      end
    end

    context 'with duration more than 24 hours' do
      it 'calculates correct days and remaining' do
        duration = 49.5
        days, remaining = base_strategy.send(:calculate_long_term, duration)
        expect(days).to eq(2)
        expect(remaining).to eq(1.5)
      end
    end

    context 'with zero duration' do
      it 'returns 0 days and 0 remaining' do
        duration = 0
        days, _remaining = base_strategy.send(:calculate_long_term, duration)
        expect(days).to eq(0)
      end
    end

    context 'with very long duration' do
      it 'calculates correct days and remaining' do
        duration = 1000.5
        days, _remaining = base_strategy.send(:calculate_long_term, duration)
        expect(days).to eq(41)
      end
    end
  end

  describe '#hourly_rate' do
    let(:base_strategy) { described_class.new(session) }

    context 'with SP slot type' do
      it 'returns SP hourly rate' do
        rate = base_strategy.send(:hourly_rate, 'SP')
        expect(rate).to eq(20.0)
      end
    end

    context 'with MP slot type' do
      it 'returns MP hourly rate' do
        rate = base_strategy.send(:hourly_rate, 'MP')
        expect(rate).to eq(60.0)
      end
    end

    context 'with LP slot type' do
      it 'returns LP hourly rate' do
        rate = base_strategy.send(:hourly_rate, 'LP')
        expect(rate).to eq(100.0)
      end
    end

    context 'with unknown slot type' do
      it 'returns default rate' do
        rate = base_strategy.send(:hourly_rate, 'XX')
        expect(rate).to eq(20.0)
      end
    end

    context 'with nil slot type' do
      it 'returns default rate' do
        rate = base_strategy.send(:hourly_rate, nil)
        expect(rate).to eq(20.0)
      end
    end
  end

  describe 'constants' do
    it 'defines BASE_RATE constant' do
      expect(Pricing::BasePricingStrategy::BASE_RATE).to eq(40.0)
    end

    it 'defines BASE_DURATION_HOURS constant' do
      expect(Pricing::BasePricingStrategy::BASE_DURATION_HOURS).to eq(3)
    end

    it 'defines HOURLY_RATES constant' do
      expect(Pricing::BasePricingStrategy::HOURLY_RATES).to be_a(Hash)
      expect(Pricing::BasePricingStrategy::HOURLY_RATES['SP']).to eq(20.0)
      expect(Pricing::BasePricingStrategy::HOURLY_RATES['MP']).to eq(60.0)
      expect(Pricing::BasePricingStrategy::HOURLY_RATES['LP']).to eq(100.0)
    end

    it 'HOURLY_RATES is frozen' do
      expect do
        Pricing::BasePricingStrategy::HOURLY_RATES['SP'] = 30.0
      end.to raise_error(FrozenError)
    end

    it 'defines LONG_TERM_RATE constant' do
      expect(Pricing::BasePricingStrategy::LONG_TERM_RATE).to eq(5000.0)
    end

    it 'defines LONG_TERM_HOURS constant' do
      expect(Pricing::BasePricingStrategy::LONG_TERM_HOURS).to eq(24)
    end
  end

  describe 'edge cases' do
    context 'with negative duration' do
      it 'handles negative duration in calculate_long_term' do
        base_strategy = described_class.new(session)
        days, = base_strategy.send(:calculate_long_term, -10)
        expect(days).to be <= 0
      end
    end

    context 'with very large duration' do
      it 'handles very large duration in calculate_long_term' do
        base_strategy = described_class.new(session)
        days, remaining = base_strategy.send(:calculate_long_term, 1_000_000)
        expect(days).to be_a(Numeric)
        expect(remaining).to be_a(Numeric)
      end
    end

    context 'with nil session' do
      it 'handles nil session gracefully' do
        expect do
          described_class.new(nil)
        end.to raise_error(ArgumentError, 'Session cannot be nil')
      end
    end
  end
end
