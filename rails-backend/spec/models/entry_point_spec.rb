require 'rails_helper'

RSpec.describe EntryPoint, type: :model do
  describe 'associations' do
    it { is_expected.to have_many(:parking_slots).dependent(:nullify) }
    it { is_expected.to have_many(:parking_sessions).dependent(:nullify) }
  end

  describe 'validations' do
    subject { build(:entry_point) }

    it { is_expected.to validate_presence_of(:identifier) }
    it { is_expected.to validate_uniqueness_of(:identifier) }
    it { is_expected.to validate_presence_of(:name) }
  end

  describe '#index' do
    context 'with entry point A' do
      it 'returns 0' do
        entry_point = build(:entry_point, identifier: 'A')
        expect(entry_point.index).to eq(0)
      end
    end

    context 'with entry point B' do
      it 'returns 1' do
        entry_point = build(:entry_point, identifier: 'B')
        expect(entry_point.index).to eq(1)
      end
    end

    context 'with entry point C' do
      it 'returns 2' do
        entry_point = build(:entry_point, identifier: 'C')
        expect(entry_point.index).to eq(2)
      end
    end

    context 'with entry point Z' do
      it 'returns 25' do
        entry_point = build(:entry_point, identifier: 'Z')
        expect(entry_point.index).to eq(25)
      end
    end
  end
end
