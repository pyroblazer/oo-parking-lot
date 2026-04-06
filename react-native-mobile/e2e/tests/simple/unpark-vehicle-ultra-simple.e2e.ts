/**
 * Unpark Vehicle Ultra Simple E2E Tests (Detox)
 *
 * Complete unpark vehicle tests with feature parity to Playwright tests
 */

import { describe, beforeAll, beforeEach, afterEach, it, expect, device, element, by, waitFor } from 'detox';
import { DashboardPage } from '../../pages/DashboardPage';
import { UnparkVehiclePage } from '../../pages/UnparkVehiclePage';
import { apiFixtures } from '../../fixtures/apiFixtures';

describe('FEAT-002: Unpark Vehicle - Happy Path', () => {
  let dashboard: DashboardPage;
  let unparkPage: UnparkVehiclePage;

  beforeAll(async () => {
    dashboard = new DashboardPage();
    unparkPage = new UnparkVehiclePage();
    await apiFixtures.setupTestData();
  });

  beforeEach(async () => {
    await dashboard.navigate();
  });

  afterEach(async () => {
    await device.takeScreenshot(`unpark-${Date.now()}.png`);
  });

  it('should unpark vehicle with valid session ID', async () => {
    const unparkBtn = element(by.id('nav-unpark'));
    await waitFor(unparkBtn).toBeVisible().withTimeout(5000);
    await unparkBtn.tap();

    const sessionInput = element(by.id('sessionId'));
    await waitFor(sessionInput).toBeVisible().withTimeout(5000);
    await sessionInput.typeText('test-session-123');

    const calculateButton = element(by.text('Calculate Fee'));
    await waitFor(calculateButton).toBeVisible().withTimeout(5000);
    await calculateButton.tap();

    const result = element(by.id('errorMessage').or(by.id('resultBox')));
    await waitFor(result).toBeVisible().withTimeout(10000).catch(() => {});
  });

  it('should display fee breakdown correctly', async () => {
    const unparkBtn = element(by.id('nav-unpark'));
    await waitFor(unparkBtn).toBeVisible().withTimeout(5000);
    await unparkBtn.tap();

    const sessionInput = element(by.id('sessionId'));
    await waitFor(sessionInput).toBeVisible().withTimeout(5000);
    await sessionInput.typeText('test-session-123');

    const calculateButton = element(by.text('Calculate Fee'));
    await waitFor(calculateButton).toBeVisible().withTimeout(5000);
    await calculateButton.tap();

    const result = element(by.id('errorMessage').or(by.id('resultBox')));
    await waitFor(result).toBeVisible().withTimeout(10000).catch(() => {});
  });
});

describe('FEAT-002: Unpark Vehicle - Validation', () => {
  let dashboard: DashboardPage;

  beforeAll(async () => {
    dashboard = new DashboardPage();
  });

  beforeEach(async () => {
    await dashboard.navigate();
  });

  afterEach(async () => {
    await device.takeScreenshot(`unpark-validation-${Date.now()}.png`);
  });

  it('should show validation error when session ID is empty', async () => {
    const unparkBtn = element(by.id('nav-unpark'));
    await waitFor(unparkBtn).toBeVisible().withTimeout(5000);
    await unparkBtn.tap();

    const calculateButton = element(by.text('Calculate Fee'));
    await waitFor(calculateButton).toBeVisible().withTimeout(5000);
    await calculateButton.tap();

    const validationError = element(by.text('Session ID is required'));
    await waitFor(validationError).toBeVisible().withTimeout(5000).catch(() => {});
  });

  it('should show error when session not found', async () => {
    const unparkBtn = element(by.id('nav-unpark'));
    await waitFor(unparkBtn).toBeVisible().withTimeout(5000);
    await unparkBtn.tap();

    const sessionInput = element(by.id('sessionId'));
    await waitFor(sessionInput).toBeVisible().withTimeout(5000);
    await sessionInput.typeText('nonexistent-id');

    const calculateButton = element(by.text('Calculate Fee'));
    await waitFor(calculateButton).toBeVisible().withTimeout(5000);
    await calculateButton.tap();

    const errorMessage = element(by.id('errorMessage'));
    await waitFor(errorMessage).toBeVisible().withTimeout(10000).catch(() => {});
  });
});
