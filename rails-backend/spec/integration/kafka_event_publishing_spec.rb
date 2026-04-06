require 'rails_helper'
require 'sidekiq/testing'

# Integration tests for verifying Sidekiq workers are enqueued during park/unpark operations.
#
# These tests ensure that ParkingService correctly publishes Kafka events and billing audit
# logs asynchronously by enqueuing the appropriate Sidekiq workers:
#
# - park_vehicle enqueues KafkaEventWorker with VEHICLE_PARKED event type and idempotency key "park:N"
# - unpark_vehicle enqueues KafkaEventWorker with VEHICLE_UNPARKED event type and idempotency key "unpark:N"
# - unpark_vehicle enqueues BillingAuditWorker with session ID, fee, and breakdown
#
# Uses Sidekiq::Testing.fake! so jobs are pushed to the worker arrays but NOT executed,
# allowing verification of enqueue behavior without requiring a running Redis or Kafka broker.
RSpec.describe 'Kafka Event Publishing via Sidekiq Workers', type: :request do
  before do
    # Clean database state to avoid conflicts
    ParkingSlot.delete_all
    ParkingSession.delete_all
    KafkaEvent.delete_all
    BillingAuditLog.delete_all

    # Ensure entry points exist
    EntryPoint.find_or_create_by(identifier: 'A', name: 'Entry A')
    EntryPoint.find_or_create_by(identifier: 'B', name: 'Entry B')
    EntryPoint.find_or_create_by(identifier: 'C', name: 'Entry C')

    # Use fake! mode: jobs are pushed to in-memory arrays but not executed
    Sidekiq::Testing.fake!
  end

  after do
    # Clear Sidekiq job queues after each test to prevent cross-test contamination
    KafkaEventWorker.jobs.clear
    BillingAuditWorker.jobs.clear
    Sidekiq::Testing.inline!
    Timecop.return
  end

  let(:entry_point_a) { EntryPoint.find_by(identifier: 'A') }

  # Helper to park a vehicle and return session_id
  def park_vehicle(vehicle_type: 'S', entry_point_id: 'A')
    create(:parking_slot, slot_type: 'SP', status: 'available', distances: [1, 5, 10])
    post '/api/v1/sessions', params: { vehicle_type: vehicle_type, entry_point_id: entry_point_id }
    expect(response).to have_http_status(:created)
    JSON.parse(response.body)['data']['session_id']
  end

  # ---------------------------------------------------------------------------
  # park_vehicle: KafkaEventWorker with VEHICLE_PARKED
  # ---------------------------------------------------------------------------
  describe 'park_vehicle enqueues KafkaEventWorker' do
    before do
      create(:parking_slot, slot_type: 'SP', status: 'available', distances: [1, 5, 10])
    end

    it 'enqueues exactly one KafkaEventWorker job' do
      post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point_a.identifier }

      expect(response).to have_http_status(:created)
      expect(KafkaEventWorker.jobs.size).to eq(1)
    end

    it 'uses the VEHICLE_PARKED event type' do
      post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point_a.identifier }

      expect(response).to have_http_status(:created)

      job = KafkaEventWorker.jobs.first
      expect(job['args'][0]).to eq(KafkaEvent::VEHICLE_PARKED)
    end

    it 'passes the session ID as the event key' do
      post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point_a.identifier }

      expect(response).to have_http_status(:created)

      json = JSON.parse(response.body)
      session_id = json['data']['session_id']

      job = KafkaEventWorker.jobs.first
      expect(job['args'][1].to_s).to eq(session_id.to_s)
    end

    it 'includes the idempotency key "park:N" in options' do
      post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point_a.identifier }

      expect(response).to have_http_status(:created)

      json = JSON.parse(response.body)
      session_id = json['data']['session_id']

      job = KafkaEventWorker.jobs.first
      options = job['args'][3]
      expect(options['idempotency_key']).to eq("park:#{session_id}")
    end

    it 'includes a correlation_id in options' do
      post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point_a.identifier }

      expect(response).to have_http_status(:created)

      job = KafkaEventWorker.jobs.first
      options = job['args'][3]
      expect(options['correlation_id']).to be_present
      # UUID format: 8-4-4-4-12 hex characters
      expect(options['correlation_id']).to match(/\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/)
    end
  end

  # ---------------------------------------------------------------------------
  # unpark_vehicle: KafkaEventWorker with VEHICLE_UNPARKED
  # ---------------------------------------------------------------------------
  describe 'unpark_vehicle enqueues KafkaEventWorker with VEHICLE_UNPARKED' do
    it 'enqueues an additional KafkaEventWorker job (total 2: park + unpark)' do
      session_id = park_vehicle
      expect(KafkaEventWorker.jobs.size).to eq(1)

      session = ParkingSession.find(session_id)
      exited_at = session.parked_at + 2.hours
      post "/api/v1/sessions/#{session_id}/unpark", params: { exited_at: exited_at.iso8601 }

      expect(response).to have_http_status(:ok)
      expect(KafkaEventWorker.jobs.size).to eq(2)
    end

    it 'uses the VEHICLE_UNPARKED event type for the unpark job' do
      session_id = park_vehicle

      session = ParkingSession.find(session_id)
      exited_at = session.parked_at + 2.hours
      post "/api/v1/sessions/#{session_id}/unpark", params: { exited_at: exited_at.iso8601 }

      expect(response).to have_http_status(:ok)

      # The second job (index 1) is the unpark event
      unpark_job = KafkaEventWorker.jobs.last
      expect(unpark_job['args'][0]).to eq(KafkaEvent::VEHICLE_UNPARKED)
    end

    it 'passes the session ID as the event key' do
      session_id = park_vehicle

      session = ParkingSession.find(session_id)
      exited_at = session.parked_at + 2.hours
      post "/api/v1/sessions/#{session_id}/unpark", params: { exited_at: exited_at.iso8601 }

      expect(response).to have_http_status(:ok)

      unpark_job = KafkaEventWorker.jobs.last
      expect(unpark_job['args'][1].to_s).to eq(session_id.to_s)
    end

    it 'includes the idempotency key "unpark:N" in options' do
      session_id = park_vehicle

      session = ParkingSession.find(session_id)
      exited_at = session.parked_at + 2.hours
      post "/api/v1/sessions/#{session_id}/unpark", params: { exited_at: exited_at.iso8601 }

      expect(response).to have_http_status(:ok)

      unpark_job = KafkaEventWorker.jobs.last
      options = unpark_job['args'][3]
      expect(options['idempotency_key']).to eq("unpark:#{session_id}")
    end

    it 'includes the fee in options' do
      session_id = park_vehicle

      session = ParkingSession.find(session_id)
      exited_at = session.parked_at + 2.hours
      post "/api/v1/sessions/#{session_id}/unpark", params: { exited_at: exited_at.iso8601 }

      expect(response).to have_http_status(:ok)

      unpark_job = KafkaEventWorker.jobs.last
      options = unpark_job['args'][3]
      expect(options['fee']).to be_present
      # 2 hours for small vehicle => 40 flat rate (within 3 hours)
      expect(options['fee']).to eq(40)
    end

    it 'includes the breakdown in options' do
      session_id = park_vehicle

      session = ParkingSession.find(session_id)
      exited_at = session.parked_at + 2.hours
      post "/api/v1/sessions/#{session_id}/unpark", params: { exited_at: exited_at.iso8601 }

      expect(response).to have_http_status(:ok)

      unpark_job = KafkaEventWorker.jobs.last
      options = unpark_job['args'][3]
      expect(options['breakdown']).to be_present
    end
  end

  # ---------------------------------------------------------------------------
  # unpark_vehicle: BillingAuditWorker
  # ---------------------------------------------------------------------------
  describe 'unpark_vehicle enqueues BillingAuditWorker' do
    it 'enqueues exactly one BillingAuditWorker job' do
      session_id = park_vehicle

      session = ParkingSession.find(session_id)
      exited_at = session.parked_at + 2.hours
      post "/api/v1/sessions/#{session_id}/unpark", params: { exited_at: exited_at.iso8601 }

      expect(response).to have_http_status(:ok)
      expect(BillingAuditWorker.jobs.size).to eq(1)
    end

    it 'passes the session ID as the first argument' do
      session_id = park_vehicle

      session = ParkingSession.find(session_id)
      exited_at = session.parked_at + 2.hours
      post "/api/v1/sessions/#{session_id}/unpark", params: { exited_at: exited_at.iso8601 }

      expect(response).to have_http_status(:ok)

      job = BillingAuditWorker.jobs.first
      expect(job['args'][0].to_s).to eq(session_id.to_s)
    end

    it 'passes the calculated fee as the second argument' do
      session_id = park_vehicle

      session = ParkingSession.find(session_id)
      exited_at = session.parked_at + 2.hours
      post "/api/v1/sessions/#{session_id}/unpark", params: { exited_at: exited_at.iso8601 }

      expect(response).to have_http_status(:ok)

      job = BillingAuditWorker.jobs.first
      # 2 hours for small vehicle => 40 flat rate (within 3 hours)
      expect(job['args'][1]).to eq(40)
    end

    it 'passes the breakdown hash as the third argument' do
      session_id = park_vehicle

      session = ParkingSession.find(session_id)
      exited_at = session.parked_at + 2.hours
      post "/api/v1/sessions/#{session_id}/unpark", params: { exited_at: exited_at.iso8601 }

      expect(response).to have_http_status(:ok)

      job = BillingAuditWorker.jobs.first
      breakdown = job['args'][2]
      expect(breakdown).to be_a(Hash)
      expect(breakdown).to have_key('total_fee')
      expect(breakdown).to have_key('duration_hours')
      expect(breakdown).to have_key('breakdown')
    end

    it 'does not enqueue BillingAuditWorker on park (only on unpark)' do
      # Only park, no unpark
      park_vehicle
      expect(BillingAuditWorker.jobs.size).to eq(0)
    end
  end

  # ---------------------------------------------------------------------------
  # Combined: full park/unpark cycle job counts
  # ---------------------------------------------------------------------------
  describe 'full park then unpark cycle' do
    it 'enqueues 2 KafkaEventWorker jobs and 1 BillingAuditWorker job total' do
      session_id = park_vehicle

      expect(KafkaEventWorker.jobs.size).to eq(1)
      expect(BillingAuditWorker.jobs.size).to eq(0)

      # Unpark after 2 hours
      session = ParkingSession.find(session_id)
      exited_at = session.parked_at + 2.hours
      post "/api/v1/sessions/#{session_id}/unpark", params: { exited_at: exited_at.iso8601 }
      expect(response).to have_http_status(:ok)

      # Total counts: 2 KafkaEventWorker (1 park + 1 unpark), 1 BillingAuditWorker
      expect(KafkaEventWorker.jobs.size).to eq(2)
      expect(BillingAuditWorker.jobs.size).to eq(1)
    end

    it 'enqueues correct number of jobs for multiple park/unpark cycles' do
      create(:parking_slot, slot_type: 'SP', status: 'available', distances: [1, 5, 10])
      create(:parking_slot, slot_type: 'SP', status: 'available', distances: [2, 5, 10])

      reference_time = Time.current

      # First cycle: park and unpark
      Timecop.freeze(reference_time) do
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point_a.identifier }
        expect(response).to have_http_status(:created)
        session_id_1 = JSON.parse(response.body)['data']['session_id']

        session = ParkingSession.find(session_id_1)
        exited_at = session.parked_at + 1.hour
        post "/api/v1/sessions/#{session_id_1}/unpark", params: { exited_at: exited_at.iso8601 }
        expect(response).to have_http_status(:ok)
      end

      # Second cycle: park again and unpark
      Timecop.freeze(reference_time + 1.hour + 30.minutes) do
        post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point_a.identifier }
        expect(response).to have_http_status(:created)
        session_id_2 = JSON.parse(response.body)['data']['session_id']

        session = ParkingSession.find(session_id_2)
        exited_at = session.parked_at + 1.hour
        post "/api/v1/sessions/#{session_id_2}/unpark", params: { exited_at: exited_at.iso8601 }
        expect(response).to have_http_status(:ok)
      end

      # 2 park + 2 unpark = 4 KafkaEventWorker jobs
      expect(KafkaEventWorker.jobs.size).to eq(4)
      # 2 unpark = 2 BillingAuditWorker jobs
      expect(BillingAuditWorker.jobs.size).to eq(2)
    end
  end

  # ---------------------------------------------------------------------------
  # Idempotency key uniqueness across sessions
  # ---------------------------------------------------------------------------
  describe 'idempotency keys are unique per session' do
    before do
      create(:parking_slot, slot_type: 'SP', status: 'available', distances: [1, 5, 10])
      create(:parking_slot, slot_type: 'SP', status: 'available', distances: [2, 5, 10])
    end

    it 'generates different idempotency keys for different sessions' do
      # Park two vehicles
      post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point_a.identifier }
      expect(response).to have_http_status(:created)
      session_id_1 = JSON.parse(response.body)['data']['session_id']

      post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point_a.identifier }
      expect(response).to have_http_status(:created)
      session_id_2 = JSON.parse(response.body)['data']['session_id']

      expect(KafkaEventWorker.jobs.size).to eq(2)

      # Verify idempotency keys differ (they embed the session ID)
      job1 = KafkaEventWorker.jobs.first
      job2 = KafkaEventWorker.jobs.last

      key1 = job1['args'][3]['idempotency_key']
      key2 = job2['args'][3]['idempotency_key']

      expect(key1).to eq("park:#{session_id_1}")
      expect(key2).to eq("park:#{session_id_2}")
      expect(key1).not_to eq(key2)
    end
  end

  # ---------------------------------------------------------------------------
  # No workers enqueued on failure
  # ---------------------------------------------------------------------------
  describe 'no workers enqueued on failure' do
    it 'does not enqueue any workers when park fails due to no available slots' do
      # No slots created - park should fail
      post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point_a.identifier }

      expect(response).to have_http_status(:conflict)
      expect(KafkaEventWorker.jobs.size).to eq(0)
      expect(BillingAuditWorker.jobs.size).to eq(0)
    end

    it 'does not enqueue any workers when park fails due to invalid vehicle type' do
      create(:parking_slot, slot_type: 'SP', status: 'available', distances: [1, 5, 10])

      post '/api/v1/sessions', params: { vehicle_type: 'X', entry_point_id: entry_point_a.identifier }

      expect(response).to have_http_status(:bad_request)
      expect(KafkaEventWorker.jobs.size).to eq(0)
      expect(BillingAuditWorker.jobs.size).to eq(0)
    end

    it 'does not enqueue additional workers when unpark fails on already exited session' do
      session_id = park_vehicle

      session = ParkingSession.find(session_id)
      exited_at = session.parked_at + 1.hour

      # First unpark succeeds
      post "/api/v1/sessions/#{session_id}/unpark", params: { exited_at: exited_at.iso8601 }
      expect(response).to have_http_status(:ok)

      initial_kafka_jobs = KafkaEventWorker.jobs.size
      initial_billing_jobs = BillingAuditWorker.jobs.size

      # Second unpark should fail
      post "/api/v1/sessions/#{session_id}/unpark"
      expect(response).to have_http_status(:not_found)

      # No additional workers should be enqueued
      expect(KafkaEventWorker.jobs.size).to eq(initial_kafka_jobs)
      expect(BillingAuditWorker.jobs.size).to eq(initial_billing_jobs)
    end
  end

  # ---------------------------------------------------------------------------
  # Worker queue configuration
  # ---------------------------------------------------------------------------
  describe 'enqueued jobs target correct queues' do
    it 'enqueues KafkaEventWorker to the kafka_events queue' do
      create(:parking_slot, slot_type: 'SP', status: 'available', distances: [1, 5, 10])

      post '/api/v1/sessions', params: { vehicle_type: 'S', entry_point_id: entry_point_a.identifier }
      expect(response).to have_http_status(:created)

      job = KafkaEventWorker.jobs.first
      expect(job['queue']).to eq('kafka_events')
    end

    it 'enqueues BillingAuditWorker to the billing queue' do
      session_id = park_vehicle

      session = ParkingSession.find(session_id)
      exited_at = session.parked_at + 1.hour
      post "/api/v1/sessions/#{session_id}/unpark", params: { exited_at: exited_at.iso8601 }
      expect(response).to have_http_status(:ok)

      job = BillingAuditWorker.jobs.first
      expect(job['queue']).to eq('billing')
    end
  end
end
