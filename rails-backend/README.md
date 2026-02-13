# Rails Backend - OO Parking Lot

Ruby on Rails API implementation for Object-Oriented Mall parking system.

## Dependencies

- **Ruby**: 3.4.8
- **Rails**: 8.0.1 (API-only)
- **PostgreSQL**: 15 (via pg 1.5.6)
- **Puma**: 6.4 (Web server)
- **Redis**: 5.2 (Caching and job queue)
- **Sidekiq**: 7.3 (Background job processing)
- **Sidekiq-Cron**: 2.0 (Scheduled jobs)
- **WaterDrop**: 2.7 (Kafka producer)
- **Lograge**: 0.14 (Structured logging)
- **Semantic Logger**: 4.13 (Advanced logging)
- **Prometheus Exporter**: 2.2 (Metrics collection)
- **OpenTelemetry**: 1.4 (Distributed tracing)
- **Sentry Rails**: 5.18 (Error tracking)
- **Rack::Attack**: 6.7 (Rate limiting)
- **SecureHeaders**: 6.6 (HTTP security headers)
- **Kaminari**: 1.2 (Pagination)
- **Brakeman**: 6.1 (Security scanning)
- **Bundler-Audit**: 0.9 (Dependency security)
- **RuboCop**: 1.60 (Code linting)
- **RSpec-Rails**: 6.1 (Testing framework)
- **FactoryBot-Rails**: 6.2 (Test fixtures)
- **SimpleCov**: 0.22 (Code coverage)

## Setup

1. Install dependencies:
```bash
bundle install
```

2. Configure database:
```bash
cp config/database.example.yml config/database.yml
# Edit config/database.yml with your PostgreSQL credentials
```

3. Create and migrate database:
```bash
rails db:create db:migrate db:seed
```

4. Run server:
```bash
rails server
```

The API will be available at `http://localhost:3000`

## Running Tests

```bash
bundle exec rspec
```

## API Endpoints

### Park Vehicle
```
POST /api/v1/parking/sessions
Content-Type: application/json

{
  "vehicle_type": "S",
  "entry_point_id": "A"
}
```

### Unpark Vehicle
```
POST /api/v1/parking/sessions/:id/unpark
```

### Get Parking Session
```
GET /api/v1/parking/sessions/:id
```

### List Available Slots
```
GET /api/v1/parking/slots/available?vehicle_type=S&entry_point_id=A
```

### List Entry Points
```
GET /api/v1/parking/entry_points
```
