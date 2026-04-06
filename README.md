# OO Parking Lot - Parking Management System

## Architecture Overview

This is a mission-critical, revenue-generating, real-time system designed for high availability, strong consistency, and horizontal scalability. The system implements a clean object-oriented design with proper separation of concerns following enterprise-grade engineering practices.

### System Quality Attributes

| Attribute | Implementation |
|-----------|---------------|
| High Availability (HA) | Multi-replica deployment, health checks, graceful degradation |
| Strong Consistency | PostgreSQL transactions, SELECT FOR UPDATE SKIP LOCKED |
| Horizontal Scalability | Stateless services, load balancer ready |
| Eventual Consistency | Kafka-based async event processing |
| Operational Observability | Structured logs, metrics, distributed tracing |
| Developer Ergonomics | Strategy pattern, clear domain boundaries |
| UX Performance & Delight | Framer Motion animations (smooth transitions, micro-interactions) |

### Project Structure

```
oo-parking-lot/
├── rails-backend/              # Ruby on Rails API (Control Plane)
│   ├── app/
│   │   ├── models/          # ActiveRecord models
│   │   ├── services/         # Business logic (Strategy pattern)
│   │   ├── workers/          # Sidekiq background jobs
│   │   └── controllers/      # API endpoints
│   ├── config/
│   │   ├── initializers/     # Observability setup
│   │   │   ├── logging.rb      # Lograge + Semantic Logger
│   │   │   ├── prometheus.rb   # Metrics collection
│   │   │   ├── opentelemetry.rb # Distributed tracing
│   │   │   ├── sentry.rb       # Error tracking
│   │   │   ├── sidekiq.rb     # Background jobs
│   │   │   └── kafka.rb        # Event streaming
│   ├── db/migrate/             # Database migrations
│   └── spec/                  # RSpec tests
├── go-backend/                 # Go/Golang API (Data Plane)
│   ├── cmd/
│   │   ├── server/           # HTTP server
│   │   └── worker/           # Asynq background jobs
│   ├── internal/
│   │   ├── models/           # Data models
│   │   ├── services/         # Business logic
│   │   ├── repositories/      # Data access
│   │   └── worker/           # Job processing
│   └── Dockerfile
├── react-web/                 # ReactJS Web Application
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── effects/          # Visual effects (spotlight, particle background)
│   │   └── api.js          # API client
│   └── Dockerfile
├── docker-compose.yml           # Complete system orchestration
├── .github/workflows/          # CI/CD pipelines
└── docs/
    └── ARCHITECTURE.md        # Detailed architecture documentation
```

---

## Core Features

### 1. Smart Slot Assignment

- **Multiple Entry Points**: Minimum of 3 entry points (extensible)
- **Automatic Allocation**: Vehicles cannot choose slots; system assigns based on:
  - Vehicle size compatibility
  - Closest available slot to the entry point used
- **Linearizable Allocation**: SELECT FOR UPDATE SKIP LOCKED ensures no double booking
- **Idempotent APIs**: Safe retries without side effects

### 2. Vehicle & Slot Compatibility

| Vehicle Type | Allowed Slots |
|--------------|---------------|
| Small (S)    | SP, MP, LP    |
| Medium (M)   | MP, LP        |
| Large (L)    | LP only        |

### 3. Parking Fee Calculation

**Base Rate**: ₱40 flat rate for the first 3 hours (all vehicles, all slots)

**Exceeding Hourly Rates** (after 3 hours):

| Slot Type | Rate per Hour |
|-----------|---------------|
| SP        | ₱20           |
| MP        | ₱60           |
| LP        | ₱100          |

**Long-Term Parking** (24+ hours):
- Every full 24-hour block: ₱5,000 (regardless of slot type)
- Remaining hours charged using standard exceeding hourly rates
- Time calculated using round-up logic (e.g., 6.4 hours → 7 hours)

### 4. Continuous Parking Rule

- If a vehicle exits and returns within 1 hour, treated as continuous parking
- No reset of base fee or hours
- Example:
  - Exit: 10:00, Re-entry: 10:30 → continuous
  - Exit: 10:00, Re-entry: 11:05 → new parking session

---

## Tech Stack

### Backend

#### Ruby on Rails (Control Plane)
- **Ruby**: 3.4.8
- **Rails**: 8.0.1 (API-only)
- **PostgreSQL**: 15 (via pg 1.5.6)
- **Redis**: 5.2
- **Sidekiq**: 7.3 (Background job processing)
- **Sidekiq-Cron**: 2.0 (Scheduled jobs)
- **Kafka**: Event streaming (via WaterDrop 2.7)
- **Observability**:
  - Lograge 0.14 + Semantic Logger 4.13 (structured JSON logging)
  - Prometheus Exporter 2.2 (metrics)
  - OpenTelemetry 1.4 SDK (distributed tracing)
  - Sentry 5.18 (error tracking)
- **Security**:
  - Rack::Attack 6.7 (Rate limiting)
  - SecureHeaders 6.6 (HTTP security headers)
- **Testing**:
  - RSpec-Rails 6.1
  - FactoryBot-Rails 6.2
  - SimpleCov 0.22 (Code coverage)

#### Go/Golang (Data Plane)
- **Go**: 1.26
- **PostgreSQL**: 15 (via lib/pq 1.11.2)
- **Redis**: 7 (via go-redis 9.17.3)
- **Asynq**: 0.26.0 (Background job processing)
- **Kafka**: Event streaming
- **Observability**:
  - Zerolog 1.34.0 (structured JSON logging)
  - OpenTelemetry Go SDK (distributed tracing)
- **Testing**:
  - Testify 1.11.1
