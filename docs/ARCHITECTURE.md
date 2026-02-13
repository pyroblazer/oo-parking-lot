# OO Parking Lot - Architecture Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [C4 Architecture Diagrams](#c4-architecture-diagrams)
3. [Logical Service Decomposition](#logical-service-decomposition)
4. [Database Design](#database-design)
5. [Slot Allocation Algorithm](#slot-allocation-algorithm)
6. [Pricing Engine Internals](#pricing-engine-internals)
7. [Kafka Flow Diagrams](#kafka-flow-diagrams)
8. [Failure Modes](#failure-modes)
9. [Scaling Strategy](#scaling-strategy)
10. [Observability Setup](#observability-setup)
11. [Tradeoffs](#tradeoffs)

---

## System Overview

The OO Parking Lot system is a production-grade, distributed parking management platform designed for high availability, strong consistency, and horizontal scalability.

### Core Principles

- **Stateless Compute**: Application servers are stateless, all state is persisted in PostgreSQL or Redis
- **Stateful Persistence**: PostgreSQL for transactional data, Redis for transient coordination
- **Event-Driven Integration**: Kafka as the backbone for async communication
- **API-First Communication**: RESTful APIs with JSON payloads
- **Explicit Domain Boundaries**: Clear separation between logical services

### Quality Attributes

| Attribute | Implementation |
|-----------|---------------|
| High Availability | Multi-replica deployment, health checks, graceful degradation |
| Strong Consistency | PostgreSQL transactions, SELECT FOR UPDATE SKIP LOCKED |
| Horizontal Scalability | Stateless services, load balancer ready |
| Observability | Structured logs, metrics, distributed tracing |
| Fault Tolerance | Circuit breakers, retries, idempotency |

---

## C4 Architecture Diagrams

### Level 1: System Context

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         OO Parking Lot System                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Web Client  │  │ Mobile Client │  │ Admin Panel  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                   │                   │          │
│         └───────────────────┴───────────────────┘          │
│                           │                              │
│                           ▼                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            API Gateway / Load Balancer         │   │
│  └───────────────────────────┬────────────────────┘   │
│                            │                             │
│         ┌──────────────────┼──────────────────┐         │
│         │                  │                  │         │
│         ▼                  ▼                  ▼         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Rails Backend │  │ Go Backend    │  │ Kafka Cluster │ │
│  │ (Control     │  │ (Data Plane)  │  │              │ │
│  │  Plane)      │  │               │  │              │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │          │
│         └──────────────────┴──────────────────┘          │
│                           │                             │
│         ┌──────────────────┼──────────────────┐         │
│         │                  │                  │         │
│         ▼                  ▼                  ▼         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ PostgreSQL   │  │ Redis         │  │ Observability │ │
│  │             │  │               │  │ Stack        │ │
│  └──────────────┘  └──────────────┘  └──────┬───────┘ │
│                                             │          │
│         ┌───────────────────────────────────────┼───────┐ │
│         │                               │          │         │
│         ▼                               ▼          ▼         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Prometheus   │  │ Grafana       │  │ Jaeger       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Level 2: Container Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Rails Backend (Control Plane)           │
├─────────────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Puma Web Server                   │   │
│  └───────────────────────────┬────────────────────┘   │
│                            │                         │
│         ┌──────────────────┼──────────────────┐         │
│         │                  │                  │         │
│         ▼                  ▼                  ▼         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Controllers  │  │ Services     │  │ Models       │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │         │
│         └──────────────────┴──────────────────┘         │
│                           │                             │
│                           ▼                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │              ActiveRecord ORM              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Logical Service Decomposition

### 1. Parking Allocation Service

**Responsibility**: Determines closest valid slot, enforces concurrency safety, emits allocation events

**Key Operations**:
- Find closest available slot for vehicle type and entry point
- Lock slot atomically using SELECT FOR UPDATE SKIP LOCKED
- Emit slot.allocated event to Kafka
- Update slot status to 'occupied'

**API Endpoints**:
- `POST /api/v1/parking/sessions` - Park vehicle
- `GET /api/v1/parking/slots/available` - List available slots

**Implementation**:
- Rails: [`ParkingService`](../rails-backend/app/services/parking_service.rb)
- Go: [`ParkingService`](../go-backend/internal/services/parking_service.go)

### 2. Parking Session Service

**Responsibility**: Manages session lifecycle, enforces continuous parking rules, guarantees session uniqueness

**Key Operations**:
- Create parking session with unique constraints
- Handle continuous parking (merge sessions within 1 hour)
- Update session state (active → exited)
- Emit vehicle.parked and vehicle.unparked events

**API Endpoints**:
- `GET /api/v1/parking/sessions/:id` - Get session details
- `POST /api/v1/parking/sessions/:id/unpark` - Unpark vehicle

**Implementation**:
- Rails: [`ParkingSession`](../rails-backend/app/models/parking_session.rb) model
- Go: [`ParkingSession`](../go-backend/internal/models/parking_session.go) model

### 3. Pricing & Billing Service

**Responsibility**: Computes fees deterministically, applies rounding rules, handles 24-hour chunk billing

**Key Operations**:
- Calculate base rate (₱40 for first 3 hours)
- Calculate exceeding hourly rate based on slot type
- Apply 24-hour chunk rate (₱5,000 per day)
- Generate detailed fee breakdown
- Create immutable billing audit log

**Strategy Pattern**:
- [`BasePricingStrategy`](../rails-backend/app/services/pricing/base_pricing_strategy.rb) - Abstract base
- [`StandardPricingStrategy`](../rails-backend/app/services/pricing/standard_pricing_strategy.rb) - Default implementation
- [`PricingEngine`](../rails-backend/app/services/pricing_engine.rb) - Strategy selector

**Implementation**:
- Rails: [`PricingEngine`](../rails-backend/app/services/pricing_engine.rb)
- Go: [`FeeCalculator`](../go-backend/internal/services/fee_calculator.go)

### 4. Topology & Distance Service

**Responsibility**: Manages entry points, maintains slot distance matrices, supports dynamic expansion

**Key Operations**:
- List all entry points
- Calculate distance from entry point to slot
- Support new entry points and slots without code changes

**API Endpoints**:
- `GET /api/v1/parking/entry-points` - List entry points

**Implementation**:
- Rails: [`EntryPoint`](../rails-backend/app/models/entry_point.rb) model
- Go: [`EntryPoint`](../go-backend/internal/models/entry_point.go) model

### 5. Event Processing Service

**Responsibility**: Consumes Kafka events, performs async side effects, ensures idempotency

**Key Operations**:
- Consume vehicle.parked events
- Consume vehicle.unparked events
- Consume session.merged events
- Consume billing.completed events
- Retry failed events with exponential backoff

**Implementation**:
- Rails: [`KafkaEventWorker`](../rails-backend/app/workers/kafka_event_worker.rb)
- Go: [`Worker`](../go-backend/internal/worker/worker.go) with Asynq

### 6. Audit & Observability Service

**Responsibility**: Immutable billing logs, regulatory-grade traceability, metrics collection

**Key Operations**:
- Create immutable billing audit log
- Collect business metrics (allocation latency, slot utilization, billing duration)
- Publish metrics to Prometheus
- Trace requests with OpenTelemetry

**Implementation**:
- Rails: [`BillingAuditWorker`](../rails-backend/app/workers/billing_audit_worker.rb)
- Rails: [`AnalyticsReportJob`](../rails-backend/app/workers/analytics_report_job.rb)

---

## Database Design

### Schema Overview

**Strong Normalization**: All tables are in 3NF or higher
**Referential Integrity**: Foreign key constraints on all relationships
**Explicit State Machines**: Status columns with CHECK constraints
**No Ambiguous Nulls**: All nullable columns have clear semantics

### Key Tables

#### parking_sessions

| Column | Type | Constraints | Purpose |
|---------|------|-------------|---------|
| id | UUID | PRIMARY KEY | Unique identifier |
| vehicle_id | UUID | FOREIGN KEY | Vehicle reference |
| parking_slot_id | UUID | FOREIGN KEY | Slot reference |
| entry_point_id | UUID | FOREIGN KEY | Entry point reference |
| vehicle_type | VARCHAR(1) | CHECK(S,M,L) | Vehicle size |
| parked_at | TIMESTAMP | NOT NULL | Entry time |
| exited_at | TIMESTAMP | NULLABLE | Exit time |
| total_fee | DECIMAL(10,2) | DEFAULT 0 | Calculated fee |
| state | VARCHAR(20) | CHECK | Session state |
| billing_state | VARCHAR(20) | CHECK | Billing state |
| idempotency_key | VARCHAR(255) | UNIQUE | Idempotency |
| correlation_id | VARCHAR(255) | INDEX | Distributed tracing |
| fee_breakdown | JSONB | NOT NULL | Detailed breakdown |
| metadata | JSONB | NOT NULL | Additional data |

**Indexes**:
- Unique: `(parking_slot_id, exited_at)` WHERE `exited_at IS NULL` (prevents double booking)
- Partial: `(parked_at, exited_at)` WHERE `exited_at IS NULL` (active sessions)
- Covering: `(parking_slot_id, exited_at, vehicle_type)` (allocation queries)
- Composite: `(vehicle_id, parked_at, exited_at)` (vehicle timeline)

#### parking_slots

| Column | Type | Constraints | Purpose |
|---------|------|-------------|---------|
| id | UUID | PRIMARY KEY | Unique identifier |
| slot_label | VARCHAR(10) | UNIQUE | Display label |
| slot_type | VARCHAR(2) | CHECK(SP,MP,LP) | Slot size |
| distances | JSONB | NOT NULL | Distance matrix |
| status | VARCHAR(20) | CHECK | Slot status |
| last_occupied_at | TIMESTAMP | NULLABLE | Analytics |

**Indexes**:
- Covering: `(slot_type, status, slot_label)` (allocation queries)
- GIN: `distances` (JSONB queries)

#### billing_audit_logs

| Column | Type | Constraints | Purpose |
|---------|------|-------------|---------|
| id | UUID | PRIMARY KEY | Unique identifier |
| parking_session_id | UUID | FOREIGN KEY | Session reference |
| total_fee | DECIMAL(10,2) | NOT NULL | Final fee |
| fee_breakdown | JSONB | NOT NULL | Detailed breakdown |
| billing_version | VARCHAR(10) | NOT NULL | Pricing version |
| calculated_at | TIMESTAMP | NOT NULL | Calculation time |

**Immutable**: Records are never updated or deleted (append-only)

#### kafka_events

| Column | Type | Constraints | Purpose |
|---------|------|-------------|---------|
| id | UUID | PRIMARY KEY | Unique identifier |
| event_type | VARCHAR(50) | NOT NULL | Event type |
| topic | VARCHAR(100) | NOT NULL | Kafka topic |
| event_id | VARCHAR(100) | UNIQUE | Event ID |
| event_payload | JSONB | NOT NULL | Event data |
| status | VARCHAR(20) | CHECK | Processing status |
| retry_count | INTEGER | DEFAULT 0 | Retry counter |

**Indexes**:
- Composite: `(status, occurred_at, retry_count)` (retry processing)
- Composite: `(event_type, occurred_at)` (event replay)

---

## Slot Allocation Algorithm

### Algorithm Overview

The slot allocation algorithm is designed to be **linearizable** - all concurrent requests see the same slot allocation order.

### Steps

1. **Validate Input**
   - Check vehicle type is valid (S, M, L)
   - Check entry point exists
   - Return error if invalid

2. **Find Compatible Slots**
   ```sql
   SELECT * FROM parking_slots
   WHERE slot_type IN (
     CASE :vehicle_type
       WHEN 'S' THEN ARRAY['SP','MP','LP']
       WHEN 'M' THEN ARRAY['MP','LP']
       WHEN 'L' THEN ARRAY['LP']
     END
   )
   AND status = 'available'
   ```

3. **Sort by Distance**
   - Extract distance from `distances` JSONB for the entry point
   - Sort ascending (closest first)
   - Secondary sort by `slot_label` (deterministic tiebreaker)

4. **Lock Slot Atomically**
   ```sql
   SELECT * FROM parking_slots
   WHERE id = :slot_id
   AND status = 'available'
   FOR UPDATE SKIP LOCKED
   LIMIT 1
   ```

5. **Create Session**
   ```sql
   INSERT INTO parking_sessions (
     vehicle_type, parking_slot_id, entry_point_id,
     parked_at, state, correlation_id
   ) VALUES (
     :vehicle_type, :slot_id, :entry_point_id,
     NOW(), 'active', :correlation_id
   )
   ```

6. **Update Slot Status**
   ```sql
   UPDATE parking_slots
   SET status = 'occupied', last_occupied_at = NOW()
   WHERE id = :slot_id
   ```

7. **Emit Event**
   - Publish `slot.allocated` event to Kafka
   - Publish `vehicle.parked` event to Kafka
   - Include correlation ID for distributed tracing

### Concurrency Guarantees

- **Linearizability**: SELECT FOR UPDATE SKIP LOCKED ensures only one request allocates a slot
- **No Deadlocks**: SKIP LOCKED skips locked rows instead of waiting
- **Idempotency**: Unique constraint on `(parking_slot_id, exited_at)` prevents double booking
- **Retry Safety**: Transaction rollback on any failure

---

## Pricing Engine Internals

### Strategy Pattern

The pricing engine uses the Strategy pattern for extensibility:

```
┌─────────────────────────────────────────────────────────┐
│              Pricing Engine                       │
├─────────────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────────────────────────────────────────┐   │
│  │         Strategy Registry               │   │
│  └──────────────────────────────────────────────┘   │
│                                                   │
│  ┌──────────────────┼──────────────────┐         │
│  │                  │                  │         │
│  ▼                  ▼                  ▼         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Standard   │  │  Future:    │  │  Future:    │
│  │  Strategy    │  │  Promotional │  │  VIP         │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Standard Pricing Rules

1. **Base Rate**: ₱40 flat rate for first 3 hours (all vehicles, all slots)

2. **Exceeding Hourly Rates** (after 3 hours):
   - SP (Small/Medium/Large): ₱20/hour
   - MP (Medium/Large): ₱60/hour
   - LP (Large only): ₱100/hour

3. **Long-Term Parking** (24+ hours):
   - Every full 24-hour block: ₱5,000 (regardless of slot type)
   - Remaining hours: Standard exceeding rates apply

4. **Time Calculations**:
   - All times in UTC
   - Round up to nearest hour (e.g., 6.4 hours → 7 hours)
   - Continuous parking: Merge sessions within 1 hour

### Fee Calculation Example

**Scenario**: Small vehicle in SP slot, parked for 26.5 hours

```
Duration: 26.5 hours
Rounded: 27 hours

Long-term calculation:
  Full days: 1 (24 hours)
  Remaining: 3 hours

Fee breakdown:
  Long-term: 1 × ₱5,000 = ₱5,000
  Base rate: ₱40 (first 3 hours)
  Exceeding: 0 hours (within base rate)

Total: ₱5,040
```

---

## Kafka Flow Diagrams

### Event Topics

| Topic | Purpose | Partitions | Retention |
|-------|---------|------------|-----------|
| vehicle.parked | Vehicle parked events | 3 | 7 days |
| vehicle.unparked | Vehicle unparked events | 3 | 7 days |
| session.merged | Continuous parking merges | 3 | 7 days |
| billing.completed | Billing finalization | 3 | 30 days |
| slot.allocated | Slot allocation | 3 | 7 days |

### Event Flow

```
┌──────────┐
│  Client  │
└─────┬────┘
      │
      ▼
┌──────────────────────────────────────────────────┐
│  Parking Allocation Service               │
└──────────────────────────────────────────────────┘
      │
      ├───► Kafka: slot.allocated
      ├───► Kafka: vehicle.parked
      │
      ▼
┌──────────────────────────────────────────────────┐
│  Event Processing Service                │
└──────────────────────────────────────────────────┘
      │
      ├───► Update Analytics
      ├───► Send Notifications
      └───► Update Dashboard
```

### Event Schema

**vehicle.parked**:
```json
{
  "event_id": "uuid",
  "session_id": "uuid",
  "vehicle_id": "uuid",
  "vehicle_type": "S|M|L",
  "slot_id": "uuid",
  "slot_label": "A-1",
  "slot_type": "SP|MP|LP",
  "entry_point": "A|B|C",
  "parked_at": "ISO8601",
  "correlation_id": "uuid",
  "occurred_at": "ISO8601"
}
```

---

## Failure Modes

### Database Failure

**Detection**: Health check fails, connection timeout

**Mitigation**:
- Retry with exponential backoff
- Serve from cached data (stale but available)
- Graceful degradation: Read-only mode

**Recovery**:
- Automatic reconnection
- Replay missed events from Kafka

### Redis Failure

**Detection**: Connection timeout, command failures

**Mitigation**:
- Fallback to in-memory rate limiting
- Disable background job deduplication
- Log all failures for manual intervention

**Recovery**:
- Automatic reconnection
- Reprocess failed jobs

### Kafka Failure

**Detection**: Connection timeout, publish failures

**Mitigation**:
- Buffer events in database
- Retry with exponential backoff
- Circuit breaker pattern

**Recovery**:
- Replay buffered events
- Offset management

### Slot Exhaustion

**Detection**: No available slots for vehicle type

**Mitigation**:
- Return clear error to client
- Log alert for operations
- Suggest alternative entry points

**Recovery**:
- Monitor slot utilization
- Alert before exhaustion

---

## Scaling Strategy

### Horizontal Scaling

**Stateless Services**: All application servers are stateless

**Load Balancer**: Distribute requests across instances

**Database**:
- Read replicas for SELECT queries
- Connection pooling (pgbouncer)
- Partitioning by entry point (future)

**Redis**:
- Cluster mode for high availability
- Sharding by service type

**Kafka**:
- Multiple brokers (3+ for production)
- Partition by session_id
- Replication factor: 2

### Vertical Scaling

**Rails Backend**:
- CPU: 4+ cores
- RAM: 8+ GB
- Puma workers: 4-8

**Go Backend**:
- CPU: 2+ cores
- RAM: 4+ GB
- Goroutines: 1000+

**PostgreSQL**:
- CPU: 8+ cores
- RAM: 16+ GB
- Storage: SSD, 100+ GB

---

## Observability Setup

### Logging

**Format**: JSON structured logs only

**Tools**:
- Rails: Lograge 0.14 + Semantic Logger 4.13
- Go: Zerolog 1.34.0

**Correlation IDs**: Propagated end-to-end

**Centralized**: All logs sent to centralized log aggregation

### Metrics

**Prometheus Metrics**:
- `parking_slot_allocation_duration_seconds` - Histogram
- `parking_billing_calculation_duration_seconds` - Histogram
- `parking_active_sessions` - Gauge
- `parking_slot_utilization` - Gauge (by slot type)
- `parking_total_revenue` - Counter
- `parking_sessions_by_vehicle_type` - Counter (by vehicle type)
- `parking_billing_errors` - Counter
- `parking_allocation_errors` - Counter
- `parking_kafka_events_published` - Counter (by event type)
- `parking_kafka_events_failed` - Counter (by event type)

**Grafana Dashboards**:
- Slot utilization by type
- Revenue over time
- Allocation latency
- Error rates
- Kafka consumer lag

### Tracing

**OpenTelemetry**:
- Service name: `rails-backend` or `go-backend`
- Exporter: OTLP (Jaeger)
- Sampling: 10% (production), 100% (development)

**Spans**:
- HTTP request lifecycle
- Database query lifecycle
- Background job lifecycle
- Kafka event lifecycle

**Jaeger UI**: http://localhost:16686

### Error Tracking

**Sentry**:
- DSN configured per environment
- Sample rate: 100% errors, 10% transactions
- User context: Vehicle ID, session ID
- Custom tags: Service, version, correlation ID

---

## Tradeoffs

### Database Choice

**PostgreSQL** (Selected):

**Advantages:**
- ACID compliance for data integrity
- Native JSONB support for flexible data
- Full-text search capabilities
- Mature tooling and community support

**Disadvantages:**
- Horizontal scaling is more complex
- Requires careful connection management

**Alternative: MongoDB**:

**Advantages:**
- Easy horizontal scaling
- Flexible schema design
- High write performance

**Disadvantages:**
- Weak consistency guarantees
- No ACID transaction support

### Message Broker Choice

**Kafka** (Selected):

**Advantages:**
- High throughput for large message volumes
- Durable message storage
- Consumer group support for scaling
- Strong ordering guarantees

**Disadvantages:**
- Higher operational complexity
- Requires more infrastructure
- Steeper learning curve

**Alternative: Redis Streams**:

**Advantages:**
- Simple to operate and maintain
- Low latency for real-time processing
- Lightweight infrastructure

**Disadvantages:**
- Limited message retention
- No consumer group support
- Less durable storage

### Pricing Engine Choice

**Strategy Pattern** (Selected):

**Advantages:**
- Easy to extend with new pricing rules
- Highly testable in isolation
- Composable and reusable
- Clear separation of concerns

**Disadvantages:**
- More classes and files to maintain
- Indirection overhead
- Initial development time higher

**Alternative: Inline Conditionals**:

**Advantages:**
- Simple to implement initially
- Fewer files and classes
- Direct and obvious code flow

**Disadvantages:**
- Hard to test different pricing strategies
- Difficult to extend with new rules
- Business logic mixed with control flow

---

## Conclusion

This architecture is designed to:

1. **Serve tens of thousands of concurrent vehicles** - Stateless services, connection pooling
2. **Run 24/7 with zero planned downtime** - Health checks, rolling updates
3. **Survive failures** - Circuit breakers, retries, idempotency
4. **Scale horizontally** - Stateless compute, partitioned data
5. **Provide observability** - Structured logs, metrics, tracing
6. **Enable future growth** - Strategy pattern, event-driven design
