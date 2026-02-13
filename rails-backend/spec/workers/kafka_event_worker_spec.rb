require 'rails_helper'

RSpec.describe KafkaEventWorker, type: :worker do
  let(:entry_point) { create(:entry_point) }
  let(:parking_slot) { create(:parking_slot, entry_point: entry_point) }
  let(:session) do
    create(:parking_session,
           vehicle_type: 'S',
           parking_slot: parking_slot,
           entry_point: entry_point,
           parked_at: 2.hours.ago)
  end

  describe '#perform' do
    context 'with VEHICLE_PARKED event' do
      it 'publishes vehicle parked event' do
        producer = instance_double('KafkaProducer')
        allow(KafkaProducer).to receive(:new).and_return(producer)
        expect(producer).to receive(:vehicle_parked).with(
          session: session,
          idempotency_key: "park:#{session.id}"
        )

        described_class.new.perform(
          KafkaEvent::VEHICLE_PARKED,
          session.id,
          {},
          { 'correlation_id' => session.correlation_id, 'idempotency_key' => "park:#{session.id}" }
        )
      end
    end

    context 'with VEHICLE_UNPARKED event' do
      let(:session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 2.hours.ago,
               exited_at: 1.hour.ago)
      end

      it 'publishes vehicle unparked event' do
        producer = instance_double('KafkaProducer')
        allow(KafkaProducer).to receive(:new).and_return(producer)
        fee = 40.0
        breakdown = { total_fee: fee, duration_hours: 1 }

        expect(producer).to receive(:vehicle_unparked).with(
          session: session,
          fee: fee,
          breakdown: breakdown,
          idempotency_key: "unpark:#{session.id}"
        )

        described_class.new.perform(
          KafkaEvent::VEHICLE_UNPARKED,
          session.id,
          {},
          { 'fee' => fee, 'breakdown' => breakdown, 'correlation_id' => session.correlation_id, 'idempotency_key' => "unpark:#{session.id}" }
        )
      end
    end

    context 'with SLOT_ALLOCATED event' do
      it 'publishes slot allocated event' do
        producer = instance_double('KafkaProducer')
        allow(KafkaProducer).to receive(:new).and_return(producer)

        expect(producer).to receive(:slot_allocated).with(
          session: session,
          idempotency_key: "allocate:#{session.parking_slot_id}:#{session.parked_at.to_i}"
        )

        described_class.new.perform(
          KafkaEvent::SLOT_ALLOCATED,
          session.id,
          {},
          { 'session_id' => session.id, 'correlation_id' => session.correlation_id,
            'idempotency_key' => "allocate:#{session.parking_slot_id}:#{session.parked_at.to_i}" }
        )
      end
    end

    context 'with BILLING_COMPLETED event' do
      let(:session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 2.hours.ago,
               exited_at: 1.hour.ago)
      end

      let(:audit_log) do
        create(:billing_audit_log,
               parking_session: session,
               total_fee: 40.0,
               parked_at: session.parked_at,
               exited_at: session.exited_at)
      end

      it 'publishes billing completed event' do
        producer = instance_double('KafkaProducer')
        allow(KafkaProducer).to receive(:new).and_return(producer)

        expect(producer).to receive(:billing_completed).with(
          session: session,
          audit_log: audit_log,
          idempotency_key: "billing:#{session.id}"
        )

        described_class.new.perform(
          KafkaEvent::BILLING_COMPLETED,
          session.id,
          {},
          { 'audit_log_id' => audit_log.id, 'correlation_id' => session.correlation_id, 'idempotency_key' => "billing:#{session.id}" }
        )
      end
    end

    context 'with SESSION_MERGED event' do
      let(:original_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 5.hours.ago,
               exited_at: 45.minutes.ago)
      end

      let(:merged_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 30.minutes.ago)
      end

      it 'publishes session merged event' do
        producer = instance_double('KafkaProducer')
        allow(KafkaProducer).to receive(:new).and_return(producer)

        expect(producer).to receive(:session_merged).with(
          original_session: original_session,
          merged_session: merged_session,
          idempotency_key: "merge:#{original_session.id}:#{merged_session.id}"
        )

        described_class.new.perform(
          KafkaEvent::SESSION_MERGED,
          merged_session.id,
          {},
          { 'original_session_id' => original_session.id, 'correlation_id' => merged_session.correlation_id,
            'idempotency_key' => "merge:#{original_session.id}:#{merged_session.id}" }
        )
      end
    end

    context 'with unknown event type' do
      it 'raises ArgumentError' do
        expect do
          described_class.new.perform('UNKNOWN_EVENT', session.id, {}, {})
        end.to raise_error(ArgumentError, /Unknown event type/)
      end
    end
  end

  describe 'sidekiq options' do
    it 'uses kafka_events queue' do
      expect(described_class.get_sidekiq_options['queue']).to eq('kafka_events')
    end

    it 'retries up to 5 times' do
      expect(described_class.get_sidekiq_options['retry']).to eq(5)
    end

    it 'includes backtrace' do
      expect(described_class.get_sidekiq_options['backtrace']).to be true
    end
  end
end
