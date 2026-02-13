/**
 * Bun test setup file
 * This file is preloaded before running tests with bun
 *
 * IMPORTANT: This project uses Jest for testing, not Bun's built-in test runner.
 * To run tests with Bun, use: bun run jest or bun run test:bun
 * 
 * The bun test command uses Bun's built-in test runner, which doesn't have
 * the same mocking capabilities as Jest. Always use bun run jest instead.
 */

// Set up global mocks for React Native
global.React = require('react');

// Mock React Native - Bun doesn't have a built-in mock API like Jest
// Instead, we set up global mock functions that can be used in tests
const _reactNativeMock = require('./__mocks__/react-native.js');

// Set up global test utilities for Bun
if (typeof Bun !== 'undefined') {
  // Create mock function factory
  global.createMock = (fn) => {
    const mockFn = (...args) => {
      mockFn.mock.calls.push(args);
      if (fn) return fn(...args);
    };
    mockFn.mock = { calls: [] };
    mockFn.mockClear = () => { mockFn.mock.calls = []; };
    mockFn.mockReset = () => { mockFn.mock.calls = []; };
    return mockFn;
  };

  // Set up module mocks for Bun using module mocking
  // Note: Bun doesn't have a built-in mock API, so we use a different approach
  // The actual mocking is done in jest.setup.js and jest.setup-after-env.cjs
  
  console.log('✓ Bun test setup complete - using Jest for testing');
  console.log('  To run tests with Bun, use: bun run jest');
  console.log('  Or: bun run test:bun');
  console.log('  Or: npm test');
  console.log('');
  console.log('  DO NOT use: bun test (uses Bun\'s built-in test runner without mocking support)');
} else {
  console.log('✓ Test setup complete');
}
