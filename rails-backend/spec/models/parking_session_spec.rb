require 'rails_helper'

RSpec.describe ParkingSession, type: :model do
  let(:entry_point) { create(:entry_point) }
  let(:parking_slot) { create(:parking_slot, entry_point: entry_point) }

  describe 'associations' do
    it { is_expected.to belong_to(:parking_slot) }
    it { is_expected.to belong_to(:entry_point) }
  end

  describe 'validations' do
    it { is_expected.to validate_presence_of(:vehicle_type) }
    it { is_expected.to validate_inclusion_of(:vehicle_type).in_array(%w[S M L]) }
    it { is_expected.to validate_presence_of(:parked_at) }
    it { is_expected.to validate_presence_of(:entry_point) }
  end

  describe '#active?' do
    context 'when session has no exit time' do
      it 'returns true' do
        session = build(:parking_session, exited_at: nil)
        expect(session.active?).to be(true)
      end
    end

    context 'when session has exit time' do
      it 'returns false' do
        session = build(:parking_session, exited_at: Time.current)
        expect(session.active?).to be(false)
      end
    end
  end

  describe '#duration_hours' do
    context 'with completed session' do
      it 'calculates duration in hours rounded up with ceiling rounding' do
        session = build(:parking_session,
                        parked_at: 2.hours.ago,
                        exited_at: 1.hour.ago)
        expect(session.duration_hours).to eq(1)
      end

      it 'rounds up partial hours with ceiling rounding' do
        session = build(:parking_session,
                        parked_at: 2.5.hours.ago,
                        exited_at: 1.hour.ago)
        expect(session.duration_hours).to eq(2)
      end
    end

    context 'with active session' do
      it 'calculates duration from parked_at to now with ceiling rounding' do
        session = build(:parking_session,
                        parked_at: 2.hours.ago,
                        exited_at: nil)
        expect(session.duration_hours).to eq(2)
      end
    end
  end

  describe '.previous_session' do
    let!(:previous_session) do
      create(:parking_session,
             vehicle_type: 'S',
             parking_slot: parking_slot,
             entry_point: entry_point,
             parked_at: 3.hours.ago,
             exited_at: 2.hours.ago)
    end

    let!(:other_session) do
      create(:parking_session,
             vehicle_type: 'M',
             parking_slot: parking_slot,
             entry_point: entry_point,
             parked_at: 3.hours.ago,
             exited_at: 2.hours.ago)
    end

    it 'finds previous session for same vehicle type within 1 hour' do
      result = described_class.previous_session('S', 1.5.hours.ago)
      expect(result).to eq(previous_session)
    end

    it 'does not find sessions older than 1 hour' do
      result = described_class.previous_session('S', 3.hours.ago)
      expect(result).to be_nil
    end

    it 'returns the most recent session' do
      recent_session = create(:parking_session,
                              vehicle_type: 'S',
                              parking_slot: parking_slot,
                              entry_point: entry_point,
                              parked_at: 1.5.hours.ago,
                              exited_at: 1.hour.ago)

      result = described_class.previous_session('S', 30.minutes.ago)
      expect(result).to eq(recent_session)
    end
  end

  describe '#continuous?' do
    context 'with previous session within 1 hour' do
      before do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 2.hours.ago,
               exited_at: 45.minutes.ago)
      end

      it 'returns true' do
        session = build(:parking_session,
                        vehicle_type: 'S',
                        parking_slot: parking_slot,
                        entry_point: entry_point,
                        parked_at: 30.minutes.ago)

        expect(session.continuous?).to be(true)
      end
    end

    context 'with no previous session' do
      it 'returns false' do
        session = build(:parking_session,
                        vehicle_type: 'S',
                        parking_slot: parking_slot,
                        entry_point: entry_point,
                        parked_at: 30.minutes.ago)

        expect(session.continuous?).to be(false)
      end
    end
  end

  describe '#base_start_time' do
    context 'with continuous parking' do
      let!(:previous_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 5.hours.ago,
               exited_at: 45.minutes.ago)
      end

      it 'returns previous session parked_at time' do
        session = build(:parking_session,
                        vehicle_type: 'S',
                        parking_slot: parking_slot,
                        entry_point: entry_point,
                        parked_at: 30.minutes.ago)

        expect(session.base_start_time).to eq(previous_session.parked_at)
      end
    end

    context 'without continuous parking' do
      it 'returns current parked_at time' do
        parked_at = 2.hours.ago
        session = build(:parking_session,
                        vehicle_type: 'S',
                        parking_slot: parking_slot,
                        entry_point: entry_point,
                        parked_at: parked_at)

        expect(session.base_start_time).to be_within(1.second).of(parked_at)
      end
    end
  end

  describe '#total_continuous_duration' do
    context 'with continuous parking' do
      before do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 5.hours.ago,
               exited_at: 45.minutes.ago)
      end

      it 'calculates duration from base start time' do
        session = build(:parking_session,
                        vehicle_type: 'S',
                        parking_slot: parking_slot,
                        entry_point: entry_point,
                        parked_at: 30.minutes.ago,
                        exited_at: nil)

        duration = session.total_continuous_duration
        expect(duration).to be > 4.5
      end
    end

    context 'without continuous parking' do
      it 'calculates duration from current parked_at' do
        parked_at = 2.hours.ago
        session = build(:parking_session,
                        vehicle_type: 'S',
                        parking_slot: parking_slot,
                        entry_point: entry_point,
                        parked_at: parked_at,
                        exited_at: nil)

        duration = session.total_continuous_duration
        expect(duration).to be_within(0.1).of(2.0)
      end
    end
  end
end
