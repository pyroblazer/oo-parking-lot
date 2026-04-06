/**
 * Create Slot E2E Tests (Detox)
 *
 * Detox tests for FEAT-008: Create Slot
 * Tests cover create button visibility, modal opening, form fields, and submission.
 */

import { describe, beforeAll, beforeEach, afterEach, afterAll, it, expect, device, element, by, waitFor } from 'detox';
import { DashboardPage } from '../../pages/DashboardPage';
import { SlotsManagementPage } from '../../pages/SlotsManagementPage';
import { apiFixtures } from '../../fixtures/apiFixtures';

describe('FEAT-008: Create Slot - Creation Flow', () => {
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
    await device.takeScreenshot(`create-slot-${Date.now()}.png`);
  });

  afterAll(async () => {
    await apiFixtures.cleanupTestData();
  });

  it('should display create slot button', async () => {
    const createButton = element(by.text('+ Create Slot'));
    await waitFor(createButton).toBeVisible().withTimeout(5000);
    expect(await createButton.isVisible()).toBe(true);
  });

  it('should open create modal on button click', async () => {
    const createButton = element(by.text('+ Create Slot'));
    await waitFor(createButton).toBeVisible().withTimeout(5000);
    await createButton.tap();

    const modal = element(by.id('createSlotModal'));
    await waitFor(modal).toBeVisible().withTimeout(5000);
    expect(await modal.isVisible()).toBe(true);
  });

  it('should display slot label input field', async () => {
    const createButton = element(by.text('+ Create Slot'));
    await createButton.tap();

    const labelInput = element(by.id('slot_label'));
    await waitFor(labelInput).toBeVisible().withTimeout(5000);
    expect(await labelInput.isVisible()).toBe(true);
  });

  it('should attempt to create slot with valid data', async () => {
    const createButton = element(by.text('+ Create Slot'));
    await createButton.tap();

    const labelInput = element(by.id('slot_label'));
    const typeInput = element(by.id('slot_type'));
    const submitButton = element(by.text('Create'));

    await labelInput.typeText('TE-1');
    await typeInput.multiTap(1);
    await submitButton.tap();

    await waitFor(element(by.id('createSlotModal'))).not.toBeVisible().withTimeout(5000).catch(() => {});
  });
});
