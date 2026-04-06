require 'rails_helper'
require 'prometheus_exporter/client'

RSpec.describe AnalyticsReportJob, type: :worker do
  let(:entry_point) { create(:entry_point) }
  let(:parking_slot) { create(:parking_slot, entry_point: entry_point) }

  describe '#perform' do
    before do
      Timecop.freeze(Time.current.beginning_of_day)
      # Stub PrometheusExporter::Client to avoid NameError
      allow(PrometheusExporter::Client).to receive(:default).and_return(instance_double(PrometheusExporter::Client, send_json: nil))
    end

    after do
      Timecop.return
    end

    context 'with daily sessions' do
      let!(:yesterday_sessions) do
        create_list(:parking_session, 5,
                    vehicle_type: 'S',
                    parking_slot: parking_slot,
                    entry_point: entry_point,
                    parked_at: 20.hours.ago,
                    exited_at: 19.hours.ago,
                    total_fee: 40.0)
      end

      let!(:today_sessions) do
        create_list(:parking_session, 3,
                    vehicle_type: 'S',
                    parking_slot: parking_slot,
                    entry_point: entry_point,
                    parked_at: 1.hour.from_now,
                    exited_at: nil)
      end

      it 'calculates total sessions' do
        report = described_class.new.perform
        expect(report[:total_sessions]).to eq(5)
      end

      it 'calculates active sessions' do
        report = described_class.new.perform
        expect(report[:active_sessions]).to eq(0)
      end

      it 'calculates completed sessions' do
        report = described_class.new.perform
        expect(report[:completed_sessions]).to eq(5)
      end

      it 'calculates total revenue' do
        report = described_class.new.perform
        expect(report[:total_revenue]).to eq(200.0)
      end

      it 'calculates vehicle distribution' do
        create(:parking_session,
               vehicle_type: 'M',
               parking_slot: parking_slot,
               entry_point: entry_point,
               parked_at: 18.hours.ago,
               exited_at: 17.hours.ago,
               total_fee: 60.0)

        report = described_class.new.perform
        expect(report[:vehicle_distribution]).to include('S' => 5, 'M' => 1)
      end
    end

    context 'with slot utilization' do
      before do
        create_list(:parking_slot, 10, entry_point: entry_point, status: 'available')
        create_list(:parking_slot, 5, entry_point: entry_point, status: 'occupied')
      end

      it 'calculates total slots' do
        report = described_class.new.perform
        expect(report[:slot_utilization][:total_slots]).to eq(ParkingSlot.count)
      end

      it 'calculates occupied slots' do
        report = described_class.new.perform
        expect(report[:slot_utilization][:occupied_slots]).to eq(5)
      end

      it 'calculates utilization rate' do
        report = described_class.new.perform
        rate = report[:slot_utilization][:utilization_rate]
        expect(rate).to be_between(0, 100)
      end
    end

    context 'with average session duration' do
      let!(:sessions) do
        [
          create(:parking_session,
                 vehicle_type: 'S',
                 parking_slot: parking_slot,
                 entry_point: entry_point,
                 parked_at: 20.hours.ago,
                 exited_at: 19.hours.ago,
                 total_fee: 40.0),
          create(:parking_session,
                 vehicle_type: 'S',
                 parking_slot: parking_slot,
                 entry_point: entry_point,
                 parked_at: 19.hours.ago,
                 exited_at: 18.hours.ago,
                 total_fee: 40.0),
          create(:parking_session,
                 vehicle_type: 'S',
                 parking_slot: parking_slot,
                 entry_point: entry_point,
                 parked_at: 18.hours.ago,
                 exited_at: 17.hours.ago,
                 total_fee: 40.0)
        ]
      end

      it 'calculates average session duration' do
        report = described_class.new.perform
        expect(report[:average_session_duration_hours]).to be_between(0.9, 1.1)
      end
    end

    context 'with no sessions' do
      it 'returns zero values' do
        report = described_class.new.perform
        expect(report[:total_sessions]).to eq(0)
        expect(report[:active_sessions]).to eq(0)
        expect(report[:completed_sessions]).to eq(0)
        expect(report[:total_revenue]).to eq(0)
        expect(report[:average_session_duration_hours]).to eq(0)
      end
    end

    context 'with Prometheus metrics' do
      it 'sends report to Prometheus' do
        prometheus_client = instance_double(PrometheusExporter::Client)
        allow(PrometheusExporter::Client).to receive(:default).and_return(prometheus_client)
        expect(prometheus_client).to receive(:send_json).with(
          type: 'analytics_report',
          metrics: hash_including(:date, :total_sessions, :total_revenue)
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
