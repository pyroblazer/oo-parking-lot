require 'rails_helper'

RSpec.describe BillingAuditWorker, type: :worker do
  # Ensure Sidekiq is in fake! mode so perform_async does not execute inline.
  # Other specs (e.g. kafka_event_publishing_spec) may leak Sidekiq::Testing.inline!
  # into this file via their after(:each) hooks.
  before do
    Sidekiq::Testing.fake!
  end

  after do
    described_class.jobs.clear
    KafkaEventWorker.jobs.clear
  end

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

  describe '#perform' do
    let(:fee) { 40.0 }
    let(:breakdown) do
      {
        total_fee: fee,
        duration_hours: 1,
        base_fee: 40.0,
        exceeding_fee: 0,
        exceeding_hours: 0,
        long_term: { days: 0, fee: 0 },
        is_continuous: false,
        base_start_time: session.parked_at
      }
    end

    it 'creates a billing audit log' do
      expect do
        described_class.new.perform(session.id, fee, breakdown)
      end.to change(BillingAuditLog, :count).by(1)
    end

    it 'stores session information in audit log' do
      described_class.new.perform(session.id, fee, breakdown)

      audit_log = BillingAuditLog.where(parking_session_id: session.id).last
      expect(audit_log.parking_session_id).to eq(session.id)
      expect(audit_log.vehicle_type).to eq('S')
      expect(audit_log.slot_label).to eq(parking_slot.slot_label)
      expect(audit_log.slot_type).to eq('SP')
      expect(audit_log.entry_point).to eq(entry_point.identifier)
    end

    it 'stores fee information in audit log' do
      described_class.new.perform(session.id, fee, breakdown)

      audit_log = BillingAuditLog.where(parking_session_id: session.id).last
      expect(audit_log.total_fee).to eq(fee)
      expect(audit_log.base_fee).to eq(breakdown[:base_fee])
      expect(audit_log.exceeding_fee).to eq(breakdown[:exceeding_fee])
      expect(audit_log.exceeding_hours).to eq(breakdown[:exceeding_hours])
    end

    it 'stores long-term information in audit log' do
      described_class.new.perform(session.id, fee, breakdown)

      audit_log = BillingAuditLog.where(parking_session_id: session.id).last
      expect(audit_log.long_term_days).to eq(0)
      expect(audit_log.long_term_fee).to eq(0)
    end

    it 'stores duration and continuous parking info' do
      described_class.new.perform(session.id, fee, breakdown)

      audit_log = BillingAuditLog.where(parking_session_id: session.id).last
      expect(audit_log.duration_hours).to eq(breakdown[:duration_hours])
      expect(audit_log.is_continuous).to eq(breakdown[:is_continuous])
      expect(audit_log.base_start_time).to eq(breakdown[:base_start_time])
    end

    it 'stores correlation id' do
      described_class.new.perform(session.id, fee, breakdown)

      audit_log = BillingAuditLog.where(parking_session_id: session.id).last
      expect(audit_log.correlation_id).to eq(session.correlation_id)
    end

    it 'sets idempotency key' do
      described_class.new.perform(session.id, fee, breakdown)

      audit_log = BillingAuditLog.where(parking_session_id: session.id).last
      expect(audit_log.idempotency_key).to eq("audit:#{session.id}")
    end

    it 'enqueues KafkaEventWorker for billing completed event' do
      expect(KafkaEventWorker).to receive(:perform_async).with(
        KafkaEvent::BILLING_COMPLETED,
        session.id,
        { 'audit_log_id' => anything },
        hash_including('correlation_id' => anything, 'idempotency_key' => anything)
      )

      described_class.new.perform(session.id, fee, breakdown)
    end

    context 'with long-term parking' do
      let(:session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 25.hours.ago,
               exited_at: 1.hour.ago)
      end

      let(:breakdown) do
        {
          total_fee: 5040.0,
          duration_hours: 25,
          base_fee: 40.0,
          exceeding_fee: 0,
          exceeding_hours: 0,
          long_term: { days: 1, fee: 5000.0 },
          is_continuous: false,
          base_start_time: session.parked_at
        }
      end

      it 'stores long-term information correctly' do
        described_class.new.perform(session.id, 5040.0, breakdown)

        audit_log = BillingAuditLog.where(parking_session_id: session.id).last
        expect(audit_log.long_term_days).to eq(1)
        expect(audit_log.long_term_fee).to eq(5000.0)
      end
    end

    context 'with continuous parking' do
      before do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 5.hours.ago,
               exited_at: 45.minutes.ago)
      end

      let(:breakdown) do
        {
          total_fee: 40.0,
          duration_hours: 5,
          base_fee: 40.0,
          exceeding_fee: 0,
          exceeding_hours: 0,
          long_term: { days: 0, fee: 0 },
          is_continuous: true,
          base_start_time: 5.hours.ago
        }
      end

      it 'stores continuous parking information correctly' do
        described_class.new.perform(session.id, 40.0, breakdown)

        audit_log = BillingAuditLog.where(parking_session_id: session.id).last
        expect(audit_log.is_continuous).to be true
      end
    end
  end

  describe 'sidekiq options' do
    it 'uses billing queue' do
      expect(described_class.get_sidekiq_options['queue']).to eq('billing')
    end

    it 'retries up to 3 times' do
      expect(described_class.get_sidekiq_options['retry']).to eq(3)
    end

    it 'includes backtrace' do
      expect(described_class.get_sidekiq_options['backtrace']).to be true
    end
  end
end