- **Routing**:
  - Gorilla Mux 1.8.1
- **Utilities**:
  - Google UUID 1.6.0
  - Godotenv 1.5.1 (Environment variables)

### Frontend

#### React Web
- **React**: 18.3.1
- **TypeScript**: 5.3.3
- **Vite**: 5.1.0 (build tool)
- **Tailwind CSS**: 3.4.1 (styling)
- **Framer Motion**: 11.0.0 (animations - ONLY animation library used)
- **Lottie React**: 2.4.0 (Lottie animations)
- **React Router DOM**: 6.22.0 (routing)
- **Axios**: 1.6.7 (HTTP client)
- **Zustand**: 4.5.0 (state management)
- **Storybook**: 8.0.0 (component documentation)
- **Testing**:
  - Vitest 1.2.0
  - @testing-library/react 14.2.0
  - @testing-library/user-event 14.5.2
- **Observability**:
  - Sentry React 7.110.0 (error tracking)
  - OpenTelemetry JS 1.8.0 (distributed tracing)

### Database

- **PostgreSQL**: 15
  - Strong normalization (3NF+)
  - Referential integrity (foreign keys)
  - Explicit state machines (CHECK constraints)
  - No ambiguous nulls
  - Partial indexes for active sessions
  - Covering indexes for allocation paths
  - SELECT FOR UPDATE SKIP LOCKED for concurrency

### Infrastructure

- **Docker**: All services containerized with multi-architecture support (amd64, arm64)
- **Docker Compose**: Local development orchestration with automatic platform detection
- **PostgreSQL**: 15-alpine (Database)
- **Redis**: 7-alpine (Caching and job queue)
- **Kafka**: Confluent 7.6.0 (Event streaming)
- **Zookeeper**: Confluent 7.6.0 (Kafka coordination)
- **Kafka UI (AKHQ)**: 0.24.0 (Kafka management UI)
- **Prometheus**: 2.47.0 (metrics collection)
- **Grafana**: 10.2.0 (metrics visualization)
- **CI/CD**: GitHub Actions

**Multi-Architecture Support:**
- Automatic OS and CPU architecture detection via wrapper scripts
- Supports Apple Silicon (M1/M2/M3), Intel Macs, and Linux hosts
- No manual environment variable configuration required
- Works seamlessly across development and CI environments

---

## Library & Component Reasoning

This section provides detailed reasoning for the major libraries and components used across all four project components.

### Ruby Backend (rails-backend/)

#### Core Framework & Language
- **Ruby 3.4.8 + Rails 8.0.1 (API-only)**
  - **Why chosen**: Ruby on Rails provides a mature, opinionated framework with excellent developer ergonomics and a vast ecosystem of gems. The API-only mode eliminates unnecessary overhead for a pure API service.
  - **Key benefits**: Rapid development, built-in conventions, strong community support, excellent testing tools (RSpec), and seamless integration with PostgreSQL and Redis.
  - **Alternatives considered**: Sinatra (too minimal), Node.js/Express (different skillset), Django (Python preference for other components).

#### Database & ORM
- **PostgreSQL 15 + ActiveRecord**
  - **Why chosen**: PostgreSQL provides strong ACID compliance, native JSONB support for flexible data, and advanced features like partial indexes and SELECT FOR UPDATE SKIP LOCKED for concurrent safety.
  - **Key benefits**: Strong data integrity, complex query capabilities, excellent performance for relational data, and mature tooling.
  - **Alternatives considered**: MySQL (lacks some advanced features), MongoDB (less suitable for transactional data).

#### Background Job Processing
- **Sidekiq 7.3 + Sidekiq-Cron 2.0**
  - **Why chosen**: Sidekiq is the de facto standard for Ruby background job processing, offering excellent performance, reliability, and a rich ecosystem of extensions.
  - **Key benefits**: Thread-based concurrency, Redis-backed queue, built-in retry logic, scheduled jobs via cron, and excellent monitoring tools.
  - **Alternatives considered**: Resque (slower, process-based), Delayed Job (database-backed, less scalable).

#### Event Streaming
- **Kafka + WaterDrop 2.7**
  - **Why chosen**: Kafka provides durable, scalable event streaming with strong ordering guarantees and consumer group support for horizontal scaling.
  - **Key benefits**: Event durability, consumer groups, replayability, and strong ordering guarantees.
  - **Alternatives considered**: Redis Streams (less durable, no consumer groups), RabbitMQ (different use case).

#### Observability
- **Lograge 0.14 + Semantic Logger 4.13**
  - **Why chosen**: Provides structured JSON logging that's easy to parse and analyze in log aggregation systems.
  - **Key benefits**: Structured logs, better performance than default Rails logging, and seamless integration with ELK stack.
  - **Alternatives considered**: Default Rails logger (unstructured, verbose).

- **Prometheus Exporter 2.2**
  - **Why chosen**: Industry-standard metrics collection with excellent visualization tools (Grafana).
  - **Key benefits**: Time-series metrics, alerting capabilities, and extensive ecosystem.
  - **Alternatives considered**: StatsD (less rich data model), Datadog (proprietary).

- **OpenTelemetry 1.4 SDK**
  - **Why chosen**: Vendor-neutral distributed tracing standard with broad industry adoption.
  - **Key benefits**: Vendor neutrality, extensive instrumentation support, and integration with Jaeger.
  - **Alternatives considered**: Datadog APM (proprietary), New Relic (proprietary).

- **Sentry 5.18**
  - **Why chosen**: Industry-standard error tracking with excellent alerting and debugging capabilities.
  - **Key benefits**: Real-time error tracking, stack traces, and alerting.
  - **Alternatives considered**: Rollbar (similar), Airbrake (similar).

