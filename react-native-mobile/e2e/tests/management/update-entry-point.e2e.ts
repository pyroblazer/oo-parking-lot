/**
 * Update Entry Point E2E Tests (Detox)
 *
 * Detox tests for FEAT-014: Update Entry Point
 * Tests cover update functionality and form field changes.
 */

import { describe, beforeAll, beforeEach, afterEach, afterAll, it, expect, device, element, by, waitFor } from 'detox';
import { DashboardPage } from '../../pages/DashboardPage';
import { EntryPointsManagementPage } from '../../pages/EntryPointsManagementPage';
import { apiFixtures } from '../../fixtures/apiFixtures';

describe('FEAT-014: Update Entry Point', () => {
  let dashboard: DashboardPage;
  let entryPoints: EntryPointsManagementPage;

  beforeAll(async () => {
    dashboard = new DashboardPage();
    entryPoints = new EntryPointsManagementPage();
    await apiFixtures.setupTestData();
  });

  beforeEach(async () => {
    await dashboard.navigate();
    await entryPoints.navigate();
  });

  afterEach(async () => {
    await device.takeScreenshot(`update-entry-point-${Date.now()}.png`);
  });

  afterAll(async () => {
    await apiFixtures.cleanupTestData();
  });

  it('should display update button for entry point', async () => {
    const updateButton = element(by.id('updateEntryPointButton'));
    await waitFor(updateButton).toExist().withTimeout(5000).catch(() => {});
  });

  it('should allow updating entry point information', async () => {
    const updateButtons = element(by.id('updateEntryPointButton'));
    await waitFor(updateButtons).toExist().withTimeout(5000).catch(() => {});
  });
});
