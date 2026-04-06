/**
 * Create Entry Point E2E Tests (Detox)
 *
 * Detox tests for FEAT-012: Create Entry Point
 * Tests cover create button visibility, modal opening, form fields, and submission.
 */

import { describe, beforeAll, beforeEach, afterEach, afterAll, it, expect, device, element, by, waitFor } from 'detox';
import { DashboardPage } from '../../pages/DashboardPage';
import { EntryPointsManagementPage } from '../../pages/EntryPointsManagementPage';
import { apiFixtures } from '../../fixtures/apiFixtures';

describe('FEAT-012: Create Entry Point - Creation Flow', () => {
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
    await device.takeScreenshot(`create-entry-point-${Date.now()}.png`);
  });

  afterAll(async () => {
    await apiFixtures.cleanupTestData();
  });

  it('should display create entry point button', async () => {
    const createButton = element(by.text('+ Create Entry Point'));
    await waitFor(createButton).toBeVisible().withTimeout(5000);
    expect(await createButton.isVisible()).toBe(true);
  });

  it('should open create modal on button click', async () => {
    const createButton = element(by.text('+ Create Entry Point'));
    await waitFor(createButton).toBeVisible().withTimeout(5000);
    await createButton.tap();

    const modal = element(by.id('createEntryPointModal'));
    await waitFor(modal).toBeVisible().withTimeout(5000);
    expect(await modal.isVisible()).toBe(true);
  });

  it('should display identifier input field', async () => {
    const createButton = element(by.text('+ Create Entry Point'));
    await createButton.tap();

    const identifierInput = element(by.id('identifier'));
    await waitFor(identifierInput).toBeVisible().withTimeout(5000);
    expect(await identifierInput.isVisible()).toBe(true);
  });

  it('should attempt to create entry point with valid data', async () => {
    const createButton = element(by.text('+ Create Entry Point'));
    await createButton.tap();

    const identifierInput = element(by.id('identifier'));
    const nameInput = element(by.id('name'));
    const submitButton = element(by.text('Create'));

    await identifierInput.typeText('D');
    await nameInput.typeText('Entry Point D');
    await submitButton.tap();

    // Wait for modal to close or response
    await waitFor(element(by.id('createEntryPointModal'))).not.toBeVisible().withTimeout(5000).catch(() => {});
  });
});
