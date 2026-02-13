require 'rails_helper'

RSpec.describe ParkingSlot, type: :model do
  describe 'associations' do
    it { should belong_to(:entry_point).optional }
    it { should have_many(:parking_sessions) }
  end

  describe 'validations' do
    subject { build(:parking_slot) }

    it { should validate_presence_of(:slot_label) }
    it { should validate_uniqueness_of(:slot_label) }
    it { should validate_presence_of(:slot_type) }
    it { should validate_inclusion_of(:slot_type).in_array(%w[SP MP LP]) }
    it { should validate_presence_of(:distances) }
  end

  describe '#available?' do
    let(:entry_point) { create(:entry_point) }
    let(:parking_slot) { create(:parking_slot, entry_point: entry_point) }

    context 'when slot has no active sessions' do
      it 'returns true' do
        expect(parking_slot.available?).to be true
      end
    end

    context 'when slot has an active session' do
      it 'returns false' do
        # When creating a parking session, the slot status should be updated to 'occupied'
        # to reflect the business logic that slots are managed by ParkingService
        parking_slot.update!(status: 'occupied')
        create(:parking_session, parking_slot: parking_slot, entry_point: entry_point)
        expect(parking_slot.available?).to be false
      end
    end

    context 'when slot has only completed sessions' do
      it 'returns true' do
        create(:parking_session, :completed, parking_slot: parking_slot, entry_point: entry_point)
        expect(parking_slot.available?).to be true
      end
    end
  end

  describe '#compatible_with?' do
    let(:entry_point) { create(:entry_point) }
    let(:sp_slot) { create(:parking_slot, slot_type: 'SP', entry_point: entry_point) }
    let(:mp_slot) { create(:parking_slot, slot_type: 'MP', entry_point: entry_point) }
    let(:lp_slot) { create(:parking_slot, slot_type: 'LP', entry_point: entry_point) }

    context 'Small vehicle' do
      it 'can park in SP, MP, or LP' do
        expect(sp_slot.compatible_with?('S')).to be true
        expect(mp_slot.compatible_with?('S')).to be true
        expect(lp_slot.compatible_with?('S')).to be true
      end
    end

    context 'Medium vehicle' do
      it 'can park in MP or LP' do
        expect(sp_slot.compatible_with?('M')).to be false
        expect(mp_slot.compatible_with?('M')).to be true
        expect(lp_slot.compatible_with?('M')).to be true
      end
    end

    context 'Large vehicle' do
      it 'can only park in LP' do
        expect(sp_slot.compatible_with?('L')).to be false
        expect(mp_slot.compatible_with?('L')).to be false
        expect(lp_slot.compatible_with?('L')).to be true
      end
    end
  end
end
