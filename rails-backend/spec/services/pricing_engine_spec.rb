require 'rails_helper'

RSpec.describe PricingEngine, type: :service do
  let(:entry_point) { create(:entry_point) }
  let(:parking_slot) { create(:parking_slot, slot_type: 'SP', entry_point: entry_point) }
  let(:session) do
    create(:parking_session,
           vehicle_type: 'S',
           parking_slot: parking_slot,
           entry_point: entry_point,
           parked_at: 2.hours.ago,
           exited_at: 1.hour.ago)
  end

  describe '#calculate' do
    subject { described_class.new(session).calculate }

    context 'with short duration (within base rate)' do
      let(:entry_point) { create(:entry_point) }
      let(:parking_slot) { create(:parking_slot, slot_type: 'SP', entry_point: entry_point) }

      it 'returns base rate' do
        expect(subject).to eq(Pricing::BasePricingStrategy::BASE_RATE)
      end
    end

    context 'with medium duration (exceeding base rate)' do
      let(:entry_point) { create(:entry_point) }
      let(:parking_slot) { create(:parking_slot, slot_type: 'SP', entry_point: entry_point) }
      let(:session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 5.hours.ago,
               exited_at: Time.current)
      end

      it 'calculates exceeding fee' do
        # For 5 hours: base rate (40) + 2 exceeding hours at SP rate (20 each) = 80
        expected_fee = Pricing::BasePricingStrategy::BASE_RATE + (BigDecimal('2') * BigDecimal('20.0'))
        expect(subject).to eq(expected_fee)
      end
    end

    context 'with long-term parking (24+ hours)' do
      let(:entry_point) { create(:entry_point) }
      let(:parking_slot) { create(:parking_slot, slot_type: 'SP', entry_point: entry_point) }
      let(:session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 25.hours.ago,
               exited_at: Time.current)
      end

      it 'applies long-term rate' do
        # For 25 hours: 1 full day (5000) + 1 remaining hour (40 base rate) = 5040
        # The long-term rate does NOT include the base rate
        expected_fee = Pricing::BasePricingStrategy::LONG_TERM_RATE + Pricing::BasePricingStrategy::BASE_RATE
        expect(subject).to eq(expected_fee)
      end
    end

    context 'with different slot types' do
      let(:entry_point) { create(:entry_point, identifier: 'D') }
      let(:parking_slot) { create(:parking_slot, slot_type: 'MP', entry_point: entry_point) }
      let(:session) do
        create(:parking_session,
               vehicle_type: 'M',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 5.hours.ago,
               exited_at: Time.current)
      end

      it 'uses correct hourly rate' do
        # For 5 hours: base rate (40) + 2 exceeding hours at MP rate (60 each) = 160
        expected_fee = Pricing::BasePricingStrategy::BASE_RATE + (BigDecimal('2') * BigDecimal('60.0'))
        expect(subject).to eq(expected_fee)
      end
    end
  end

  describe '#breakdown' do
    let(:entry_point) { create(:entry_point, identifier: 'E') }
    let(:parking_slot) { create(:parking_slot, slot_type: 'SP', entry_point: entry_point) }
    subject { described_class.new(session).breakdown }

    it 'returns detailed breakdown' do
      expect(subject).to include(
        :total_fee,
        :duration_hours,
        :is_continuous,
        :breakdown
      )
    end

    it 'includes long-term breakdown when applicable' do
      expect(subject[:breakdown]).to have_key(:long_term)
    end

    it 'includes remaining breakdown' do
      expect(subject[:breakdown]).to have_key(:remaining)
    end
  end

  describe '.register_strategy' do
    let(:custom_strategy) { Class.new(Pricing::BasePricingStrategy) }

    it 'registers a custom strategy' do
      expect do
        described_class.register_strategy('custom', custom_strategy)
      end.to change { described_class.available_strategies }.from(include('standard')).to(include('custom'))
    end
  end

  describe '.available_strategies' do
    it 'returns list of available strategies' do
      expect(described_class.available_strategies).to include('standard')
    end
  end

  describe 'error handling' do
    let(:entry_point) { create(:entry_point, identifier: 'F') }
    let(:parking_slot) { create(:parking_slot, slot_type: 'SP', entry_point: entry_point) }

    context 'when strategy is not found' do
      it 'raises ArgumentError' do
        expect do
          described_class.new(session, 'nonexistent').calculate
        end.to raise_error(ArgumentError, /Unknown pricing strategy/)
      end
    end
  end
end
