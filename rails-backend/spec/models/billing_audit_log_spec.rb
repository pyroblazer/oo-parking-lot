require 'rails_helper'

RSpec.describe BillingAuditLog, type: :model do
  let(:entry_point) { create(:entry_point) }
  let(:parking_slot) { create(:parking_slot, entry_point: entry_point) }
  let(:session) do
    create(:parking_session,
           vehicle_type: 'S',
           parking_slot: parking_slot,
           entry_point: entry_point,
           parked_at: 2.hours.ago,
           exited_at: 1.hour.ago)
  end

  describe 'associations' do
    it { is_expected.to belong_to(:parking_session) }
  end

  describe 'validations' do
    subject { build(:billing_audit_log) }

    it { is_expected.to belong_to(:parking_session).required(true) }
    it { is_expected.to validate_presence_of(:vehicle_type) }
    it { is_expected.to validate_presence_of(:slot_label) }
    it { is_expected.to validate_presence_of(:slot_type) }
    it { is_expected.to validate_presence_of(:entry_point) }
    it { is_expected.to validate_presence_of(:total_fee) }
    it { is_expected.to validate_inclusion_of(:vehicle_type).in_array(%w[S M L]) }
    it { is_expected.to validate_inclusion_of(:slot_type).in_array(%w[SP MP LP]) }
  end

  describe 'scopes' do
    context 'with completed sessions' do
      let!(:completed_audit_log) do
        create(:billing_audit_log,
               parking_session: session,
               vehicle_type: 'S',
               slot_label: 'SP-1',
               slot_type: 'SP',
               entry_point: 'A',
               duration_hours: 2,
               total_fee: 40.0)
      end

      it 'returns completed audit logs' do
        expect(described_class.all).to include(completed_audit_log)
      end
    end

    context 'with continuous parking' do
      let!(:continuous_audit_log) do
        create(:billing_audit_log,
               parking_session: session,
               vehicle_type: 'S',
               slot_label: 'SP-1',
               slot_type: 'SP',
               entry_point: 'A',
               duration_hours: 5,
               total_fee: 80.0,
               is_continuous: true)
      end

      it 'returns continuous audit logs' do
        expect(described_class.where(is_continuous: true)).to include(continuous_audit_log)
      end
    end

    context 'with long-term parking' do
      let!(:long_term_audit_log) do
        create(:billing_audit_log,
               parking_session: session,
               vehicle_type: 'S',
               slot_label: 'SP-1',
               slot_type: 'SP',
               entry_point: 'A',
               duration_hours: 25,
               total_fee: 5040.0,
               long_term_days: 1,
               long_term_fee: 5000.0)
      end

      it 'returns long-term audit logs' do
        expect(described_class.where.not(long_term_days: nil)).to include(long_term_audit_log)
      end
    end
  end

  describe 'edge cases' do
    context 'with zero duration' do
      it 'handles zero duration' do
        unique_session = create(:parking_session,
                                vehicle_type: 'S',
                                parking_slot: parking_slot,
                                entry_point: entry_point,
                                parked_at: 2.hours.ago,
                                exited_at: 2.hours.ago)
        audit_log = create(:billing_audit_log,
                           parking_session: unique_session,
                           duration_hours: 0,
                           total_fee: 40.0)
        expect(audit_log).to be_valid
      end
    end

    context 'with very short duration' do
      it 'handles very short duration' do
        unique_session = create(:parking_session,
                                vehicle_type: 'S',
                                parking_slot: parking_slot,
                                entry_point: entry_point,
                                parked_at: 6.minutes.ago,
                                exited_at: Time.current)
        audit_log = create(:billing_audit_log,
                           parking_session: unique_session,
                           duration_hours: 0.1,
                           total_fee: 40.0)
        expect(audit_log).to be_valid
      end
    end

    context 'with very long duration' do
      it 'handles very long duration' do
        unique_session = create(:parking_session,
                                vehicle_type: 'S',
                                parking_slot: parking_slot,
                                entry_point: entry_point,
                                parked_at: 1000.hours.ago,
                                exited_at: Time.current)
        audit_log = create(:billing_audit_log,
                           parking_session: unique_session,
                           duration_hours: 1000,
                           total_fee: 50_000.0)
        expect(audit_log).to be_valid
      end
    end

    context 'with zero fee' do
      it 'handles zero fee' do
        unique_session = create(:parking_session,
                                vehicle_type: 'S',
                                parking_slot: parking_slot,
                                entry_point: entry_point,
                                parked_at: 1.hour.ago,
                                exited_at: Time.current)
        audit_log = create(:billing_audit_log,
                           parking_session: unique_session,
                           duration_hours: 1,
                           total_fee: 0.0)
        expect(audit_log).to be_valid
      end
    end

    context 'with very large fee' do
      it 'handles very large fee' do
        unique_session = create(:parking_session,
                                vehicle_type: 'S',
                                parking_slot: parking_slot,
                                entry_point: entry_point,
                                parked_at: 100.hours.ago,
                                exited_at: Time.current)
        audit_log = create(:billing_audit_log,
                           parking_session: unique_session,
                           duration_hours: 100,
                           total_fee: 100_000.0)
        expect(audit_log).to be_valid
      end
    end

    context 'with negative fee' do
      it 'handles negative fee' do
        audit_log = build(:billing_audit_log,
                          duration_hours: 1,
                          total_fee: -10.0)
        expect(audit_log).not_to be_valid
      end
    end

    context 'with negative duration' do
      it 'handles negative duration' do
        audit_log = build(:billing_audit_log,
                          duration_hours: -1,
                          total_fee: 40.0)
        expect(audit_log).not_to be_valid
      end
    end

    context 'with maximum long-term days' do
      it 'handles maximum long-term days' do
        unique_session = create(:parking_session,
                                vehicle_type: 'S',
                                parking_slot: parking_slot,
                                entry_point: entry_point,
                                parked_at: 1000.hours.ago,
                                exited_at: Time.current)
        audit_log = create(:billing_audit_log,
                           parking_session: unique_session,
                           duration_hours: 1000,
                           long_term_days: 41,
                           long_term_fee: 205_000.0)
        expect(audit_log).to be_valid
      end
    end

    context 'with default long-term values' do
      it 'handles default long-term values' do
        unique_session = create(:parking_session,
                                vehicle_type: 'S',
                                parking_slot: parking_slot,
                                entry_point: entry_point,
                                parked_at: 2.hours.ago,
                                exited_at: Time.current)
        audit_log = create(:billing_audit_log,
                           parking_session: unique_session,
                           duration_hours: 2,
                           long_term_days: 0,
                           long_term_fee: 0)
        expect(audit_log).to be_valid
        expect(audit_log.long_term_days).to eq(0)
        expect(audit_log.long_term_fee).to eq(0)
      end
    end
  end

  describe 'concurrency' do
    it 'handles concurrent audit log creation' do
      create_method = method(:create)
      threads = Array.new(10) do |i|
        Thread.new do
          unique_session = create(:parking_session,
                                  vehicle_type: 'S',
                                  parking_slot: parking_slot,
                                  entry_point: entry_point,
                                  parked_at: 2.hours.ago,
                                  exited_at: Time.current)
          create_method.call(:billing_audit_log,
                             parking_session: unique_session,
                             vehicle_type: 'S',
                             slot_label: "SP-#{i}",
                             slot_type: 'SP',
                             entry_point: 'A',
                             duration_hours: 2,
                             total_fee: 40.0)
        end
      end

      threads.each(&:join)
      expect(described_class.count).to eq(10)
    end
  end

  describe 'data integrity' do
    context 'with correlation id' do
      it 'stores correlation id' do
        unique_session = create(:parking_session,
                                vehicle_type: 'S',
                                parking_slot: parking_slot,
                                entry_point: entry_point,
                                parked_at: 2.hours.ago,
                                exited_at: Time.current)
        audit_log = create(:billing_audit_log,
                           parking_session: unique_session,
                           correlation_id: 'test-correlation-123')
        expect(audit_log.correlation_id).to eq('test-correlation-123')
      end
    end

    context 'with idempotency key' do
      it 'stores idempotency key' do
        unique_session = create(:parking_session,
                                vehicle_type: 'S',
                                parking_slot: parking_slot,
                                entry_point: entry_point,
                                parked_at: 2.hours.ago,
                                exited_at: Time.current)
        audit_log = create(:billing_audit_log,
                           parking_session: unique_session,
                           idempotency_key: 'audit:session-123')
        expect(audit_log.idempotency_key).to eq('audit:session-123')
      end
    end

    context 'with nil correlation id' do
      it 'handles nil correlation id' do
        audit_log = build(:billing_audit_log,
                          parking_session: session,
                          correlation_id: nil)
        expect(audit_log).to be_valid
      end
    end

    context 'with nil idempotency key' do
      it 'handles nil idempotency key' do
        audit_log = build(:billing_audit_log,
                          parking_session: session,
                          idempotency_key: nil)
        expect(audit_log).to be_valid
      end
    end
  end

  describe 'fee breakdown tracking' do
    context 'with base fee only' do
      it 'tracks base fee correctly' do
        unique_session = create(:parking_session,
                                vehicle_type: 'S',
                                parking_slot: parking_slot,
                                entry_point: entry_point,
                                parked_at: 2.hours.ago,
                                exited_at: Time.current)
        audit_log = create(:billing_audit_log,
                           parking_session: unique_session,
                           duration_hours: 2,
                           total_fee: 40.0,
                           base_fee: 40.0,
                           exceeding_fee: 0,
                           exceeding_hours: 0)
        expect(audit_log.base_fee).to eq(40.0)
        expect(audit_log.exceeding_fee).to eq(0)
        expect(audit_log.exceeding_hours).to eq(0)
      end
    end

    context 'with exceeding fee' do
      it 'tracks exceeding fee correctly' do
        unique_session = create(:parking_session,
                                vehicle_type: 'S',
                                parking_slot: parking_slot,
                                entry_point: entry_point,
                                parked_at: 5.hours.ago,
                                exited_at: Time.current)
        audit_log = create(:billing_audit_log,
                           parking_session: unique_session,
                           duration_hours: 5,
                           total_fee: 80.0,
                           base_fee: 40.0,
                           exceeding_fee: 40.0,
                           exceeding_hours: 2)
        expect(audit_log.base_fee).to eq(40.0)
        expect(audit_log.exceeding_fee).to eq(40.0)
        expect(audit_log.exceeding_hours).to eq(2)
      end
    end

    context 'with long-term fee' do
      it 'tracks long-term fee correctly' do
        unique_session = create(:parking_session,
                                vehicle_type: 'S',
                                parking_slot: parking_slot,
                                entry_point: entry_point,
                                parked_at: 25.hours.ago,
                                exited_at: Time.current)
        audit_log = create(:billing_audit_log,
                           parking_session: unique_session,
                           duration_hours: 25,
                           total_fee: 5040.0,
                           long_term_days: 1,
                           long_term_fee: 5000.0,
                           base_fee: 40.0,
                           exceeding_fee: 0,
                           exceeding_hours: 0)
        expect(audit_log.long_term_days).to eq(1)
        expect(audit_log.long_term_fee).to eq(5000.0)
      end
    end
  end

  describe 'timestamp tracking' do
    it 'records created_at timestamp' do
      audit_log = create(:billing_audit_log,
                         parking_session: session)
      expect(audit_log.created_at).to be_present
      expect(audit_log.created_at).to be_within(1.second).of(Time.current)
    end

    it 'records updated_at timestamp' do
      audit_log = create(:billing_audit_log,
                         parking_session: session)
      expect(audit_log.updated_at).to be_present
      expect(audit_log.updated_at).to be_within(1.second).of(Time.current)
    end
  end

  describe 'association with parking session' do
    it 'correctly associates with parking session' do
      audit_log = create(:billing_audit_log,
                         parking_session: session)
      expect(audit_log.parking_session).to eq(session)
    end

    it 'prevents deletion of session with associated audit log' do
      audit_log = create(:billing_audit_log,
                         parking_session: session)
      expect do
        session.destroy
      end.to raise_error(ActiveRecord::InvalidForeignKey)
      expect(described_class.find_by(id: audit_log.id)).to eq(audit_log)
    end
  end
end
