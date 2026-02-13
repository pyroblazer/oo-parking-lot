/**
 * Custom Jest preset for React Native tests
 * This is a modified version of the react-native preset that excludes the problematic setup.js
 */

'use strict';

module.exports = {
  haste: {
    defaultPlatform: 'ios',
    platforms: ['android', 'ios', 'native'],
  },
  transform: {
    '^.+\\.(js|ts|tsx)$': 'babel-jest',
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': require.resolve(
      './node_modules/react-native/jest/assetFileTransformer.js',
    ),
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native(-community)?|@react-navigation)/)',
    '__mocks__',
  ],
  // Include our custom setup file that properly mocks React Native
  setupFiles: [
    require.resolve('./jest.setup.cjs'),
  ],
  testEnvironment: 'jsdom',
  moduleDirectories: ['node_modules', '<rootDir>/__mocks__'],
  // Use v8 coverage provider to avoid babel-plugin-istanbul issues with minimatch 10.x
  coverageProvider: 'v8',
};