#### Security
- **Rack::Attack 6.7**
  - **Why chosen**: Provides rate limiting and request throttling to protect against abuse.
  - **Key benefits**: Redis-backed rate limiting, configurable rules, and IP whitelisting/blacklisting.
  - **Alternatives considered**: Custom middleware (reinventing the wheel).

- **SecureHeaders 6.6**
  - **Why chosen**: Automatically sets security-related HTTP headers to protect against common vulnerabilities.
  - **Key benefits**: Defense against XSS, clickjacking, and other attacks with minimal configuration.
  - **Alternatives considered**: Manual header configuration (error-prone).

#### Testing
- **RSpec-Rails 6.1 + FactoryBot-Rails 6.2**
  - **Why chosen**: RSpec is the de facto standard for Ruby testing with a rich matcher library and excellent documentation.
  - **Key benefits**: BDD-style tests, readable syntax, and extensive ecosystem.
  - **Alternatives considered**: Minitest (built-in, less expressive).

- **SimpleCov 0.22**
  - **Why chosen**: Provides code coverage reporting to ensure comprehensive test coverage.
  - **Key benefits**: Coverage reports, CI/CD integration, and multiple output formats.
  - **Alternatives considered**: RCov (deprecated), Coveralls (SaaS).

### Go Backend (go-backend/)

#### Core Framework & Language
- **Go 1.24.0**
  - **Why chosen**: Go provides excellent performance, strong concurrency support via goroutines, and a simple, opinionated standard library.
  - **Key benefits**: Fast compilation, excellent performance, built-in concurrency, and static typing.
  - **Alternatives considered**: Rust (steeper learning curve), Java (more verbose), Node.js (different concurrency model).

#### Database & ORM
- **PostgreSQL 15 + lib/pq 1.11.2**
  - **Why chosen**: Same as Ruby backend for consistency and strong ACID compliance.
  - **Key benefits**: Strong data integrity, complex queries, and mature tooling.
  - **Alternatives considered**: sqlx (more complex), GORM (ORM preference for simplicity).

#### Background Job Processing
- **Asynq 0.26.0**
  - **Why chosen**: Asynq provides a simple, reliable Redis-backed task queue with excellent performance and monitoring.
  - **Key benefits**: Redis-backed, built-in retry logic, scheduled tasks, and excellent monitoring.
  - **Alternatives considered**: Sidekiq (Ruby-specific), Celery (Python-specific).

#### Event Streaming
- **Kafka**
  - **Why chosen**: Same as Ruby backend for consistency and event streaming capabilities.
  - **Key benefits**: Event durability, consumer groups, and replayability.
  - **Alternatives considered**: Redis Streams (less durable).

#### Observability
- **Zerolog 1.34.0**
  - **Why chosen**: Provides structured JSON logging with excellent performance and zero-allocation logging.
  - **Key benefits**: Zero-allocation, structured logs, and excellent performance.
  - **Alternatives considered**: Logrus (slower, less structured), Zap (similar).

- **OpenTelemetry Go SDK**
  - **Why chosen**: Vendor-neutral distributed tracing standard with Go-specific instrumentation.
  - **Key benefits**: Vendor neutrality, extensive instrumentation, and Jaeger integration.
  - **Alternatives considered**: Datadog APM (proprietary).

#### Testing
- **Testify 1.11.1**
  - **Why chosen**: Provides assertion library, mocking framework, and test suites with a familiar syntax.
  - **Key benefits**: Rich assertion library, mocking support, and test suites.
  - **Alternatives considered**: Go's built-in testing (less expressive).

#### Routing
- **Gorilla Mux 1.8.1**
  - **Why chosen**: Provides powerful URL routing and dispatch with middleware support.
  - **Key benefits**: RESTful routing, middleware support, and subrouters.
  - **Alternatives considered**: Chi (lighter, fewer features), Gin (opinionated).

#### Utilities
- **Google UUID 1.6.0**
  - **Why chosen**: Provides UUID generation with RFC 4122 compliance.
  - **Key benefits**: RFC 4122 compliance, multiple UUID versions, and excellent performance.
  - **Alternatives considered**: go.uuid (less maintained), satori/go.uuid (similar).

- **Godotenv 1.5.1**
  - **Why chosen**: Loads environment variables from .env files for configuration.
  - **Key benefits**: Simple API, .env file support, and development-friendly.
  - **Alternatives considered**: Viper (more complex), envconfig (different approach).

### React Web Frontend (react-web/)

#### Core Framework & Language
- **React 18.3.1 + TypeScript 5.3.3**
  - **Why chosen**: React provides a component-based architecture with excellent performance and a vast ecosystem. TypeScript adds static typing for better developer experience and fewer runtime errors.
  - **Key benefits**: Component reusability, virtual DOM for performance, static typing, and excellent tooling.
  - **Alternatives considered**: Vue.js (different paradigm), Svelte (smaller ecosystem), Angular (opinionated, heavier).

#### Build Tool
- **Vite 5.1.0**
  - **Why chosen**: Vite provides fast development server startup and hot module replacement (HMR) with excellent TypeScript support.
  - **Key benefits**: Fast HMR, optimized production builds, and excellent TypeScript support.
  - **Alternatives considered**: Webpack (slower, more complex), Parcel (less configurable).

#### Styling
- **Tailwind CSS 3.4.1**
  - **Why chosen**: Utility-first CSS framework that enables rapid UI development without writing custom CSS.
  - **Key benefits**: Rapid development, consistent design system, small bundle size, and excellent documentation.
  - **Alternatives considered**: Styled Components (larger bundle), CSS Modules (more verbose), Emotion (similar).

