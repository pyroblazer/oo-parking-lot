require 'rails_helper'

RSpec.describe KafkaEventRetryJob, type: :worker do
  let(:entry_point) { create(:entry_point) }
  let(:parking_slot) { create(:parking_slot, entry_point: entry_point) }

  describe '#perform' do
    context 'with retryable failed events' do
      let!(:failed_event) do
        create(:kafka_event,
               event_type: KafkaEvent::VEHICLE_PARKED,
               event_key: 'test-key',
               status: 'failed',
               retry_count: 2)
      end

      let!(:old_failed_event) do
        create(:kafka_event,
               event_type: KafkaEvent::VEHICLE_PARKED,
               event_key: 'old-key',
               status: 'failed',
               retry_count: 6)
      end

      let!(:pending_event) do
        create(:kafka_event,
               event_type: KafkaEvent::VEHICLE_PARKED,
               event_key: 'pending-key',
               status: 'pending',
               retry_count: 0)
      end

      it 'retries events with retry_count < 5' do
        producer = instance_double('KafkaProducer')
        allow(KafkaProducer).to receive(:new).and_return(producer)
        allow(producer).to receive(:publish).and_return(failed_event)

        described_class.new.perform

        failed_event.reload
        expect(failed_event.status).to eq('published')
      end

      it 'does not retry events with retry_count >= 5' do
        described_class.new.perform
        old_failed_event.reload
        expect(old_failed_event.status).to eq('failed')
      end

      it 'does not retry pending events' do
        described_class.new.perform
        pending_event.reload
        expect(pending_event.status).to eq('pending')
      end

      it 'limits retries to 100 events' do
        create_list(:kafka_event, 150,
                    event_type: KafkaEvent::VEHICLE_PARKED,
                    status: 'failed',
                    retry_count: 2)

        producer = instance_double('KafkaProducer')
        allow(KafkaProducer).to receive(:new).and_return(producer)
        allow(producer).to receive(:publish).and_return(nil)

        described_class.new.perform

        # Verify that only 100 events were processed (updated to published)
        # This includes 1 from the context setup + 99 from the newly created 150
        expect(KafkaEvent.where(status: 'published').count).to eq(100)
        # Verify that remaining events stay failed
        # This includes 1 old_failed_event (retry_count: 6) + 51 from the newly created 150
        expect(KafkaEvent.where(status: 'failed').count).to eq(52)
      end
    end

    context 'when retry succeeds' do
      let!(:failed_event) do
        create(:kafka_event,
               event_type: KafkaEvent::VEHICLE_PARKED,
               event_key: 'test-key',
               status: 'failed',
               retry_count: 2)
      end

      it 'updates event status to published' do
        producer = instance_double('KafkaProducer')
        allow(KafkaProducer).to receive(:new).and_return(producer)
        allow(producer).to receive(:publish).and_return(failed_event)

        described_class.new.perform

        failed_event.reload
        expect(failed_event.status).to eq('published')
      end

      it 'does not increment retry count' do
        producer = instance_double('KafkaProducer')
        allow(KafkaProducer).to receive(:new).and_return(producer)
        allow(producer).to receive(:publish).and_return(failed_event)

        described_class.new.perform

        failed_event.reload
        expect(failed_event.retry_count).to eq(2)
      end
    end

    context 'when retry fails' do
      let!(:failed_event) do
        create(:kafka_event,
               event_type: KafkaEvent::VEHICLE_PARKED,
               event_key: 'test-key',
               status: 'failed',
               retry_count: 2)
      end

      it 'increments retry count' do
        producer = instance_double('KafkaProducer')
        allow(KafkaProducer).to receive(:new).and_return(producer)
        allow(producer).to receive(:publish).and_raise(KafkaProducer::PublishError, 'Failed to publish')

        described_class.new.perform

        failed_event.reload
        expect(failed_event.retry_count).to eq(3)
      end

      it 'updates event status to retrying' do
        producer = instance_double('KafkaProducer')
        allow(KafkaProducer).to receive(:new).and_return(producer)
        allow(producer).to receive(:publish).and_raise(KafkaProducer::PublishError, 'Failed to publish')

        described_class.new.perform

        failed_event.reload
        expect(failed_event.status).to eq('retrying')
      end

      it 'stores error message' do
        producer = instance_double('KafkaProducer')
        allow(KafkaProducer).to receive(:new).and_return(producer)
        allow(producer).to receive(:publish).and_raise(KafkaProducer::PublishError, 'Failed to publish')

        described_class.new.perform

        failed_event.reload
        expect(failed_event.error_message).to eq('Failed to publish')
      end
    end
  end

  describe 'sidekiq options' do
    it 'uses kafka_events queue' do
      expect(described_class.get_sidekiq_options['queue']).to eq('kafka_events')
    end

    it 'retries only once' do
      expect(described_class.get_sidekiq_options['retry']).to eq(1)
    end

    it 'includes backtrace' do
      expect(described_class.get_sidekiq_options['backtrace']).to be true
    end
  end
end
