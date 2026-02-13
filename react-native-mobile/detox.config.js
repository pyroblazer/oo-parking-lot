/**
 * Detox Configuration for React Native Mobile E2E Tests
 * 
 * This configuration file sets up Detox for running end-to-end tests
 * on iOS simulators and Android emulators.
 * 
 * Configuration documentation: https://wix.github.io/Detox/docs/config/
 */

module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/ooParkingLotMobile.app',
      build: 'xcodebuild -workspace ios/ooParkingLotMobile.xcworkspace -scheme ooParkingLotMobile -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/ooParkingLotMobile.app',
      build: 'xcodebuild -workspace ios/ooParkingLotMobile.xcworkspace -scheme ooParkingLotMobile -configuration Release -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..',
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release && cd ..',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_5_API_33',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
  },
  artifacts: {
    rootDir: 'artifacts',
    plugins: {
      log: {
        enabled: true,
        keepOnlyFailedTests: false,
      },
      screenshot: {
        enabled: true,
        shouldTakeAutomaticSnapshots: true,
        takeOn: 'failure',
      },
      video: {
        enabled: true,
        keepOnlyFailedTests: false,
        android: {
          bitRate: 4000000,
        },
        ios: {
          codec: 'h264',
          fps: 30,
          scaleFactor: 1,
        },
      },
      instrumentation: {
        enabled: true,
        keepOnlyFailedTests: false,
      },
    },
  },
  logger: {
    level: 'info',
    override: {
      'detox': {
        level: 'debug',
      },
    },
  },
};