#### Animation
- **Framer Motion 11.0.0 (ONLY animation library used)**
  - **Why chosen**: Framer Motion provides a powerful, declarative API for animations with excellent performance and React integration.
  - **Key benefits**: Declarative API, gesture support, layout animations, and excellent performance.
  - **Alternatives considered**: React Spring (less maintained), GSAP (imperative, larger bundle).

- **Lottie React 2.4.0**
  - **Why chosen**: Enables rendering Lottie animations (JSON-based animations) for complex, high-quality animations.
  - **Key benefits**: High-quality animations, small file size, and cross-platform compatibility.
  - **Alternatives considered**: Custom CSS animations (limited), SVG animations (more complex).

#### Routing
- **React Router DOM 6.22.0**
  - **Why chosen**: Industry-standard routing library for React with excellent TypeScript support and code splitting.
  - **Key benefits**: Declarative routing, code splitting, and excellent TypeScript support.
  - **Alternatives considered**: Reach Router (merged into React Router), TanStack Router (newer).

#### State Management
- **Zustand 4.5.0**
  - **Why chosen**: Lightweight state management library with simple API and excellent TypeScript support.
  - **Key benefits**: Simple API, minimal boilerplate, TypeScript support, and no context provider hell.
  - **Alternatives considered**: Redux (overkill for this use case), Context API (performance issues), Recoil (more complex).

#### HTTP Client
- **Axios 1.6.7**
  - **Why chosen**: Promise-based HTTP client with excellent error handling, request/response interceptors, and TypeScript support.
  - **Key benefits**: Promise-based, interceptors, automatic JSON transformation, and excellent TypeScript support.
  - **Alternatives considered**: Fetch API (less feature-rich), ky (lighter, less popular).

#### Component Documentation
- **Storybook 8.0.0**
  - **Why chosen**: Provides an isolated development environment for components with excellent documentation and testing capabilities.
  - **Key benefits**: Isolated development, component documentation, and visual testing.
  - **Alternatives considered**: Bit (more complex), Ladle (lighter, fewer features).

#### Testing
- **Vitest 1.2.0**
  - **Why chosen**: Fast unit testing framework with excellent TypeScript support and Vite integration.
  - **Key benefits**: Fast execution, Vite integration, and excellent TypeScript support.
  - **Alternatives considered**: Jest (slower, more complex), Mocha (less opinionated).

- **@testing-library/react 14.2.0**
  - **Why chosen**: Provides utilities for testing React components in a user-centric way.
  - **Key benefits**: User-centric testing, accessibility support, and excellent documentation.
  - **Alternatives considered**: Enzyme (deprecated), React Testing Library (same).

#### Observability
- **Sentry React 7.110.0**
  - **Why chosen**: Industry-standard error tracking with excellent React integration and debugging capabilities.
  - **Key benefits**: Real-time error tracking, stack traces, and React-specific context.
  - **Alternatives considered**: Rollbar (similar), Bugsnag (similar).

- **OpenTelemetry JS 1.8.0**
  - **Why chosen**: Vendor-neutral distributed tracing standard with JavaScript-specific instrumentation.
  - **Key benefits**: Vendor neutrality, extensive instrumentation, and Jaeger integration.
  - **Alternatives considered**: Datadog RUM (proprietary).

---

## API Endpoints

### Park Vehicle
```
POST /api/v1/parking/sessions
Content-Type: application/json
X-Correlation-Id: <uuid>

{
  "vehicle_type": "S|M|L",
  "entry_point_id": "A|B|C|..."
}

Response:
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "parking_slot_id": "uuid",
    "slot_label": "A-1",
    "entry_point": "A",
    "parked_at": "2025-01-15T10:00:00Z",
    "correlation_id": "uuid"
  }
}
```

### Unpark Vehicle
```
POST /api/v1/parking/sessions/:session_id/unpark
Content-Type: application/json
X-Correlation-Id: <uuid>

Response:
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "parking_slot_id": "uuid",
    "entry_point": "A",
    "parked_at": "2025-01-15T10:00:00Z",
    "exited_at": "2025-01-15T14:30:00Z",
    "duration_hours": 4.5,
    "total_fee": 100.00,
    "fee_breakdown": {
      "total_fee": 100.00,
      "duration_hours": 5,
      "is_continuous": false,
      "base_start_time": "2025-01-15T10:00:00Z",
      "breakdown": {
        "long_term": {
          "days": 0,
          "fee": 0.00,
          "rate": 5000.00
        },
        "remaining": {
          "total": 100.00,
          "base_fee": 40.00,
          "exceeding_hours": 2,
          "exceeding_fee": 60.00,
          "hourly_rate": 20.00
        }
      }
    }
  }
}
```

### Get Parking Session
```
GET /api/v1/parking/sessions/:session_id
X-Correlation-Id: <uuid>

Response:
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "vehicle_type": "S",
    "parking_slot_id": "uuid",
    "slot_label": "A-1",
    "slot_type": "SP",
    "entry_point": "A",
    "parked_at": "2025-01-15T10:00:00Z",
    "exited_at": null,
    "is_continuous": false,
    "state": "active"
  }
}
```

### List Available Slots
```
GET /api/v1/parking/slots/available?vehicle_type=S&entry_point=A
X-Correlation-Id: <uuid>

Response:
{
  "success": true,
  "data": {
    "available_slots": [
      {
        "slot_id": "uuid",
        "slot_label": "A-1",
        "slot_type": "SP",
        "distance_from_entry": 1
      }
    ],
    "total_available": 5
  }
}
```

---

## Domain Model

### EntryPoint
- Unique identifier (A, B, C, etc.)
- Configurable and extensible
- Distance matrix to all slots

