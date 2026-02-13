/**
 * Jest setup file for React Native tests
 */

// Setup jest-native matchers
require('@testing-library/jest-native/extend-expect');

// Suppress React act() warnings for async state updates in useEffect
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    const errorMessage = args[0];
    if (typeof errorMessage === 'string' && errorMessage.includes('An update to') && errorMessage.includes('was not wrapped in act')) {
      return; // Suppress act() warnings
    }
    originalError.apply(console, args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Mock pulseAnimation to prevent "pulseAnimation.start is not a function" errors
global.pulseAnimation = {
  start: jest.fn(),
  stop: jest.fn(),
  reset: jest.fn(),
};
