/**
 * Jest Configuration for Detox E2E Tests
 *
 * This configuration is specifically for running Detox e2e tests.
 * Unit tests use the jest.config.js in the root directory.
 */

module.exports = {
  testEnvironment: 'detox/runners/jest/testEnvironment',
  testRunner: 'jest-circus/runner',
  maxWorkers: 1,
  testTimeout: 120000,
  testMatch: [
    '**/e2e/**/*.e2e.ts',
    '**/e2e/**/*.e2e.tsx',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/init.ts',
  ],
  reporters: [
    'default',
  ],
  verbose: true,
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|detox|@react-native-async-storage)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@env$': '<rootDir>/../__mocks__/env.js',
    '^react-native$': '<rootDir>/../__mocks__/react-native.js',
  },
};
