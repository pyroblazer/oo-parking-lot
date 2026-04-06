# Test Configuration for OO Parking Lot
# This file provides helper methods for test setup and configuration

module TestConfiguration
  # Create test entry point
  # Always create a new entry point for test isolation
  def self.create_test_entry_point(identifier = 'A', name = 'Test Entrance')
    EntryPoint.create!(identifier: identifier, name: name)
  end

  # Create test parking slots
  def self.create_test_slots
    entry_point = create_test_entry_point

    [
      create(:parking_slot, slot_type: 'SP', entry_point: entry_point, slot_label: 'SP-1', distances: [1, 4, 5]),
      create(:parking_slot, slot_type: 'SP', entry_point: entry_point, slot_label: 'SP-2', distances: [2, 5, 6]),
      create(:parking_slot, slot_type: 'SP', entry_point: entry_point, slot_label: 'SP-3', distances: [3, 6, 7]),
      create(:parking_slot, slot_type: 'MP', entry_point: entry_point, slot_label: 'MP-1', distances: [2, 5, 8]),
      create(:parking_slot, slot_type: 'MP', entry_point: entry_point, slot_label: 'MP-2', distances: [1, 4, 7]),
      create(:parking_slot, slot_type: 'LP', entry_point: entry_point, slot_label: 'LP-1', distances: [3, 6, 9])
    ]
  end

  # Create test parking session
  def self.create_test_session(vehicle_type: 'S', status: 'active')
    entry_point = create_test_entry_point
    slot = create_test_slots.first

    create(:parking_session,
           vehicle_type: vehicle_type,
           parking_slot: slot,
           entry_point: entry_point,
           parked_at: Time.current,
           exited_at: status == 'active' ? nil : 1.hour.ago,
           total_fee: status == 'active' ? 0 : 40.0)
  end

  # Mock Kafka producer for tests
  def self.mock_kafka_producer
    instance_double(KafkaProducer).tap do |mock|
      allow(mock).to receive_messages(new: mock, publish: true, vehicle_parked: true, vehicle_unparked: true, slot_allocated: true,
                                      billing_completed: true)
    end
  end

  # Mock Sidekiq workers
  def self.mock_sidekiq_workers
    allow(KafkaEventWorker).to receive(:perform_async).and_return(true)
    allow(BillingAuditWorker).to receive(:perform_async).and_return(true)
    allow(SessionReconciliationJob).to receive(:perform_async).and_return(true)
    allow(AnalyticsReportJob).to receive(:perform_async).and_return(true)
    allow(SlotUtilizationReportJob).to receive(:perform_async).and_return(true)
  end

  # Mock Prometheus client
  def self.mock_prometheus_client
    instance_double(PrometheusExporter::Client).tap do |mock|
      allow(mock).to receive_messages(default: mock, send_json: true)
    end
  end

  # Mock Sentry
  def self.mock_sentry
    instance_double(Sentry).tap do |mock|
      allow(mock).to receive_messages(capture_message: true, capture_exception: true)
    end
  end
end
