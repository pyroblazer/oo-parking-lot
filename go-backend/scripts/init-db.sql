-- Initialize Go backend database tables

-- Entry Points table
CREATE TABLE IF NOT EXISTS entry_points (
    id BIGSERIAL PRIMARY KEY,
    identifier VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Parking Slots table
CREATE TABLE IF NOT EXISTS parking_slots (
    id BIGSERIAL PRIMARY KEY,
    slot_label VARCHAR(255) UNIQUE NOT NULL,
    slot_type VARCHAR(50) NOT NULL,
    distances JSONB NOT NULL,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Parking Sessions table
CREATE TABLE IF NOT EXISTS parking_sessions (
    id BIGSERIAL PRIMARY KEY,
    vehicle_type VARCHAR(50) NOT NULL,
    parking_slot_id BIGINT NOT NULL REFERENCES parking_slots(id),
    entry_point_id BIGINT NOT NULL REFERENCES entry_points(id),
    parked_at TIMESTAMP NOT NULL,
    exited_at TIMESTAMP,
    total_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    license_plate VARCHAR(20),
    base_start_time TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for continuous parking queries (vehicle_type + license_plate + exited_at)
CREATE INDEX IF NOT EXISTS idx_parking_sessions_vehicle_license_exit ON parking_sessions(vehicle_type, license_plate, exited_at);

-- Kafka Events table (for event tracking)
CREATE TABLE IF NOT EXISTS kafka_events (
    id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    partition INTEGER NOT NULL DEFAULT 0,
    kafka_offset BIGINT NOT NULL DEFAULT 0,
    event_key VARCHAR(255),
    event_payload JSONB NOT NULL DEFAULT '{}',
    correlation_id VARCHAR(255),
    causation_id VARCHAR(255),
    idempotency_key VARCHAR(255),
    event_id VARCHAR(255),
    occurred_at TIMESTAMP NOT NULL,
    published_at TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Kafka events
CREATE INDEX IF NOT EXISTS idx_kafka_events_event_type ON kafka_events(event_type);
CREATE INDEX IF NOT EXISTS idx_kafka_events_topic ON kafka_events(topic);
CREATE INDEX IF NOT EXISTS idx_kafka_events_event_id ON kafka_events(event_id);
CREATE INDEX IF NOT EXISTS idx_kafka_events_idempotency_key ON kafka_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_kafka_events_correlation_id ON kafka_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_kafka_events_status ON kafka_events(status);
CREATE INDEX IF NOT EXISTS idx_kafka_events_occurred_at ON kafka_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_kafka_events_retry ON kafka_events(status, occurred_at, retry_count);
CREATE INDEX IF NOT EXISTS idx_kafka_events_replay ON kafka_events(event_type, occurred_at);

-- Vehicles table (for vehicle tracking)
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_plate VARCHAR(255) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    color VARCHAR(255),
    brand VARCHAR(255),
    model VARCHAR(255),
    year INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}',
    first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_hours_parked DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_frequent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_type ON vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_first_seen_at ON vehicles(first_seen_at);
CREATE INDEX IF NOT EXISTS idx_vehicles_last_seen_at ON vehicles(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_vehicles_total_spent ON vehicles(total_spent);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_frequent ON vehicles(is_frequent);
CREATE INDEX IF NOT EXISTS idx_vehicles_analytics ON vehicles(vehicle_type, total_sessions, total_spent);

-- Billing Audit Logs table (for billing audit trail)
CREATE TABLE IF NOT EXISTS billing_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    parking_session_id BIGINT NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    slot_label VARCHAR(255) NOT NULL,
    slot_type VARCHAR(50) NOT NULL,
    entry_point VARCHAR(255) NOT NULL,
    parked_at TIMESTAMP NOT NULL,
    exited_at TIMESTAMP,
    total_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    base_fee DECIMAL(10,2) NOT NULL,
    exceeding_fee DECIMAL(10,2) NOT NULL,
    exceeding_hours INTEGER NOT NULL,
    long_term_days INTEGER NOT NULL DEFAULT 0,
    long_term_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    duration_hours DECIMAL(10,2) NOT NULL,
    is_continuous BOOLEAN NOT NULL DEFAULT FALSE,
    base_start_time TIMESTAMP,
    fee_breakdown JSONB NOT NULL DEFAULT '{}',
    correlation_id VARCHAR(255),
    idempotency_key VARCHAR(255),
    billing_version VARCHAR(50) NOT NULL DEFAULT '1.0',
    calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for billing audit logs
CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_parking_session_id ON billing_audit_logs(parking_session_id);
CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_parked_at ON billing_audit_logs(parked_at);
CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_exited_at ON billing_audit_logs(exited_at);
CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_total_fee ON billing_audit_logs(total_fee);
CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_vehicle_type ON billing_audit_logs(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_correlation_id ON billing_audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_idempotency_key ON billing_audit_logs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_billing_audit_logs_reports ON billing_audit_logs(parked_at, exited_at, total_fee);

-- Insert entry points with ON CONFLICT DO NOTHING to make it idempotent
INSERT INTO entry_points (identifier, name, created_at, updated_at) VALUES ('A', 'Entry Point A', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (identifier) DO NOTHING;

INSERT INTO entry_points (identifier, name, created_at, updated_at) VALUES ('B', 'Entry Point B', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (identifier) DO NOTHING;

INSERT INTO entry_points (identifier, name, created_at, updated_at) VALUES ('C', 'Entry Point C', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (identifier) DO NOTHING;

-- Insert parking slots with ON CONFLICT DO NOTHING to make it idempotent
-- Each slot has 3 distance values corresponding to entry points A, B, C
-- Added more SP slots (SP-4, SP-5, SP-6) to prevent test exhaustion issues
INSERT INTO parking_slots (slot_label, slot_type, distances, available, created_at, updated_at) VALUES
    ('SP-1', 'SP', '[5, 15, 25]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SP-2', 'SP', '[10, 5, 15]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SP-3', 'SP', '[15, 5, 5]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SP-4', 'SP', '[20, 10, 15]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SP-5', 'SP', '[25, 15, 20]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('SP-6', 'SP', '[30, 20, 25]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('MP-1', 'MP', '[10, 10, 20]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('MP-2', 'MP', '[20, 10, 10]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('LP-1', 'LP', '[15, 15, 15]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('LP-2', 'LP', '[2, 5, 6]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (slot_label) DO NOTHING;
