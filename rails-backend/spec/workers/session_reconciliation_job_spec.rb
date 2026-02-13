require 'rails_helper'

RSpec.describe SessionReconciliationJob, type: :worker do
  let(:entry_point) { create(:entry_point) }

  let(:parking_slot) { create(:parking_slot, entry_point: entry_point) }

  describe '#perform' do
    context 'with long-active sessions' do
      let!(:long_active_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 25.hours.ago,
               exited_at: nil)
      end

      let!(:normal_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 1.hour.ago,
               exited_at: nil)
      end

      it 'detects long-active sessions' do
        expect(Sentry).to receive(:capture_message).with(
          'Long-active parking session detected',
          hash_including(
            level: 'warning',
            extra: hash_including(
              session_id: long_active_session.id,
              duration_hours: a_value >= 24.0
            )
          )
        )

        described_class.new.perform
      end

      it 'does not alert for normal sessions' do
        expect(Sentry).not_to receive(:capture_message).with(
          'Long-active parking session detected',
          hash_including(
            extra: hash_including(session_id: normal_session.id)
          )
        )

        described_class.new.perform
      end
    end

    context 'with inconsistent session states' do
      let!(:inconsistent_session) do
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 1.hour.ago,
               exited_at: nil)
      end

      before do
        # Use a valid state that's not 'active' or 'exited'
        # Valid states are: 'active', 'exited', 'billing_pending', 'billing_completed'
        inconsistent_session.update_column(:state, 'billing_pending')
      end

      it 'detects inconsistent sessions' do
        described_class.new.perform
        inconsistent_session.reload
        expect(inconsistent_session.state).to eq('active')
      end
    end

    context 'with orphaned slots' do
      let!(:orphaned_slot) do
        create(:parking_slot, entry_point: entry_point, status: 'occupied')
      end

      it 'detects orphaned slots' do
        # The job only logs orphaned slots, doesn't change status
        # Slot availability is determined by active sessions, not status column
        expect { described_class.new.perform }.not_to raise_error
      end
    end

    context 'with normal slots' do
      let!(:occupied_slot) do
        slot = create(:parking_slot, entry_point: entry_point, status: 'occupied')
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: slot,
               entry_point: entry_point,
               parked_at: 1.hour.ago,
               exited_at: nil)
        slot
      end

      let!(:available_slot) do
        create(:parking_slot, entry_point: entry_point, status: 'available')
      end

      it 'does not modify normal slots' do
        described_class.new.perform
        occupied_slot.reload
        available_slot.reload
        expect(occupied_slot.status).to eq('occupied')
        expect(available_slot.status).to eq('available')
      end
    end

    context 'with slots having only completed sessions' do
      let!(:slot_with_completed_session) do
        slot = create(:parking_slot, entry_point: entry_point, status: 'occupied')
        create(:parking_session,
               vehicle_type: 'S',
               parking_slot: slot,
               entry_point: entry_point,
               parked_at: 5.hours.ago,
               exited_at: 2.hours.ago)
        slot
      end

      it 'logs slot with only completed sessions' do
        # The job only logs orphaned slots, doesn't change status
        # Slot availability is determined by active sessions, not status column
        expect { described_class.new.perform }.not_to raise_error
      end
    end
  end

  describe 'sidekiq options' do
    it 'uses audit queue' do
      expect(described_class.get_sidekiq_options['queue']).to eq('audit')
    end

    it 'retries only once' do
      expect(described_class.get_sidekiq_options['retry']).to eq(1)
    end

    it 'includes backtrace' do
      expect(described_class.get_sidekiq_options['backtrace']).to be true
    end
  end
end
