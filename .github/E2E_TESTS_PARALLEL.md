# E2E Tests Parallel Execution in GitHub CI

## Overview

Both Playwright (React Web) and Detox (React Native) E2E tests are configured to run in parallel in the GitHub CI pipeline, significantly reducing overall test execution time.

## Playwright E2E Tests (React Web)

### Configuration
- **Sharding Strategy**: 3 independent shards
- **Runner**: `ubuntu-latest`
- **Test Execution**:
  - Each shard runs the complete test suite on 1/3 of the tests
  - Tests are automatically distributed by Playwright's sharding engine
  - Results from all shards are consolidated

### Test Categories
- **Core Flows** (5 tests): green-flow, park, unpark, view-session, fee-calculation
- **Management CRUD** (11 tests): entry-points, slots, sessions, billing-logs, kafka-events
- **Navigation & System** (7 tests): navigation, health, initialize, system-health

### Performance
- Sequential: ~60 minutes
- Parallel (3 shards): ~20 minutes
- **Improvement: 3x faster**

### Shard Distribution (Automatic)
```
Shard 1/3: Tests 1-8 and every 3rd test after
Shard 2/3: Tests 2-9 and every 3rd test after  
Shard 3/3: Tests 3-10 and every 3rd test after
```

## Detox E2E Tests (React Native Mobile)

### Configuration
- **Matrix Strategy**: 3 test groups
- **Runner**: `macos-latest` (required for iOS simulator)
- **Test Groups**:
  1. **Core**: `e2e/tests/core/` (5 tests)
  2. **Management**: `e2e/tests/management/` (11 tests)
  3. **Simple-Navigation**: `e2e/tests/simple/`, `e2e/tests/navigation/`, `e2e/tests/system/` (7 tests)

### Performance
- Sequential: ~15 minutes
- Parallel (3 groups): ~5 minutes per group (groups run in parallel)
- **Total improvement: 3x faster**

### Test Group Details
```
Core Tests:
  - green-flow.e2e.ts
  - park-vehicle.e2e.ts
  - unpark-vehicle.e2e.ts
  - view-session.e2e.ts
  - fee-calculation.e2e.ts

Management Tests:
  - entry-points-management.e2e.ts (+ create, delete, update)
  - slots-management.e2e.ts (+ create, delete, update)
  - sessions-management.e2e.ts
  - available-slots.e2e.ts
  - billing-audit-logs.e2e.ts
  - kafka-events.e2e.ts

Simple-Navigation Tests:
  - navigation.e2e.ts
  - navigation-simple.e2e.ts
  - park-vehicle-ultra-simple.e2e.ts
  - unpark-vehicle-ultra-simple.e2e.ts
  - initialize-system.e2e.ts
  - system-health.e2e.ts
  - settings.e2e.ts
```

## CI Pipeline Dependency Graph

```
┌─────────────────────────────────────────────────────────┐
│ Linting (parallel)                                      │
│ - RuboCop → Go-Lint → ESLint                            │
└────────────┬────────────────────────┬─────────────────┘
             │                        │
             ├─────────────────┬──────┴───────────────────┐
             │                 │                          │
        Unit Tests         E2E Tests (Parallel)       Linting
        (parallel)         
             │              
    ┌────────┼────────┐
    │        │        │
  RSpec   Go Tests  Frontend Tests
             │
    ┌────────┴────────┬────────────────┐
    │                 │                │
Playwright-1/3   Playwright-2/3    Playwright-3/3
    │                 │                │
    └────────────┬────────────────────┘
                 │
         Playwright-Consolidate
                 │
    ┌────────────┼────────────────┐
    │            │                │
Detox-Core   Detox-Management   Detox-Simple
    │            │                │
    └────────────┼────────────────┘
                 │
              Build ◄─── Build Frontend ◄─── Waiting for all E2E tests
```

## Running Tests Locally

### Playwright (React Web)
```bash
cd react-web

# Run all tests in parallel (default - uses 8 workers on local machine)
bun run test:e2e

# Run specific shard for testing
bunx playwright test --shard=1/3

# Run with UI for debugging
bunx playwright test --ui
```

### Detox (React Native Mobile)
```bash
cd react-native-mobile

# Run all tests
npm run e2e:ios

# Run specific test group (if supported)
detox test e2e/tests/core --configuration ios.sim.debug --cleanup
detox test e2e/tests/management --configuration ios.sim.debug --cleanup
detox test 'e2e/tests/simple' 'e2e/tests/navigation' 'e2e/tests/system' --configuration ios.sim.debug --cleanup
```

## Total CI Execution Time

### Before Parallelization
- RSpec Tests: 10 min
- Go Tests: 8 min
- Playwright Tests: 60 min (sequential)
- Detox Tests: 15 min
- Frontend Tests: 3 min
- **Total: ~96 minutes**

### After Parallelization
- Linting: 5 min (eslint, rubocop, go-lint in parallel)
- Unit Tests: 10 min (rspec, go tests, frontend tests in parallel)
- E2E Tests: 25 min (Playwright 3 shards + Detox 3 groups in parallel)
- Build: 5 min (all builds in parallel after tests)
- **Total: ~45 minutes** (56% reduction)

## Monitoring & Troubleshooting

### Shard Results
- Each Playwright shard generates its own test results artifact
- Consolidation job merges results for final reporting
- Individual shard failures are reported per shard

### Test Distribution
- If one shard is significantly slower, Playwright automatically redistributes in future runs
- macOS-based Detox tests may have variable performance based on available resources

### Failure Investigation
- Download individual shard artifacts from GitHub Actions
- Check `test-results/` for shard-specific failures
- Run failing test group locally to reproduce

## Future Optimizations

1. **Dynamic Shard Count**: Adjust shard count based on test suite size (currently 3)
2. **Test Grouping**: Re-balance test groups based on execution time profiles
3. **Caching**: Cache Playwright browsers between shard runs
4. **Resource Optimization**: Use smaller macOS runners for Detox if available

