# ReactJS Web - OO Parking Lot

ReactJS web application for Object-Oriented Mall parking system.

## Dependencies

- **React**: 18.3.1
- **React DOM**: 18.3.1
- **TypeScript**: 5.3.3
- **Vite**: 5.1.0 (Build tool)
- **Tailwind CSS**: 3.4.1 (Styling)
- **Three.js**: 0.160.0 (3D graphics)
- **@react-three/fiber**: 8.16.0 (React renderer for Three.js)
- **@react-three/drei**: 9.105.0 (Three.js helpers)
- **Framer Motion**: 11.0.0 (Animations)
- **Anime.js**: 3.2.2 (Animations)
- **Lottie React**: 2.4.0 (Lottie animations)
- **React Router DOM**: 6.22.0 (Routing)
- **Axios**: 1.6.7 (HTTP client)
- **Zustand**: 4.5.0 (State management)
- **Vitest**: 1.2.0 (Testing framework)
- **@testing-library/react**: 14.2.0 (Component testing)
- **@testing-library/user-event**: 14.5.2 (User interaction testing)
- **Storybook**: 8.0.0 (Component documentation)
- **Chromatic**: 11.0.0 (Visual regression testing)
- **@opentelemetry/api**: 1.8.0 (Distributed tracing API)
- **@opentelemetry/sdk-trace-web**: 1.8.0 (Web tracing SDK)
- **@sentry/react**: 7.110.0 (Error tracking)
- **eslint-plugin-security**: 1.7.1 (Security linting)
- **eslint-plugin-jsx-a11y**: 6.8.0 (Accessibility linting)

## Setup

1. Install dependencies:
```bash
bun install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your API endpoint
```

3. Run development server:
```bash
bun run dev
```

The app will be available at `http://localhost:3002`

## Features

- **Park Vehicle**: Select vehicle type and entry point to park a vehicle
- **Unpark Vehicle**: Enter session ID to unpark a vehicle and calculate fees
- **View Session**: View detailed information about a parking session
- **Available Slots**: Search for available parking slots based on vehicle type and entry point
- **3D Visualization**: Interactive 3D parking lot visualization using Three.js

## API Integration

The app connects to the Rails or Go backend API. Configure the API endpoint in the `.env` file.

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run tests with Bun
npm run test:bun
```

## Storybook

```bash
# Start Storybook
npm run storybook

# Build Storybook
npm run build-storybook

# Run Chromatic
npm run chromatic
```

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Linting

```bash
# Run ESLint
npm run lint
```
