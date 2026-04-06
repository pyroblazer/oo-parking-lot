# Testing Guide for OO Parking Lot

This document provides comprehensive instructions for running all tests across the entire parking lot system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Rails Backend Tests](#rails-backend-tests)
3. [Go Backend Tests](#go-backend-tests)
4. [React Web Tests](#react-web-tests)
5. [Integration Tests](#integration-tests)
7. [User Acceptance Tests](#user-acceptance-tests)
8. [Running All Tests](#running-all-tests)

## Prerequisites

### Required Software

-**Ruby**: 3.4.8 or higher
-**Go**: 1.24.0 or higher
-**Node.js**: 18.x or higher
-**npm**: 9.x or higher
-**Docker**: Latest version
-**Docker Compose**: Latest version

### Required Services

-**PostgreSQL**: For Rails and Go backend databases
-**Redis**: For Sidekiq job queue
-**Kafka**: For event streaming (optional for unit tests)
-**Prometheus**: For metrics (optional for unit tests)

## Rails Backend Tests

### Unit Tests

Run Rails backend unit tests:

```bash
cd rails-backend

# Install dependencies
bundle install

# Run all unit tests
bundle exec rspec

# Run specific test file
bundle exec rspec spec/models/parking_session_spec.rb
bundle exec rspec spec/services/parking_service_spec.rb
bundle exec rspec spec/services/pricing_engine_spec.rb
bundle exec rspec spec/workers/kafka_event_worker_spec.rb
```

### Integration Tests

Run Rails backend integration tests:

```bash
cd rails-backend

# Run integration tests
bundle exec rspec spec/integration/parking_flow_spec.rb
```

### System Tests (UAT)

Run Rails backend user acceptance tests:

```bash
cd rails-backend

# Run UAT tests
bundle exec rspec spec/system/parking_uat_spec.rb
```

### Test Coverage

Generate test coverage report:

```bash
cd rails-backend

# Generate coverage report
COVERAGE=true bundle exec rspec

# Open coverage report
open coverage/index.html
```

## Go Backend Tests

### Unit Tests

Run Go backend unit tests:

```bash
cd go-backend

# Run all tests
go test ./...

# Run specific test file
go test ./internal/models/parking_session_test.go
go test ./internal/services/fee_calculator_test.go
go test ./internal/models/parking_slot_test.go
```

### Test Coverage

Generate test coverage report:

```bash
cd go-backend

# Run tests with coverage
go test -coverprofile=coverage.out ./...

# View coverage
go tool cover -html=coverage.out
```

## Selenium E2E Tests

### Overview

Selenium tests provide end-to-end (E2E) testing for the React Web application, covering all critical user flows defined in the User Journeys and Feature Specifications document.

### Prerequisites

1.**React Web Dev Server Running**
 ```bash
 cd react-web
 bun run dev
 ```
- The dev server should be running at `http://localhost:3002`

2.**Backend API Running**
- Start either the Go backend or Rails backend:
 ```bash
 # Go backend
 cd go-backend
 make run

 # Or Rails backend
 cd rails-backend
 bundle exec rails server
 ```

3.**ChromeDriver/GeckoDriver Installed**
 - ChromeDriver is automatically installed via npm
 - For Firefox, ensure geckodriver is installed

### Installation

```bash
cd selenium-tests
bun install
```

### Configuration

Configuration is managed via environment variables:

- `BASE_URL`: Base URL for the React Web app (default: `http://localhost:8082`)
- `BROWSER`: Browser to use - `chrome` or `firefox` (default: `chrome`)
- `HEADLESS`: Run in headless mode - `true` or `false` (default: `false`)

Example:
```bash
BASE_URL=http://localhost:8082 BROWSER=chrome bun test
```

### Running Tests

#### Run all tests:
```bash
cd selenium-tests
bun test
```

#### Run tests in watch mode:
```bash
cd selenium-tests
bun run test:watch
```

#### Run tests with coverage:
```bash
cd selenium-tests
bun run test:coverage
```

#### Run tests in headless mode:
```bash
cd selenium-tests
bun run test:headless
```

#### Run tests for specific browser:
```bash
cd selenium-tests
bun run test:chrome
bun run test:firefox
```

#### Clean up screenshots:
```bash
cd selenium-tests
bun run clean:screenshots
```

### Test Coverage

The Selenium test suite covers the following features:

#### Core Operations
- Park Vehicle (FEAT-001)
- Unpark Vehicle (FEAT-002)
- Fee Calculation and Display (FEAT-003)
- View Session Details (FEAT-004)

#### Management Features
- List Sessions (FEAT-005)
- List All Slots (FEAT-006)
- Get Available Slots (FEAT-007)
- Create Slot (FEAT-008)
- Update Slot (FEAT-009)
- Delete Slot (FEAT-010)
- List Entry Points (FEAT-011)
- Create Entry Point (FEAT-012)
- Update Entry Point (FEAT-013)
- Delete Entry Point (FEAT-014)

#### System Features
- Initialize System (FEAT-015)
- Check System Health (FEAT-016)

### Test Structure

```
selenium-tests/
├── package.json
├── selenium.config.js # WebDriver configuration
├── tests/
│ ├── setup.js # Jest setup and teardown
│ ├── park-vehicle.spec.js # FEAT-001: Park Vehicle
│ ├── unpark-vehicle.spec.js # FEAT-002, FEAT-003: Unpark Vehicle & Fee Calculation
│ ├── view-session.spec.js # FEAT-004: View Session Details
│ ├── list-sessions.spec.js # FEAT-005: List Sessions
│ ├── list-slots.spec.js # FEAT-006: List All Slots
│ ├── available-slots.spec.js # FEAT-007: Get Available Slots
│ ├── slot-management.spec.js # FEAT-008, FEAT-009, FEAT-010: Slot CRUD
│ ├── entry-point-management.spec.js # FEAT-011, FEAT-012, FEAT-013, FEAT-014: Entry Point CRUD
│ ├── system-initialization.spec.js # FEAT-015: Initialize System
│ └── health-check.spec.js # FEAT-016: Check System Health
└── utils/
 └── selenium-helpers.js # Helper functions for WebDriver operations
```

### Screenshots

Screenshots are automatically captured:
- On test failure (named: `failed-{test-name}.png`)
- At key test steps (named descriptively)

Screenshots are saved to the `selenium-tests/screenshots/` directory.

### Troubleshooting

#### Tests fail to connect to the application
1. Ensure the React Web dev server is running:
 ```bash
 cd react-web
 bun run dev
 ```

2. Verify the backend API is running:
 ```bash
 # Check Go backend
 curl http://localhost:8082/health

 # Or check Rails backend
 curl http://localhost:3000/health
 ```

3. Check the BASE_URL configuration:
 ```bash
 export BASE_URL=http://localhost:8082
 bun test
 ```

#### ChromeDriver issues
1. Ensure ChromeDriver version matches Chrome browser version
2. Reinstall ChromeDriver:
 ```bash
 cd selenium-tests
 bun install chromedriver@latest
 ```

#### Timeouts
If tests are timing out, adjust timeouts in `selenium-tests/selenium.config.js`:
- `pageLoadTimeout`: Page load timeout (default: 30000ms)
- `elementTimeout`: Element wait timeout (default: 10000ms)
- `scriptTimeout`: Script execution timeout (default: 30000ms)

### CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
- name: Run Selenium Tests
 run: |
 cd selenium-tests
 bun install
 bun test
 env:
- BASE_URL: http://localhost:8082
- HEADLESS: true
```

### Additional Resources

- [Selenium Tests README](selenium-tests/README.md)
- [User Journeys and Feature Specifications](docs/User_Journeys_and_Feature_Specifications.md)

## Playwright E2E Tests

### Overview

Playwright E2E tests provide comprehensive end-to-end testing for the React Web application using Playwright's modern browser automation framework. These tests cover all critical user flows and are optimized for CI/CD reliability.

### Browser Testing Strategy

**CI Configuration:**
-**Primary Browser:** Chromium only (all 978 tests pass)
-**Firefox:** Skipped in CI due to XPCOM loading errors (environmental issue)
-**WebKit:** Skipped in CI due to element stability issues (10/31 tests fail)
-**Mobile Chrome:** Skipped in CI due to timeout issues (1/1 test fails)
-**Mobile Safari:** Skipped in CI due to pointer event issues (6/9 tests fail)

**Local Development:**
- All browsers are enabled for comprehensive testing
- Faster timeouts for quick feedback
- No retries for immediate failure detection

For detailed information about the browser testing strategy, see [Playwright Browser Testing Strategy](docs/PLAYWRIGHT_BROWSER_TESTING_STRATEGY.md).

### Prerequisites

1.**Backend API Running**
- Start either the Go backend or Rails backend:
 ```bash
 # Go backend
 cd go-backend
 make run

 # Or Rails backend
 cd rails-backend
 bundle exec rails server
 ```

2.**Database and Redis Running**
 ```bash
 docker-compose up -d postgres redis
 ```

### Installation

```bash
cd react-web

# Install dependencies
bun install

# Install Playwright browsers
bunx playwright install --with-deps
```

### Running Tests

#### Run all tests (all browsers):
```bash
cd react-web
bun run test:e2e
```

#### Run Chromium only (CI configuration):
```bash
cd react-web
CI=true bun run test:e2e
```

#### Run specific browser:
```bash
# Chromium only
bun run test:e2e --project=chromium

# Firefox only (if enabled)
bun run test:e2e --project=firefox

# WebKit only (if enabled)
bun run test:e2e --project=webkit

# Mobile Chrome only (if enabled)
bun run test:e2e --project="Mobile Chrome"

# Mobile Safari only (if enabled)
bun run test:e2e --project="Mobile Safari"
```

#### Run with UI mode (interactive):
```bash
cd react-web
bun run test:e2e:ui
```

#### View test report:
```bash
cd react-web
bun run test:e2e:report
```

### Test Structure

```
react-web/e2e/
├── fixtures/
│ ├── apiFixtures.ts # API mock fixtures
│ └── testData.ts # Test data helpers
├── pages/
│ ├── BasePage.ts # Base page class with common methods
│ ├── DashboardPage.ts # Dashboard page interactions
│ ├── ParkVehiclePage.ts # Park vehicle page interactions
│ ├── UnparkVehiclePage.ts # Unpark vehicle page interactions
│ ├── ViewSessionPage.ts # View session page interactions
│ ├── SessionsManagementPage.ts # Sessions management page
│ ├── SlotsManagementPage.ts # Slots management page
│ ├── EntryPointsManagementPage.ts # Entry points management page
│ ├── ConfigurationPage.ts # Configuration page interactions
│ └── SettingsPage.ts # Settings page interactions
├── tests/
│ ├── core/
│ │ ├── park-vehicle.spec.ts # Park vehicle E2E tests
│ │ ├── unpark-vehicle.spec.ts # Unpark vehicle E2E tests
│ │ └── view-session.spec.ts # View session E2E tests
│ ├── management/
│ │ ├── sessions-management.spec.ts # Sessions management tests
│ │ ├── slots-management.spec.ts # Slots management tests
│ │ └── entry-points-management.spec.ts # Entry points management tests
│ ├── navigation/
│ │ └── navigation.spec.ts # Navigation tests
│ ├── simple/
│ │ ├── park-vehicle-ultra-simple.spec.ts # Simple park vehicle test
│ │ ├── unpark-vehicle-ultra-simple.spec.ts # Simple unpark vehicle test
│ │ └── navigation-simple.spec.ts # Simple navigation test
│ └── system/
│ └── system-health.spec.ts # System health tests
└── utils/
 ├── assertions.ts # Custom assertions
 ├── helpers.ts # Helper functions
 ├── selectors.ts # Element selectors
 ├── waits.ts # Wait conditions
 └── test-base.ts # Test base configuration
```

### Test Coverage

The Playwright E2E test suite covers the following features:

#### Core Operations
- Park Vehicle (FEAT-001)
- Unpark Vehicle (FEAT-002)
- Fee Calculation and Display (FEAT-003)
- View Session Details (FEAT-004)

#### Management Features
- List Sessions (FEAT-005)
- List All Slots (FEAT-006)
- Get Available Slots (FEAT-007)
- Create Slot (FEAT-008)
- Update Slot (FEAT-009)
- Delete Slot (FEAT-010)
- List Entry Points (FEAT-011)
- Create Entry Point (FEAT-012)
- Update Entry Point (FEAT-013)
- Delete Entry Point (FEAT-014)

#### System Features
- Initialize System (FEAT-015)
- Check System Health (FEAT-016)

### Configuration

Playwright configuration is managed in [`react-web/playwright.config.ts`](react-web/playwright.config.ts):

**CI-specific settings:**
- Retries: 2 (for flaky test handling)
- Workers: 2 (balanced performance)
- Timeout: 60 seconds (global), 15 seconds (actions), 30 seconds (navigation)
- Trace: Retain on failure
- Screenshot: Only on failure
- Video: Retain on failure

**Local development settings:**
- Retries: 0 (immediate feedback)
- Workers: 8 (optimal performance)
- Timeout: 30 seconds (global), 10 seconds (actions), 15 seconds (navigation)

### Debugging

#### View screenshots on failure:
Screenshots are automatically saved to `react-web/test-results/` on test failure.

#### View videos on failure:
Videos are automatically saved to `react-web/test-results/` on test failure.

#### View trace files:
Trace files are automatically saved to `react-web/test-results/` on test failure and can be viewed in the Playwright trace viewer.

#### Run tests in debug mode:
```bash
cd react-web
bunx playwright test --debug
```

#### Run tests with headed mode:
```bash
cd react-web
bunx playwright test --headed
```

### CI/CD Integration

The Playwright E2E tests are integrated into the CI/CD pipeline in [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

```yaml
playwright-e2e-tests:
 name: Playwright E2E Tests (Chromium Only)
 runs-on: ubuntu-latest
 needs: [eslint]
 steps:
 - Checkout code
 - Set up Bun
 - Install dependencies
 - Install Playwright Browsers
 - Setup Go backend
 - Build and start Go backend
 - Wait for Go backend to be ready
 - Run Playwright E2E tests
 - Upload test results
 - Upload screenshots on failure
 - Upload videos on failure
 - Upload server logs on failure
```

### Troubleshooting

#### Tests fail to connect to the application
1. Ensure the backend API is running:
 ```bash
 # Check Go backend
 curl http://localhost:8082/health

 # Or check Rails backend
 curl http://localhost:3000/health
 ```

2. Verify the database is running:
 ```bash
 docker-compose ps postgres redis
 ```

3. Check the baseURL configuration in [`playwright.config.ts`](react-web/playwright.config.ts)

#### Browser installation issues
1. Reinstall Playwright browsers:
 ```bash
 cd react-web
 bunx playwright install --with-deps
 ```

2. Install specific browser:
 ```bash
 bunx playwright install chromium
 ```

#### Timeout issues
1. Increase timeout values in [`playwright.config.ts`](react-web/playwright.config.ts)
2. Add explicit wait conditions in tests
3. Check for slow network conditions

#### Element not found issues
1. Verify selectors are correct
2. Add explicit wait conditions using `waitForSelector()`
3. Check for dynamic content loading

### Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Browser Testing Strategy](docs/PLAYWRIGHT_BROWSER_TESTING_STRATEGY.md)
- [User Journeys and Feature Specifications](docs/User_Journeys_and_Feature_Specifications.md)

## React Web Tests

### Unit Tests

Run React web unit tests:

```bash
cd react-web

# Install dependencies
bun install

# Run all unit tests
bun test

# Run specific test file
bun test -- ParkVehicle.test.tsx
bun test -- UnparkVehicle.test.tsx
bun test -- AvailableSlots.test.tsx
```

### Test Coverage

Generate test coverage report:

```bash
cd react-web

# Run tests with coverage
bun test -- --coverage

# View coverage report
open coverage/index.html
```

### Component Tests with Vitest UI

Run tests with Vitest UI:

```bash
cd react-web

# Start Vitest UI
bun run test:ui
```

## Integration Tests

### Full Stack Integration Tests

Run full stack integration tests using Docker Compose:

```bash
# Start all services
docker-compose up -d

# Run Rails integration tests
cd rails-backend
bundle exec rspec spec/integration/parking_flow_spec.rb

# Run Go integration tests (if available)
cd go-backend
go test ./...

# Run React web integration tests (if available)
cd react-web
bun test -- --integration
```

## User Acceptance Tests

### Running UAT Scenarios

Run UAT tests:

```bash
cd rails-backend

# Run all UAT scenarios
bundle exec rspec spec/system/parking_uat_spec.rb --tag uat
```

## Running All Tests

### Run All Tests Across All Components

```bash
# Rails backend
cd rails-backend && bundle exec rspec

# Go backend
cd go-backend && go test ./...

# React web
cd react-web && bun test


### Run Tests with Specific Tags

```bash
# Run only fast tests
bundle exec rspec --tag fast

# Run only integration tests
bundle exec rspec --tag integration

# Run only UAT tests
bundle exec rspec --tag uat
```

## Test Categories

### Unit Tests

-**Rails Backend**: Models, Services, Workers, Controllers
-**Go Backend**: Models, Services, Repositories, Handlers
-**React Web**: Components, API functions

### Integration Tests

-**Rails Backend**: API endpoint integration, database integration
-**Go Backend**: Service integration, repository integration
-**Full Stack**: End-to-end parking flow across all services

### User Acceptance Tests

-**Complete Parking Flow**: Park → Unpark with fee calculation
-**Vehicle Type Compatibility**: Small/Medium/Large vehicle slot allocation
-**Slot Allocation Strategy**: Closest available slot assignment
-**Continuous Parking**: Detection within 1-hour threshold
-**Long-term Parking**: 24+ hour rate application
-**Error Handling**: Invalid inputs, no available slots, double parking prevention

## CI/CD Integration

The project includes GitHub Actions CI/CD configuration:

```bash
# Run CI pipeline locally
act push

# View CI workflow
cat .github/workflows/ci.yml
```

## Troubleshooting

### Common Issues

1.**Database Connection Failed**
 - Ensure PostgreSQL is running: `docker-compose up -d postgres`
 - Check database configuration in `rails-backend/config/database.yml`

2.**Redis Connection Failed**
 - Ensure Redis is running: `docker-compose up -d redis`
 - Check Redis configuration in `rails-backend/config/initializers/sidekiq.rb`

3.**Port Already in Use**
 - Kill processes using the port: `lsof -ti:8082 | xargs kill -9`

4.**Dependency Installation Failed**
 - Clear cache: `rm -rf node_modules vendor/bundle`
 - Reinstall dependencies: `bundle install` or `npm install`

5.**Test Failures Due to Missing Data**
 - Ensure test database is seeded: `cd rails-backend && rails db:seed`

## Test Data Management

### Seed Test Data

```bash
cd rails-backend

# Seed test data
rails db:seed

# Reset test database
rails db:reset db:test

# Create test fixtures
rails g fixture:load
```

## Continuous Testing

### Watch Mode

Run tests in watch mode for rapid feedback:

```bash
# Rails backend
bundle exec rspec --format documentation

# Go backend
go test ./... -watch

# React web
bun test -- --watch
```

## Best Practices

1.**Run tests before committing code**
2.**Ensure test coverage meets minimum thresholds (80%+)**
3.**Run UAT before production releases**
4.**Use transactional fixtures for database tests**
5.**Mock external services (Kafka, Sentry, Prometheus) in unit tests**
6.**Clean up test data after test runs**

## Test Reports

### Coverage Reports

-**Rails Backend**: `coverage/index.html`
-**Go Backend**: `coverage.html`
-**React Web**: `coverage/index.html`

### Test Results

-**Unit Tests**: Individual test results in console
-**Integration Tests**: Combined results with API responses
-**UAT**: Scenario-based results with pass/fail status

## Dependencies Verification

### Rails Backend

```bash
cd rails-backend

# Verify all gems can be installed
bundle check

# Check for security vulnerabilities
bundle audit

# Update gems
bundle update
```

### Go Backend

```bash
cd go-backend

# Verify all modules can be downloaded
go mod download

# Check for security vulnerabilities
go mod verify

# Update dependencies
go get -u
```

### React Web

```bash
cd react-web

# Verify all packages can be installed
bun audit

# Update packages
bun update
```

## Quick Reference

### Run All Rails Tests
```bash
cd rails-backend && bundle exec rspec
```

### Run All Go Tests
```bash
cd go-backend && go test ./...
```

### Run All React Web Tests
```bash
cd react-web && bun test
```

### Run Full Integration Tests
```bash
docker-compose up -d && cd rails-backend && bundle exec rspec spec/integration
```
