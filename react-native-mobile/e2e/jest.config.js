/**
 * Jest Configuration for Detox E2E Tests
 * 
 * This configuration is specifically for running Detox e2e tests.
 * Unit tests use the jest.config.js in the root directory.
 */

const { DetoxCircusEnvironment } = require('detox/runners/jest-circus');

module.exports = {
  preset: 'jest-expo',
  testEnvironment: DetoxCircusEnvironment,
  testRunner: 'jest-circus/runner',
  maxWorkers: 8,
  setupTimeout: 120000,
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
    'detox/runners/jest/streamlineReporter',
    'jest-junit',
  ],
  verbose: true,
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|detox)/)',
  ],
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
      },
    },
  },
};