### ParkingSlot
- Unique identifier
- Slot type (SP, MP, LP)
- Distance from each entry point (JSONB)
- Availability status (available, occupied, maintenance)
- Last occupied timestamp (analytics)

### Vehicle
- License plate (natural key)
- Type (S, M, L)
- Color, brand, model (optional)
- Total sessions, total spent (analytics)

### ParkingSession
- Unique identifier (UUID)
- Vehicle reference
- Parking slot reference
- Entry point used
- Entry timestamp
- Exit timestamp (nullable until unparked)
- Total fee (calculated on exit)
- Continuous parking flag
- State (active, exited, billing_pending, billing_completed)
- Billing state (pending, calculated, finalized, disputed)
- Fee breakdown (JSONB)
- Idempotency key (for safe retries)
- Correlation ID (for distributed tracing)

### BillingAuditLog
- Immutable audit log (append-only)
- Session reference
- Vehicle type, slot type, entry point
- Parked at, exited at timestamps
- Total fee and detailed breakdown
- Billing version (for replayability)
- Calculated at timestamp

### KafkaEvent
- Event tracking (idempotency)
- Event type, topic, event ID
- Event payload (JSONB)
- Status (pending, published, failed, retrying)
- Retry count
- Error message
- Correlation ID, causation ID

---

## Key Design Decisions

### 1. Object-Oriented Design
- **Domain Models**: Clear separation of concerns with dedicated models for each entity
- **Service Layer**: Business logic encapsulated in services (ParkingService, PricingEngine)
- **Repository Pattern**: Data access abstracted through repositories
- **Strategy Pattern**: Pricing engine uses strategy pattern for extensibility

### 2. Slot Allocation Algorithm
- Priority-based selection:
  1. Filter slots by vehicle compatibility
  2. Filter by availability
  3. Sort by distance from entry point (ascending)
  4. Select first available slot
- **Transaction Safety**: Database transactions prevent double booking
- **Linearizability**: SELECT FOR UPDATE SKIP LOCKED ensures concurrent safety

### 3. Fee Calculation Logic
- Modular design allows easy extension of pricing rules
- Separate service for fee calculation (PricingEngine)
- Supports long-term parking and continuous parking rules
- Strategy pattern enables custom pricing rules without refactoring

### 4. Database Design
- Normalized schema with proper foreign key relationships
- Indexes on frequently queried columns (entry_point_id, slot_type, status)
- Partial indexes for active sessions (performance optimization)
- Covering indexes for allocation queries
- Timestamps for audit trail

### 5. API Design
- RESTful conventions
- Consistent response format
- Proper HTTP status codes
- Input validation
- Correlation ID propagation for distributed tracing

### 6. Event-Driven Architecture
- Kafka as event backbone
- Idempotent event publishing
- Event tracking in database
- Retry logic for failed events
- Consumer groups for scalability

### 7. Observability-First Design
- Structured JSON logging (Lograge, Semantic Logger, Zerolog)
- Metrics collection (Prometheus)
- Distributed tracing (OpenTelemetry, Jaeger)
- Error tracking (Sentry)
- Business KPIs (allocation latency, slot utilization, billing duration)

### 8. Background Processing
- Rails: Sidekiq for async jobs
- Go: Asynq for async jobs
- Job types:
  - Kafka event publishing
  - Billing audit log creation
  - Session reconciliation
  - Analytics report generation
  - Slot utilization reports

---

## Running the Application

### Quick Start - Run All Services

The fastest way to run the entire application is using Docker Compose:

```bash
# Start all services (auto-detects platform)
./docker-compose.sh up -d

# Run database migrations
./docker-compose.sh exec rails-backend bundle exec rails db:create db:migrate

# View logs
./docker-compose.sh logs -f

# Stop all services
./docker-compose.sh down
```

**Access Services:**
- Rails Backend: http://localhost:3000
- Go Backend: http://localhost:8082
- React Web: http://localhost:3001
- Kafka UI: http://localhost:8085
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002 (admin/admin)

### Running the Backend

#### Option 1: Rails Backend (Control Plane)

```bash
cd rails-backend

# Install dependencies
bundle install

# Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL, Redis, and Kafka credentials

# Set up database
bundle exec rails db:create db:migrate db:seed

# Start the server
bundle exec rails server
# Server runs on http://localhost:3000

# Start Sidekiq (background jobs) in a separate terminal
bundle exec sidekiq
```

#### Option 2: Go Backend (Data Plane)

```bash
cd go-backend

# Install dependencies
go mod download

# Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL, Redis, and Kafka credentials

# Start the server
go run cmd/server/main.go
# Server runs on http://localhost:8082

# Or use the Makefile
make run
```

### Running the Frontend

#### React Web Application

```bash
cd react-web

# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your API endpoint (default: http://localhost:8082)

# Start the development server
bun run dev
# App runs on http://localhost:3002

# Build for production
bun run build

# Preview production build
bun run preview
```

### Running Selenium Tests

Selenium tests provide end-to-end testing for the React Web application.

#### Prerequisites

1. **React Web Dev Server Running**
   ```bash
   cd react-web
   bun run dev
   ```
   The dev server should be running at `http://localhost:3002`

2. **Backend API Running**
   Start either the Go backend or Rails backend:
   ```bash
   # Go backend
   cd go-backend
   make run
   
   # Or Rails backend
   cd rails-backend
   bundle exec rails server
   ```

#### Installation and Setup

```bash
cd react-web/selenium-tests

# Install dependencies
bun install
```

#### Running Selenium Tests

