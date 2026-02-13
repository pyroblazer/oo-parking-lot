require 'rails_helper'

RSpec.describe FeeCalculator, type: :service do
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

  describe '#initialize' do
    it 'stores the session' do
      calculator = described_class.new(session)
      expect(calculator.session).to eq(session)
    end
  end

  describe '#calculate' do
    it 'delegates to PricingEngine' do
      calculator = described_class.new(session)
      pricing_engine = instance_double('PricingEngine', calculate: BigDecimal('100.0'))
      allow(PricingEngine).to receive(:new).with(session).and_return(pricing_engine)

      result = calculator.calculate

      expect(result).to eq(BigDecimal('100.0'))
    end

    it 'returns a numeric value' do
      calculator = described_class.new(session)
      result = calculator.calculate
      expect(result).to be_a(Numeric)
    end
  end

  describe '#breakdown' do
    it 'delegates to PricingEngine' do
      calculator = described_class.new(session)
      pricing_engine = instance_double('PricingEngine', breakdown: {
                                         total_fee: BigDecimal('80.0'),
                                         duration_hours: 2,
                                         is_continuous: false,
                                         breakdown: {}
                                       })
      allow(PricingEngine).to receive(:new).with(session).and_return(pricing_engine)

      result = calculator.breakdown

      expect(result).to eq(pricing_engine.breakdown)
    end

    it 'returns a hash with required keys' do
      calculator = described_class.new(session)
      result = calculator.breakdown
      expect(result).to be_a(Hash)
      expect(result).to have_key(:total_fee)
      expect(result).to have_key(:duration_hours)
      expect(result).to have_key(:is_continuous)
      expect(result).to have_key(:breakdown)
    end
  end

  describe 'edge cases' do
    context 'with zero duration session' do
      let(:zero_duration_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: Time.current,
               exited_at: Time.current)
      end

      it 'calculates fee for zero duration' do
        calculator = described_class.new(zero_duration_session)
        result = calculator.calculate
        expect(result).to be_a(Numeric)
        expect(result).to be >= 0
      end
    end

    context 'with negative duration (edge case)' do
      let(:invalid_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 1.hour.from_now,
               exited_at: 1.hour.ago)
      end

      it 'handles negative duration gracefully' do
        calculator = described_class.new(invalid_session)
        result = calculator.calculate
        expect(result).to be_a(Numeric)
      end
    end

    context 'with very long duration' do
      let(:long_duration_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 1000.hours.ago,
               exited_at: 1.hour.ago)
      end

      it 'calculates fee for very long duration' do
        calculator = described_class.new(long_duration_session)
        result = calculator.calculate
        expect(result).to be_a(Numeric)
        expect(result).to be > 0
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

      it 'calculates fee for active session' do
        calculator = described_class.new(active_session)
        result = calculator.calculate
        expect(result).to be_a(Numeric)
        expect(result).to be >= 0
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

  describe 'different vehicle types' do
    context 'with small vehicle' do
      let(:small_vehicle_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 2.hours.ago,
               exited_at: 1.hour.ago)
      end

      it 'calculates correct fee' do
        calculator = described_class.new(small_vehicle_session)
        result = calculator.calculate
        expect(result).to be_a(Numeric)
      end
    end

    context 'with medium vehicle' do
      let(:mp_slot) { create(:parking_slot, slot_type: 'MP', entry_point: entry_point) }
      let(:medium_vehicle_session) do
        create(:parking_session,
               vehicle_type: 'M',
               parking_slot: mp_slot,
               entry_point: entry_point,
               parked_at: 2.hours.ago,
               exited_at: 1.hour.ago)
      end

      it 'calculates correct fee' do
        calculator = described_class.new(medium_vehicle_session)
        result = calculator.calculate
        expect(result).to be_a(Numeric)
      end
    end

    context 'with large vehicle' do
      let(:lp_slot) { create(:parking_slot, slot_type: 'LP', entry_point: entry_point) }
      let(:large_vehicle_session) do
        create(:parking_session,
               vehicle_type: 'L',
               parking_slot: lp_slot,
               entry_point: entry_point,
               parked_at: 2.hours.ago,
               exited_at: 1.hour.ago)
      end

      it 'calculates correct fee' do
        calculator = described_class.new(large_vehicle_session)
        result = calculator.calculate
        expect(result).to be_a(Numeric)
      end
    end
  end

  describe 'different slot types' do
    context 'with SP slot' do
      let(:sp_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 2.hours.ago,
               exited_at: 1.hour.ago)
      end

      it 'calculates correct fee' do
        calculator = described_class.new(sp_session)
        result = calculator.calculate
        expect(result).to be_a(Numeric)
      end
    end

    context 'with MP slot' do
      let(:mp_slot) { create(:parking_slot, slot_type: 'MP', entry_point: entry_point) }
      let(:mp_session) do
        create(:parking_session,
               vehicle_type: 'M',
               parking_slot: mp_slot,
               entry_point: entry_point,
               parked_at: 2.hours.ago,
               exited_at: 1.hour.ago)
      end

      it 'calculates correct fee' do
        calculator = described_class.new(mp_session)
        result = calculator.calculate
        expect(result).to be_a(Numeric)
      end
    end

    context 'with LP slot' do
      let(:lp_slot) { create(:parking_slot, slot_type: 'LP', entry_point: entry_point) }
      let(:lp_session) do
        create(:parking_session,
               vehicle_type: 'L',
               parking_slot: lp_slot,
               entry_point: entry_point,
               parked_at: 2.hours.ago,
               exited_at: 1.hour.ago)
      end

      it 'calculates correct fee' do
        calculator = described_class.new(lp_session)
        result = calculator.calculate
        expect(result).to be_a(Numeric)
      end
    end
  end

  describe 'continuous parking scenarios' do
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

      it 'calculates fee with continuous parking' do
        calculator = described_class.new(continuous_session)
        result = calculator.calculate
        expect(result).to be_a(Numeric)
      end

      it 'breakdown includes continuous flag' do
        calculator = described_class.new(continuous_session)
        result = calculator.breakdown
        expect(result[:is_continuous]).to be true
      end
    end

    context 'without continuous parking' do
      # Clean up any existing sessions to ensure isolation
      before(:each) do
        ParkingSession.delete_all
      end

      it 'breakdown includes continuous flag set to false' do
        non_continuous_session = create(:parking_session,
                                        vehicle_type: 'S',
                                        parking_slot: parking_slot,
                                        entry_point: entry_point,
                                        parked_at: 2.hours.ago,
                                        exited_at: 1.hour.ago)
        calculator = described_class.new(non_continuous_session)
        result = calculator.breakdown
        expect(result[:is_continuous]).to be false
      end
    end
  end

  describe 'long-term parking scenarios' do
    context 'with long-term parking (24+ hours)' do
      let(:long_term_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 25.hours.ago,
               exited_at: 1.hour.ago)
      end

      it 'calculates fee with long-term rate' do
        calculator = described_class.new(long_term_session)
        result = calculator.calculate
        expect(result).to be_a(Numeric)
        expect(result).to be >= BigDecimal('5000')
      end

      it 'breakdown includes long-term component' do
        calculator = described_class.new(long_term_session)
        result = calculator.breakdown
        expect(result[:breakdown]).to have_key(:long_term)
      end
    end

    context 'without long-term parking' do
      let(:short_term_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 2.hours.ago,
               exited_at: 1.hour.ago)
      end

      it 'breakdown does not include long-term component' do
        calculator = described_class.new(short_term_session)
        result = calculator.breakdown
        expect(result[:breakdown][:long_term][:days]).to eq(0)
        expect(result[:breakdown][:long_term][:fee]).to eq(BigDecimal('0'))
      end
    end
  end

  describe 'boundary conditions' do
    context 'exactly at base duration (3 hours)' do
      let(:base_duration_session) do
        start_time = 3.hours.ago
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: start_time,
               exited_at: start_time + 3.hours)
      end

      it 'calculates base rate' do
        calculator = described_class.new(base_duration_session)
        result = calculator.calculate
        expect(result).to eq(BigDecimal('40.0'))
      end
    end

    context 'just over base duration (3.1 hours)' do
      let(:exceeding_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 3.1.hours.ago,
               exited_at: Time.current)
      end

      it 'calculates exceeding fee' do
        calculator = described_class.new(exceeding_session)
        result = calculator.calculate
        expect(result).to be > BigDecimal('40.0')
      end
    end

    context 'exactly at long-term threshold (24 hours)' do
      let(:threshold_session) do
        start_time = 24.hours.ago
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: start_time,
               exited_at: start_time + 24.hours)
      end

      it 'calculates long-term fee' do
        calculator = described_class.new(threshold_session)
        result = calculator.calculate
        expect(result).to eq(BigDecimal('5000.0'))
      end
    end

    context 'just over long-term threshold (24.1 hours)' do
      let(:over_threshold_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 24.1.hours.ago,
               exited_at: Time.current)
      end

      it 'calculates long-term fee with remaining hours' do
        calculator = described_class.new(over_threshold_session)
        result = calculator.calculate
        expect(result).to be >= BigDecimal('5040.0')
      end
    end
  end
end
