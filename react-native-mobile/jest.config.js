/**
 * Jest Configuration for React Native
 * This configuration overrides package.json settings to fix readonly property issues
 */

module.exports = {
  preset: './jest-preset.js',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/jest.setup-after-env.cjs'
  ],
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  moduleNameMapper: {
    '^@env$': '<rootDir>/__mocks__/env.js',
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^@react-native-picker/picker$': '<rootDir>/__mocks__/@react-native-picker/picker.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/@react-native-async-storage/async-storage.js',
    '^@react-native-community/datetimepicker$': '<rootDir>/__mocks__/@react-native-community/datetimepicker.js',
    '^@react-navigation/native$': '<rootDir>/__mocks__/@react-navigation/native/native.js',
    '^@react-navigation/native-stack$': '<rootDir>/__mocks__/@react-navigation/native-stack.js',
    '^@react-navigation/(.*)$': '<rootDir>/__mocks__/@react-navigation/native/native.js',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation)/)'
  ],
  testEnvironment: 'jsdom',
  testTimeout: 10000,
  maxWorkers: 8,
  verbose: false,
  // Add detectOpenHandles flag for better async operation handling
  detectOpenHandles: true,
  // Add bail mode to stop on first failure for easier debugging
  bail: false,
  // Prevent readonly property assignment errors
  resetModules: false,
  resetMocks: false,
  restoreMocks: false
};