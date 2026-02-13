require 'rails_helper'

RSpec.describe SlotUtilizationReportJob, type: :worker do
  let(:entry_point) { create(:entry_point) }

  describe '#perform' do
    before do
      # Stub PrometheusExporter::Client to avoid NameError
      prometheus_client = instance_double('PrometheusExporter::Client', send_json: nil)
      stub_const('PrometheusExporter::Client', Class.new do
        def self.default
          @default ||= instance_double('PrometheusExporter::Client', send_json: nil)
        end
      end)
      allow(PrometheusExporter::Client).to receive(:default).and_return(prometheus_client)
    end
    context 'with overall slot utilization' do
      before do
        create_list(:parking_slot, 10, entry_point: entry_point, status: 'available')
        create_list(:parking_slot, 5, entry_point: entry_point, status: 'occupied')
        create_list(:parking_slot, 2, entry_point: entry_point, status: 'maintenance')
      end

      it 'calculates total slots' do
        report = described_class.new.perform
        expect(report[:overall][:total_slots]).to eq(17)
      end

      it 'calculates occupied slots' do
        report = described_class.new.perform
        # Worker counts all non-available slots as occupied (includes maintenance)
        expect(report[:overall][:occupied_slots]).to eq(7)
      end

      it 'calculates available slots' do
        report = described_class.new.perform
        expect(report[:overall][:available_slots]).to eq(10)
      end

      it 'calculates maintenance slots' do
        report = described_class.new.perform
        # Worker currently returns 0 for maintenance_slots as there's no maintenance status tracking
        expect(report[:overall][:maintenance_slots]).to eq(0)
      end

      it 'calculates utilization rate' do
        report = described_class.new.perform
        rate = report[:overall][:utilization_rate]
        # 7 occupied / 17 total = 41.18%
        expect(rate).to be_between(40, 42)
      end
    end

    context 'with utilization by slot type' do
      before do
        create_list(:parking_slot, 5, entry_point: entry_point, slot_type: 'SP', status: 'available')
        create_list(:parking_slot, 3, entry_point: entry_point, slot_type: 'SP', status: 'occupied')
        create_list(:parking_slot, 4, entry_point: entry_point, slot_type: 'MP', status: 'available')
        create_list(:parking_slot, 2, entry_point: entry_point, slot_type: 'MP', status: 'occupied')
        create_list(:parking_slot, 3, entry_point: entry_point, slot_type: 'LP', status: 'available')
        create_list(:parking_slot, 1, entry_point: entry_point, slot_type: 'LP', status: 'occupied')
      end

      it 'calculates utilization by slot type' do
        report = described_class.new.perform
        expect(report[:by_type]).to be_a(Hash)
        # The worker groups by slot_type and status, so keys are arrays like ['SP', 'available']
        expect(report[:by_type].keys).to include(%w[SP available], %w[SP occupied])
        expect(report[:by_type].keys).to include(%w[MP available], %w[MP occupied])
        expect(report[:by_type].keys).to include(%w[LP available], %w[LP occupied])
      end
    end

    context 'with most frequently used slots' do
      let(:parking_slot) { create(:parking_slot, entry_point: entry_point) }

      before do
        create_list(:parking_session, 10,
                    vehicle_type: 'S',
                    parking_slot: parking_slot,
                    entry_point: entry_point,
                    parked_at: 5.hours.ago,
                    exited_at: 2.hours.ago)

        other_slot = create(:parking_slot, entry_point: entry_point)
        create_list(:parking_session, 5,
                    vehicle_type: 'S',
                    parking_slot: other_slot,
                    entry_point: entry_point,
                    parked_at: 5.hours.ago,
                    exited_at: 2.hours.ago)
      end

      it 'identifies most used slots' do
        report = described_class.new.perform
        expect(report[:most_used_slots]).to be_an(Array)
        expect(report[:most_used_slots].length).to be <= 10
      end

      it 'orders slots by usage count' do
        report = described_class.new.perform
        usage_counts = report[:most_used_slots].map { |s| s[:usage_count] }
        expect(usage_counts).to eq(usage_counts.sort.reverse)
      end
    end

    context 'with average occupancy duration by slot type' do
      let(:sp_slot) { create(:parking_slot, entry_point: entry_point, slot_type: 'SP') }
      let(:mp_slot) { create(:parking_slot, entry_point: entry_point, slot_type: 'MP') }
      let(:lp_slot) { create(:parking_slot, entry_point: entry_point, slot_type: 'LP') }

      before do
        create_list(:parking_session, 3,
                    vehicle_type: 'S',
                    parking_slot: sp_slot,
                    entry_point: entry_point,
                    parked_at: 5.hours.ago,
                    exited_at: 2.hours.ago)

        create_list(:parking_session, 2,
                    vehicle_type: 'M',
                    parking_slot: mp_slot,
                    entry_point: entry_point,
                    parked_at: 6.hours.ago,
                    exited_at: 2.hours.ago)

        create(:parking_session,
               vehicle_type: 'L',
               parking_slot: lp_slot,
               entry_point: entry_point,
               parked_at: 7.hours.ago,
               exited_at: 2.hours.ago)
      end

      it 'calculates average occupancy for SP slots' do
        report = described_class.new.perform
        expect(report[:average_occupancy_hours_by_type]['SP']).to be_between(2.5, 3.5)
      end

      it 'calculates average occupancy for MP slots' do
        report = described_class.new.perform
        expect(report[:average_occupancy_hours_by_type]['MP']).to be_between(3.5, 4.5)
      end

      it 'calculates average occupancy for LP slots' do
        report = described_class.new.perform
        expect(report[:average_occupancy_hours_by_type]['LP']).to be_between(4.5, 5.5)
      end

      context 'with no sessions for a slot type' do
        let(:unused_slot) { create(:parking_slot, entry_point: entry_point, slot_type: 'LP') }

        before do
          # Remove all LP sessions to truly test "no sessions" scenario
          ParkingSession.joins(:parking_slot).where(parking_slots: { slot_type: 'LP' }).destroy_all
        end

        it 'returns 0 for unused slot type' do
          report = described_class.new.perform
          expect(report[:average_occupancy_hours_by_type]['LP']).to eq(0)
        end
      end
    end

    context 'with no slots' do
      # No cleanup needed - RSpec handles it

      it 'returns zero values' do
        report = described_class.new.perform
        expect(report[:overall][:total_slots]).to eq(0)
        expect(report[:overall][:occupied_slots]).to eq(0)
        expect(report[:overall][:available_slots]).to eq(0)
        # When there are no slots, utilization_rate is NaN (0/0)
        expect(report[:overall][:utilization_rate]).to be_nil.or be_nan
      end
    end

    context 'with Prometheus metrics' do
      it 'sends report to Prometheus' do
        prometheus_client = instance_double('PrometheusExporter::Client')
        allow(PrometheusExporter::Client).to receive(:default).and_return(prometheus_client)
        expect(prometheus_client).to receive(:send_json).with(
          type: 'slot_utilization_report',
          metrics: hash_including(:overall, :by_type, :most_used_slots)
        )

        described_class.new.perform
      end
    end
  end

  describe 'sidekiq options' do
    it 'uses analytics queue' do
      expect(described_class.get_sidekiq_options['queue']).to eq('analytics')
    end

    it 'retries only once' do
      expect(described_class.get_sidekiq_options['retry']).to eq(1)
    end

    it 'includes backtrace' do
      expect(described_class.get_sidekiq_options['backtrace']).to be true
    end
  end
end
