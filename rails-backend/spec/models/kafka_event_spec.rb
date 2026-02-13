require 'rails_helper'

RSpec.describe KafkaEvent, type: :model do
  describe 'associations' do
    # No associations defined in the model
  end

  describe 'validations' do
    subject { build(:kafka_event) }

    it { should validate_presence_of(:event_type) }
    it { should validate_presence_of(:topic) }
    it { should validate_presence_of(:event_id) }
    it { should validate_presence_of(:occurred_at) }
    it { should validate_presence_of(:status) }
    it { should validate_inclusion_of(:status).in_array(%w[pending published failed retrying]) }
    it { should validate_uniqueness_of(:event_id) }
  end

  describe 'scopes' do
    let!(:pending_event) do
      create(:kafka_event, status: 'pending')
    end

    let!(:published_event) do
      create(:kafka_event, status: 'published')
    end

    let!(:failed_event) do
      create(:kafka_event, status: 'failed')
    end

    let!(:retrying_event) do
      create(:kafka_event, status: 'retrying')
    end

    it '.pending returns only pending events' do
      expect(KafkaEvent.pending).to include(pending_event)
      expect(KafkaEvent.pending).not_to include(published_event, failed_event, retrying_event)
    end

    it '.published returns only published events' do
      expect(KafkaEvent.published).to include(published_event)
      expect(KafkaEvent.published).not_to include(pending_event, failed_event, retrying_event)
    end

    it '.failed returns only failed events' do
      expect(KafkaEvent.failed).to include(failed_event)
      expect(KafkaEvent.failed).not_to include(pending_event, published_event, retrying_event)
    end

    it '.retrying returns only retrying events' do
      expect(KafkaEvent.retrying).to include(retrying_event)
      expect(KafkaEvent.retrying).not_to include(pending_event, published_event, failed_event)
    end

    it '.for_idempotency returns events with matching idempotency key' do
      key = 'test-key-123'
      event = create(:kafka_event, idempotency_key: key)
      other_event = create(:kafka_event, idempotency_key: 'other-key')

      expect(KafkaEvent.for_idempotency(key)).to include(event)
      expect(KafkaEvent.for_idempotency(key)).not_to include(other_event)
    end
  end

  describe '#can_retry?' do
    context 'when event is failed and retry count < 5' do
      it 'returns true' do
        event = build(:kafka_event, status: 'failed', retry_count: 2)
        expect(event.can_retry?).to be true
      end
    end

    context 'when event is failed and retry count >= 5' do
      it 'returns false' do
        event = build(:kafka_event, status: 'failed', retry_count: 5)
        expect(event.can_retry?).to be false
      end
    end

    context 'when event is published' do
      it 'returns false' do
        event = build(:kafka_event, status: 'published', retry_count: 0)
        expect(event.can_retry?).to be false
      end
    end

    context 'when event is pending' do
      it 'returns false' do
        event = build(:kafka_event, status: 'pending', retry_count: 0)
        expect(event.can_retry?).to be false
      end
    end

    context 'when event is retrying' do
      it 'returns false' do
        event = build(:kafka_event, status: 'retrying', retry_count: 3)
        expect(event.can_retry?).to be false
      end
    end
  end

  describe '#increment_retry!' do
    it 'increments retry count' do
      event = create(:kafka_event, retry_count: 2)
      expect do
        event.increment_retry!
      end.to change { event.reload.retry_count }.by(1)
    end
  end

  describe '#mark_published!' do
    it 'updates status to published' do
      event = create(:kafka_event, status: 'pending')
      expect do
        event.mark_published!(partition: 1, offset: 100)
      end.to change { event.reload.status }.from('pending').to('published')
    end

    it 'sets partition and offset' do
      event = create(:kafka_event, status: 'pending')
      event.mark_published!(partition: 1, offset: 100)
      event.reload
      expect(event.partition).to eq(1)
      expect(event.offset).to eq(100)
    end

    it 'sets published_at timestamp' do
      event = create(:kafka_event, status: 'pending')
      Timecop.freeze(Time.current)
      event.mark_published!(partition: 1, offset: 100)
      event.reload
      expect(event.published_at).to be_within(1.second).of(Time.current)
      Timecop.return
    end
  end

  describe '#mark_failed!' do
    it 'updates status to failed' do
      event = create(:kafka_event, status: 'retrying')
      error_message = 'Connection timeout'
      expect do
        event.mark_failed!(error_message: error_message)
      end.to change { event.reload.status }.from('retrying').to('failed')
    end

    it 'stores error message' do
      event = create(:kafka_event, status: 'retrying')
      error_message = 'Connection timeout'
      event.mark_failed!(error_message: error_message)
      event.reload
      expect(event.error_message).to eq(error_message)
    end
  end

  describe 'event type constants' do
    it 'defines VEHICLE_PARKED constant' do
      expect(KafkaEvent::VEHICLE_PARKED).to eq('vehicle.parked')
    end

    it 'defines VEHICLE_UNPARKED constant' do
      expect(KafkaEvent::VEHICLE_UNPARKED).to eq('vehicle.unparked')
    end

    it 'defines SESSION_MERGED constant' do
      expect(KafkaEvent::SESSION_MERGED).to eq('session.merged')
    end

    it 'defines BILLING_COMPLETED constant' do
      expect(KafkaEvent::BILLING_COMPLETED).to eq('billing.completed')
    end

    it 'defines SLOT_ALLOCATED constant' do
      expect(KafkaEvent::SLOT_ALLOCATED).to eq('slot.allocated')
    end
  end

  describe 'topic constants' do
    it 'maps event types to topics' do
      expect(KafkaEvent::TOPICS[KafkaEvent::VEHICLE_PARKED]).to eq('vehicle.parked')
      expect(KafkaEvent::TOPICS[KafkaEvent::VEHICLE_UNPARKED]).to eq('vehicle.unparked')
      expect(KafkaEvent::TOPICS[KafkaEvent::SESSION_MERGED]).to eq('session.merged')
      expect(KafkaEvent::TOPICS[KafkaEvent::BILLING_COMPLETED]).to eq('billing.completed')
      expect(KafkaEvent::TOPICS[KafkaEvent::SLOT_ALLOCATED]).to eq('slot.allocated')
    end

    it 'is frozen' do
      expect do
        KafkaEvent::TOPICS['vehicle.parked'] = 'new.topic'
      end.to raise_error(FrozenError)
    end
  end

  describe 'edge cases' do
    context 'with maximum retry count' do
      it 'correctly identifies cannot retry' do
        event = build(:kafka_event, status: 'failed', retry_count: 100)
        expect(event.can_retry?).to be false
      end
    end

    context 'with zero retry count' do
      it 'correctly identifies can retry' do
        event = build(:kafka_event, status: 'failed', retry_count: 0)
        expect(event.can_retry?).to be true
      end
    end

    context 'with negative retry count' do
      it 'handles negative retry count gracefully' do
        event = build(:kafka_event, status: 'failed', retry_count: -1)
        expect(event.can_retry?).to be true
      end
    end

    context 'with empty error message' do
      it 'marks as failed with empty error message' do
        event = create(:kafka_event, status: 'retrying')
        expect do
          event.mark_failed!(error_message: '')
        end.to change { event.reload.status }.to('failed')
      end
    end

    context 'with nil error message' do
      it 'marks as failed with nil error message' do
        event = create(:kafka_event, status: 'retrying')
        expect do
          event.mark_failed!(error_message: nil)
        end.to change { event.reload.status }.to('failed')
      end
    end

    context 'with very long error message' do
      it 'handles long error messages' do
        event = create(:kafka_event, status: 'retrying')
        long_message = 'A' * 10_000
        expect do
          event.mark_failed!(error_message: long_message)
        end.to change { event.reload.status }.to('failed')
        expect(event.reload.error_message).to eq(long_message)
      end
    end
  end

  describe 'concurrency' do
    it 'handles concurrent status updates', :truncation do
      event = create(:kafka_event, status: 'pending')
      event_id = event.id

      threads = 5.times.map do
        Thread.new do
          # Each thread loads the event independently to simulate concurrent access
          event_record = KafkaEvent.find(event_id)
          event_record.mark_published!(partition: 1, offset: 100)
        end
      end

      threads.each(&:join)
      event.reload
      expect(event.status).to eq('published')
    end
  end
end