```bash
cd react-web/selenium-tests

# Run all tests
bun test

# Run tests in headless mode
bun run test:headless

# Run tests with coverage
bun run test:coverage

# Run tests in watch mode
bun run test:watch

# Run tests for specific browser
bun run test:chrome
bun run test:firefox

# Clean up screenshots
bun run clean:screenshots
```

#### Configuration

Configure tests via environment variables:

```bash
# Set base URL (default: http://localhost:3002)
BASE_URL=http://localhost:3002 bun test

# Set browser (default: chrome)
BROWSER=chrome bun test
BROWSER=firefox bun test

# Run in headless mode
HEADLESS=true bun test
```

#### Test Coverage

The Selenium test suite covers:
- Park Vehicle (FEAT-001)
- Unpark Vehicle (FEAT-002)
- Fee Calculation and Display (FEAT-003)
- View Session Details (FEAT-004)
- List Sessions (FEAT-005)
- List All Slots (FEAT-006)
- Get Available Slots (FEAT-007)
- Slot Management (FEAT-008, FEAT-009, FEAT-010)
- Entry Point Management (FEAT-011, FEAT-012, FEAT-013, FEAT-014)
- Check System Health (FEAT-016)

The Selenium test suite doesn't cover:
- Initialize System (FEAT-015) (as it is done through backend)

For detailed Selenium testing information, see [`react-web/selenium-tests/README.md`](react-web/selenium-tests/README.md).

### Running All Tests

For comprehensive testing across all components, see [`TESTING.md`](TESTING.md).

```bash
# Rails backend tests
cd rails-backend && bundle exec rspec

# Go backend tests (with race detector)
cd go-backend && go test -race -count=1 ./...

# React web unit tests
cd react-web && bun test

# Selenium E2E tests
cd react-web/selenium-tests && bun test

```

---

## Setup Instructions

### Prerequisites
- Ruby 3.4+
- Go 1.24+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose
### Quick Start with Docker Compose

The project includes automatic OS/architecture detection scripts that eliminate the need to manually set environment variables.

**For macOS/Linux (Recommended):**
```bash
# Clone the repository
git clone <repository-url>
cd oo-parking-lot

# Start all services (auto-detects platform)
./docker-compose.sh up -d

# Run database migrations
./docker-compose.sh exec rails-backend bundle exec rails db:create db:migrate
./docker-compose.sh exec go-backend go run cmd/migrate/main.go

# View logs
./docker-compose.sh logs -f

# Stop all services
./docker-compose.sh down
```

**For Windows:**
```cmd
REM Clone the repository
git clone <repository-url>
cd oo-parking-lot

REM Start all services (auto-detects platform)
docker-compose.bat up -d

REM Run database migrations
docker-compose.bat exec rails-backend bundle exec rails db:create db:migrate
docker-compose.bat exec go-backend go run cmd/migrate/main.go

REM View logs
docker-compose.bat logs -f

REM Stop all services
docker-compose.bat down
```

**Manual Platform Override (if needed):**
```bash
# Force specific platform
DOCKER_PLATFORM=linux/arm64 docker-compose up -d
```

**Platform Detection Output:**
The wrapper scripts display detected platform information:
```
=========================================
Docker Platform Auto-Detection
=========================================
Host OS:        Darwin
Host Arch:      arm64
Docker Platform: linux/arm64
=========================================
```

**Access Services:**
- Rails Backend: http://localhost:3000
- Go Backend: http://localhost:8082
- React Web: http://localhost:3001
- Kafka UI: http://localhost:8085
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002 (admin/admin)

### Rails Backend Setup (Manual)

```bash
cd rails-backend
bundle install
cp .env.example .env
# Edit .env with your PostgreSQL, Redis, and Kafka credentials
bundle exec rails db:create db:migrate db:seed
bundle exec sidekiq  # In separate terminal
rails server
# Server runs on http://localhost:3000
```

### Go Backend Setup (Manual)

```bash
cd go-backend
go mod download
cp .env.example .env
# Edit .env with your PostgreSQL, Redis, and Kafka credentials
go run cmd/server/main.go
# Server runs on http://localhost:8082
```

### React Web Setup (Manual)

```bash
cd react-web
bun install
cp .env.example .env
# Edit .env with your API endpoint
bun run dev
# App runs on http://localhost:3001
```

---

## Testing

### Rails Backend
```bash
cd rails-backend
bundle exec rspec
```

### Go Backend
```bash
cd go-backend

# Run all tests
go test ./...

# Run with race detector (recommended for concurrency tests)
go test -race -count=1 ./...

# Run only concurrency tests (requires running PostgreSQL)
go test -race -count=1 -run TestConcurrent ./internal/...
```

### React Web
```bash
cd react-web
bun test
```

### Load Testing (k6)
```bash
k6 run load-test.js
```

### API Testing (Newman)

Run the Postman collection to test all API endpoints and generate comprehensive test reports:

```bash
# Install Newman (if not already installed)
bun install -g newman newman-reporter-html newman-reporter-junit

# Run collection and generate all reports
newman run "Parking Lot API.postman_collection.json" \
  -r cli,json,html,junit \
  --reporter-json-export results.json \
  --reporter-html-export report.html \
  --reporter-junit-export results.xml
```

**Generated Reports:**
- `results.json` - JSON format results for programmatic analysis
- `report.html` - HTML report with detailed test execution visualization
- `results.xml` - JUnit XML format for CI/CD integration

**Note:** Ensure the backend servers are running before executing the Newman collection:
- Go Backend: http://localhost:8082
- Rails Backend: http://localhost:3000

---

## Observability

### Metrics (Prometheus + Grafana)

**Access Prometheus**: http://localhost:9090

**Access Grafana**: http://localhost:3002 (admin/admin)

**Provisioned Dashboard**: Parking Lot Overview (auto-loaded on first start)

