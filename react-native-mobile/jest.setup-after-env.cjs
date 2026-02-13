/**
 * Jest setup file that runs after jest globals are available
 */

// Setup jest-native matchers
require('@testing-library/jest-native/extend-expect');

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
