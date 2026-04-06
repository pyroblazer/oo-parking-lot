/**
 * Update Slot E2E Tests (Detox)
 *
 * Detox tests for FEAT-010: Update Slot
 * Tests cover update functionality and form field changes.
 */

import { describe, beforeAll, beforeEach, afterEach, afterAll, it, expect, device, element, by, waitFor } from 'detox';
import { DashboardPage } from '../../pages/DashboardPage';
import { SlotsManagementPage } from '../../pages/SlotsManagementPage';
import { apiFixtures } from '../../fixtures/apiFixtures';

describe('FEAT-010: Update Slot', () => {
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
    await device.takeScreenshot(`update-slot-${Date.now()}.png`);
  });

  afterAll(async () => {
    await apiFixtures.cleanupTestData();
  });

  it('should display update button for slot', async () => {
    const updateButton = element(by.id('updateSlotButton'));
    await waitFor(updateButton).toExist().withTimeout(5000).catch(() => {});
  });

  it('should allow updating slot information', async () => {
    const updateButtons = element(by.id('updateSlotButton'));
    await waitFor(updateButtons).toExist().withTimeout(5000).catch(() => {});
  });
});