The Grafana instance comes pre-configured with:
- Prometheus datasource (auto-connected)
- Parking Lot Overview dashboard with the following panels:
  - Slot Utilization by Type (%) - gauge with green/yellow/red thresholds
  - Active Parking Sessions - timeseries by entry point
  - Revenue Over Time - 1h and 24h revenue tracking
  - Slot Allocation Latency - p95 and p99 percentile latencies
  - Error Rates (5xx) - real-time error gauge
  - Kafka Consumer Lag - consumer group monitoring
  - Parking Sessions Created (per hour) - stacked bar chart by vehicle type and entry point
  - HTTP Request Rate - request throughput timeseries

**Prometheus Scrape Targets**:
- `prometheus` (self-monitoring, 15s interval)
- `rails-backend` at `rails-backend:9394/metrics` (10s interval)
- `go-backend` at `go-backend:8082/metrics` (10s interval)

### Logs

**Format**: Structured JSON

**View Logs**:
```bash
# Rails Backend
docker-compose logs -f rails-backend

# Go Backend
docker-compose logs -f go-backend

# Sidekiq
docker-compose logs -f sidekiq
```

### Error Tracking (Sentry)

**Access Sentry**: Configure SENTRY_DSN in .env

**Error Alerts**:
- Email notifications on new errors
- Slack integration (optional)
- PagerDuty integration (optional)

---

## Race Condition Prevention

Both backends implement atomic operations to prevent race conditions in the park/unpark flows:

### Park (Slot Allocation)

- **Go**: Uses `UPDATE parking_slots SET available = FALSE WHERE id = $1 AND available = TRUE RETURNING ...` within a transaction (`FindAndLockAvailableSlot`). This is an atomic compare-and-swap that prevents two goroutines from booking the same slot.
- **Rails**: Uses `ParkingSlot.transaction` with `slot.lock!` (SELECT FOR UPDATE) to acquire a row-level lock before updating, preventing concurrent bookings.

### Unpark (Double-Unpark Prevention)

- **Go**: `AtomicUnpark` uses a conditional UPDATE within a single transaction:
  ```sql
  UPDATE parking_sessions SET exited_at = $1, total_fee = $2 WHERE id = $3 AND exited_at IS NULL
  ```
  If `rows_affected == 0`, the session was already unparked by another request. The slot availability is restored in the same transaction, ensuring atomicity.

- **Rails**: Uses `ParkingSession.lock.find(session_id)` (SELECT FOR UPDATE) inside the unpark transaction, so only one thread can hold the row lock at a time. The `active?` check happens after acquiring the lock, preventing TOCTOU races.

### Connection Pooling (Go)

The Go backend configures connection pool limits to prevent exhaustion under load:
```go
db.SetMaxOpenConns(25)
db.SetMaxIdleConns(10)
db.SetConnMaxLifetime(5 * time.Minute)
db.SetConnMaxIdleTime(1 * time.Minute)
```

### Concurrency Tests

Both backends include dedicated concurrency tests that verify these guarantees:

- **Go**: `go test -race -count=1 -run TestConcurrent ./internal/...` — Tests concurrent park (no double-booking), concurrent unpark (only one succeeds), and interleaved operations. The `-race` flag enables Go's built-in race detector.
- **Rails**: `bundle exec rspec spec/integration/concurrency_spec.rb` — Thread-based tests for concurrent unpark (only one succeeds) and concurrent park (no over-allocation).

---

## Monitoring Without Docker

If you're running the backends without Docker Compose, you can still use Prometheus and Grafana:

### Standalone Prometheus

