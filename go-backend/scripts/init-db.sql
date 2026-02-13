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
    total_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    base_start_time TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert entry points with individual INSERT ... ON CONFLICT DO UPDATE
INSERT INTO entry_points (identifier, name) VALUES ('A', 'Entry Point A')
ON CONFLICT (identifier) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO entry_points (identifier, name) VALUES ('B', 'Entry Point B')
ON CONFLICT (identifier) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO entry_points (identifier, name) VALUES ('C', 'Entry Point C')
ON CONFLICT (identifier) DO UPDATE SET name = EXCLUDED.name;

-- Insert parking slots (with available = TRUE)
INSERT INTO parking_slots (slot_label, slot_type, distances, available) VALUES
    ('SP-1', 'SP', '[5, 15, 25]', TRUE),
    ('SP-2', 'SP', '[10, 5, 15]', TRUE),
    ('SP-3', 'SP', '[15, 5, 5]', TRUE),
    ('MP-1', 'MP', '[10, 10, 20]', TRUE),
    ('MP-2', 'MP', '[20, 10, 10]', TRUE),
    ('LP-1', 'LP', '[15, 15, 15]', TRUE),
    ('LP-2', 'LP', '[2, 5, 6]', TRUE)
ON CONFLICT (slot_label) DO NOTHING;
