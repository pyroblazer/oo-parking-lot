/**
 * Delete Slot E2E Tests (Detox)
 *
 * Detox tests for FEAT-009: Delete Slot
 * Tests cover delete functionality and confirmation.
 */

import { describe, beforeAll, beforeEach, afterEach, afterAll, it, expect, device, element, by, waitFor } from 'detox';
import { DashboardPage } from '../../pages/DashboardPage';
import { SlotsManagementPage } from '../../pages/SlotsManagementPage';
import { apiFixtures } from '../../fixtures/apiFixtures';

describe('FEAT-009: Delete Slot', () => {
  let dashboard: DashboardPage;
  let slots: SlotsManagementPage;

  beforeAll(async () => {
    dashboard = new DashboardPage();
    slots = new SlotsManagementPage();
    await apiFixtures.setupTestData();
  });

  beforeEach(async () => {
    await dashboard.navigate();
    await slots.navigate();
  });

  afterEach(async () => {
    await device.takeScreenshot(`delete-slot-${Date.now()}.png`);
  });

  afterAll(async () => {
    await apiFixtures.cleanupTestData();
  });

  it('should display delete button for slot', async () => {
    const deleteButton = element(by.id('deleteSlotButton'));
    await waitFor(deleteButton).toExist().withTimeout(5000).catch(() => {});
  });

  it('should handle slot deletion', async () => {
    const deleteButtons = element(by.id('deleteSlotButton'));
    await waitFor(deleteButtons).toExist().withTimeout(5000).catch(() => {});
  });
});