1. Install Prometheus (`brew install prometheus` on macOS, or download from [prometheus.io](https://prometheus.io))
2. Create a `prometheus.yml` scrape config:
   ```yaml
   global:
     scrape_interval: 15s

   scrape_configs:
     - job_name: 'go-backend'
       static_configs:
         - targets: ['localhost:8082']
       metrics_path: /metrics

     - job_name: 'rails-backend'
       static_configs:
         - targets: ['localhost:3000']
       metrics_path: /metrics
   ```
3. Run: `prometheus --config.file=prometheus.yml`
4. Access: http://localhost:9090

### Standalone Grafana

1. Install Grafana (`brew install grafana` on macOS, or download from [grafana.com](https://grafana.com))
2. Start: `grafana-server` (or `brew services start grafana`)
3. Access: http://localhost:3000 (admin/admin)
4. Add Prometheus as a data source (URL: `http://localhost:9090`)

### Available Metrics

**Go Backend** (`/metrics` on port 8082):
- `http_request_duration_seconds` — HTTP request latency histogram
- `parking_operations_total` — Parking operation counter (park/unpark by result)
- `parking_slot_allocation_duration_seconds` — Slot allocation latency by type

**Rails Backend** (`/metrics` on port 3000):
- `parking_slot_allocation_duration_seconds` — Slot allocation latency
- `parking_billing_calculation_duration_seconds` — Fee calculation latency
- `parking_active_sessions` — Active session gauge
- `parking_total_revenue` — Revenue counter
- `parking_kafka_events_published` — Kafka event publishing counter

---

## Assumptions & Tradeoffs

### Assumptions
1. **Distance Units**: Abstract integer values (not meters), only relative comparison matters
2. **Time Zone**: All timestamps in UTC
3. **Slot Capacity**: Each slot can hold exactly one vehicle
4. **Entry Points**: Minimum 3, extensible to N entry points
5. **Fee Currency**: Philippine Peso (₱)
6. **Vehicle Tracking**: License plate is optional, sessions are tracked by UUID

### Tradeoffs

1. **Database Choice**: PostgreSQL chosen for ACID compliance and JSON support

   **Advantages:**
   - Strong ACID compliance for data integrity
   - Native JSONB support for flexible data
   - Mature tooling and community support

   **Disadvantages:**
   - Horizontal scaling is more complex
   - Requires careful connection management

2. **API Style**: REST over GraphQL for simplicity and broader compatibility

   **Advantages:**
   - Simpler to implement and maintain
   - Better compatibility with existing tools
   - Easier caching and CDN integration

   **Disadvantages:**
   - Less flexible for complex queries
   - May require multiple API calls for related data

3. **Slot Allocation**: Greedy algorithm (closest slot) - simple but effective

   **Advantages:**
   - Fast and predictable performance
   - Easy to understand and debug
   - Works well for most scenarios

   **Disadvantages:**
   - May not find optimal solution in all cases
   - Doesn't consider future demand patterns

4. **Continuous Parking**: 1-hour threshold - configurable but not exposed in API

   **Advantages:**
   - Simple business rule to enforce
   - Consistent billing for customers
   - Easy to calculate and explain

   **Disadvantages:**
   - Not flexible for customer needs
   - Cannot be adjusted per customer

5. **Dual Backend**: Rails + Go for risk diversification

   **Advantages:**
   - Technology diversity reduces risk
   - Can leverage strengths of both languages
   - Backup implementation available

   **Disadvantages:**
   - Higher development overhead
   - More complex deployment
   - Requires maintaining two codebases

6. **Kafka vs. Redis Streams**: Kafka for durability and consumer groups

   **Advantages:**
   - Durable message storage
   - Consumer group support for scaling
   - Strong ordering guarantees

   **Disadvantages:**
   - Higher operational complexity
   - Requires more infrastructure
   - Steeper learning curve

---

## Security Considerations

1. **Input Validation**: All API inputs are validated
2. **SQL Injection Prevention**: Parameterized queries used throughout
3. **Transaction Safety**: Database transactions prevent race conditions
4. **Error Handling**: Graceful error responses without exposing internals
5. **Idempotency**: Idempotency keys on all mutating operations
6. **Correlation IDs**: End-to-end tracing for security auditing
7. **Immutable Audit Logs**: Billing logs are never updated or deleted
8. **Rate Limiting**: Redis-based rate limiting (to be implemented)
9. **Authentication**: API key authentication (to be implemented)
10. **Authorization**: Role-based access control (to be implemented)

### Security Scanning

The project includes automated security scanning for all components:

#### Go Backend Security

The Go backend uses two security scanning tools:

**GoSec** - Go Security Checker
- Scans for SQL injection, command injection, weak cryptography, and more
- Generates SARIF reports for security analysis
- Runs automatically in CI/CD on every push and pull request
- Results are available as CI/CD artifacts

**golangci-lint** - Fast Go Linters Runner
- Multiple linters for code quality, performance, and security
- Configured via `.golangci.yml`
- Runs automatically in CI/CD

**Local Security Scanning**:

```bash
# Using Makefile (recommended)
cd go-backend
make security-all          # Run all security checks
make security              # Run gosec only
make lint                  # Run golangci-lint only

# Using security scan script
cd go-backend
./scripts/security-scan.sh                    # Run all checks
./scripts/security-scan.sh --gosec-only        # GoSec only
./scripts/security-scan.sh --lint-only         # Linter only
./scripts/security-scan.sh --fail-on-error     # Fail on issues
```

**Installation**:

```bash
cd go-backend
make install-tools        # Install all security tools
# or
go install github.com/securego/gosec/v2/cmd/gosec@latest
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin latest
```

#### Rails Backend Security

- **Brakeman**: Static analysis security scanner for Ruby on Rails
- **Bundler-Audit**: Checks for vulnerable dependencies
- Both run automatically in CI/CD

#### Frontend Security

- **NPM Audit**: Scans for vulnerable dependencies
- Runs automatically in CI/CD for React Web

#### CI/CD Integration

All security scans run in GitHub Actions CI/CD pipeline:
- Results are available as CI/CD artifacts (preserved for 30 days)
- SARIF reports are generated for security analysis
- Note: GitHub Security code scanning is not used for this private repository

For detailed security scanning instructions, see the [Go Backend README](go-backend/README.md#security-scanning).

---

## Deployment Considerations

1. **Backend Scaling**: Stateless APIs can be horizontally scaled
2. **Database**: Connection pooling recommended for production (pgbouncer)
3. **Rate Limiting**: Should be added for production use
4. **Monitoring**: Application performance monitoring recommended
5. **Logging**: Structured logging for debugging and audit trails
6. **Health Checks**: All services expose /health endpoint
7. **Graceful Shutdown**: SIGTERM handling for zero-downtime deployments
8. **Blue-Green Deployment**: For zero-downtime updates
9. **Circuit Breakers**: For fault tolerance
10. **Retry Logic**: Exponential backoff for transient failures

---

## License

This project is created for assessment purposes.

---

## Author

Ignatius Timothy Manullang

---

## Documentation

For detailed architecture documentation, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

**Architecture Documentation Includes**:
- C4 architecture diagrams
- Slot allocation algorithm
- Pricing engine internals
- Kafka flow diagrams
- Failure modes
- Scaling strategy
- Observability setup
- Tradeoffs

For GitHub Code Scanning setup and troubleshooting, see [`docs/CODE_SCANNING_SETUP.md`](docs/CODE_SCANNING_SETUP.md)

**Code Scanning Documentation Includes**:
- How to enable GitHub Code Scanning
- SARIF file upload configuration
- Security scanning tools (GoSec, Trivy, Brakeman)
- Troubleshooting common issues
- Alternative solutions for security reporting

---
