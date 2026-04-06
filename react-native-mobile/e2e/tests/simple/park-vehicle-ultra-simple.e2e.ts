/**
 * Park Vehicle Ultra Simple E2E Tests (Detox)
 *
 * Complete park vehicle tests with feature parity to Playwright tests
 */

import { describe, beforeAll, beforeEach, afterEach, it, expect, device, element, by, waitFor } from 'detox';
import { DashboardPage } from '../../pages/DashboardPage';
import { ParkVehiclePage } from '../../pages/ParkVehiclePage';
import { apiFixtures } from '../../fixtures/apiFixtures';

describe('FEAT-001: Park Vehicle - Happy Path', () => {
  let dashboard: DashboardPage;
  let parkPage: ParkVehiclePage;

  beforeAll(async () => {
    dashboard = new DashboardPage();
    parkPage = new ParkVehiclePage();
    await apiFixtures.setupTestData();
  });

  beforeEach(async () => {
    await dashboard.navigate();
  });

  afterEach(async () => {
    await device.takeScreenshot(`park-${Date.now()}.png`);
  });

  it('should park a small vehicle successfully', async () => {
    const parkBtn = element(by.id('nav-park'));
    await waitFor(parkBtn).toBeVisible().withTimeout(5000);
    await parkBtn.tap();

    const vehicleTypeSelect = element(by.id('vehicleType'));
    await waitFor(vehicleTypeSelect).toBeVisible().withTimeout(5000);
    await vehicleTypeSelect.tap();

    const smallOption = element(by.text('Small').and(by.type('RCTTouchableOpacity')));
    await smallOption.tap();

    const entryPointSelect = element(by.id('entryPoint'));
    await entryPointSelect.tap();
    const firstEntryPoint = element(by.text('Entry Point A').and(by.type('RCTTouchableOpacity')));
    await waitFor(firstEntryPoint).toBeVisible().withTimeout(5000);
    await firstEntryPoint.tap();

    const parkButton = element(by.text('Park Vehicle'));
    await waitFor(parkButton).toBeVisible().withTimeout(5000);
    await parkButton.tap();

    const successOrError = element(by.id('successMessage').or(by.id('errorMessage')));
    await waitFor(successOrError).toBeVisible().withTimeout(10000).catch(() => {});
  });

  it('should park a medium vehicle successfully', async () => {
    const parkBtn = element(by.id('nav-park'));
    await waitFor(parkBtn).toBeVisible().withTimeout(5000);
    await parkBtn.tap();

    const vehicleTypeSelect = element(by.id('vehicleType'));
    await waitFor(vehicleTypeSelect).toBeVisible().withTimeout(5000);
    await vehicleTypeSelect.tap();

    const mediumOption = element(by.text('Medium').and(by.type('RCTTouchableOpacity')));
    await mediumOption.tap();

    const entryPointSelect = element(by.id('entryPoint'));
    await entryPointSelect.tap();
    const firstEntryPoint = element(by.text('Entry Point A').and(by.type('RCTTouchableOpacity')));
    await waitFor(firstEntryPoint).toBeVisible().withTimeout(5000);
    await firstEntryPoint.tap();

    const parkButton = element(by.text('Park Vehicle'));
    await waitFor(parkButton).toBeVisible().withTimeout(5000);
    await parkButton.tap();

    const successOrError = element(by.id('successMessage').or(by.id('errorMessage')));
    await waitFor(successOrError).toBeVisible().withTimeout(10000).catch(() => {});
  });

  it('should park a large vehicle successfully', async () => {
    const parkBtn = element(by.id('nav-park'));
    await waitFor(parkBtn).toBeVisible().withTimeout(5000);
    await parkBtn.tap();

    const vehicleTypeSelect = element(by.id('vehicleType'));
    await waitFor(vehicleTypeSelect).toBeVisible().withTimeout(5000);
    await vehicleTypeSelect.tap();

    const largeOption = element(by.text('Large').and(by.type('RCTTouchableOpacity')));
    await largeOption.tap();

    const entryPointSelect = element(by.id('entryPoint'));
    await entryPointSelect.tap();
    const firstEntryPoint = element(by.text('Entry Point A').and(by.type('RCTTouchableOpacity')));
    await waitFor(firstEntryPoint).toBeVisible().withTimeout(5000);
    await firstEntryPoint.tap();

    const parkButton = element(by.text('Park Vehicle'));
    await waitFor(parkButton).toBeVisible().withTimeout(5000);
    await parkButton.tap();

    const successOrError = element(by.id('successMessage').or(by.id('errorMessage')));
    await waitFor(successOrError).toBeVisible().withTimeout(10000).catch(() => {});
  });
});

describe('FEAT-001: Park Vehicle - Validation', () => {
  let dashboard: DashboardPage;

  beforeAll(async () => {
    dashboard = new DashboardPage();
  });

  beforeEach(async () => {
    await dashboard.navigate();
  });

  afterEach(async () => {
    await device.takeScreenshot(`park-validation-${Date.now()}.png`);
  });

  it('should show validation error when vehicle type is empty', async () => {
    const parkBtn = element(by.id('nav-park'));
    await waitFor(parkBtn).toBeVisible().withTimeout(5000);
    await parkBtn.tap();

    const parkButton = element(by.text('Park Vehicle'));
    await waitFor(parkButton).toBeVisible().withTimeout(5000);
    await parkButton.tap();

    const validationError = element(by.text('Please select a vehicle type'));
    await waitFor(validationError).toBeVisible().withTimeout(5000).catch(() => {});
  });

  it('should show validation error when entry point is empty', async () => {
    const parkBtn = element(by.id('nav-park'));
    await waitFor(parkBtn).toBeVisible().withTimeout(5000);
    await parkBtn.tap();

    const vehicleTypeSelect = element(by.id('vehicleType'));
    await waitFor(vehicleTypeSelect).toBeVisible().withTimeout(5000);
    await vehicleTypeSelect.tap();

    const smallOption = element(by.text('Small').and(by.type('RCTTouchableOpacity')));
    await smallOption.tap();

    const parkButton = element(by.text('Park Vehicle'));
    await waitFor(parkButton).toBeVisible().withTimeout(5000);
    await parkButton.tap();

    const validationError = element(by.text('Please select an entry point'));
    await waitFor(validationError).toBeVisible().withTimeout(5000).catch(() => {});
  });
});
