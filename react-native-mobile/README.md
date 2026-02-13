# React Native Mobile - OO Parking Lot

React Native mobile application for Object-Oriented Mall parking system.

## Dependencies

- **React Native**: 0.73.0
- **React**: 18.2.0
- **TypeScript**: 5.3.0
- **React Navigation**: 6.x
  - @react-navigation/native 6.1.9
  - @react-navigation/native-stack 6.9.17
- **React Native Screens**: 3.27.0
- **React Native Safe Area Context**: 4.8.2
- **@react-native-picker/picker**: 2.4.10
- **Axios**: 1.6.0 (HTTP client)
- **@react-native-async-storage/async-storage**: 1.21.0 (Secure storage)
- **React Native Keychain**: 8.1.3 (Secure credential storage)
- **Jest**: 29.7.0 (Testing framework)
- **@testing-library/react-native**: 12.4.0 (Component testing)
- **@testing-library/jest-native**: 5.4.3 (Jest utilities)
- **ESLint**: 8.56.0 (Code linting)
- **TypeScript ESLint**: 6.21.0 (TypeScript linting)
- **Prettier**: 3.1.0 (Code formatting)

## Setup

1. Install dependencies:
```bash
npm install
```

2. For iOS:
```bash
cd ios && pod install
```

3. Run app:
```bash
# For iOS
npm run ios

# For Android
npm run android
```

## Features

- **Park Vehicle**: Select vehicle type and entry point to park a vehicle
- **Unpark Vehicle**: Enter session ID to unpark a vehicle and calculate fees
- **View Session**: View detailed information about a parking session
- **Available Slots**: Search for available parking slots based on vehicle type and entry point

## API Configuration

The API endpoint is configured in `src/api.js`. Update the `API_BASE_URL` constant to point to your Rails or Go backend.

## Platform-Specific Setup

### iOS
- Make sure you have Xcode installed
- Run `cd ios && pod install` after npm install
- Open `ios/ooParkingLot.xcworkspace` in Xcode

### Android
- Make sure you have Android Studio installed
- Open the `android/` folder in Android Studio
- Configure the emulator or connect a physical device

## Build for Production

```bash
# iOS
npm run ios --configuration Release

# Android
cd android && ./gradlew assembleRelease
```

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with Bun
npm run test:bun
```
