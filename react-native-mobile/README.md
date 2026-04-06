# React Native Mobile - OO Parking Lot

React Native mobile application for the OO Parking Lot System.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template and adjust if needed
cp .env.example .env

# 3. Start the backend (from project root)
#    Go backend (port 8082):
cd go-backend && go run cmd/server/main.go
#    Rails backend (port 3000):
cd rails-backend && bundle exec rails server

# 4. Start the Android emulator (via Android Studio or CLI)

# 5. Forward ports so the emulator can reach the backend
cd react-native-mobile
./setup-ports.sh          # Forwards Metro (8081) + Go backend (8082)
./setup-ports.sh --rails  # Also forwards Rails backend (3000)

# 6. Start Metro bundler and run the app
npm start                 # Terminal 1: Metro
npm run android           # Terminal 2: Build & install APK
```

## Environment Configuration

The app reads its API server URL from a `.env` file at the project root. This file is **not** committed to git.

### Setup

```bash
cp .env.example .env        # Create from template
```

### `API_BASE_URL`

| Environment | Value | Notes |
|-------------|-------|-------|
| Android emulator (ADB reverse) | `http://localhost:8082` | Recommended. Run `./setup-ports.sh` first. |
| Android emulator (no ADB) | `http://10.0.2.2:8082` | `10.0.2.2` maps to host loopback in the emulator VM. |
| iOS Simulator | `http://localhost:8082` | Works natively. |
| Physical device | `http://192.168.x.x:8082` | Use your computer's LAN IP (`ifconfig` or `ipconfig`). |
| Docker / remote | `http://your-server:8082` | Point to wherever the backend runs. |

**URL resolution order** (highest priority first):

1. **AsyncStorage** — user changes it at runtime via *Configuration > System > API Configuration*.
2. **`.env` file** — `API_BASE_URL` var, injected at Metro build time.
3. **Platform fallback** — `http://10.0.2.2:8082` on Android, `http://localhost:8082` everywhere else.

After editing `.env`, **restart Metro with cache cleared**:

```bash
npx react-native start --reset-cache
```

### Adding new env vars

1. Add the variable to `.env` and `.env.example`.
2. Declare its type in `src/env.d.ts`.
3. Import it: `import { MY_VAR } from '@env';`

The `@env` module is provided by `react-native-dotenv` (Babel plugin) and is mocked in `__mocks__/env.js` for Jest tests.

## Port Forwarding (Required for Emulator)

The Android emulator runs in its own VM and cannot reach `localhost` on the host machine directly. `adb reverse` maps emulator ports to host ports.

**Run this every time you connect an emulator:**

```bash
# Go backend (default)
./setup-ports.sh

# Rails backend
./setup-ports.sh --rails

# All services (Rails, Postgres, Redis, Metro, Go)
./setup-ports.sh --all
```

| Port | Service | Notes |
|------|---------|-------|
| 8081 | Metro bundler | Required for live reload |
| 8082 | Go backend | Default backend for the app |
| 3000 | Rails backend | Use `--rails` flag |
| 5432 | PostgreSQL | Use `--all` flag |
| 6379 | Redis | Use `--all` flag |

If the app shows "Cannot connect to parking system", run `./setup-ports.sh` and reload the app (press `RR` in the emulator).

## Backend Selection

The app defaults to the **Go backend at `http://localhost:8082`**. The API base URL can be changed at runtime from the **Configuration > System** screen, or by editing `.env`.

To switch backends programmatically:

```typescript
import { setApiBaseUrl } from './src/api/parkingApi';

// Switch to Rails backend
await setApiBaseUrl('http://localhost:3000');

// Switch to Go backend
await setApiBaseUrl('http://localhost:8082');
```

## API Compatibility

Both backends (Go on port 8082, Rails on port 3000) expose identical REST APIs. The app works with either. Key notes:

- **Park endpoint** (`POST /api/v1/sessions`): Uses `application/x-www-form-urlencoded`, not JSON
- **Unpark endpoint** (`POST /api/v1/sessions/:id/unpark`): `exited_at` is a query parameter, not body
- **Entry point field**: The park endpoint returns `entry_point` as a string (e.g., `"A"`), while the list/unpark endpoints return it as an object — the app handles both formats

## Dependencies

- **React Native**: 0.73.0
- **React**: 18.2.0
- **TypeScript**: 5.3.0
- **React Navigation**: 6.x
- **@react-native-community/datetimepicker**: ^9.1.0
- **@react-native-async-storage/async-storage**: ^1.21.0
- **Axios**: 1.6.0
- **react-native-dotenv**: build-time env var injection
- **Jest**: 29.7.0
- **@testing-library/react-native**: 12.4.0

## Setup

```bash
npm install
```

For iOS:
```bash
cd ios && pod install
```

## Running

```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Testing

```bash
npm test                    # All tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
npm run test:api            # API integration tests only
npm run type-check          # TypeScript type checking
```

## E2E Testing (Detox)

Detox E2E tests are written for iOS and have full feature parity with the React Web Playwright tests. All test cases are production-ready.

### Test Groups

| Group | Test Files | Description |
|-------|-----------|-------------|
| core | 5 files | Park, unpark, fee calculation, sessions, green flow |
| management | 12 files | Entry points, slots, sessions, billing logs, Kafka events |
| navigation | 1 file | Navigation between screens |
| simple | 3 files | Basic park, unpark, and navigation flows |
| system | 2 files | Initialization, health checks, and settings |

### Test Parity with Playwright

| Test File | Web Tests | Mobile Tests |
|-----------|-----------|--------------|
| navigation-simple | 8 tests | 8 tests |
| park-vehicle-ultra-simple | 5 tests | 5 tests |
| unpark-vehicle-ultra-simple | 4 tests | 4 tests |

### Running Locally

```bash
# Build the iOS binary for Detox
npm run e2e:build:ios

# Run all Detox E2E tests
npm run e2e:ios
```

The Podfile automatically patches `boost.podspec` to remove SHA256 checksum verification, which is required to work around a checksum mismatch in the Artifactory mirror for boost 1.83.0. This has no impact on test execution or security since boost is statically linked.

### CI

Tests run on `macos-latest` with three parallel test groups: `core`, `management`, and `simple-navigation`. The CI workflow handles all setup, patching, and build steps automatically.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot connect to parking system" | Run `./setup-ports.sh` and press `RR` |
| Still can't connect after port forward | Check `.env` has correct `API_BASE_URL`. Restart Metro with `--reset-cache`. |
| Metro not connecting | Check port 8081 is forwarded: `adb reverse --list` |
| App crashes on launch | Ensure Metro is running: `npm start` |
| Build fails | Clean build: `cd android && ./gradlew clean` |
| New Arch errors | Ensure `newArchEnabled=false` in `android/gradle.properties` |
| Env var changes not picked up | Restart Metro: `npx react-native start --reset-cache` |

## Build for Production

```bash
# Android
cd android && ./gradlew assembleRelease

# iOS
npm run ios --configuration Release
```
