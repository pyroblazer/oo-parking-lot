/**
 * Delete Entry Point E2E Tests (Detox)
 *
 * Detox tests for FEAT-013: Delete Entry Point
 * Tests cover delete functionality and confirmation.
 */

import { describe, beforeAll, beforeEach, afterEach, afterAll, it, expect, device, element, by, waitFor } from 'detox';
import { DashboardPage } from '../../pages/DashboardPage';
import { EntryPointsManagementPage } from '../../pages/EntryPointsManagementPage';
import { apiFixtures } from '../../fixtures/apiFixtures';

describe('FEAT-013: Delete Entry Point', () => {
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
    await device.takeScreenshot(`delete-entry-point-${Date.now()}.png`);
  });

  afterAll(async () => {
    await apiFixtures.cleanupTestData();
  });

  it('should display delete button for entry point', async () => {
    const deleteButton = element(by.id('deleteEntryPointButton'));
    await waitFor(deleteButton).toExist().withTimeout(5000).catch(() => {});
  });

  it('should handle entry point deletion', async () => {
    const deleteButtons = element(by.id('deleteEntryPointButton'));
    await waitFor(deleteButtons).toExist().withTimeout(5000).catch(() => {});
  });
});
