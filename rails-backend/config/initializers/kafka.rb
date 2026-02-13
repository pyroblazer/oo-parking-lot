# Kafka Configuration
# Initialize Kafka producer and consumer for event-driven architecture

Rails.application.config.to_prepare do
  # Kafka configuration
  kafka_config = {
    seed_brokers: ENV.fetch('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092').split(','),
    client_id: "rails-backend-#{Rails.env}",
    connect_timeout: 10,
    socket_timeout: 30,
    logger: Rails.logger
  }

  Rails.configuration.x.kafka = kafka_config
end

# Kafka topics configuration
Rails.configuration.x.kafka_topics = {
  'vehicle.parked' => {
    partitions: 3,
    replication_factor: 1,
    retention_ms: 7 * 24 * 60 * 60 * 1000 # 7 days
  },
  'vehicle.unparked' => {
    partitions: 3,
    replication_factor: 1,
    retention_ms: 7 * 24 * 60 * 60 * 1000
  },
  'session.merged' => {
    partitions: 3,
    replication_factor: 1,
    retention_ms: 7 * 24 * 60 * 60 * 1000
  },
  'billing.completed' => {
    partitions: 3,
    replication_factor: 1,
    retention_ms: 30 * 24 * 60 * 60 * 1000 # 30 days for audit
  },
  'slot.allocated' => {
    partitions: 3,
    replication_factor: 1,
    retention_ms: 7 * 24 * 60 * 60 * 1000
  }
}
