/**
 * Detox Initialization
 * 
 * This file is used by Detox to set up the test environment.
 * It runs before all tests to ensure the app is ready for testing.
 */

import { detox, device } from 'detox';

beforeAll(async () => {
  await device.launchApp();
});

beforeEach(async () => {
  await device.reloadReactNative();
});

afterEach(async () => {
  await device.takeScreenshot(`after-each-${Date.now()}`);
});
